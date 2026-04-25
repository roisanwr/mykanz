# MyKanz — UI Roadmap & Progress Tracker

> **Dokumen ini mencatat semua perubahan frontend yang telah dilakukan dan yang masih pending.**
> Backend tidak disentuh sama sekali. Semua perubahan bersifat pure UI/CSS/React.

---

## ✅ SUDAH DIPERBAIKI (Eksekusi Sesi Ini)

### 1. 🔤 Typography — Ganti Inter dengan Font Pairing Profesional
**File:** `app/layout.tsx`, `app/globals.css`

**Sebelum:**
```tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
// globals.css: --font-sans: 'Inter', ui-sans-serif...
```

**Sesudah:**
```tsx
import { DM_Sans, Syne } from 'next/font/google'
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--dm-sans', display: 'swap' })
const syne   = Syne({ subsets: ['latin'], variable: '--syne', weight: ['700', '800'], display: 'swap' })
// globals.css: --font-sans: var(--dm-sans)  |  --font-display: var(--syne)
```

**Dampak:**
- `DM Sans` untuk seluruh body text — modern, readable, bukan Inter
- `Syne` untuk heading display (hero net worth) — geometric, distinctive
- Dihilangkan double-import Inter yang redundan antara `layout.tsx` dan `globals.css`
- `.font-display` CSS class tersedia global untuk Tailwind

---

### 2. 🎨 Hero Section — Kill the AI Gradient
**File:** `app/(dashboard)/page.tsx`, `app/page.tsx`

**Sebelum:**
```tsx
"bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900"
// Decorative: bg-indigo-500 blur-3xl + bg-emerald-500 blur-3xl
```

**Sesudah:**
```tsx
style={{ backgroundColor: 'oklch(0.18 0.06 50)' }}
// Decorative: warm amber radial-gradient (oklch-based), bukan indigo/emerald
```

**Dampak:**
- Dihilangkan dark navy + purple gradient yang merupakan AI signature paling dikenali
- Hero kini pakai warm dark amber — konsisten dengan brand orange tanpa terlihat template
- Net worth number kini pakai `font-display` (Syne) → lebih bold, lebih finansial
- Label menggunakan `oklch` text color yang warm, bukan `text-indigo-200`
- Greeting text lebih personal: "Hari ini adalah hari yang tepat untuk mencatat."

---

### 3. 📊 Metric Cards — Redesain ke Data-Forward
**File:** `app/(dashboard)/page.tsx`, `app/page.tsx`

**Sebelum (AI Pattern):**
```tsx
// Icon besar di dalam rounded container → label di samping → angka di bawah
<div className="bg-slate-50 p-2.5 rounded-xl">
  <Wallet className="w-5 h-5" />
</div>
<h3>Tunai & Bank</h3>
<p>Rp xxx</p>
```

**Sesudah (Data-Forward):**
```tsx
// Label kecil uppercase di atas → angka besar → icon konteks kecil di bawah
<p className="text-[10px] font-bold uppercase tracking-widest">Tunai & Bank</p>
<p className="text-2xl font-black">Rp xxx</p>
<div className="flex items-center gap-1.5 text-xs text-slate-400">
  <Wallet className="w-3.5 h-3.5 text-emerald-500" />
  <span>Saldo aktif di dompetmu</span>
</div>
```

**Dampak:**
- Dihilangkan "big rounded icon above every heading" — anti-pattern AI paling dikenali
- Angka kini menjadi elemen utama visual, bukan icon
- Label warna-warni (emerald untuk income, rose untuk expense) memberikan konteks semantik
- Micro-copy ditambahkan: "Saldo aktif di dompetmu", "Estimasi nilai beli", konteks bulan berjalan
- Hover effect dari `transition-all` diganti ke `transition-[shadow,transform]` — lebih spesifik, lebih efisien GPU

---

### 4. ✨ Staggered Card Animation
**File:** `app/globals.css`

**Sesudah:**
```css
@keyframes card-enter {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.metric-card { animation: card-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
.metric-card:nth-child(1) { animation-delay: 0ms; }
.metric-card:nth-child(2) { animation-delay: 60ms; }
.metric-card:nth-child(3) { animation-delay: 120ms; }
.metric-card:nth-child(4) { animation-delay: 180ms; }
```

