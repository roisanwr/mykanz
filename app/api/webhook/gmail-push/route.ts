// app/api/webhook/gmail-push/route.ts
// Dipanggil Google Pub/Sub setiap ada email baru di inbox user yang connect Gmail
// KRITIS: Harus balas 200 dalam < 10 detik atau Google akan retry terus
//
// FIX BUG #2: Ganti .catch() non-blocking dengan waitUntil() dari @vercel/functions
//   Sebelumnya: return dulu lalu processNewEmails() → Vercel langsung kill function → email tidak pernah diproses
//   Sekarang: waitUntil() memberi tahu Vercel agar function tetap hidup sampai promise selesai
//
// FIX BUG #6: Handle error 404 (historyId expired) → reset historyId agar tidak stuck selamanya

import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { google } from 'googleapis';
import prisma from '@/lib/prisma';
import { getClientForUser, handleInvalidGrant } from '@/lib/gmail/token-manager';
import { parseTransactionFromEmail } from '@/lib/gmail/parser';
import { findBestMatchingCategory } from '@/lib/category-matcher';
import type { ParsedGmailTx } from '@/lib/gmail/parser';

// Berikan Vercel cukup waktu untuk proses background
export const maxDuration = 60;

interface PubSubMessage {
  message: {
    data: string; // base64-encoded JSON
    messageId: string;
  };
  subscription: string;
}

interface GmailNotification {
  emailAddress: string;
  historyId: string;
}

export async function POST(req: NextRequest) {
  let body: PubSubMessage;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Decode payload Pub/Sub
  let notification: GmailNotification;
  try {
    const decoded = Buffer.from(body.message.data, 'base64').toString('utf8');
    notification = JSON.parse(decoded);
  } catch {
    // Payload tidak valid, balas 200 agar Pub/Sub tidak retry terus
    return NextResponse.json({ ok: true });
  }

  const { emailAddress, historyId: newHistoryId } = notification;

  // FIX BUG #2: Gunakan waitUntil() — Vercel akan menjaga function tetap hidup
  // sampai processNewEmails() selesai, bahkan setelah response 200 dikirim ke Pub/Sub.
  // Sebelumnya: processNewEmails().catch() langsung mati saat return dieksekusi.
  waitUntil(
    processNewEmails(emailAddress, newHistoryId).catch((err) => {
      console.error('[Gmail Webhook] Background processing error:', err);
    })
  );

  return NextResponse.json({ ok: true });
}

async function processNewEmails(
  emailAddress: string,
  newHistoryId: string,
): Promise<void> {
  // Cari user berdasarkan gmail_email
  const user = await prisma.users.findFirst({
    where: { gmail_email: emailAddress, gmail_connected: true },
    select: {
      id: true,
      gmail_history_id: true,
      default_wallet_id: true,
    },
  });

  if (!user) {
    console.log(`[Gmail Webhook] User tidak ditemukan untuk email: ${emailAddress}`);
    return;
  }

  if (!user.gmail_history_id) {
    // Belum ada history ID — update ke yang baru dan selesai
    await prisma.users.update({
      where: { id: user.id },
      data: { gmail_history_id: newHistoryId },
    });
    return;
  }

  let oauth2Client;
  try {
    oauth2Client = await getClientForUser(user.id);
  } catch (err) {
    console.error('[Gmail Webhook] Gagal mendapatkan OAuth client:', err);
    return;
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    // Ambil history sejak historyId terakhir yang kita simpan
    const historyRes = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: user.gmail_history_id,
      historyTypes: ['messageAdded'],
      labelId: 'INBOX',
    });

    const historyItems = historyRes.data.history ?? [];
    const processedMsgIds = new Set<string>();

    for (const historyItem of historyItems) {
      for (const msgAdded of historyItem.messagesAdded ?? []) {
        const msgId = msgAdded.message?.id;
        if (!msgId || processedMsgIds.has(msgId)) continue;
        processedMsgIds.add(msgId);

        try {
          // Ambil full message
          const msgRes = await gmail.users.messages.get({
            userId: 'me',
            id: msgId,
            format: 'full',
          });

          const parsedTx = parseTransactionFromEmail(msgRes.data as Parameters<typeof parseTransactionFromEmail>[0]);
          if (parsedTx) {
            await saveTransactionIfNotDuplicate(user.id, parsedTx, msgId, user.default_wallet_id);
          }
        } catch (msgErr) {
          console.error(`[Gmail Webhook] Error processing msg ${msgId}:`, msgErr);
        }
      }
    }

    // Update history ID ke yang terbaru
    await prisma.users.update({
      where: { id: user.id },
      data: { gmail_history_id: newHistoryId },
    });
  } catch (err: unknown) {
    const error = err as { message?: string; code?: number };
    if (
      error?.message?.includes('invalid_grant') ||
      error?.code === 401
    ) {
      await handleInvalidGrant(user.id);
    } else if (error?.code === 404) {
      // FIX BUG #6: historyId sudah terlalu lama (Google hanya simpan ~7 hari).
      // Reset ke historyId baru agar webhook berikutnya bisa jalan normal.
      // Tanpa fix ini, sistem akan stuck terus mencoba historyId lama dan selalu 404.
      await prisma.users.update({
        where: { id: user.id },
        data: { gmail_history_id: newHistoryId },
      });
      console.warn(`[Gmail Webhook] historyId expired (404), reset ke ${newHistoryId}`);
    } else {
      console.error('[Gmail Webhook] Error fetching history:', err);
    }
  }
}

