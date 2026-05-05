import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateWebhookSecret, sendMessage, getFile, editMessageText, answerCallbackQuery } from '@/lib/telegram';
import { parseTransactionWithAI, ParsedTransaction } from '@/lib/github_models';
import { fiat_tx_type } from '@prisma/client';

export const maxDuration = 60;

export async function POST(req: Request) {
  // 1. Validasi Keamanan
  if (!validateWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    
    // --- HANDLE CALLBACK QUERY (Tombol Inline) ---
    if (body.callback_query) {
      const queryId = body.callback_query.id;
      const chatId = body.callback_query.message.chat.id.toString();
      const messageId = body.callback_query.message.message_id;
      const actionData = body.callback_query.data; // e.g. "wallet:<id>" or "action:save"
      
      await processCallbackQuery(chatId, messageId, queryId, actionData);
      return NextResponse.json({ ok: true });
    }

    // --- HANDLE NORMAL MESSAGES ---
    if (!body.message) return NextResponse.json({ ok: true });
    
    const message = body.message;
    const chatId = message.chat.id.toString();
    const text = message.text || '';

    // A. Handle /start atau perintah dasar
    if (text.startsWith('/start')) {
      await sendMessage(chatId, "👋 Halo! Saya MyKanz Bot.\n\nUntuk memulai, hubungkan akun kamu dengan mengirim perintah:\n<code>/connect [TOKEN]</code>\n\nDapatkan token dari Web MyKanz > Pengaturan > Telegram.");
      return NextResponse.json({ ok: true });
    }

    // B. Handle /connect
    if (text.startsWith('/connect')) {
      const token = text.split(' ')[1]?.trim();
      if (!token) {
        await sendMessage(chatId, "❌ Token tidak valid. Format: /connect [TOKEN]");
        return NextResponse.json({ ok: true });
      }

      // Cari user dengan token yang valid (belum expired)
      const user = await prisma.users.findFirst({
        where: {
          telegram_link_token: token,
          telegram_token_expires_at: { gt: new Date() } // Token blm expired
        }
      });

      if (!user) {
        await sendMessage(chatId, "❌ Token tidak ditemukan atau sudah kadaluarsa. Silakan generate ulang di web MyKanz.");
        return NextResponse.json({ ok: true });
      }

      // Link akun
      await prisma.users.update({
        where: { id: user.id },
        data: {
          telegram_chat_id: chatId,
          telegram_link_token: null,
          telegram_token_expires_at: null
        }
      });

      await sendMessage(chatId, `✅ Akun <b>${user.name || 'kamu'}</b> berhasil terhubung!\n\nSekarang kamu bisa mengirim teks pengeluaran atau foto struk belanja langsung ke sini.`);
      return NextResponse.json({ ok: true });
    }

    // C. Validasi User Terhubung
    const user = await prisma.users.findUnique({
      where: { telegram_chat_id: chatId }
    });

    if (!user) {
      await sendMessage(chatId, "⛔ Akun belum terhubung. Silakan dapatkan token dari web MyKanz dan ketik /connect [TOKEN].");
      return NextResponse.json({ ok: true });
    }

    // D. Handle Foto Struk atau Input Teks untuk Transaksi
    if (message.photo || (text && !text.startsWith('/'))) {
      await sendMessage(chatId, "⏳ Memproses data dengan AI...");

      let imageBase64 = null;
      let textContent = text || null;

      // Ambil resolusi tertinggi (elemen terakhir di array photo)
      if (message.photo) {
        const fileId = message.photo[message.photo.length - 1].file_id;
        try {
          imageBase64 = await getFile(fileId);
        } catch (error) {
          await sendMessage(chatId, "❌ Gagal mengunduh gambar dari Telegram.");
          return NextResponse.json({ ok: true });
        }
      }

      // 1. Ekstrak via AI
      const parsed = await parseTransactionWithAI(textContent, imageBase64);
      
      if (!parsed || !parsed.amount) {
        await sendMessage(chatId, "🤷‍♂️ Maaf, AI tidak dapat mengenali transaksi dari pesan ini. Silakan coba lagi dengan format yang lebih jelas.");
        return NextResponse.json({ ok: true });
      }

      // 2. Simpan Sesi (State)
      await prisma.telegram_sessions.create({
        data: {
          user_id: user.id,
          telegram_chat_id: chatId,
          state: 'AWAITING_WALLET',
          data: JSON.stringify(parsed)
        }
      });

      // 3. Tanyakan Wallet
      const wallets = await prisma.wallets.findMany({
        where: { user_id: user.id, deleted_at: null }
      });

      if (wallets.length === 0) {
        await sendMessage(chatId, "❌ Kamu belum memiliki dompet (wallet) di MyKanz. Buat dompet dulu di web.");
        return NextResponse.json({ ok: true });
      }

      const keyboard = {
        inline_keyboard: wallets.map(w => [{ text: `💳 ${w.name} (${w.currency})`, callback_data: `wallet:${w.id}` }])
      };
      // Tambahkan tombol Batal di bawah list wallet
      keyboard.inline_keyboard.push([{ text: "❌ Batal", callback_data: "action:cancel" }]);

      await sendMessage(chatId, `💰 <b>Terdeteksi ${parsed.type}</b>\nJumlah: Rp ${parsed.amount.toLocaleString('id-ID')}\nKategori: ${parsed.category_guess}\n\nSilakan pilih dompet sumber:`, { reply_markup: keyboard });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ==========================================
// CALLBACK QUERY HANDLER (Untuk tombol inline)
// ==========================================
async function processCallbackQuery(chatId: string, messageId: number, queryId: string, actionData: string) {
  // Cari sesi user
  const session = await prisma.telegram_sessions.findFirst({
    where: { telegram_chat_id: chatId },
    orderBy: { created_at: 'desc' }
  });

  if (!session) {
    await answerCallbackQuery(queryId, "Sesi telah kadaluarsa.", true);
    return;
  }

  const parsedData = JSON.parse(session.data || "{}");

  // 1. User Memilih Wallet
  if (session.state === 'AWAITING_WALLET' && actionData.startsWith('wallet:')) {
    const walletId = actionData.split(':')[1];
    
    // Validasi wallet
    const wallet = await prisma.wallets.findFirst({ where: { id: walletId, user_id: session.user_id } });
    if (!wallet) {
      await answerCallbackQuery(queryId, "Wallet tidak ditemukan.", true);
      return;
    }

    parsedData.wallet_id = wallet.id;
    parsedData.wallet_name = wallet.name;

    // Update state
    await prisma.telegram_sessions.update({
      where: { id: session.id },
      data: {
        state: 'AWAITING_CONFIRMATION',
        data: JSON.stringify(parsedData)
      }
    });

    // Tampilkan Summary Konfirmasi
    const summaryText = `📝 <b>Konfirmasi Transaksi</b>\n\n` +
      `<b>Tipe:</b> ${parsedData.type}\n` +
      `<b>Jumlah:</b> Rp ${parsedData.amount.toLocaleString('id-ID')}\n` +
      `<b>Kategori AI:</b> ${parsedData.category_guess}\n` +
      `<b>Dompet:</b> ${wallet.name}\n` +
      `<b>Tanggal:</b> ${parsedData.date || 'Hari ini'}\n` +
      `<b>Detail:</b> ${parsedData.items_summary || parsedData.store_name || '-'}\n\n` +
      `Apakah data ini sudah benar?`;

    const keyboard = {
      inline_keyboard: [
        [{ text: "✅ Ya, Simpan", callback_data: "action:save" }],
        [{ text: "❌ Batalkan", callback_data: "action:cancel" }]
      ]
    };

    await editMessageText(chatId, messageId, summaryText, { reply_markup: keyboard });
    await answerCallbackQuery(queryId);
    return;
  }

  // 2. User Konfirmasi Simpan/Batal
  if (session.state === 'AWAITING_CONFIRMATION') {
    if (actionData === 'action:save') {
      
      // Cari atau buat kategori
      let category = await prisma.categories.findFirst({
        where: { user_id: session.user_id, name: { equals: parsedData.category_guess, mode: 'insensitive' }, type: parsedData.type as fiat_tx_type }
      });

      if (!category) {
        // Fallback ke "Lainnya" jika tidak ketemu
        category = await prisma.categories.findFirst({
          where: { user_id: session.user_id, name: 'Lainnya', type: parsedData.type as fiat_tx_type }
        });
      }

      // Insert transaksi
      await prisma.fiat_transactions.create({
        data: {
          user_id: session.user_id,
          wallet_id: parsedData.wallet_id,
          category_id: category?.id,
          transaction_type: parsedData.type as fiat_tx_type,
          amount: parsedData.amount,
          description: parsedData.items_summary || parsedData.store_name || 'Dari Telegram Bot',
          transaction_date: parsedData.date ? new Date(parsedData.date) : new Date()
        }
      });

      // Sukses
      await editMessageText(chatId, messageId, `✅ <b>Transaksi Berhasil Disimpan!</b>\nRp ${parsedData.amount.toLocaleString('id-ID')} ke dompet ${parsedData.wallet_name}.`);
      await prisma.telegram_sessions.delete({ where: { id: session.id } }); // Bersihkan state
      await answerCallbackQuery(queryId, "Tersimpan!");

    } else if (actionData === 'action:cancel') {
      await editMessageText(chatId, messageId, "❌ Transaksi dibatalkan.");
      await prisma.telegram_sessions.delete({ where: { id: session.id } });
      await answerCallbackQuery(queryId);
    }
    return;
  }

  // Jika membatalkan dari tahap milih wallet
  if (session.state === 'AWAITING_WALLET' && actionData === 'action:cancel') {
    await editMessageText(chatId, messageId, "❌ Dibatalkan.");
    await prisma.telegram_sessions.delete({ where: { id: session.id } });
    await answerCallbackQuery(queryId);
  }
}