**Dampak:**
- Cards muncul secara staggered (bergantian), bukan sekaligus
- Easing menggunakan `cubic-bezier(0.16, 1, 0.3, 1)` — professional expo-out, bukan `ease-in-out` default

---

### 5. ♿ Accessibility — Fix Critical A11y Issues
**File:** `components/DashboardLayout.tsx`

**Sebelum:**
```tsx
// Naked focus:outline-none — pengguna keyboard tidak bisa lihat focus
<button className="flex items-center focus:outline-none ...">
// Icon buttons tanpa label
<button><Moon /></button>
<button><Bell /></button>
<button><Menu /></button>
```

**Sesudah:**
```tsx
// focus-visible ring yang proper
<button className="... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50">
// Semua icon buttons punya aria-label
<button aria-label="Aktifkan Mode Gelap"><Moon /></button>
<button aria-label="Notifikasi" aria-haspopup="true"><Bell /></button>
<button aria-label="Buka menu navigasi" aria-expanded={isMobileMenuOpen}><Menu /></button>
// Profile button punya aria-expanded + aria-haspopup
<button aria-label="Buka menu profil" aria-expanded={isProfileOpen} aria-haspopup="true">
```

**Dampak:**
- Pengguna keyboard dapat melihat focus indicator yang jelas
- Screen reader dapat mengumumkan fungsi setiap tombol
- WCAG 2.4.7 (Focus Visible) tidak lagi dilanggar
- `aria-expanded` pada menu/dropdown memberikan state information

---

### 6. 🌙 Bug Fix: Moon Icon Tidak Berubah ke Sun
**File:** `components/DashboardLayout.tsx`

**Sebelum:**
```tsx
// Selalu tampil Moon, bahkan saat Dark Mode aktif
<button onClick={toggleDarkMode}>
  <Moon className="w-5 h-5" />
</button>
```

**Sesudah:**
```tsx
// Correctly toggles based on isDarkMode state
<button aria-label={isDarkMode ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}>
  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
</button>
```

**Dampak:**
- Bug visual hilang — icon kini mencerminkan state yang sebenarnya
- Import `Sun` dari lucide-react ditambahkan

---

### 7. 🎯 Custom Easing Tokens
**File:** `app/globals.css`

**Sesudah:**
```css
:root {
  --ease-out-expo:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-expo:     cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out-circ: cubic-bezier(0.85, 0, 0.15, 1);
  --ease-spring:      cubic-bezier(0.34, 1.25, 0.64, 1);
}
```

**Dampak:**
- Token easing tersedia sebagai CSS custom properties
- Digunakan di price-flash animations, card-enter animation, body transitions

---

### 8. 🌿 Tinted Neutral Background (OKLCH)
**File:** `app/globals.css`

**Sebelum:**
```css
body { @apply bg-[#f4f6f8] }  /* Cold pure gray */
.dark body { @apply bg-[#0f172a] }  /* Cold pure dark */
```

**Sesudah:**
```css
:root {
  --surface-bg:      oklch(0.965 0.006 60);  /* Warm-tinted, bukan cold gray */
  --surface-bg-dark: oklch(0.145 0.018 250); /* Tinted dark, bukan pure slate */
}
body { background-color: var(--surface-bg); }
.dark body { background-color: var(--surface-bg-dark); }
```

**Dampak:**
- Background tidak lagi pure/cold gray, ada subtle warmth sesuai brand orange
- Dark mode background punya subtle blue tint yang lebih natural dari mata

---

### 9. ♿ Global focus-visible Ring
**File:** `app/globals.css`

**Sesudah:**
```css
*:focus-visible {
  outline: 2px solid oklch(0.72 0.17 55);
  outline-offset: 2px;
  border-radius: 6px;
}
```

**Dampak:**
- Setiap elemen interaktif di seluruh app kini punya focus indicator otomatis
- Tidak perlu tambahkan `focus-visible:ring` manual di setiap komponen

---

### 10. 🧘 prefers-reduced-motion Support
**File:** `app/globals.css`

