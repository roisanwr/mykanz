# 🚀 MyKanz

> **📁 Kategori:** Personal  
> **🔴 Prioritas:** Tinggi  
> **📅 Mulai:** 03 June 2026 (Format Log) 
> **🎯 Deadline:** Belum ditentukan

---

## 🎯 Tujuan Project
Membangun aplikasi personal finance tracker (Pencatat Keuangan Pribadi) yang komprehensif, modern, dan otomatis. Aplikasi ini dirancang untuk memantau arus kas dari berbagai dompet, memantau portofolio investasi dengan pembaruan harga secara real-time (live pricing), mengelola target keuangan (goals), dan mengotomatiskan pencatatan transaksi melalui integrasi notifikasi email (Gmail Push) dan bot Telegram.

## ✅ Definisi Sukses
- Aplikasi berjalan stabil dan responsif di berbagai perangkat.
- Integrasi otomatisasi transaksi via Gmail (Smart Wallet Routing) dan Telegram berjalan tanpa hambatan.
- Portofolio investasi dapat menampilkan data harga live (Saham, Kripto, Logam Mulia) secara akurat.
- Sistem bebas dari bug kritikal yang memengaruhi integritas data keuangan (seperti salah hitung rata-rata harga atau saldo dompet).

---

## 🗺️ Milestones & Roadmap
| Fase | Deskripsi | Target | Status |
|------|-----------|--------|--------|
| 1️⃣ Fase 1 | Setup dasar, Autentikasi, Manajemen Dompet & Kategori | Foundation | ✅ |
| 2️⃣ Fase 2 | Pencatatan Transaksi Kas & Integrasi Telegram Bot | Core Features | ✅ |
| 3️⃣ Fase 3 | Modul Portofolio Investasi (Live Price) & Financial Goals | Advanced Features | ✅ |
| 4️⃣ Launch | Otomatisasi Gmail Webhook, Smart Routing, Polish UI & Bug Fixes | Polish & Release | ⏳ |

---

## ✅ Task List
### 🔥 Segera
- [ ] Memastikan konfigurasi Google Cloud Pub/Sub untuk webhook Gmail push berjalan lancar di production.
- [ ] Validasi alur end-to-end integrasi Smart Wallet Routing dari email bank ke aplikasi.

### 📋 Minggu Ini
- [ ] Refactoring ringan (Deduplikasi konstanta aset ke `lib/portfolio-constants.ts`).
- [ ] Evaluasi kebutuhan penambahan tipe instrumen "Reksadana" ke dalam skema database resmi.

### 🔮 Nanti
- [ ] Pengembangan analitik lanjutan untuk arus kas dan performa investasi.
- [ ] Fitur multi-currency untuk dompet fiat (jika diperlukan).

---

## 👥 Tim / Stakeholders
| Nama | Peran | Kontak |
|------|-------|--------|
| Rois Anwar | Owner / Developer | roisanwar44@gmail.com |
| Antigravity (AI) | AI Coding Assistant | - |

---

## 🔗 Sumber Daya & Referensi
- 📄 Dokumen: `prisma/schema.prisma` (Database Schema)
- 🔗 Link: Repositori GitHub (github.com/roisanwr/mykanz), Vercel Dashboard
- 📁 Folder: `app/` (Next.js App Router), `components/` (UI Components), `lib/` (Utilities & Hooks)

---

## 📊 Progress Log
| Tanggal | Update |
|---------|--------|
| 2026-06-03 | Project overview dibuat. 6 bug utama pada modul portofolio berhasil diperbaiki (termasuk recalculate average price, fix linked fiat tx, dan perbaikan UI live portfolio). |

---

## 💭 Catatan & Ide
- Aplikasi memiliki desain estetika modern menggunakan Tailwind CSS dengan skema warna yang kaya, micro-animations, dan layout yang responsif.
- Masalah integrasi Gmail sebelumnya (NEXT_REDIRECT bug) sudah diatasi, error handling sudah dibuat lebih informatif. Jika webhook Pub/Sub masih bermasalah, perlu dilakukan pengecekan manual di Google Cloud Console.

---

## 📦 Catatan Terkait
```dataview
LIST
FROM [[MyKanz]]
WHERE file.name != this.file.name
SORT file.mtime DESC
```

---
*🚀 Project dibuat: 03 June 2026, 10:36 WIB*
