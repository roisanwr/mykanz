# Rencana Implementasi: Gmail OAuth — Auto-Capture Transaksi dari Email

## Latar Belakang

Fitur ini memungkinkan MyKanz membaca email notifikasi bank/e-wallet user secara otomatis (BCA, GoPay, OVO, Mandiri, Tokopedia, Shopee, dll.) dan langsung mencatatnya ke dalam tabel `fiat_transactions` tanpa user perlu melakukan input manual.

**Strategi yang dipilih: Level B (Production Unverified)**
- Tidak ada token expire 7 hari untuk user (hanya `gmail.watch()` yang expire tiap 7 hari, di-renew otomatis oleh cron).
- User lihat layar "Unverified App" dari Google **satu kali saja** saat pertama connect, lalu berjalan normal selamanya.
- Tidak perlu CASA audit atau verifikasi Google — cukup "Publish App" ke Production.

---

## Diagram Alur Sistem

```
User klik "Connect Gmail"
  → GET /api/auth/google                    (redirect ke Google Consent)
  → Google Consent Screen (Unverified)
  → User klik "Advanced → Proceed anyway"
  → GET /api/auth/google/callback?code=...  (tukar code → tokens)
  → Simpan tokens ke DB (encrypted AES-256)
  → Setup gmail.watch()                     (Google push ke Pub/Sub)
  → Selesai! User tidak perlu connect lagi

Email masuk ke inbox user
  → Google Pub/Sub push ke POST /api/webhook/gmail-push
  → Decode payload → cari user via gmail_email
  → Balas 200 OK segera (max 10 detik)
  → Background: ambil email via gmail.history.list()
  → Parsing email (BCA, GoPay, dll.)
  → Insert ke fiat_transactions (dedup via gmail_msg_id)

Vercel Cron (setiap hari jam 02:00 WIB)
  → GET /api/cron/renew-gmail-watch
  → Find users dengan gmail_watch_expiry < sekarang + 2 hari
  → Renew gmail.watch() untuk masing-masing user
  → Update gmail_watch_expiry di DB
```

---

## Prasyarat — Setup Google Cloud Console (Manual, Satu Kali)

> [!IMPORTANT]
> Langkah-langkah ini dilakukan **satu kali** sebelum menulis kode apapun. Tidak bisa dilewati.

