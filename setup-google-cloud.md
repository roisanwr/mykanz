# 🚀 Setup Google Cloud — MyKanz Gmail Integration

> **Tujuan:** Menghubungkan Gmail ke MyKanz agar email notifikasi bank (BCA, GoPay, OVO, Mandiri, dll.) otomatis jadi transaksi di dashboard.
>
> ⏱️ Estimasi waktu: **30–45 menit** (pertama kali)
> 📌 Lakukan langkah ini **sekali saja** sebelum deploy ke Vercel.

---

## 📋 Daftar Isi

1. [Buat Google Cloud Project](#1-buat-google-cloud-project)
2. [Enable Gmail API & Pub/Sub API](#2-enable-gmail-api--pubsub-api)
3. [Buat OAuth Consent Screen](#3-buat-oauth-consent-screen)
4. [Buat OAuth 2.0 Client ID](#4-buat-oauth-20-client-id)
5. [Buat Pub/Sub Topic](#5-buat-pubsub-topic)
6. [Grant Permission ke Gmail Service Account](#6-grant-permission-ke-gmail-service-account)
7. [Buat Pub/Sub Subscription (Push)](#7-buat-pubsub-subscription-push)
8. [Set Environment Variables di Vercel](#8-set-environment-variables-di-vercel)
9. [Generate ENCRYPTION_KEY Lokal](#9-generate-encryption_key-lokal)
10. [Test & Deploy](#10-test--deploy)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Buat Google Cloud Project

1. Buka **[console.cloud.google.com](https://console.cloud.google.com)**
2. Login dengan akun Google kamu
3. Di pojok kiri atas, klik **dropdown nama project** → klik **"New Project"**

   ```
   Project name : MyKanz Production
   Organization : (kosongkan / No organization)
   Location     : (biarkan default)
   ```

4. Klik **"Create"** → tunggu beberapa detik
5. Pastikan project `MyKanz Production` sudah aktif di dropdown atas

> ⚠️ **Penting:** Semua langkah selanjutnya harus dilakukan di dalam project ini. Selalu cek nama project di header Cloud Console.

---

## 2. Enable Gmail API & Pub/Sub API

Kamu harus enable **2 API** berikut:

### 2a. Enable Gmail API

1. Klik menu **☰ (hamburger)** → **"APIs & Services"** → **"Library"**
2. Di search bar, ketik: `Gmail API`
3. Klik hasil **"Gmail API"** (by Google)
4. Klik tombol biru **"Enable"**
5. Tunggu sampai halaman redirect ke dashboard Gmail API

### 2b. Enable Cloud Pub/Sub API

1. Kembali ke **"APIs & Services"** → **"Library"**
2. Search: `Cloud Pub/Sub API`
3. Klik **"Cloud Pub/Sub API"**
4. Klik **"Enable"**

**Verifikasi:** Buka **"APIs & Services" → "Enabled APIs & Services"** — pastikan ada `Gmail API` dan `Cloud Pub/Sub API` dalam list.

---

## 3. Buat OAuth Consent Screen

OAuth Consent Screen adalah layar izin yang muncul saat user klik "Hubungkan Gmail".

1. Klik **"APIs & Services"** → **"OAuth consent screen"**
2. Pilih User Type: **External** → klik **"Create"**

### Tab "App information"

| Field | Isi |
|-------|-----|
| App name | `MyKanz` |
| User support email | Email kamu (pilih dari dropdown) |
| App logo | (opsional, bisa skip) |
| App homepage | `https://[domain-vercel-kamu].vercel.app` |
| App privacy policy link | `https://[domain-vercel-kamu].vercel.app/privacy` |
| App terms of service | (opsional, bisa skip) |
| Developer contact email | Email kamu |

> 💡 Ganti `[domain-vercel-kamu]` dengan domain Vercel kamu (contoh: `mykanz.vercel.app`)

Klik **"Save and Continue"**

### Tab "Scopes"

1. Klik **"Add or remove scopes"**
2. Di kolom search, ketik: `gmail.readonly`
3. Centang scope: `https://www.googleapis.com/auth/gmail.readonly`
4. Scroll ke atas, cari dan centang juga: `openid` dan `email`
5. Klik **"Update"** → klik **"Save and Continue"**

### Tab "Test users"

> Kamu bisa skip bagian ini karena kita akan langsung publish ke Production.

Klik **"Save and Continue"** → Klik **"Back to Dashboard"**

### Publish App (Penting!)

1. Di halaman OAuth consent screen, lihat status **"Publishing status: Testing"**
2. Klik tombol **"Publish App"**
3. Muncul dialog konfirmasi → klik **"Confirm"**
4. Status berubah menjadi **"In production"**

> ℹ️ **Kenapa perlu publish?** Saat masih "Testing", token refresh hanya berlaku 7 hari. Setelah "In production", token refresh bisa bertahan lama. User tetap akan lihat warning "Unverified App" tapi itu normal untuk aplikasi pribadi — tidak perlu submit untuk verifikasi Google.

---

## 4. Buat OAuth 2.0 Client ID

Ini yang menghasilkan `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`.

1. Klik **"APIs & Services"** → **"Credentials"**
2. Klik **"+ Create Credentials"** → pilih **"OAuth 2.0 Client IDs"**
3. Isi form:

   | Field | Nilai |
   |-------|-------|
   | Application type | **Web application** |
   | Name | `MyKanz Web Client` |

4. Di bagian **"Authorized redirect URIs"**, klik **"+ Add URI"**, isi:
   ```
   https://[domain-vercel-kamu].vercel.app/api/auth/google/callback
   ```

   > Contoh: `https://mykanz.vercel.app/api/auth/google/callback`
   >
   > 💡 Kalau kamu mau testing lokal juga, tambahkan satu lagi:
   > `http://localhost:3000/api/auth/google/callback`

5. Klik **"Create"**

6. Muncul popup **"OAuth client created"** — **COPY DAN SIMPAN sekarang:**
   - **Client ID** → ini `GOOGLE_CLIENT_ID`
   - **Client Secret** → ini `GOOGLE_CLIENT_SECRET`

   > ⚠️ Client Secret hanya ditampilkan sekali. Kalau lupa, kamu harus buat yang baru.

7. Klik **"OK"**

---

## 5. Buat Pub/Sub Topic

Pub/Sub Topic adalah "saluran" yang digunakan Google untuk mengirim notifikasi email ke webhook kita.

1. Klik **☰** → **"Pub/Sub"** → **"Topics"**
2. Klik **"+ Create Topic"**
3. Isi:

   | Field | Nilai |
   |-------|-------|
   | Topic ID | `mykanz-gmail-push` |
   | Add a default subscription | ❌ **JANGAN** centang ini (kita akan buat manual) |
   | Message retention duration | (biarkan default) |

4. Klik **"Create"**

---

## 6. Grant Permission ke Gmail Service Account

Ini langkah **krusial** — tanpa ini Gmail tidak bisa publish notifikasi ke topic kita.

1. Di halaman **Pub/Sub → Topics**, klik nama topic **`mykanz-gmail-push`**
2. Di halaman detail topic, lihat panel sebelah kanan — klik **"Show Info Panel"** (jika panel belum muncul)
3. Di panel Info, klik **"Add Principal"**
4. Di field **"New principals"**, ketik persis:
   ```
   gmail-api-push@system.gserviceaccount.com
   ```
5. Di field **"Select a role"**, search: `Pub/Sub Publisher`
6. Pilih role: **Pub/Sub → Pub/Sub Publisher**
7. Klik **"Save"**

> 💡 **Catatan:** `gmail-api-push@system.gserviceaccount.com` adalah service account milik Google sendiri (bukan buatanmu). Kamu tidak perlu membuatnya — cukup tambahkan sebagai principal dengan role Publisher.

> ⚠️ Jika muncul error "Domain restricted sharing" — ini terjadi pada organisasi Google Workspace. Hubungi admin GWS kamu untuk menambahkan exception policy.

---

## 7. Buat Pub/Sub Subscription (Push)

Subscription ini yang menghubungkan topic ke webhook endpoint kamu di Vercel.

1. Klik **"Pub/Sub"** → **"Subscriptions"**
2. Klik **"+ Create Subscription"**
3. Isi form:

   | Field | Nilai |
   |-------|-------|
   | Subscription ID | `mykanz-gmail-push-sub` |
   | Select a Cloud Pub/Sub topic | Pilih `projects/[project-id]/topics/mykanz-gmail-push` |
   | Delivery type | **Push** |
   | Endpoint URL | `https://[domain-vercel-kamu].vercel.app/api/webhook/gmail-push` |
   | Enable authentication | ❌ (biarkan off untuk Vercel) |
   | Acknowledgement deadline | `60` seconds |
   | Message retention duration | `1 day` |
   | Retry policy | Retry after exponential backoff delay |

4. Klik **"Create"**

---

## 8. Set Environment Variables di Vercel

Buka **[vercel.com](https://vercel.com)** → pilih project MyKanz → **Settings → Environment Variables**

Tambahkan variable berikut satu per satu:

| Variable | Nilai | Cara Dapat |
|----------|-------|------------|
| `GOOGLE_CLIENT_ID` | `163743165360-xxxx.apps.googleusercontent.com` | Dari Step 4 (OAuth Client ID) |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxxxxxxxxx` | Dari Step 4 (OAuth Client Secret) |
| `GOOGLE_REDIRECT_URI` | `https://[domain].vercel.app/api/auth/google/callback` | Sama persis dengan yang didaftarkan di Step 4 |
| `GCP_PROJECT_ID` | `mykanz-production` | Nama project di Google Cloud (cek di header console) |
| `ENCRYPTION_KEY` | (lihat Step 9) | Generate di terminal |
| `CRON_SECRET` | String random bebas | Generate di terminal (lihat Step 9) |

> 💡 **Untuk semua variables:** Atur **Environment** ke `Production`, `Preview`, dan `Development` sekaligus (centang ketiganya).

### Cara cek GCP_PROJECT_ID

Project ID berbeda dengan Project Name. Cara melihatnya:
- Buka Google Cloud Console
- Klik dropdown project di header
- Di tabel, lihat kolom **"ID"** — contoh: `mykanz-production-123456`
- Nilai ini yang dimasukkan ke `GCP_PROJECT_ID`

---

## 9. Generate ENCRYPTION_KEY Lokal

Jalankan perintah ini di terminal (di folder project):

```bash
# Generate ENCRYPTION_KEY (32 bytes hex = 64 karakter)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate CRON_SECRET (random string)
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Contoh output:
```
ENCRYPTION_KEY: a3f8c2d1e9b4f7a0c5d8e1f2a9b3c6d8e2f5a8b1c4d7e0f3a6b9c2d5e8f1a4b7
CRON_SECRET: xK9mP2qRnZvDcFhJwTyBsL8e
```

Copy masing-masing nilai ke Vercel Environment Variables.

---

## 10. Test & Deploy

### Langkah Deploy

```bash
# Di terminal, dari folder project
git add .
git commit -m "feat: gmail oauth integration"
git push origin main
```

Vercel akan auto-deploy. Tunggu hingga status **"Ready"** di dashboard Vercel.

### Test Koneksi Gmail

1. Buka app: `https://[domain-kamu].vercel.app`
2. Login ke MyKanz
3. Buka **Settings** → scroll ke bagian **Gmail**
4. Klik **"Hubungkan Gmail"**
5. Pilih akun Google → izinkan akses
6. Kamu akan redirect kembali ke Settings — status harus berubah menjadi **"✅ Gmail Terhubung"**

### Test Transaksi Otomatis

1. Dari akun Gmail yang terhubung, forward (atau terima) email notifikasi dari bank (BCA, GoPay, OVO, dll.)
2. Tunggu 1–2 menit
3. Buka **Transactions** di MyKanz — transaksi harus muncul otomatis

---

## 11. Troubleshooting

### ❌ Error: "redirect_uri_mismatch"

**Penyebab:** URL callback yang didaftarkan di Google Cloud tidak sama persis dengan yang di env variable.

**Solusi:**
- Buka Google Cloud → Credentials → Edit OAuth Client
- Pastikan Authorized redirect URIs berisi **persis**: `https://[domain-kamu].vercel.app/api/auth/google/callback`
- Pastikan `GOOGLE_REDIRECT_URI` di Vercel sama persis (tanpa trailing slash)

---

### ❌ Error: "access_denied" atau "This app isn't verified"

**Penyebab:** App masih di status Testing atau scope `gmail.readonly` termasuk Restricted Scope.

**Solusi:**
- Pastikan sudah klik **"Publish App"** di OAuth Consent Screen (lihat Step 3)
- Saat consent screen muncul dengan warning, klik **"Advanced"** → **"Go to [App Name] (unsafe)"** — ini normal untuk aplikasi personal

---

### ❌ Gmail push notification tidak masuk

**Penyebab paling umum:** Permission Pub/Sub Publisher belum di-grant ke `gmail-api-push@system.gserviceaccount.com`

**Solusi:**
- Ulangi Step 6 dengan teliti
- Pastikan email service account diketik persis: `gmail-api-push@system.gserviceaccount.com`
- Cek log di Vercel Functions (tab Logs) saat kamu coba connect Gmail

---

### ❌ Error: "GCP_PROJECT_ID" tidak valid

**Penyebab:** Menggunakan Project Name bukan Project ID.

**Solusi:**
- Di Google Cloud Console header, hover/klik nama project
- Salin nilai dari kolom **"ID"** (bukan "Name")
- Update `GCP_PROJECT_ID` di Vercel

---

### ❌ Token refresh expired setelah 7 hari

**Penyebab:** App masih di Testing mode saat user pertama kali connect.

**Solusi:**
- Publish app ke Production (Step 3)
- Minta user disconnect dan reconnect Gmail dari Settings
- Pastikan cron job `/api/cron/renew-gmail-watch` berjalan (cek Vercel Cron Logs)

---

### ❌ Cron job tidak jalan

**Penyebab:** `vercel.json` belum dikonfigurasi atau `CRON_SECRET` tidak sesuai.

**Verifikasi:**
```json
// vercel.json — sudah ada
{
  "crons": [
    {
      "path": "/api/cron/renew-gmail-watch",
      "schedule": "0 19 * * *"
    }
  ]
}
```

Cron berjalan setiap hari jam 19.00 UTC (02.00 WIB). Cek di Vercel Dashboard → **Cron Jobs** tab.

---

## 📌 Summary Checklist

```
[ ] Google Cloud Project "MyKanz Production" dibuat
[ ] Gmail API di-enable
[ ] Cloud Pub/Sub API di-enable
[ ] OAuth Consent Screen (External) dikonfigurasi
[ ] App dipublish ke "In production"
[ ] OAuth 2.0 Client ID dibuat (Web Application)
[ ] Redirect URI didaftarkan
[ ] Client ID & Client Secret disimpan
[ ] Pub/Sub Topic "mykanz-gmail-push" dibuat
[ ] gmail-api-push@system.gserviceaccount.com diberi role "Pub/Sub Publisher"
[ ] Pub/Sub Subscription (Push) ke /api/webhook/gmail-push dibuat
[ ] Environment variables di Vercel sudah diisi semua
[ ] ENCRYPTION_KEY & CRON_SECRET sudah di-generate
[ ] Deploy berhasil
[ ] Test connect Gmail berhasil
[ ] Test transaksi bank muncul otomatis
```

---

*Dibuat untuk project MyKanz — Gmail OAuth Integration*
*Last updated: Juni 2026*
