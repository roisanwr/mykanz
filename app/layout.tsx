import type { Metadata } from 'next'
import { DM_Sans, Outfit } from 'next/font/google'
import './globals.css'
import { FeedbackProvider } from '@/components/FeedbackProvider'
import GSAPProvider from '@/components/shared/GSAPProvider'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MyKanz',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
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
        {/* PWA: mobile viewport & theme */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#D9581A" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1a1c2e" media="(prefers-color-scheme: dark)" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MyKanz" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <GSAPProvider>
          <FeedbackProvider>
            {children}
            <PWAInstallPrompt />
          </FeedbackProvider>
        </GSAPProvider>
      </body>
    </html>
  )
}