# 🎨 Skill — UI/UX Agent Skills untuk MyKanz

Kumpulan skill yang di-install dari 2 repo:
- `nextlevelbuilder/ui-ux-pro-max-skill`
- `VoltAgent/awesome-agent-skills`

Dipilih khusus untuk memaksimalkan **UI/UX workflow** proyek MyKanz (Next.js 15, Tailwind v4, GSAP, OKLCH).

---

## 📦 Daftar Skill

### 🔥 Dari `nextlevelbuilder/ui-ux-pro-max-skill`

| Folder | Fungsi | Kapan Dipakai |
|--------|--------|----------------|
| `ui-styling/` | **67 UI Styles** — Glassmorphism, Bento Grid, Brutalism, Neumorphism, dsb. Panduan styling komponen, dark mode, Tailwind, responsive | Saat styling komponen baru, pilih visual style, dark mode |
| `design-system/` | **Design System Generator** — Buat token warna, tipografi, spacing, komponen. Token architecture, primitive/semantic tokens | Saat membangun atau mengaudit design system |
| `design/` | **Design Intelligence** — Logo design, icon design, banner art direction (22 styles), social media, slide design | Saat butuh asset visual, banner, atau social media content |
| `brand/` | **Brand Consistency** — Brand guideline checker, color palette management, typography spec, logo usage rules | Saat review konsistensi brand di semua komponen |

### ⚡ Dari `VoltAgent/awesome-agent-skills` (Official Skills)

| Folder | Sumber | Fungsi | Kapan Dipakai |
|--------|--------|--------|----------------|
| `frontend-design/` | Anthropic | **Anti-AI-Slop UI** — Aesthetic direction, font pairing, typography system, motion design, atmospheric backgrounds | Saat build page baru atau refactor UI besar |
| `vercel-web-design-guidelines/` | Vercel Labs | **Web Design Guidelines** — Best practices UI/UX dari tim Vercel | Saat review design decision |
| `vercel-react-best-practices/` | Vercel Labs | **React Best Practices** — Composition patterns, performance, bundle optimization | Saat menulis/review React components |
| `vercel-optimize/` | Vercel Labs | **Next.js Performance** — Core Web Vitals, caching, image optimization, LCP, CLS | Saat audit performa atau deploy ke Vercel |

---

## 🎯 Rekomendasi Penggunaan untuk MyKanz

### Untuk Styling Baru
```
Gunakan: ui-styling/ + frontend-design/
```
- `ui-styling` → pilih visual style (misal: Glassmorphism sesuai tema dashboard)
- `frontend-design` → implementasi dengan aesthetic direction yang konsisten

### Untuk Design System
```
Gunakan: design-system/ + brand/
```
- `design-system` → generate/audit token OKLCH yang sudah ada di globals.css
- `brand` → pastikan warna orange primary konsisten di semua komponen

### Untuk Performa
```
Gunakan: vercel-optimize/ + vercel-react-best-practices/
```
- `vercel-optimize` → audit Core Web Vitals, image optimization, caching
- `vercel-react-best-practices` → optimasi komponen React/Next.js

### Untuk Component Baru
```
Gunakan: frontend-design/ + vercel-react-best-practices/
```

---

## 🛠️ Stack MyKanz yang Didukung Skill Ini

- **Next.js 15** (App Router) — `vercel-optimize`, `vercel-react-best-practices`
- **Tailwind CSS v4** — `ui-styling`, `design-system`
- **GSAP + ScrollTrigger** — `frontend-design` (motion design guidelines)
- **OKLCH Colors** — `design-system`, `brand`
- **Dark Mode** — `ui-styling`
- **DM Sans + Syne** — `frontend-design` (typography pairing)

---

*Skill ini kompatibel dengan Claude Code, Antigravity, Cursor, Windsurf, dan tool coding AI lainnya.*