**Sesudah:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration:        0.01ms !important;
    animation-iteration-count: 1      !important;
    transition-duration:       0.01ms !important;
  }
}
```

**Dampak:**
- Pengguna dengan vestibular disorder atau motion sensitivity dilindungi
- WCAG 2.3.3 (Animation from Interactions) terpenuhi

---

### 11. 🧹 Hapus dangerouslySetInnerHTML
**File:** `components/DashboardLayout.tsx`

**Sebelum:**
```tsx
<style dangerouslySetInnerHTML={{__html: `
  .hide-scrollbar::-webkit-scrollbar { display: none; }
`}} />
```

**Sesudah:**
- CSS `.hide-scrollbar` dipindahkan ke `app/globals.css` sebagai static CSS
- Tidak ada lagi `dangerouslySetInnerHTML` untuk kebutuhan styling

---

### 12. 🔧 `transition-all` Diganti Specific Properties
**File:** `components/DashboardLayout.tsx`, metric cards

**Sebelum:** `transition-all hover:rotate-12 hover:scale-110`

**Sesudah:** `transition-colors` (untuk warna), `transition-[shadow,transform]` (untuk shadow+hover lift)

**Dampak:**
- Tidak lagi animate semua CSS property sekaligus (wasteful)
- GPU hanya mengurus property yang relevan

---

## 🔜 BELUM DILAKUKAN (Priority Queue)

### 🔴 HIGH PRIORITY

#### H1. Skeleton Loading States
**File yang perlu diubah:** `app/(dashboard)/page.tsx`, `app/page.tsx`, semua halaman lain
**Masalah:** Saat page load, konten langsung muncul atau blank — tidak ada feedback untuk user
**Solusi yang diperlukan:**
```tsx
// Buat komponen SkeletonCard dan SkeletonHero
// Gunakan Suspense boundary dengan skeleton sebagai fallback
<Suspense fallback={<SkeletonHero />}>
  <HeroContent />
</Suspense>
```

#### H2. TypeScript — Hapus Semua `any` Props
**File yang perlu diubah:** 
- `components/AddTransactionModal.tsx` — `wallets: any[]`, `categories: any[]`
- `components/TransactionList.tsx` — `transactions: any[]`
- `components/DashboardLayout.tsx` — `user: any`
- Semua modal components lainnya

**Solusi yang diperlukan:**
```tsx
// Definisikan interface di types/ folder
interface Wallet { id: string; name: string; currency: string }
interface Category { id: string; name: string; type: string }
interface User { id: string; name?: string | null; email?: string | null }
```

#### H3. Error Boundary
**File yang perlu dibuat:** `components/ErrorBoundary.tsx`
**Masalah:** Jika ada fetch error atau runtime error, app crash tanpa graceful handling
**Solusi yang diperlukan:**
```tsx
// React Error Boundary class component atau pakai package 'react-error-boundary'
// Wrap setiap data-heavy section
<ErrorBoundary fallback={<ErrorState />}>
  <DashboardCharts ... />
