Master Plan: Integrasi Telegram Bot AI MyKanz (Serverless Next.js)

Dokumen ini adalah cetak biru (blueprint) untuk membangun asisten keuangan berbasis Telegram yang dapat membaca struk (menggunakan AI Vision) dan mencatat transaksi langsung ke database MyKanz, menggunakan arsitektur Serverless API di Next.js.

FASE 1: Persiapan Fondasi Database (Prisma)

Fase ini bertujuan untuk menyiapkan database agar bisa mengenali identitas Telegram pengguna (Account Linking).

[ ] Langkah 1.1: Modifikasi Skema Prisma

Buka file prisma/schema.prisma.

Tambahkan dua kolom baru pada model User:

model User {
  // ... kolom yang sudah ada ...
  telegramChatId String? @unique
  telegramToken  String? @unique // Token sinkronisasi sementara
}


[ ] Langkah 1.2: Jalankan Migrasi Database

Jalankan npx prisma db push atau npx prisma migrate dev --name add_telegram_fields.

Jalankan npx prisma generate untuk memperbarui type checking di TypeScript.

FASE 2: Registrasi Bot & Persiapan Environment

Fase ini bertujuan mengamankan semua akses kunci (API Keys) yang dibutuhkan oleh sistem.

[ ] Langkah 2.1: Buat Bot di Telegram

Buka Telegram, cari @BotFather.

Ketik /newbot, ikuti langkahnya untuk membuat nama bot (misal: @MyKanzBot).

Simpan Bot Token yang diberikan oleh BotFather.

[ ] Langkah 2.2: Dapatkan API Key AI Vision

Daftar dan dapatkan API Key dari Google Gemini (Sangat disarankan karena gratis dan sangat pintar membaca gambar) atau OpenAI (GPT-4o).

[ ] Langkah 2.3: Konfigurasi .env

Tambahkan variabel ini di file .env lokal dan di Dashboard Vercel:

TELEGRAM_BOT_TOKEN="token_dari_botfather"
AI_VISION_API_KEY="token_dari_gemini_atau_openai"
MYKANZ_URL="[https://domain-kamu.com](https://domain-kamu.com)" # Ganti localhost:3000 jika testing lokal


FASE 3: Alur Sinkronisasi Akun (Frontend & Backend)

Fase ini memungkinkan pengguna menghubungkan akun web MyKanz mereka dengan Telegram dengan sangat aman.

[ ] Langkah 3.1: Buat API Endpoint Generator Token

Buat file app/api/telegram/generate-token/route.ts.

Logika: Pastikan user sudah login via NextAuth. Generate string acak (contoh: MYKANZ-A7F9K), lalu prisma.user.update kolom telegramToken untuk user tersebut. Kembalikan token ini sebagai response.

[ ] Langkah 3.2: Buat UI di Halaman Settings

Buka komponen components/SettingsPage.tsx.

Tambahkan bagian "Hubungkan Telegram".

Buat tombol "Generate Koneksi". Saat diklik, panggil API di langkah 3.1.

Tampilkan instruksi di UI: "Buka Telegram @MyKanzBot dan kirim pesan: /connect MYKANZ-A7F9K"

FASE 4: Membangun Core Webhook Handler

Ini adalah "Jantung" dari aplikasi bot kamu. Vercel akan menerima pesan Telegram secara real-time di sini.

[ ] Langkah 4.1: Buat Rute Webhook

Buat file app/api/telegram/webhook/route.ts.

Pastikan rute ini menangani request berjenis POST.

[ ] Langkah 4.2: Tulis Logika /connect (Account Linking)

Di dalam rute webhook, baca JSON yang dikirim Telegram (req.body).

Logika: * Jika pesan teks (text message) dimulai dengan /connect:

Ambil token dari pesan (misal: memotong teks setelah kata /connect).

Cari di database: prisma.user.findFirst({ where: { telegramToken: token } }).

Jika ketemu: Update telegramChatId dengan ID Telegram pengirim (message.chat.id), lalu ubah telegramToken menjadi null.

Kirim pesan HTTP POST ke API Telegram (sendMessage) berisi: "✅ Sukses! Akun MyKanz Budi berhasil terhubung."

FASE 5: Ekstraksi AI Vision & Penyimpanan (Otomatisasi Inti)

Ini adalah alur jika akun sudah terhubung dan pengguna mulai mengirim gambar struk.

[ ] Langkah 5.1: Validasi Pengguna Terdaftar

Di rute webhook yang sama, jika pesan yang masuk berupa Foto/Gambar:

Cek ID Telegram pengirim. Cari di DB: prisma.user.findUnique({ where: { telegramChatId: senderId } }).

Jika user tidak ditemukan, kirim pesan: "⛔ Akun belum terhubung. Silakan connect via Web MyKanz." Batalkan proses.

[ ] Langkah 5.2: Unduh Gambar dari Telegram

Jika ada foto, Telegram tidak mengirim langsung file-nya, melainkan file_id.

Gunakan file_id untuk memanggil API Telegram getFile, dapatkan URL unduhnya, lalu download gambar tersebut ke memori (Buffer).

[ ] Langkah 5.3: Kirim Gambar ke AI Vision

Kirim gambar (buffer base64) ke API AI (misal Gemini) bersama System Prompt yang ketat.

Draft Prompt AI:

"Kamu adalah asisten pengurai struk. Baca gambar ini. Keluarkan MURNI JSON tanpa markdown, format: { "amount": angka_total, "date": "YYYY-MM-DD", "category_name": "makanan/transportasi/tagihan" }"

[ ] Langkah 5.4: Parsing & Insert ke Database

Tangkap JSON dari AI. Lakukan JSON.parse().

Cari ID Category berdasarkan category_name yang ditebak AI menggunakan prisma.category.findFirst. (Bisa ditambahkan fallback ke kategori 'Lain-lain' jika tebakan AI tidak cocok dengan list kategori DB).

Lakukan proses Insert: prisma.transaction.create({...}) menggunakan ID pengguna yang sudah kita validasi di Langkah 5.1.

[ ] Langkah 5.5: Konfirmasi Kesuksesan

Kirim balasan ke Telegram pengguna: "💸 Berhasil dicatat! Pengeluaran Rp150.000 untuk kategori Makanan."

FASE 6: Deployment & Aktivasi Webhook

Fase terakhir untuk membawa sistem hidup (Go Live).

[ ] Langkah 6.1: Push ke GitHub & Vercel

Commit kode terbaru, biarkan Vercel me-rebuild proyek MyKanz-mu.

[ ] Langkah 6.2: Daftarkan Webhook URL ke Telegram

Buka Browser atau Postman.

Jalankan request GET ke URL ini untuk memberi tahu Telegram ke mana mereka harus mengirim data:

https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://domain-kamu.com/api/telegram/webhook

[ ] Langkah 6.3: Testing

Buka Web, generate token.

Buka Telegram, kirim /connect <token>.

Kirim foto struk Indomaret.

Cek Dashboard Web MyKanz, pastikan transaksi terisi otomatis!

Tips Tambahan Selama Development

ngrok untuk Testing Lokal: Karena webhook memerlukan URL publik (https), gunakan tools seperti ngrok saat mengetes di komputer lokal (localhost:3000) sebelum di-deploy ke Vercel.

Keamanan Ekstra: Verifikasi secret_token pada header webhook (fitur bawaan API Telegram) untuk memastikan bahwa yang memanggil Vercel-mu benar-benar server Telegram, bukan hacker yang iseng.


Bot sudah dibuat: t.me/mykanz_bot
