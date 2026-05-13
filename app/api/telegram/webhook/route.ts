import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateWebhookSecret, sendMessage, getFile, editMessageText, answerCallbackQuery } from '@/lib/telegram';
import { parseTransactionWithAI } from '@/lib/github_models';
import { fiat_tx_type } from '@prisma/client';

export const maxDuration = 60;

// ==========================================
// Rate Limiting (In-Memory, per deployment instance)
// Cukup untuk mencegah spam — akan reset saat cold start
// ==========================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;    // Maks 5 pesan per window
const RATE_LIMIT_WINDOW = 60 * 1000; // 60 detik

function isRateLimited(chatId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(chatId);

  if (!entry || now > entry.resetAt) {
    // Reset window
    rateLimitMap.set(chatId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) return true;

  entry.count++;
  return false;
}

export async function POST(req: Request) {
  // 1. Validasi Keamanan Webhook
  if (!validateWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();

    // --- HANDLE CALLBACK QUERY (Tombol Inline Keyboard) ---
    if (body.callback_query) {
      const queryId = body.callback_query.id;
      const chatId = body.callback_query.message.chat.id.toString();
      const messageId = body.callback_query.message.message_id;
      const actionData = body.callback_query.data;

      await processCallbackQuery(chatId, messageId, queryId, actionData);
      return NextResponse.json({ ok: true });
    }

    // --- HANDLE NORMAL MESSAGES ---
    if (!body.message) return NextResponse.json({ ok: true });

    const message = body.message;
    const chatId = message.chat.id.toString();
    const text: string = message.text || '';

    // A. Handle /start
    if (text.startsWith('/start')) {
      await sendMessage(chatId,
        `👋 <b>Selamat datang di MyKanz Bot!</b>\n\n` +
        `Bot ini membantumu mencatat transaksi keuangan langsung dari Telegram.\n\n` +
        `Untuk memulai, hubungkan akun MyKanz kamu:\n` +
        `1. Buka Web MyKanz → <b>Pengaturan</b> → <b>Telegram Bot</b>\n` +
        `2. Klik <b>Generate Token</b>\n` +
        `3. Kirim perintah: <code>/connect [TOKEN]</code>\n\n` +
        `Ketik /help untuk melihat semua perintah yang tersedia.`
      );
      return NextResponse.json({ ok: true });
    }

    // B. Handle /help
    if (text.startsWith('/help')) {
      await sendMessage(chatId,
        `📖 <b>Daftar Perintah MyKanz Bot</b>\n\n` +
        `<b>Akun</b>\n` +
        `• /connect [TOKEN] — Hubungkan akun MyKanz\n` +
        `• /status — Cek status koneksi akun\n` +
        `• /disconnect — Putuskan koneksi akun\n\n` +
        `<b>Mencatat Transaksi</b>\n` +
        `• 📷 <b>Kirim foto struk</b> — AI membaca dan mencatat otomatis\n` +
        `• ✍️ <b>Ketik teks bebas</b> — Contoh:\n` +
        `  <code>beli nasi padang 35000</code>\n` +
        `  <code>terima gaji bulan mei 5000000</code>\n` +
        `  <code>bayar listrik 250000</code>\n\n` +
        `• /help — Tampilkan pesan ini`
      );
      return NextResponse.json({ ok: true });
    }

    // C. Handle /connect
    if (text.startsWith('/connect')) {
      const token = text.split(' ')[1]?.trim().toUpperCase();
      if (!token) {
        await sendMessage(chatId, '❌ Format salah. Gunakan: <code>/connect [TOKEN]</code>\n\nDapatkan token dari Web MyKanz → Pengaturan → Telegram Bot.');
        return NextResponse.json({ ok: true });
      }

      const user = await prisma.users.findFirst({
        where: {
          telegram_link_token: token,
          telegram_token_expires_at: { gt: new Date() }
        }
      });

      if (!user) {
        await sendMessage(chatId, '❌ Token tidak ditemukan atau sudah kadaluarsa.\n\nSilakan generate token baru di Web MyKanz → Pengaturan → Telegram Bot.');
        return NextResponse.json({ ok: true });
      }

      await prisma.users.update({
        where: { id: user.id },
        data: {
          telegram_chat_id: chatId,
          telegram_link_token: null,
          telegram_token_expires_at: null
        }
      });

      await sendMessage(chatId,
        `✅ <b>Akun ${user.name || 'kamu'} berhasil terhubung!</b>\n\n` +
        `Sekarang kamu bisa:\n` +
        `• Kirim 📷 <b>foto struk</b> untuk dicatat otomatis\n` +
        `• Ketik teks seperti <code>beli kopi 35000</code>\n\n` +
        `Ketik /help untuk panduan lengkap.`
      );
      return NextResponse.json({ ok: true });
    }

    // D. Handle /status
    if (text.startsWith('/status')) {
      const user = await prisma.users.findUnique({ where: { telegram_chat_id: chatId } });
      if (user) {
        await sendMessage(chatId,
          `✅ <b>Akun Terhubung</b>\n\n` +
          `👤 Nama: ${user.name || '-'}\n` +
          `📧 Email: ${user.email || '-'}\n\n` +
          `Bot siap menerima transaksi kamu!`
        );
      } else {
        await sendMessage(chatId,
          `❌ <b>Akun Belum Terhubung</b>\n\n` +
          `Gunakan /connect [TOKEN] untuk menghubungkan akun MyKanz kamu.`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // E. Handle /disconnect
    if (text.startsWith('/disconnect')) {
      const user = await prisma.users.findUnique({ where: { telegram_chat_id: chatId } });
      if (!user) {
        await sendMessage(chatId, '⛔ Akun kamu memang belum terhubung.');
        return NextResponse.json({ ok: true });
      }
      await prisma.users.update({
        where: { id: user.id },
        data: { telegram_chat_id: null }
      });
      await sendMessage(chatId, '✅ Akun berhasil diputuskan dari Telegram. Sampai jumpa!');
      return NextResponse.json({ ok: true });
    }

    // F. Cek Rate Limit (sebelum proses AI)
    if (isRateLimited(chatId)) {
      await sendMessage(chatId, '⏳ Terlalu banyak permintaan. Mohon tunggu sebentar dan coba lagi.');
      return NextResponse.json({ ok: true });
    }

    // G. Validasi user terhubung
    const user = await prisma.users.findUnique({ where: { telegram_chat_id: chatId } });
    if (!user) {
      await sendMessage(chatId, '⛔ Akun belum terhubung. Ketik /start untuk panduan atau /connect [TOKEN] untuk menghubungkan akun.');
      return NextResponse.json({ ok: true });
    }

    // Cek apakah sedang menunggu input teks untuk nama kategori baru
    const sessionForText = await prisma.telegram_sessions.findFirst({
      where: { telegram_chat_id: chatId, state: 'AWAITING_NEW_CATEGORY_NAME' },
      orderBy: { created_at: 'desc' }
    });

    if (sessionForText && text && !text.startsWith('/')) {
      const parsedData = JSON.parse(sessionForText.data || '{}');

      // Buat kategori baru di DB
      const newCategory = await prisma.categories.create({
        data: {
          user_id: sessionForText.user_id,
          name: text.trim(),
          type: parsedData.type as fiat_tx_type
        }
      });

      parsedData.category_id = newCategory.id;
      parsedData.category_name = newCategory.name;

      await prisma.telegram_sessions.update({
        where: { id: sessionForText.id },
        data: { state: 'AWAITING_CONFIRMATION', data: JSON.stringify(parsedData) }
      });

      const typeEmoji = parsedData.type === 'PEMASUKAN' ? '📈' : '📉';
      const summaryText =
        `📝 <b>Konfirmasi Transaksi</b>\n\n` +
        `${typeEmoji} Tipe: <b>${parsedData.type}</b>\n` +
        `💰 Jumlah: <b>Rp ${parsedData.amount.toLocaleString('id-ID')}</b>\n` +
        `🗂 Kategori: <b>${newCategory.name}</b>\n` +
        `💳 Dompet: <b>${parsedData.wallet_name}</b>\n` +
        `📅 Tanggal: ${parsedData.date || 'Hari ini'}\n` +
        `📝 Detail: ${parsedData.items_summary || parsedData.store_name || '-'}\n\n` +
        `Apakah data ini sudah benar?`;

      await sendMessage(chatId, summaryText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Ya, Simpan', callback_data: 'action:save' }],
            [{ text: '❌ Batalkan', callback_data: 'action:cancel' }]
          ]
        }
      });
      return NextResponse.json({ ok: true });
    }

    // H. Handle Foto atau Teks Bebas → Pipeline AI
    if (message.photo || (text && !text.startsWith('/'))) {
      await sendMessage(chatId, '⏳ Memproses dengan AI, sebentar...');

      let imageBase64: string | null = null;
      const textContent: string | null = text || null;

      if (message.photo) {
        const fileId = message.photo[message.photo.length - 1].file_id;
        try {
          imageBase64 = await getFile(fileId);
        } catch {
          await sendMessage(chatId, '❌ Gagal mengunduh gambar dari Telegram. Coba lagi ya.');
          return NextResponse.json({ ok: true });
        }
      }

      const parsed = await parseTransactionWithAI(textContent, imageBase64);

      if (!parsed || !parsed.amount || parsed.amount === 0) {
        await sendMessage(chatId,
          `🤷 AI tidak dapat mengenali transaksi dari pesan ini.\n\n` +
          `Coba format yang lebih jelas, contoh:\n` +
          `<code>beli nasi goreng 25000</code>\n` +
          `<code>terima transfer 500000</code>\n` +
          `Atau kirim foto struk yang lebih terang.`
        );
        return NextResponse.json({ ok: true });
      }

      // Bersihkan sesi lama (jika ada) sebelum buat yang baru
      await prisma.telegram_sessions.deleteMany({ where: { telegram_chat_id: chatId } });

      // Simpan sesi baru
      await prisma.telegram_sessions.create({
        data: {
          user_id: user.id,
          telegram_chat_id: chatId,
          state: 'AWAITING_WALLET',
          data: JSON.stringify(parsed)
        }
      });

      // Tanyakan wallet
      const wallets = await prisma.wallets.findMany({
        where: { user_id: user.id, deleted_at: null },
        orderBy: { created_at: 'asc' }
      });

      if (wallets.length === 0) {
        await sendMessage(chatId, '❌ Kamu belum memiliki dompet di MyKanz. Buat dompet dulu di web ya.');
        return NextResponse.json({ ok: true });
      }

      const typeEmoji = parsed.type === 'PEMASUKAN' ? '📈' : '📉';
      const keyboard = {
        inline_keyboard: [
          ...wallets.map(w => [{ text: `💳 ${w.name} (${w.currency})`, callback_data: `wallet:${w.id}` }]),
          [{ text: '❌ Batal', callback_data: 'action:cancel' }]
        ]
      };

      await sendMessage(chatId,
        `${typeEmoji} <b>Terdeteksi ${parsed.type}</b>\n` +
        `💰 Jumlah: <b>Rp ${parsed.amount.toLocaleString('id-ID')}</b>\n` +
        `🗂 Kategori: ${parsed.category_guess}\n` +
        `📝 Detail: ${parsed.items_summary || parsed.store_name || '-'}\n` +
        `📅 Tanggal: ${parsed.date || 'Hari ini'}\n\n` +
        `Pilih dompet yang digunakan:`,
        { reply_markup: keyboard }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    // Selalu return 200 agar Telegram tidak retry terus
    return NextResponse.json({ ok: true });
  }
}

// ==========================================
// CALLBACK QUERY HANDLER
// ==========================================
async function processCallbackQuery(chatId: string, messageId: number, queryId: string, actionData: string) {
  const session = await prisma.telegram_sessions.findFirst({
    where: { telegram_chat_id: chatId },
    orderBy: { created_at: 'desc' }
  });

  if (!session) {
    await answerCallbackQuery(queryId, 'Sesi kadaluarsa. Kirim ulang pesan/foto kamu.', true);
    return;
  }

  const parsedData = JSON.parse(session.data || '{}');

  // --- TAHAP 1: Pilih Wallet ---
  if (session.state === 'AWAITING_WALLET' && actionData.startsWith('wallet:')) {
    const walletId = actionData.split(':')[1];
    const wallet = await prisma.wallets.findFirst({ where: { id: walletId, user_id: session.user_id } });

    if (!wallet) {
      await answerCallbackQuery(queryId, 'Wallet tidak ditemukan.', true);
      return;
    }

    parsedData.wallet_id = wallet.id;
    parsedData.wallet_name = wallet.name;

    await prisma.telegram_sessions.update({
      where: { id: session.id },
      data: { state: 'AWAITING_CATEGORY', data: JSON.stringify(parsedData) }
    });

    const categories = await prisma.categories.findMany({
      where: { user_id: session.user_id, type: parsedData.type as fiat_tx_type, deleted_at: null },
      orderBy: { name: 'asc' }
    });

    const keyboard = {
      inline_keyboard: [
        ...categories.map(c => [{ text: `🗂 ${c.name}`, callback_data: `category:${c.id}` }]),
        [{ text: '➕ Tambah Kategori Baru', callback_data: 'action:new_category' }],
        [{ text: '❌ Batal', callback_data: 'action:cancel' }]
      ]
    };

    await editMessageText(chatId, messageId,
      `💳 Dompet terpilih: <b>${wallet.name}</b>\n\n` +
      `Tebakan AI Kategori: ${parsedData.category_guess}\n\n` +
      `Silakan pilih kategori dari daftar di bawah ini atau tambah baru:`,
      { reply_markup: keyboard }
    );

    await answerCallbackQuery(queryId);
    return;
  }

  // --- TAHAP 2: Pilih Kategori ---
  if (session.state === 'AWAITING_CATEGORY') {
    if (actionData.startsWith('category:')) {
      const categoryId = actionData.split(':')[1];
      const category = await prisma.categories.findFirst({ where: { id: categoryId, user_id: session.user_id } });

      if (!category) {
        await answerCallbackQuery(queryId, 'Kategori tidak ditemukan.', true);
        return;
      }

      parsedData.category_id = category.id;
      parsedData.category_name = category.name;

      await prisma.telegram_sessions.update({
        where: { id: session.id },
        data: { state: 'AWAITING_CONFIRMATION', data: JSON.stringify(parsedData) }
      });

      const typeEmoji = parsedData.type === 'PEMASUKAN' ? '📈' : '📉';
      const summaryText =
        `📝 <b>Konfirmasi Transaksi</b>\n\n` +
        `${typeEmoji} Tipe: <b>${parsedData.type}</b>\n` +
        `💰 Jumlah: <b>Rp ${parsedData.amount.toLocaleString('id-ID')}</b>\n` +
        `🗂 Kategori: <b>${category.name}</b>\n` +
        `💳 Dompet: <b>${parsedData.wallet_name}</b>\n` +
        `📅 Tanggal: ${parsedData.date || 'Hari ini'}\n` +
        `📝 Detail: ${parsedData.items_summary || parsedData.store_name || '-'}\n\n` +
        `Apakah data ini sudah benar?`;

      await editMessageText(chatId, messageId, summaryText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Ya, Simpan', callback_data: 'action:save' }],
            [{ text: '❌ Batalkan', callback_data: 'action:cancel' }]
          ]
        }
      });
      await answerCallbackQuery(queryId);
      return;
    } else if (actionData === 'action:new_category') {
      await prisma.telegram_sessions.update({
        where: { id: session.id },
        data: { state: 'AWAITING_NEW_CATEGORY_NAME' }
      });
      await editMessageText(chatId, messageId, 'Ketikkan nama kategori baru yang ingin ditambahkan:');
      await answerCallbackQuery(queryId);
      return;
    } else if (actionData === 'action:cancel') {
      await prisma.telegram_sessions.delete({ where: { id: session.id } });
      await editMessageText(chatId, messageId, '❌ Transaksi dibatalkan.');
      await answerCallbackQuery(queryId);
      return;
    }
  }

  // --- TAHAP 3: Konfirmasi Simpan ---
  if (session.state === 'AWAITING_CONFIRMATION') {
    if (actionData === 'action:save') {
      await prisma.fiat_transactions.create({
        data: {
          user_id: session.user_id,
          wallet_id: parsedData.wallet_id,
          category_id: parsedData.category_id,
          transaction_type: parsedData.type as fiat_tx_type,
          amount: parsedData.amount,
          description: parsedData.items_summary || parsedData.store_name || 'Dicatat via Telegram Bot',
          transaction_date: parsedData.date ? new Date(parsedData.date) : new Date()
        }
      });

      await prisma.telegram_sessions.delete({ where: { id: session.id } });
      await editMessageText(chatId, messageId,
        `✅ <b>Tersimpan!</b>\n\n` +
        `Rp ${parsedData.amount.toLocaleString('id-ID')} (${parsedData.type}) telah dicatat ke dompet <b>${parsedData.wallet_name}</b>.\n\n` +
        `Cek di dashboard MyKanz kamu.`
      );
      await answerCallbackQuery(queryId, 'Transaksi tersimpan! ✅');

    } else if (actionData === 'action:cancel') {
      await prisma.telegram_sessions.delete({ where: { id: session.id } });
      await editMessageText(chatId, messageId, '❌ Transaksi dibatalkan.\n\nKirim foto atau teks baru untuk mencatat transaksi lain.');
      await answerCallbackQuery(queryId);
    }
    return;
  }

  // --- Batal dari tahap wallet ---
  if (session.state === 'AWAITING_WALLET' && actionData === 'action:cancel') {
    await prisma.telegram_sessions.delete({ where: { id: session.id } });
    await editMessageText(chatId, messageId, '❌ Dibatalkan.');
    await answerCallbackQuery(queryId);
  }
}
