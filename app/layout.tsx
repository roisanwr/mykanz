// app/layout.tsx
import type { Metadata } from 'next'
import { DM_Sans, Syne } from 'next/font/google'
import './globals.css'
import { auth } from '@/lib/auth'
import DashboardLayout from '@/components/DashboardLayout'
import { FeedbackProvider } from '@/components/FeedbackProvider'

// DM Sans — body font: readable, modern, NOT overused like Inter
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--dm-sans',
  display: 'swap',
})

// Syne — display font: geometric, distinctive, personality
const syne = Syne({
  subsets: ['latin'],
  variable: '--syne',
  weight: ['700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MyKanz - Wealth Management Dashboard',
  description: 'Pantau pergerakan aset dan target keuanganmu hari ini.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="id" className={`${dmSans.variable} ${syne.variable} light`}>
      <body>
        <FeedbackProvider>
          {/* Kalau user login, bungkus dengan DashboardLayout. Kalau nggak (misal di halaman login), biarkan kosong */}
          {session?.user ? (
            <DashboardLayout user={session.user}>
              {children}
            </DashboardLayout>
          ) : (
            children
          )}
        </FeedbackProvider>
      </body>
    </html>
  )
}