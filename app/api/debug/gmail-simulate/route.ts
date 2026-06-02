// app/api/debug/gmail-simulate/route.ts
// Endpoint testing untuk simulasi email notifikasi bank tanpa perlu email asli.
// HANYA AKTIF jika GMAIL_TEST_MODE=true di environment variables.
// Dilindungi dengan CRON_SECRET agar tidak bisa diakses sembarangan.
//
// Cara pakai (dari terminal atau Postman):
//
// curl -X POST https://[domain]/api/debug/gmail-simulate \
//   -H "Authorization: Bearer [CRON_SECRET]" \
//   -H "Content-Type: application/json" \
//   -d '{
//     "source": "Mandiri",
//     "subject": "Notifikasi Debit Mandiri",
//     "body": "Debit rekening Mandiri\nRp 150.000\nkepada Tokopedia",
//     "from": "test@pribadi.com",
//     "save": false
//   }'
//
// Parameter:
//   source  : "BCA" | "GoPay" | "OVO" | "Mandiri" | "Tokopedia" | "Shopee"
//   subject : judul email (bebas)
//   body    : isi email (pastikan ada "Rp xxx.xxx" dan kata kunci debit/kredit)
//   from    : alamat pengirim (bebas, tidak dipakai untuk matching di test mode)
//   save    : true = benar-benar simpan ke DB | false = dry run, hanya tampilkan hasil parsing

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { parseTransactionFromEmail } from '@/lib/gmail/parser';
import { findBestMatchingCategory } from '@/lib/category-matcher';

export async function POST(req: NextRequest) {
  // Hanya aktif jika GMAIL_TEST_MODE=true
  if (process.env.GMAIL_TEST_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Test mode tidak aktif. Set GMAIL_TEST_MODE=true di environment variables.' },
      { status: 403 },
    );
  }

  // Verifikasi CRON_SECRET
  const authHeader = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Cek session — harus login
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  let body: {
    source: string;
    subject: string;
    body: string;
    from?: string;
    save?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { source, subject, body: emailBody, from = 'test@example.com', save = false } = body;

  if (!source || !emailBody) {
    return NextResponse.json(
      { error: 'Field "source" dan "body" wajib diisi' },
      { status: 400 },
    );
  }

  // Buat simulasi GmailMessage — dengan subject keyword [TEST:SOURCE] agar
  // parser langsung menggunakan parser yang sesuai tanpa cek sender domain
  const testSubject = `[TEST:${source.toUpperCase()}] ${subject}`;

  // Encode body ke base64url (format yang sama dengan Gmail API)
  const encodedBody = Buffer.from(emailBody).toString('base64url');

  const simulatedMessage = {
    payload: {
      headers: [
        { name: 'From', value: from },
        { name: 'Subject', value: testSubject },
      ],
      body: { data: encodedBody },
      mimeType: 'text/plain',
    },
    internalDate: String(Date.now()),
  };

  // Parse email
  const parsedTx = parseTransactionFromEmail(simulatedMessage);

  if (!parsedTx) {
    return NextResponse.json({
      ok: false,
      message: 'Email tidak bisa di-parse. Cek apakah body mengandung "Rp xxx.xxx" dan kata kunci debit/kredit/pembayaran.',
      debug: {
        subject: testSubject,
        body_preview: emailBody.substring(0, 200),
        test_mode_active: process.env.GMAIL_TEST_MODE === 'true',
      },
    });
  }

  const result = {
    ok: true,
    parsed: {
      source: parsedTx.source,
      type: parsedTx.type,
      amount: parsedTx.amount,
      merchant: parsedTx.merchant,
      currency: parsedTx.currency,
      date: parsedTx.date,
      category_hint: parsedTx.category_hint,
    },
    saved: false,
    transaction_id: null as string | null,
  };

  // Jika save=true, simpan ke DB
  if (save) {
    const userId = session.user.id;

    // Cari wallet
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { default_wallet_id: true },
    });

    let walletId = user?.default_wallet_id ?? null;
    if (!walletId) {
      const firstWallet = await prisma.wallets.findFirst({
        where: { user_id: userId, deleted_at: null },
        select: { id: true },
      });
      walletId = firstWallet?.id ?? null;
    }

    if (!walletId) {
      return NextResponse.json({
        ...result,
        ok: false,
        message: 'User tidak punya wallet. Buat wallet dulu di dashboard.',
      });
    }

    const txType = parsedTx.type;

    // Category matching
    const userCategories = await prisma.categories.findMany({
      where: { user_id: userId, type: txType, deleted_at: null },
      select: { id: true, name: true },
    });

    const matchedCategory = findBestMatchingCategory(userCategories, parsedTx.category_hint);

    let categoryId: string;
    if (matchedCategory) {
      categoryId = matchedCategory.id;
    } else {
      const fallback = await prisma.categories.upsert({
        where: { user_id_name_type: { user_id: userId, name: `Gmail: ${parsedTx.source}`, type: txType } },
        create: { user_id: userId, name: `Gmail: ${parsedTx.source}`, type: txType },
        update: {},
        select: { id: true },
      });
      categoryId = fallback.id;
    }

    // Buat gmail_msg_id unik untuk test transaction (tidak akan ada duplikasi dengan email asli)
    const testMsgId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const transaction = await prisma.fiat_transactions.create({
      data: {
        user_id: userId,
        wallet_id: walletId,
        category_id: categoryId,
        transaction_type: txType,
        amount: parsedTx.amount,
        description: parsedTx.merchant
          ? `[TEST][${parsedTx.source}] ${parsedTx.merchant}`
          : `[TEST][${parsedTx.source}] Simulate via gmail-simulate endpoint`,
        transaction_date: parsedTx.date,
        gmail_msg_id: testMsgId,
        source_channel: 'GMAIL',
        needs_review: !matchedCategory,
      },
      select: { id: true },
    });

    result.saved = true;
    result.transaction_id = transaction.id;
  }

  return NextResponse.json(result);
}
