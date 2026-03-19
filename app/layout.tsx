// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { auth } from '@/lib/auth'
import DashboardLayout from '@/components/DashboardLayout' // Import komponen mesin kita!
import { FeedbackProvider } from '@/components/FeedbackProvider'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="id" className={`${inter.className} light`}>
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