import type { Metadata } from 'next'
import { DM_Sans, Outfit } from 'next/font/google'
import './globals.css'
import { FeedbackProvider } from '@/components/FeedbackProvider'
import GSAPProvider from '@/components/shared/GSAPProvider'

// DM Sans — body font: readable, modern, NOT overused like Inter
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--dm-sans',
  display: 'swap',
})

// Outfit — display font: clean, geometric, very readable for fintech
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MyKanz — Wealth Management',
  description: 'Pantau pergerakan aset dan target keuanganmu hari ini.',
}

// Script ini berjalan SEBELUM React render pertama kali (blocking).
// Mencegah FOUC (Flash of Unstyled Content) saat user punya preferensi dark mode.
const themeScript = `
  (function() {
    try {
      var saved = localStorage.getItem('theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (saved === 'dark' || (!saved && prefersDark)) {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // suppressHydrationWarning: class 'light'/'dark' diset oleh script di atas
    // sebelum React hydrate, jadi mismatch adalah hal yang disengaja.
    <html
      lang="id"
      className={`${dmSans.variable} ${outfit.variable} light`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-FOUC: set theme class sebelum first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body>
        <GSAPProvider>
          <FeedbackProvider>
            {children}
          </FeedbackProvider>
        </GSAPProvider>
      </body>
    </html>
  )
}