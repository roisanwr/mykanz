// app/api/webhook/gmail-push/route.ts
// Dipanggil Google Pub/Sub setiap ada email baru di inbox user yang connect Gmail
// KRITIS: Harus balas 200 dalam < 10 detik atau Google akan retry terus
//
// FIX BUG #2: Ganti .catch() non-blocking dengan waitUntil() dari @vercel/functions
//   Sebelumnya: return dulu lalu processNewEmails() → Vercel langsung kill function → email tidak pernah diproses
//   Sekarang: waitUntil() memberi tahu Vercel agar function tetap hidup sampai promise selesai
//
// FIX BUG #6: Handle error 404 (historyId expired) → reset historyId agar tidak stuck selamanya
//
// IMPROVEMENT: Split transaction — jika email mengandung biaya admin, insert 2 transaksi terpisah
// IMPROVEMENT: User-defined rules — cek gmail_category_rules sebelum smart category matching

import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { google } from 'googleapis';
import prisma from '@/lib/prisma';
import { getClientForUser, handleInvalidGrant } from '@/lib/gmail/token-manager';
import { parseTransactionFromEmail } from '@/lib/gmail/parser';
import { findBestMatchingCategory } from '@/lib/category-matcher';
import { findBestMatchingWallet } from '@/lib/wallet-matcher';
import { applyUserRules } from '@/lib/gmail/rule-engine';
import type { ParsedGmailTx } from '@/lib/gmail/parser';
import type { GmailCategoryRule } from '@/lib/gmail/rule-engine';

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
      wallets: {
        where: { deleted_at: null },
        select: { id: true, name: true },
      },
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

  // Load user-defined rules sekali untuk semua email dalam batch ini
  const userRules = await prisma.gmail_category_rules.findMany({
    where: { user_id: user.id, is_active: true },
    orderBy: { priority: 'asc' },
    select: {
      id: true,
      condition_type: true,
      condition_value: true,
      match_type: true,
      category_id: true,
      priority: true,
      is_active: true,
    },
  }) as GmailCategoryRule[];

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
            await saveTransactionIfNotDuplicate(
              user.id,
              parsedTx,
              msgId,
              user.wallets,
              user.default_wallet_id,
              userRules,
            );
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
  userWallets: { id: string; name: string }[],
  defaultWalletId: string | null,
  userRules: GmailCategoryRule[],
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

  // ─── Smart Wallet Routing ───────────────────────────────────────────────
  const smartMatched = findBestMatchingWallet(userWallets, tx.source);
  let walletId: string | null = null;

  if (smartMatched) {
    walletId = smartMatched.id;
    console.log(`[Gmail Webhook] Smart wallet match: "${tx.source}" → dompet "${smartMatched.name}"`);
  } else if (defaultWalletId) {
    walletId = defaultWalletId;
    console.log(`[Gmail Webhook] No wallet match for "${tx.source}", fallback ke default wallet`);
  } else if (userWallets.length > 0) {
    walletId = userWallets[0].id;
    console.log(`[Gmail Webhook] No default wallet, pakai dompet pertama: "${userWallets[0].name}"`);
  }

  if (!walletId) {
    console.warn(`[Gmail Webhook] User ${userId} tidak punya wallet, skip insert`);
    return;
  }

  const txType = tx.type === 'PEMASUKAN' ? 'PEMASUKAN' : 'PENGELUARAN';

  // ─── Category Resolution (3 Layer) ──────────────────────────────────────
  // Layer 1: User-defined rules (highest priority) — user input sendiri, langsung percaya
  // Layer 2: Smart matching ke kategori user yang ada
  // Layer 3: Fallback category "Gmail: {source}"

  let categoryId: string;
  let needsReview: boolean;

  // Layer 1: Cek user-defined rules
  const ruleMatchedCategoryId = applyUserRules(userRules, tx);

  if (ruleMatchedCategoryId) {
    // Verifikasi kategori masih ada dan sesuai tipe
    const ruleCategory = await prisma.categories.findFirst({
      where: { id: ruleMatchedCategoryId, user_id: userId, deleted_at: null },
      select: { id: true, name: true },
    });

    if (ruleCategory) {
      categoryId = ruleCategory.id;
      needsReview = false; // User bikin rule sendiri, langsung percaya
      console.log(`[Gmail Webhook] Rule match → kategori "${ruleCategory.name}" (no review)`);
    } else {
      // Rule ada tapi kategorinya sudah dihapus — fallback ke layer 2
      console.warn(`[Gmail Webhook] Rule matched category ${ruleMatchedCategoryId} tidak ditemukan, fallback ke smart match`);
      const fallback = await resolveSmartCategory(userId, txType, tx);
      categoryId = fallback.categoryId;
      needsReview = fallback.needsReview;
    }
  } else {
    // Layer 2 & 3: Smart matching
    const fallback = await resolveSmartCategory(userId, txType, tx);
    categoryId = fallback.categoryId;
    needsReview = fallback.needsReview;
  }

  // Insert transaksi utama
  await prisma.fiat_transactions.create({
    data: {
      user_id: userId,
      wallet_id: walletId,
      category_id: categoryId,
      transaction_type: txType,
      amount: tx.amount,
      description: tx.merchant
        ? `[${tx.source}] ${tx.merchant}`
        : tx.recipient
          ? `[${tx.source}] ${tx.recipient}`
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

  // ─── Split Transaction: Insert Biaya Admin jika ada ───────────────────────
  if (tx.fee_amount && tx.fee_amount > 0) {
    const feeGmailMsgId = `${gmailMsgId}_fee`;

    // Cek duplikasi biaya admin
    const existingFee = await prisma.fiat_transactions.findUnique({
      where: { gmail_msg_id: feeGmailMsgId },
      select: { id: true },
    });

    if (!existingFee) {
      // Cari atau buat kategori "Biaya Admin" untuk user ini
      const adminCategory = await prisma.categories.upsert({
        where: {
          user_id_name_type: {
            user_id: userId,
            name: 'Biaya Admin',
            type: 'PENGELUARAN',
          },
        },
        create: {
          user_id: userId,
          name: 'Biaya Admin',
          type: 'PENGELUARAN',
        },
        update: {},
        select: { id: true },
      });

      const feeDesc = tx.fee_description ?? 'Biaya Transaksi';

      await prisma.fiat_transactions.create({
        data: {
          user_id: userId,
          wallet_id: walletId,
          category_id: adminCategory.id,
          transaction_type: 'PENGELUARAN',
          amount: tx.fee_amount,
          description: `[${tx.source}] ${feeDesc}${tx.recipient ? ` - ${tx.recipient}` : ''}`,
          transaction_date: tx.date,
          gmail_msg_id: feeGmailMsgId, // suffix _fee untuk deduplication
          source_channel: 'GMAIL',
          needs_review: false, // biaya admin selalu clear, tidak perlu review
        },
      });

      console.log(
        `[Gmail Webhook] Inserted fee: PENGELUARAN Rp${tx.fee_amount.toLocaleString()} ` +
        `(${feeDesc}) dari ${tx.source} | kategori: Biaya Admin`,
      );
    }
  }
}

/**
 * Resolve kategori via smart matching (layer 2) + fallback kategori (layer 3).
 */
async function resolveSmartCategory(
  userId: string,
  txType: 'PEMASUKAN' | 'PENGELUARAN',
  tx: ParsedGmailTx,
): Promise<{ categoryId: string; needsReview: boolean }> {
  // Ambil semua kategori user yang sesuai tipe transaksi
  const userCategories = await prisma.categories.findMany({
    where: { user_id: userId, type: txType, deleted_at: null },
    select: { id: true, name: true },
  });

  // Fuzzy-match berdasarkan category_hint dari parser
  const matchedCategory = findBestMatchingCategory(userCategories, tx.category_hint);

  if (matchedCategory) {
    console.log(
      `[Gmail Webhook] Category match: "${matchedCategory.name}" (hint: ${tx.category_hint})`,
    );
    return { categoryId: matchedCategory.id, needsReview: false };
  }

  // Tidak ada match → buat/pakai kategori fallback per-sumber
  const fallbackName = `Gmail: ${tx.source}`;
  const fallbackCategory = await prisma.categories.upsert({
    where: { user_id_name_type: { user_id: userId, name: fallbackName, type: txType } },
    create: { user_id: userId, name: fallbackName, type: txType },
    update: {},
    select: { id: true },
  });

  console.log(
    `[Gmail Webhook] No category match, using fallback "${fallbackName}" (hint: ${tx.category_hint})`,
  );
  return { categoryId: fallbackCategory.id, needsReview: true };
}