### Urutan Setup:
1. **Buat Google Cloud Project** di [console.cloud.google.com](https://console.cloud.google.com). Nama: `MyKanz Production`.
2. **Enable dua API**: `Gmail API` dan `Cloud Pub/Sub API` (menu: APIs & Services → Enable APIs & Services).
3. **Buat OAuth Consent Screen**:
   - User Type: **External**
   - Isi App name, User support email, Developer contact email
   - App homepage: `https://[domain-vercel-kamu]`
   - Privacy policy URL (wajib diisi untuk publish): `https://[domain-vercel-kamu]/privacy`
   - Scopes: tambahkan `gmail.readonly` (Restricted) + `userinfo.email`
4. **Publish App** → Klik **"Publish App"** (pindah dari Testing ke In Production). User akan lihat layar Unverified, tapi token **tidak lagi expire 7 hari**.
5. **Buat OAuth 2.0 Client ID**:
   - Application type: **Web Application**
   - Authorized redirect URIs: `https://[domain-vercel-kamu]/api/auth/google/callback`
   - Salin `Client ID` dan `Client Secret`.
6. **Buat Pub/Sub Topic**:
   - Nama topic: `mykanz-gmail-push`
   - Grant publish permission ke service account: `gmail-api-push@system.gserviceaccount.com` (role: Pub/Sub Publisher)
7. **Buat Pub/Sub Subscription** (Push type):
   - Topic: pilih `mykanz-gmail-push` yang baru dibuat
   - Delivery type: **Push**
   - Endpoint URL: `https://[domain-vercel-kamu]/api/webhook/gmail-push`

---

## Environment Variables Baru di Vercel

> [!IMPORTANT]
> Tambahkan semua variable ini di Vercel Dashboard → Project Settings → Environment Variables. Jangan tambahkan ke `.env` lokal karena sudah dikelola di Vercel.

| Variable | Nilai | Keterangan |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `xxxx.apps.googleusercontent.com` | Dari Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxx` | Dari Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://[domain]/api/auth/google/callback` | Harus sama persis dengan yang di GCloud |
| `GCP_PROJECT_ID` | `mykanz-production` | Nama project Google Cloud |
| `ENCRYPTION_KEY` | 64-char hex string (32 bytes) | Kunci AES-256-GCM untuk enkripsi token |

**Cara generate `ENCRYPTION_KEY`** (jalankan di terminal lokal):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Package Baru yang Perlu Diinstal

```bash
npm install googleapis
```

Hanya **satu package** tambahan. Library ini adalah official Google API client untuk Node.js yang meng-handle OAuth2 dan auto-refresh token secara otomatis.

---

## Perubahan Database Schema (Prisma)

### File: `prisma/schema.prisma`

#### MODIFY model `users` — Tambah 8 kolom baru:

```prisma
model users {
  // ... kolom yang sudah ada ...

  // === Gmail OAuth Integration ===
  gmail_email          String?
  gmail_access_token   String?    // dienkripsi AES-256-GCM
  gmail_refresh_token  String?    // dienkripsi AES-256-GCM, long-lived
  gmail_token_expiry   BigInt?    // unix milliseconds, access token ~1 jam
  gmail_history_id     String?    // untuk incremental history polling
  gmail_watch_expiry   DateTime?  @db.Timestamptz(6)  // expire tiap 7 hari
  gmail_connected      Boolean    @default(false)
  gmail_needs_reauth   Boolean    @default(false)

  // Index untuk webhook lookup
  @@index([gmail_email], map: "idx_users_gmail_email")
}
```

#### MODIFY model `fiat_transactions` — Tambah 1 kolom:

```prisma
model fiat_transactions {
  // ... kolom yang sudah ada ...

  // === Gmail Auto-Capture ===
  gmail_msg_id  String?   @unique  // deduplication: 1 Gmail msg = 1 transaksi
}
```

**Setelah edit schema**, jalankan:
```bash
npx prisma db push
```

---

## Proposed Changes — File Baru & File yang Dimodifikasi

---

### Library Gmail (`lib/gmail/`)

#### [NEW] `lib/gmail/crypto.ts`
Enkripsi dan dekripsi token menggunakan AES-256-GCM dengan `ENCRYPTION_KEY` dari env. Menggunakan modul `crypto` bawaan Node.js — tidak perlu install package tambahan. **Ini layer keamanan wajib** — refresh token adalah kunci akses email user, tidak boleh disimpan plaintext di database.

```typescript
// Fungsi yang di-export:
export function encrypt(text: string): string
export function decrypt(encryptedText: string): string
// Format hasil encrypt: "iv:authTag:ciphertext" (hex-encoded)
```

#### [NEW] `lib/gmail/oauth.ts`
Handler alur OAuth Google dari awal sampai setup push notification. Mengikuti pola yang sama dengan `lib/auth.ts` yang sudah ada.

```typescript
// Fungsi yang di-export:
export function getAuthUrl(userId: string): string
// → Menghasilkan URL Google Consent Screen dengan parameter:
//   access_type: 'offline' (wajib untuk dapat refresh_token)
//   prompt: 'consent' (wajib agar refresh_token selalu dikirim, bahkan jika user sudah pernah authorize)
//   state: userId (untuk link token ke user di DB saat callback)

export async function handleCallback(code: string, userId: string): Promise<void>
// → Tukar authorization code dengan tokens
// → Simpan tokens ke DB via saveTokens() (encrypted)
// → Panggil setupGmailWatch()

export async function setupGmailWatch(userId: string, tokens: object): Promise<void>
// → Panggil gmail.users.watch() dengan topicName dari GCP_PROJECT_ID
// → Label: ['INBOX'] — hanya pantau kotak masuk
// → Simpan historyId dan gmail_watch_expiry ke DB
// CATATAN: watch() expire tiap 7 hari — BERBEDA dari OAuth token
```

#### [NEW] `lib/gmail/token-manager.ts`
Manajemen access token agar selalu fresh. Googleapis library men-handle auto-refresh secara otomatis, tapi kita perlu listen event `'tokens'` untuk menyimpan token baru ke DB setiap kali refresh terjadi.

```typescript
// Fungsi yang di-export:
export async function getClientForUser(userId: string): Promise<OAuth2Client>
// → Ambil tokens dari DB, dekripsi
// → Set credentials ke oauth2Client
// → Listen event 'tokens' → auto-save ke DB jika ada token baru
// → Return oauth2Client yang siap dipakai

export async function saveTokens(userId: string, tokens: Partial<Credentials>): Promise<void>
// → Enkripsi access_token dan refresh_token (jika ada)
// → Update kolom gmail_* di tabel users
// → Jika ada refresh_token baru (Google kadang rotate), update juga

export async function handleInvalidGrant(userId: string): Promise<void>
// → Set gmail_connected = false, gmail_needs_reauth = true
// → Trigger notifikasi ke user bahwa Gmail perlu dihubungkan ulang
```

#### [NEW] `lib/gmail/parser.ts`
Ekstraksi data transaksi dari respons Gmail API. Ini adalah "otak" dari fitur ini — pattern matching per pengirim email.

```typescript
// Map pengirim email ke fungsi parser-nya:
const KNOWN_SENDERS = {
  'notifikasi@bca.co.id':               parseBCA,
  'no-reply@gojek.com':                 parseGoPay,
  'no-reply@ovo.id':                    parseOVO,
  'mandiri.notifikasi@bankmandiri.co.id': parseMandiri,
  'noreply@tokopedia.com':              parseTokopedia,
  'cs@shopee.co.id':                    parseShopee,
}

// Fungsi yang di-export:
export function parseTransactionFromEmail(gmailMessage: GmailMessage): ParsedGmailTx | null
// → Ambil header From dan cari parser yang cocok
// → Decode body dari base64url
// → Jalankan parser yang sesuai
// → Return: { source, type (PEMASUKAN/PENGELUARAN), amount, merchant, currency, date }
// → Return null jika bukan email transaksi yang dikenal

// Helper internal:
function extractBody(payload): string  // handle nested multipart MIME
function getHeader(headers, name): string
function parseRupiah(str): number      // hapus titik/koma, parseInt

// Per-bank parsers — semua return ParsedGmailTx | null:
function parseBCA({ subject, body, date })
function parseGoPay({ subject, body, date })
function parseOVO({ subject, body, date })
function parseMandiri({ subject, body, date })
function parseTokopedia({ subject, body, date })
function parseShopee({ subject, body, date })
```

> [!NOTE]
> Parser bank menggunakan regex. Regex yang dipakai harus diuji terhadap email asli dari masing-masing bank — format email bisa berubah sewaktu-waktu. Parser di file HTML adalah titik awal yang bagus, tapi perlu fine-tuning berdasarkan email nyata.

---

### API Routes Baru

#### [NEW] `app/api/auth/google/route.ts`
```
GET /api/auth/google
```
Route ini dipanggil saat user klik tombol "Connect Gmail" di halaman Settings. Harus ada session NextAuth yang valid (user harus login dulu). Redirect ke Google Consent Screen.

```typescript
export async function GET(req: Request) {
  // 1. Cek session NextAuth (wajib login)
  // 2. Ambil userId dari session
  // 3. Generate auth URL via getAuthUrl(userId)
  // 4. redirect(authUrl)  // Next.js redirect
}
```

#### [NEW] `app/api/auth/google/callback/route.ts`
```
GET /api/auth/google/callback?code=...&state=userId&error=...
```
Google memanggil URL ini setelah user approve atau deny consent screen.

```typescript
export async function GET(req: Request) {
  // 1. Parse searchParams: code, state (= userId), error
  // 2. Jika error (user deny/cancel): redirect ke /settings?gmail=denied
  // 3. Jika tidak ada code: return 400
  // 4. Panggil handleCallback(code, userId)
  //    → Tukar code → tokens
  //    → Save tokens (encrypted) ke DB
  //    → Setup gmail.watch()
  // 5. Jika success: redirect ke /settings?gmail=connected
  // 6. Jika error (misal: code already used): redirect ke /settings?gmail=error
}
```

#### [NEW] `app/api/webhook/gmail-push/route.ts`
```
POST /api/webhook/gmail-push
```
Dipanggil oleh Google Pub/Sub setiap ada email baru masuk di inbox user yang sudah connect Gmail. **Wajib balas 200 dalam < 10 detik**, atau Google akan retry terus (exponential backoff sampai 7 hari).

```typescript
export async function POST(req: Request) {
  // 1. Parse body Pub/Sub: { message: { data: base64string } }
  // 2. Decode base64 → { emailAddress, historyId }
  // 3. Balas 200 SEGERA ← KRITIS! Sebelum proses apapun yang berat
  // 4. Cari user di DB berdasarkan gmail_email
  // 5. Jika user tidak ditemukan: selesai (sudah reply 200)
  // 6. Background: processNewEmails(user, historyId)

  // processNewEmails(user, newHistoryId):
  //   a. getClientForUser(user.id)
  //   b. gmail.users.history.list({
  //        startHistoryId: user.gmail_history_id,
  //        historyTypes: ['messageAdded'],
  //        labelId: 'INBOX'
  //      })
  //   c. Loop setiap message yang ditemukan:
  //      - gmail.users.messages.get({ id: msg.id, format: 'full' })
  //      - parseTransactionFromEmail(fullMessage)
  //      - Jika ada hasil: saveTransactionIfNotDuplicate()
  //   d. Update gmail_history_id ke newHistoryId
  //   e. Catch 'invalid_grant' → handleInvalidGrant(user.id)
}

// saveTransactionIfNotDuplicate(userId, tx, gmailMsgId):
//   - Cek apakah gmail_msg_id sudah ada di fiat_transactions
//   - Jika tidak ada: insert transaksi baru
//   - Jika sudah ada: skip (natural deduplication)
//   - Wallet target: gunakan default_wallet_id user (sudah ada di schema)
//   - Category: buat atau cari kategori "Gmail Import" otomatis
```

> [!WARNING]
> Webhook ini harus menambahkan `export const maxDuration = 60;` (sama seperti Telegram webhook) agar Vercel memberikan waktu eksekusi yang cukup untuk proses background.

#### [NEW] `app/api/gmail/status/route.ts`
```
GET  /api/gmail/status  → cek status koneksi Gmail user
DELETE /api/gmail/status → disconnect Gmail (hapus tokens dari DB)
```

```typescript
// GET: Return { connected: boolean, email: string | null, needs_reauth: boolean }
// DELETE: Update DB: set semua kolom gmail_* ke null/false
//         Return { success: true }
```

#### [NEW] `app/api/cron/renew-gmail-watch/route.ts`
```
GET /api/cron/renew-gmail-watch
```
Endpoint untuk Vercel Cron Job. Dipanggil otomatis setiap hari jam 02:00 WIB (19:00 UTC). Renew `gmail.watch()` untuk semua user yang watch-nya akan expire dalam 2 hari ke depan.

```typescript
export async function GET(req: Request) {
  // 1. Verifikasi cron secret header (keamanan)
  //    → Cek header 'Authorization: Bearer ${CRON_SECRET}'
  // 2. Query DB: users dengan gmail_connected = true
  //    dan gmail_watch_expiry < (sekarang + 2 hari)
  // 3. Loop setiap user:
  //    a. getClientForUser(user.id)
  //    b. gmail.users.watch({ topicName, labelIds: ['INBOX'] })
  //    c. Update gmail_watch_expiry di DB
  //    d. Catch 'invalid_grant' → handleInvalidGrant(user.id)
  // 4. Return summary: { renewed: N, failed: M }
}
```

---

### Vercel Configuration

#### [NEW] `vercel.json` (di root project)
Konfigurasi Vercel Cron Job untuk auto-renew `gmail.watch()`:

```json
{
  "crons": [
    {
      "path": "/api/cron/renew-gmail-watch",
      "schedule": "0 19 * * *"
    }
  ]
}
```

Jam `0 19 * * *` = jam 19:00 UTC = jam 02:00 WIB.

> [!NOTE]
> Tambahkan `CRON_SECRET` ke Vercel env vars. Vercel otomatis mengirimkan header `Authorization: Bearer ${CRON_SECRET}` ke cron endpoints untuk keamanan.

---

### Modifikasi File yang Sudah Ada

#### [MODIFY] `components/SettingsPage.tsx`

Tambahkan section **"Gmail Connect"** ke sidebar settings, mirip dengan section "Telegram Bot" yang sudah ada.

**Perubahan yang diperlukan:**

1. **Tambah `'gmail'` ke type `Section`:**
```typescript
type Section = 'profile' | 'password' | 'export' | 'telegram' | 'gmail' | 'danger';
```

2. **Tambah props baru `gmailStatus`:**
```typescript
interface GmailStatus {
  connected: boolean;
  email: string | null;
  needs_reauth: boolean;
}
// SettingsPage menerima prop tambahan:
export default function SettingsPage({ user, gmailStatus }: { user: UserData, gmailStatus: GmailStatus })
```

3. **Tambah state untuk Gmail:**
```typescript
const [gmailConnected, setGmailConnected] = useState(gmailStatus.connected);
const [gmailEmail, setGmailEmail] = useState(gmailStatus.email);
const [gmailNeedsReauth, setGmailNeedsReauth] = useState(gmailStatus.needs_reauth);
const [gmailLoading, setGmailLoading] = useState(false);
```

4. **Tambah nav item di `navItems` array (sebelum 'danger'):**
```typescript
{ id: 'gmail', label: 'Gmail Connect', icon: Mail },
```

5. **Tambah section UI Gmail** — mirip dengan section Telegram:
   - Jika `connected && !needs_reauth`: tampilkan status hijau "Gmail Terhubung" + email yang terkoneksi + tombol Disconnect
   - Jika `needs_reauth`: tampilkan warning kuning "Diperlukan Reconnect" + tombol "Hubungkan Ulang Gmail"
   - Jika `!connected`: tampilkan UI penjelasan + tombol "Hubungkan Gmail"
   
   **KRUSIAL — Tambahkan penjelasan "Unverified App"** sebelum tombol Connect, misalnya:
   > ⚠️ Saat menghubungkan Gmail, Google akan menampilkan layar peringatan "Unverified App". Klik **Advanced → Proceed to MyKanz (unsafe)** untuk melanjutkan. Ini normal karena MyKanz belum melalui proses verifikasi Google yang membutuhkan waktu berbulan-bulan. Data kamu tetap aman — MyKanz hanya membaca email notifikasi transaksi, tidak pernah mengirim email.

6. **Handler connect/disconnect:**
```typescript
const handleConnectGmail = () => {
  window.location.href = '/api/auth/google';
};

const handleDisconnectGmail = async () => {
  setGmailLoading(true);
  const res = await fetch('/api/gmail/status', { method: 'DELETE' });
  if (res.ok) {
    setGmailConnected(false);
    setGmailEmail(null);
    showFeedback('Gmail berhasil diputuskan.', 'success');
  }
  setGmailLoading(false);
};
```

7. **Handle URL params dari callback** — deteksi `?gmail=connected` atau `?gmail=error`:
```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const gmailParam = params.get('gmail');
  if (gmailParam === 'connected') {
    showFeedback('Gmail berhasil dihubungkan! 🎉', 'success');
    setGmailConnected(true);
    setActiveSection('gmail');
  } else if (gmailParam === 'error') {
    showFeedback('Gagal menghubungkan Gmail. Coba lagi.', 'error');
  } else if (gmailParam === 'denied') {
    showFeedback('Kamu membatalkan koneksi Gmail.', 'error');
  }
}, []);
```

#### [MODIFY] `app/(dashboard)/settings/page.tsx`

Tambahkan query untuk mendapatkan status Gmail user dan pass ke `SettingsPage`:

```typescript
// Tambah query kolom gmail:
const user = await prisma.users.findUnique({
  where: { id: session.user.id },
  select: {
    id: true, name: true, email: true, created_at: true,
    // Tambahan baru:
    gmail_connected: true,
    gmail_email: true,
    gmail_needs_reauth: true,
  },
});

// Pass ke component:
return (
  <SettingsPage
    user={{ id: user.id, name: user.name, email: user.email, created_at: user.created_at?.toISOString() ?? null }}
    gmailStatus={{
      connected: user.gmail_connected,
      email: user.gmail_email,
      needs_reauth: user.gmail_needs_reauth,
    }}
  />
);
```

---

## Urutan Eksekusi (Step-by-Step)

> [!IMPORTANT]
> Ikuti urutan ini dengan tepat. Jangan skip langkah.

- [ ] **Step 1**: Setup Google Cloud Console (manual) — buat project, enable API, OAuth consent, publish ke Production, buat Pub/Sub topic + subscription.
- [ ] **Step 2**: Generate `ENCRYPTION_KEY` dan tambahkan semua env vars baru ke Vercel Dashboard.
- [ ] **Step 3**: Install package `googleapis` → `npm install googleapis`.
- [ ] **Step 4**: Edit `prisma/schema.prisma` — tambah kolom gmail ke model `users` dan `fiat_transactions`.
- [ ] **Step 5**: Jalankan `npx prisma db push` → schema tersync ke Supabase.
- [ ] **Step 6**: Buat file `lib/gmail/crypto.ts`.
- [ ] **Step 7**: Buat file `lib/gmail/oauth.ts`.
- [ ] **Step 8**: Buat file `lib/gmail/token-manager.ts`.
- [ ] **Step 9**: Buat file `lib/gmail/parser.ts` (mulai dengan BCA + GoPay, tambah bank lain iteratif).
- [ ] **Step 10**: Buat file `app/api/auth/google/route.ts` (redirect ke Google).
- [ ] **Step 11**: Buat file `app/api/auth/google/callback/route.ts` (handle callback dari Google).
- [ ] **Step 12**: Buat file `app/api/webhook/gmail-push/route.ts` (Pub/Sub push handler).
- [ ] **Step 13**: Buat file `app/api/gmail/status/route.ts` (check + disconnect).
- [ ] **Step 14**: Buat file `app/api/cron/renew-gmail-watch/route.ts`.
- [ ] **Step 15**: Buat file `vercel.json` dengan konfigurasi cron job.
- [ ] **Step 16**: Modifikasi `components/SettingsPage.tsx` — tambah Gmail section.
- [ ] **Step 17**: Modifikasi `app/(dashboard)/settings/page.tsx` — query + pass gmail status.
- [ ] **Step 18**: Push ke GitHub → Vercel auto-deploy.
- [ ] **Step 19**: Test manual connect Gmail dari Settings.
- [ ] **Step 20**: Verifikasi Pub/Sub webhook berfungsi dengan mengirim email test dari bank/e-wallet.

---

## Pertimbangan Keamanan & Edge Cases

| Skenario | Penanganan |
|---|---|
| User mengganti password Google | Refresh token direvoke → `invalid_grant` → set `gmail_needs_reauth = true` → notifikasi di UI |
| User mencabut izin MyKanz dari Google Account | Sama dengan di atas |
| Refresh token tidak dipakai 6 bulan | Diinvalidasi Google → `invalid_grant` → sama |
| Email dari pengirim tidak dikenal | `parseTransactionFromEmail` return `null` → skip, tidak ada insert |
| Email yang sama masuk dua kali (Pub/Sub retry) | `gmail_msg_id` adalah `@unique` → insert gagal gracefully → tidak ada double entry |
| `gmail.watch()` tidak di-renew (cron gagal) | Push notif berhenti datang, tapi token tetap valid. User perlu disconnect + reconnect |
| DB bocor | Token dienkripsi AES-256-GCM → tidak bisa dibaca tanpa `ENCRYPTION_KEY` |

---

## Open Questions untuk User

> [!IMPORTANT]
> **1. Default Wallet untuk Transaksi Gmail:** Ketika email notifikasi BCA/GoPay masuk dan di-parse, transaksi akan dimasukkan ke wallet mana? Opsi:
> - (A) Gunakan `default_wallet_id` yang sudah ada di schema users (sudah bisa diset dari Settings)
> - (B) Tentukan wallet per email sender (user bisa config "email BCA → wallet BCA")
> - (C) Buat wallet "Gmail Import" khusus, user bisa merge manual nanti
>
> **2. Category untuk Transaksi Gmail:** Kategori apa yang digunakan untuk transaksi yang di-capture otomatis? Opsi:
> - (A) Buat kategori "Import Gmail" secara otomatis jika belum ada
> - (B) Coba tebak kategori dari nama merchant (mirip AI Telegram, tapi tanpa AI call)
>
> **3. Konfirmasi sebelum Save:** Apakah transaksi langsung disimpan otomatis, atau ada mekanisme review dulu (misalnya via notifikasi Telegram bot untuk konfirmasi)?

---

## Verification Plan

### Automated
- `npx prisma db push` harus berjalan tanpa error setelah schema diupdate

### Manual Testing
1. Buka Settings → Gmail Connect → Klik "Hubungkan Gmail"
2. Pastikan redirect ke Google Consent Screen dengan scope `gmail.readonly`
3. Approve (klik "Advanced → Proceed") → pastikan redirect kembali ke `/settings?gmail=connected`
4. Cek database: kolom `gmail_connected`, `gmail_email`, `gmail_history_id` di tabel `users` harus terisi
5. Kirim email dari pengirim yang dikenal (misal: forward email notifikasi BCA) ke Gmail yang terkoneksi
6. Tunggu beberapa detik → cek dashboard MyKanz apakah transaksi muncul otomatis
7. Cek Vercel Cron Jobs log setelah deploy untuk memastikan cron terdaftar