</ErrorBoundary>
```

---

### 🟠 MEDIUM PRIORITY

#### M1. Modular Type Scale
**File:** `app/globals.css`
**Masalah:** Font sizes dipakai secara acak (`text-2xl`, `text-xl`, dll) tanpa sistem rasio
**Solusi yang diperlukan:**
```css
/* Rasio 1.25 (Major Third) */
--text-xs:   clamp(0.64rem, 0.6rem + 0.2vw, 0.72rem);
--text-sm:   clamp(0.8rem,  0.75rem + 0.25vw, 0.9rem);
--text-base: clamp(1rem,    0.95rem + 0.25vw, 1.05rem);
--text-lg:   clamp(1.25rem, 1.15rem + 0.5vw, 1.35rem);
/* dst sampai text-5xl */
```

#### M2. Semantic Color Token System
**File:** `app/globals.css`
**Masalah:** Warna hardcoded di setiap komponen (`text-indigo-600`, `bg-orange-500`, dll)
**Solusi yang diperlukan:**
```css
:root {
  --color-action:      oklch(0.72 0.17 55);   /* brand orange */
  --color-action-hover: oklch(0.63 0.18 55);
  --color-income:      oklch(0.65 0.16 145);  /* green */
  --color-expense:     oklch(0.62 0.18 25);   /* rose */
  --color-neutral-text: oklch(0.55 0.02 250); /* tinted gray, bukan #666 */
}
```

#### M3. Optimistic UI untuk Delete Transaksi
**File:** `components/TransactionList.tsx`
**Masalah:** Setelah klik hapus, user harus tunggu server response sebelum list terupdate
**Solusi yang diperlukan:**
```tsx
// Hapus item dari local state segera, rollback jika error
const [optimisticTxs, removeOptimistic] = useOptimistic(transactions, ...)
```

#### M4. Micro-copy Rewrite
**File:** Multiple components
**Yang perlu diubah:**

| Sekarang | Lebih Baik |
|---|---|
| "Tambah Transaksi" | "Catat Pengeluaran / Pemasukan" |
| "Simpan Transaksi" | "Simpan & Perbarui Saldo" |
| "Belum ada transaksi bulan ini." | "Bulan ini masih bersih. Catat yang pertama." |
| "Modul Insight yang lebih cerdas akan segera hadir" | **HAPUS** atau ganti dengan konten nyata |
| "Tambah Transaksi" CTA button | Lebih kontekstual per halaman |

#### M5. Right Column Dashboard — Hapus Placeholder
**File:** `app/(dashboard)/page.tsx`, `app/page.tsx`
**Masalah:** Kolom kanan ("Perjalanan Bebas Finansial") adalah coming-soon placeholder
**Solusi:** Ganti dengan salah satu:
- Budget progress bars (% penggunaan anggaran bulan ini)
- Top 3 kategori pengeluaran terbesar
- Saving rate bulan ini (income - expense / income)

---

### 🟡 LOWER PRIORITY

#### L1. Intentional Asymmetry
**Masalah:** Semua section terlalu simetris — terasa template
**Solusi:** Break grid di 1-2 section:
```tsx
// Contoh: buat "hero" stat yang lebih besar dari yang lain
<div className="lg:col-span-2 ..."> {/* Cash — double width */}
<div> {/* Investment */}... </div>
<div> {/* ...grid 3, bukan 4 */ }
```

#### L2. Noise/Grain Texture pada Hero
**Masalah:** Hero masih terasa flat
**Solusi:**
```tsx
// Subtle SVG grain noise di atas background
<div className="absolute inset-0 opacity-[0.03]"
  style={{ backgroundImage: "url('data:image/svg+xml,...noise filter...')" }}
/>
```

#### L3. Kontras Warna — WCAG Audit
**Masalah:** Beberapa kombinasi warna teks (misal `text-slate-400` on white) kemungkinan di bawah WCAG AA 4.5:1
**Solusi:** Run axe-core atau Lighthouse accessibility audit, fix semua failing contrast ratios

#### L4. Container Queries untuk Cards
**Masalah:** Cards menggunakan viewport-based breakpoints (`md:grid-cols-2`)
**Solusi:** Migrate ke CSS container queries untuk adaptasi berbasis ukuran container, bukan viewport

#### L5. keyboard navigation di MultiSelectDropdown
**File:** `components/TransactionFilters.tsx`
**Masalah:** MultiSelectDropdown tidak bisa dioperasikan dengan keyboard (arrow keys, Enter, Escape)
**Solusi:** Implement proper `listbox` role dengan keyboard event handlers

#### L6. `aria-current="page"` pada Active Nav
**File:** `components/DashboardLayout.tsx`
**Masalah:** Screen reader tidak tahu link mana yang sedang aktif
**Solusi:**
```tsx
<Link aria-current={isActive ? 'page' : undefined} ...>
```

---

## 📈 PROGRESS SUMMARY

```
Completed: 12 items
Pending:   14 items (3 High, 5 Medium, 6 Low)
```

| Phase | Status | Items |
|---|---|---|
| Phase 1 — Critical Fixes | ✅ Done | Typography, Hero, A11y, Motion, Dark mode bug |
| Phase 2 — Design Upgrade | 🔜 Next | Skeleton, TypeScript, Error Boundary, Micro-copy |
| Phase 3 — Polish | ⏳ Later | Type scale, Tokens, Asymmetry, Container queries |

---

*Last updated: 2026-04-25 — Sesi UI Overhaul Phase 1*
