# ✅ Status Implementasi Gmail OAuth — MyKanz

## Yang Sudah Dikerjakan (AI)

| Step | File | Status |
|------|------|--------|
| 3 | `npm install googleapis` | ✅ Done |
| 4 | `prisma/schema.prisma` — tambah kolom `gmail_*` ke `users` + `gmail_msg_id` ke `fiat_transactions` | ✅ Done |
| 5 | `npx prisma db push` + `npx prisma generate` | ✅ Done (DB sudah tersync ke Supabase) |
| 6 | `lib/gmail/crypto.ts` | ✅ Done |
| 7 | `lib/gmail/oauth.ts` | ✅ Done |
| 8 | `lib/gmail/token-manager.ts` | ✅ Done |
| 9 | `lib/gmail/parser.ts` (BCA, GoPay, OVO, Mandiri, Tokopedia, Shopee) | ✅ Done |
| 10 | `app/api/auth/google/route.ts` | ✅ Done |
| 11 | `app/api/auth/google/callback/route.ts` | ✅ Done |
| 12 | `app/api/webhook/gmail-push/route.ts` | ✅ Done |
| 13 | `app/api/gmail/status/route.ts` | ✅ Done |
| 14 | `app/api/cron/renew-gmail-watch/route.ts` | ✅ Done |
| 15 | `vercel.json` — Cron job config | ✅ Done |
| 16 | `components/SettingsPage.tsx` — Gmail section | ✅ Done |
| 17 | `app/(dashboard)/settings/page.tsx` — query + pass gmailStatus | ✅ Done |
| — | TypeScript compile check | ✅ 0 errors |

---

## ⚠️ Yang Harus Kamu Lakukan Sendiri

### Step 1 — Google Cloud Console (MANUAL, SATU KALI)

> Lakukan langkah ini berurutan sebelum push ke Vercel.

1. **Buat Google Cloud Project**
   - Buka [console.cloud.google.com](https://console.cloud.google.com)
   - Buat project baru: nama `MyKanz Production`

2. **Enable 2 API** (menu: APIs & Services → Enable APIs & Services)
   - ✅ Gmail API
   - ✅ Cloud Pub/Sub API

3. **Buat OAuth Consent Screen**
   - User Type: **External**
   - App name: `MyKanz`
   - User support email: email kamu
   - Developer contact email: email kamu
   - App homepage: `https://[domain-vercel-kamu]`
   - Privacy policy URL: `https://[domain-vercel-kamu]/privacy` ← **wajib diisi untuk publish**
   - Scopes: tambah `gmail.readonly` (Restricted) + `userinfo.email`

4. **Publish App** → Klik **"Publish App"**
   - Pindah dari Testing → In Production
   - User akan lihat layar Unverified tapi token **tidak expire 7 hari**

5. **Buat OAuth 2.0 Client ID**
   - Application type: **Web Application**
   - Authorized redirect URIs: `https://[domain-vercel-kamu]/api/auth/google/callback`
   - Salin `Client ID` dan `Client Secret`

6. **Buat Pub/Sub Topic**
   - Nama: `mykanz-gmail-push`
   - Grant role **Pub/Sub Publisher** ke service account: `gmail-api-push@system.gserviceaccount.com`

7. **Buat Pub/Sub Subscription** (Push type)
   - Topic: `mykanz-gmail-push`
   - Delivery type: **Push**
   - Endpoint URL: `https://[domain-vercel-kamu]/api/webhook/gmail-push`

---

### Step 2 — Environment Variables di Vercel

> Buka Vercel Dashboard → Project Settings → Environment Variables

| Variable | Cara Dapat Nilai |
|----------|-----------------|
| `GOOGLE_CLIENT_ID` | Dari OAuth 2.0 Client ID di GCloud |
| `GOOGLE_CLIENT_SECRET` | Dari OAuth 2.0 Client ID di GCloud |
| `GOOGLE_REDIRECT_URI` | `https://[domain-kamu]/api/auth/google/callback` |
| `GCP_PROJECT_ID` | Nama project Google Cloud kamu (contoh: `mykanz-production`) |
| `ENCRYPTION_KEY` | Generate dengan command di bawah |
| `CRON_SECRET` | String random apa saja, untuk keamanan cron endpoint |

**Generate ENCRYPTION_KEY** (jalankan di terminal):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Step 18–20 — Deploy & Test

- **Step 18**: `git add . && git commit -m "feat: gmail oauth integration" && git push` → Vercel auto-deploy
- **Step 19**: Buka Settings → Gmail Connect → klik "Hubungkan Gmail" → ikuti consent screen
- **Step 20**: Kirim forward email notifikasi bank ke Gmail yang terkoneksi → cek apakah transaksi muncul di dashboard

---

## Catatan Penting

### Jawaban Open Questions (Default yang dipakai)

1. **Default Wallet**: Pakai `default_wallet_id` user. Jika tidak diset, otomatis ambil wallet pertama yang user punya.
2. **Category**: Dibuat otomatis kategori bernama `"Gmail Import"` (opsi A).
3. **Langsung save**: Transaksi langsung disimpan tanpa review — tidak ada konfirmasi manual.

> Kalau kamu mau ubah behavior ini (misalnya konfirmasi via Telegram dulu), bisa dimodifikasi di `app/api/webhook/gmail-push/route.ts` fungsi `saveTransactionIfNotDuplicate`.

### Privacy Policy Page

Google mewajibkan URL Privacy Policy yang valid saat Publish App ke Production. Kamu perlu buat halaman `/privacy` di MyKanz (minimal sederhana saja).

### Regex Parser Bank

Parser di `lib/gmail/parser.ts` sudah dibuat berdasarkan pola umum email notifikasi tiap bank. **Perlu di-test dengan email asli** — format email bisa berbeda-beda dan berubah sewaktu-waktu. Jika ada bank yang tidak ter-parse, tinggal update regex di fungsi parser-nya.
