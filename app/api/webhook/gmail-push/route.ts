// app/api/webhook/gmail-push/route.ts
// Dipanggil Google Pub/Sub setiap ada email baru di inbox user yang connect Gmail
// KRITIS: Harus balas 200 dalam < 10 detik atau Google akan retry terus

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import prisma from '@/lib/prisma';
import { getClientForUser, handleInvalidGrant } from '@/lib/gmail/token-manager';
import { parseTransactionFromEmail } from '@/lib/gmail/parser';
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

  // ← BALAS 200 SEGERA — proses berat dilakukan di background
  // Pub/Sub hanya butuh konfirmasi bahwa pesan diterima
  const responsePromise = NextResponse.json({ ok: true });

  // Background processing (non-blocking)
  processNewEmails(emailAddress, newHistoryId).catch((err) => {
    console.error('[Gmail Webhook] Background processing error:', err);
  });

  return responsePromise;
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

  // Cari atau buat kategori "Gmail Import"
  const categoryName = 'Gmail Import';
  let category = await prisma.categories.findFirst({
    where: {
      user_id: userId,
      name: categoryName,
      type: tx.type === 'PEMASUKAN' ? 'PEMASUKAN' : 'PENGELUARAN',
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!category) {
    category = await prisma.categories.create({
      data: {
        user_id: userId,
        name: categoryName,
        type: tx.type === 'PEMASUKAN' ? 'PEMASUKAN' : 'PENGELUARAN',
      },
      select: { id: true },
    });
  }

  // Insert transaksi
  await prisma.fiat_transactions.create({
    data: {
      user_id: userId,
      wallet_id: walletId,
      category_id: category.id,
      transaction_type: tx.type,
      amount: tx.amount,
      description: tx.merchant
        ? `[${tx.source}] ${tx.merchant}`
        : `[${tx.source}] Auto-import via Gmail`,
      transaction_date: tx.date,
      gmail_msg_id: gmailMsgId,
    },
  });

  console.log(
    `[Gmail Webhook] Inserted transaksi: ${tx.type} Rp${tx.amount.toLocaleString()} dari ${tx.source}`,
  );
}
