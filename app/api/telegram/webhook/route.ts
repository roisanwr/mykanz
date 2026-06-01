import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateWebhookSecret, sendMessage, getFile, editMessageText, answerCallbackQuery } from '@/lib/telegram';
import { parseTransactionWithAI } from '@/lib/github_models';
import { sortCategoriesByHint } from '@/lib/category-matcher';
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
        `✨ <b>Kategori baru berhasil dibuat!</b>\n\n` +
        `Oke, jadi ini ringkasan transaksinya:\n` +
        `• <b>${parsedData.type}</b> nominal <b>Rp ${parsedData.amount.toLocaleString('id-ID')}</b>\n` +
        `• Kategori: <b>${newCategory.name}</b>\n` +
        `• Dompet: <b>${parsedData.wallet_name}</b>\n` +
        `• Tanggal: ${parsedData.date || 'Hari ini'}\n` +
        `• Keterangan: ${parsedData.items_summary || parsedData.store_name || '-'}\n\n` +
        `Sudah sesuai semua?`;

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
      const existingSession = await prisma.telegram_sessions.findFirst({
        where: { telegram_chat_id: chatId },
        orderBy: { created_at: 'desc' }
      });

      const isCorrection = existingSession && text && !message.photo;
      await sendMessage(chatId, isCorrection ? '🔄 Mengupdate data...' : '⏳ Memproses dengan AI, sebentar...');

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

      let existingData = null;
      if (isCorrection) {
        try {
          existingData = JSON.parse(existingSession.data || '{}');
        } catch (e) {
          console.error("Failed to parse existing session data", e);
        }
      }

      let parsed = null;
      let isManualFallback = false;

      // --- MANUAL FALLBACK PARSER ---
      // Cek apakah pesan menggunakan format manual: "- 25000 beli nasi" atau "+ 500000 gaji"
      if (textContent) {
        const manualMatch = textContent.trim().match(/^([+-])\s*([\d.,]+)\s+(.+)$/i);
        if (manualMatch) {
          const sign = manualMatch[1];
          // bersihkan titik/koma kalau user iseng ketik 25.000
          const amount = parseInt(manualMatch[2].replace(/[.,]/g, ''), 10); 
          const description = manualMatch[3].trim();
          
          parsed = {
            amount,
            date: new Date().toISOString().split('T')[0],
            store_name: description,
            category_guess: 'lainnya', // fallback
            items_summary: description,
            type: sign === '+' ? 'PEMASUKAN' : 'PENGELUARAN',
            feedback: 'Mencatat menggunakan mode manual (tanpa AI).'
          } as any; // cast as ParsedTransaction
          
          isManualFallback = true;
        }
      }

      // Jika bukan format manual, lempar ke AI
      if (!isManualFallback) {
        parsed = await parseTransactionWithAI(textContent, imageBase64, existingData);
      }

      if (!parsed) {
        await sendMessage(chatId,
          `🤖 <b>Oops, AI sedang sibuk atau offline!</b>\n\n` +
          `Tapi tenang, kamu tetap bisa mencatat transaksi dengan <b>Format Manual</b>:\n\n` +
          `🔴 <b>PENGELUARAN (Tanda Minus)</b>\n` +
          `<code>- 25000 beli nasi padang</code>\n\n` +
          `🟢 <b>PEMASUKAN (Tanda Plus)</b>\n` +
          `<code>+ 500000 gaji bulan ini</code>\n\n` +
          `Silakan balas dengan format di atas, ya!`
        );
        return NextResponse.json({ ok: true });
      }

      if (!parsed.amount || parsed.amount === 0) {
        if (parsed.feedback) {
          // Bersihkan sesi lama
          await prisma.telegram_sessions.deleteMany({ where: { telegram_chat_id: chatId } });

          // Simpan sesi agar percakapan bisa berlanjut (misal: user menjawab pertanyaan AI)
          await prisma.telegram_sessions.create({
            data: {
              user_id: user.id,
              telegram_chat_id: chatId,
              state: 'AWAITING_AMOUNT',
              data: JSON.stringify(parsed)
            }
          });

          await sendMessage(chatId, `💬 <i>${parsed.feedback}</i>`);
          return NextResponse.json({ ok: true });
        } else {
            await sendMessage(chatId,
              `🤖 <b>Oops, AI sedang sibuk atau offline!</b>\n\n` +
              `Tapi tenang, kamu tetap bisa mencatat transaksi dengan <b>Format Manual</b>:\n\n` +
              `🔴 <b>PENGELUARAN (Tanda Minus)</b>\n` +
              `<code>- 25000 beli nasi padang</code>\n\n` +
              `🟢 <b>PEMASUKAN (Tanda Plus)</b>\n` +
              `<code>+ 500000 gaji bulan ini</code>\n\n` +
              `Silakan balas dengan format di atas, ya!`
            );
            return NextResponse.json({ ok: true });
        }
      }

      // Jika koreksi, kita tetap di state yang sama atau lanjut jika data lengkap
      let newState = 'AWAITING_WALLET';
      if (isCorrection && existingSession && existingData) {
        if (existingSession.state === 'AWAITING_AMOUNT') {
          newState = 'AWAITING_WALLET';
        } else {
          newState = existingSession.state;
        }
        // Merge data penting yang mungkin hilang saat AI parsing ulang (seperti ID wallet/kategori yang sudah dipilih)
        if (existingData.wallet_id) parsed.wallet_id = existingData.wallet_id;
        if (existingData.wallet_name) parsed.wallet_name = existingData.wallet_name;
        if (existingData.category_id) parsed.category_id = existingData.category_id;
        if (existingData.category_name) parsed.category_name = existingData.category_name;
      }

      // Bersihkan sesi lama (jika ada) sebelum buat yang baru
      await prisma.telegram_sessions.deleteMany({ where: { telegram_chat_id: chatId } });

      // Simpan sesi baru
      await prisma.telegram_sessions.create({
        data: {
          user_id: user.id,
          telegram_chat_id: chatId,
          state: newState as any,
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
      let keyboard = {
        inline_keyboard: [
          ...wallets.map(w => [{ text: `💳 ${w.name} (${w.currency})`, callback_data: `wallet:${w.id}` }]),
          [{ text: '❌ Batal', callback_data: 'action:cancel' }]
        ]
      };

      if (newState === 'AWAITING_CATEGORY') {
        const categories = await prisma.categories.findMany({
          where: { user_id: user.id, type: parsed.type as fiat_tx_type, deleted_at: null },
          orderBy: { name: 'asc' }
        });
        const sortedCategories = sortCategoriesByHint(categories, parsed.category_guess);
        keyboard = {
          inline_keyboard: [
            ...sortedCategories.map(({ category: c, isMatch }) => [{
              text: isMatch ? `⭐ ${c.name}` : `🗂 ${c.name}`,
              callback_data: `category:${c.id}`
            }]),
            [{ text: '➕ Tambah Kategori Baru', callback_data: 'action:new_category' }],
            [{ text: '❌ Batal', callback_data: 'action:cancel' }]
          ]
        };
      } else if (newState === 'AWAITING_CONFIRMATION') {
        keyboard = {
          inline_keyboard: [
            [{ text: '✅ Ya, Simpan', callback_data: 'action:save' }],
            [{ text: '❌ Batalkan', callback_data: 'action:cancel' }]
          ]
        };
      }

      const feedbackText = parsed.feedback ? `💬 <i>${parsed.feedback}</i>\n\n` : '';
      const messageText =
        feedbackText +
        `Aku mencatat <b>${parsed.type.toLowerCase()}</b> sebesar <b>Rp ${parsed.amount.toLocaleString('id-ID')}</b>.\n` +
        `Kategorinya <b>${parsed.category_name || parsed.category_guess}</b>, dicatat di dompet <b>${parsed.wallet_name || '-'}</b>.\n` +
        `Keterangannya: <i>${parsed.items_summary || parsed.store_name || '-'}</i>\n\n` +
        (newState === 'AWAITING_WALLET' ? `Sekarang, pilih <b>dompet</b> yang mau dipakai ya:` :
         newState === 'AWAITING_CATEGORY' ? `Lalu, pilih <b>kategori</b> yang pas:` :
         `Sudah benar semua datanya?`) +
        `\n\n<i>Ketik aja kalau ada yang mau diganti.</i>`;

      await sendMessage(chatId, messageText, { reply_markup: keyboard });
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

    const sortedCategories = sortCategoriesByHint(categories, parsedData.category_guess);
    const keyboard = {
      inline_keyboard: [
        ...sortedCategories.map(({ category: c, isMatch }) => [{
          text: isMatch ? `⭐ ${c.name}` : `🗂 ${c.name}`,
          callback_data: `category:${c.id}`
        }]),
        [{ text: '➕ Tambah Kategori Baru', callback_data: 'action:new_category' }],
        [{ text: '❌ Batal', callback_data: 'action:cancel' }]
      ]
    };

    await editMessageText(chatId, messageId,
      `💳 Dompet terpilih: <b>${wallet.name}</b>\n\n` +
      `Tebakan AI Kategori: ${parsedData.category_guess} (⭐ = paling cocok)\n\n` +
      `Silakan pilih kategori dari daftar di bawah ini atau tambah baru:\n\n` +
      `<i>Ketik pesan jika ada yang ingin dikoreksi.</i>`,
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
        `🙌 <b>Sip! Kategori sudah dipilih.</b>\n\n` +
        `Ringkasan akhirnya begini:\n` +
        `• <b>${parsedData.type}</b> nominal <b>Rp ${parsedData.amount.toLocaleString('id-ID')}</b>\n` +
        `• Kategori: <b>${category.name}</b>\n` +
        `• Dompet: <b>${parsedData.wallet_name}</b>\n` +
        `• Tanggal: ${parsedData.date || 'Hari ini'}\n` +
        `• Keterangan: <i>${parsedData.items_summary || parsedData.store_name || '-'}</i>\n\n` +
        `Sudah benar semua datanya?\n\n` +
        `<i>Ketik aja kalau ada yang mau diganti.</i>`;

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
          transaction_date: parsedData.date ? new Date(parsedData.date) : new Date(),
          source_channel: 'TELEGRAM',
          needs_review: false, // User sudah konfirmasi manual
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