async function saveTransactionIfNotDuplicate(
  userId: string,
  tx: ParsedGmailTx,
  gmailMsgId: string,
  defaultWalletId: string | null,
): Promise<void> {
  // Cek apakah gmail_msg_id sudah ada (deduplication)
  const existing = await prisma.fiat_transactions.findUnique({
    where: { gmail_msg_id: gmailMsgId },
    select: { id: true },
  });

  if (existing) {
    console.log(`[Gmail Webhook] Skip duplicate msg: ${gmailMsgId}`);
    return;
  }

  // Tentukan wallet: gunakan default_wallet_id user, atau ambil wallet pertama
  let walletId = defaultWalletId;
  if (!walletId) {
    const firstWallet = await prisma.wallets.findFirst({
      where: { user_id: userId, deleted_at: null },
      select: { id: true },
    });
    walletId = firstWallet?.id ?? null;
  }

  if (!walletId) {
    console.warn(`[Gmail Webhook] User ${userId} tidak punya wallet, skip insert`);
    return;
  }

  const txType = tx.type === 'PEMASUKAN' ? 'PEMASUKAN' : 'PENGELUARAN';

  // === SMART CATEGORY MATCHING ===
  // 1. Ambil semua kategori user yang sesuai tipe transaksi
  const userCategories = await prisma.categories.findMany({
    where: { user_id: userId, type: txType, deleted_at: null },
    select: { id: true, name: true },
  });

  // 2. Fuzzy-match berdasarkan category_hint dari parser
  const matchedCategory = findBestMatchingCategory(userCategories, tx.category_hint);

  let categoryId: string;
  let needsReview: boolean;

  if (matchedCategory) {
    // Match ditemukan → pakai kategori user yang sudah ada
    categoryId = matchedCategory.id;
    needsReview = false;
    console.log(
      `[Gmail Webhook] Category match: "${matchedCategory.name}" (hint: ${tx.category_hint})`,
    );
  } else {
    // Tidak ada match → buat/pakai kategori fallback per-sumber
    // Format: "Gmail: BCA", "Gmail: GoPay", dst. — lebih informatif dari "Gmail Import"
    const fallbackName = `Gmail: ${tx.source}`;
    const fallbackCategory = await prisma.categories.upsert({
      where: { user_id_name_type: { user_id: userId, name: fallbackName, type: txType } },
      create: { user_id: userId, name: fallbackName, type: txType },
      update: {},
      select: { id: true },
    });
    categoryId = fallbackCategory.id;
    needsReview = true; // Tandai butuh review karena kategori tidak spesifik
    console.log(
      `[Gmail Webhook] No category match, using fallback "${fallbackName}" (hint: ${tx.category_hint})`,
    );
  }

  // Insert transaksi
  await prisma.fiat_transactions.create({
    data: {
      user_id: userId,
      wallet_id: walletId,
      category_id: categoryId,
      transaction_type: txType,
      amount: tx.amount,
      description: tx.merchant
        ? `[${tx.source}] ${tx.merchant}`
        : `[${tx.source}] Auto-import via Gmail`,
      transaction_date: tx.date,
      gmail_msg_id: gmailMsgId,
      source_channel: 'GMAIL',
      needs_review: needsReview,
    },
  });

  console.log(
    `[Gmail Webhook] Inserted: ${tx.type} Rp${tx.amount.toLocaleString()} dari ${tx.source}` +
    ` | kategori: ${needsReview ? '⚠️ butuh review' : '✅ auto-match'}`,
  );
}
