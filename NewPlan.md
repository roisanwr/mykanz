📈 Master Plan: Project Wall Street (Realtime Asset Pricing)

🎯 Tujuan Utama

Mengintegrasikan data harga aset global secara real-time ke dalam aplikasi mykanz untuk menghitung Total Kekayaan Bersih (Net Worth) pengguna secara otomatis dan akurat, tanpa merusak struktur database yang sudah ada.

🗺️ FASE 1: Standarisasi "KTP" Aset & Live Search (UX Improvement)

Masalah: Membiarkan user mengetik nama saham/koin secara manual berisiko fatal (salah ketik ticker = API gagal menarik harga).
Solusi: Implementasi fitur Live Search Autocomplete ("Pilih, Jangan Ketik!").

Sumber Data Makelar (Third-Party APIs):

Kripto (KRIPTO) 🪙

Supplier: CoinGecko API (Gratis, tanpa API Key).

Endpoint Search: https://api.coingecko.com/api/v3/search?query={keyword}

Target Data: Mengambil nama koin dan ID/Ticker uniknya (cth: bitcoin).

Saham (SAHAM) 📈

Supplier: Yahoo Finance API (Mencakup IHSG dan Wall Street).

Endpoint Search: https://query2.finance.yahoo.com/v1/finance/search?q={keyword}

Target Data: Mengambil nama PT dan Ticker Symbol-nya (cth: BBCA.JK).

Pengecualian (Manual Input) 🏠

Emas (LOGAM_MULIA): Hardcode ticker menjadi XAU.

Properti & Bisnis: Fitur pencarian disembunyikan, user menginput harga dan nama secara manual (menyimpan ke tabel asset_valuations).

Rencana Arsitektur Backend (Fase 1):

Membuat endpoint internal: GET /api/assets/search?q={keyword}&type={asset_type}
API internal ini akan bertugas sebagai "Makelar" yang meneruskan pencarian user ke CoinGecko atau Yahoo Finance agar Frontend tidak berinteraksi langsung dengan API luar.

🗺️ FASE 2: Mesin Konversi Mata Uang (The Forex Engine)

Masalah: Portofolio pengguna terdiri dari berbagai mata uang (USD untuk Kripto/Saham US, IDR untuk Saham Lokal/Reksadana).
Solusi: Normalisasi harga real-time ke IDR (atau mata uang dasar pengguna) sebelum dikalkulasi ke dalam Total Kekayaan.

Strategi Eksekusi:

Jurus 1 (Jalur Cepat - API Pintar): Memanfaatkan fitur konversi langsung dari API jika tersedia. Contoh: CoinGecko memiliki parameter vs_currency=idr yang otomatis mengembalikan harga Bitcoin langsung dalam bentuk Rupiah.

Jurus 2 (Jalur Arsitek - Kalkulasi Manual): Untuk API seperti Yahoo Finance yang mengembalikan nilai native (misal Saham Apple dalam USD), Backend kita akan menarik kurs USD/IDR harian terkini (cth: IDR=X), lalu mengalikannya secara internal: Harga Native * Kurs IDR = Harga Final.

🛡️ Strategi Caching (Wajib untuk Mencegah Rate-Limit!):

Cache Harga Kurs (USD/IDR): Disimpan di memori server selama 3.600 detik (1 Jam). Karena pergerakan Forex relatif lambat, ini mencegah server kita diblokir oleh Yahoo Finance akibat terlalu sering request.

Cache Harga Aset (Kripto/Saham): Disimpan selama 10 hingga 15 detik saja. Cukup cepat untuk mendapatkan harga aktual (Volatile Market), namun memberikan jeda agar terhindar dari pemblokiran Spam/DDoS.

🗺️ FASE 3: Pabrik API "Harga Live" (The Price Router)

Membuat satu jalur terpusat di Backend untuk mengambil harga semua aset yang ada di portofolio user.

Rencana Arsitektur Backend (Fase 3):

Membuat endpoint internal: GET /api/prices/live?tickers={daftar_ticker}
Endpoint ini bertindak layaknya seorang "Mandor Pabrik":

Penerimaan Tugas: Frontend meminta harga untuk berbagai jenis aset sekaligus (cth: BBCA.JK, bitcoin, AAPL).

Pendelegasian: Mandor memecah request. Ticker saham dilempar ke Yahoo Finance, ticker kripto dilempar ke CoinGecko.

Penyelarasan (Integrasi Fase 2): Mandor mengecek mata uang hasil tarikan data. Jika ada yang masih dalam USD, Mandor memanggil Mesin Konversi (menggunakan Cache Kurs 1 Jam) untuk diubah ke IDR.

Pengepakan: Mandor menyatukan semua harga menjadi 1 JSON rapi berseragam Rupiah dan mengirimkannya ke Frontend.
(Keuntungan Arsitektur: Frontend terisolasi (Decoupled). UI tetap bersih dan ringan karena semua proses rumit ditangani oleh Backend).

🗺️ FASE 4: Sihir Tampilan UI (The Live Dashboard)

Membuat tampilan dashboard dan portfolios hidup seperti terminal trading profesional.

Strategi Eksekusi:

Menggunakan library SWR (Stale-While-Revalidate) dari Next.js / Vercel.

Background Polling: Frontend diam-diam memanggil /api/prices/live setiap 10-15 detik otomatis tanpa perlu user menekan tombol refresh browser.

Kalkulasi Live: Mengalikan harga live dengan kolom total_units milik user dari tabel user_portfolios.

UI/UX Animations: Menambahkan animasi CSS transisi halus. Teks angka berkedip warna 🟢 Hijau jika harga naik dari detik sebelumnya, dan 🔴 Merah jika harga turun.

Dokumen ini adalah cetak biru (blueprint) hidup dan akan terus diperbarui seiring jalannya eksekusi proyek.