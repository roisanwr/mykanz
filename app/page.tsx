// app/page.tsx
import { auth } from '@/lib/auth'
// Tambahkan import ikon ini:
import { Plus, Landmark } from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mt-2 lg:mt-0">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight animate-fade-in">
            Halo, Sultan {session?.user?.name || 'Anonim'}! 👑
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Pantau pergerakan aset dan target keuanganmu hari ini.</p>
        </div>
        
        <button className="bg-gradient-to-r from-wealth-500 to-wealth-600 hover:from-primary-500 hover:to-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-[0_4px_15px_rgba(34,197,94,0.4)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.6)] hover:-translate-y-0.5 flex items-center gap-2">
          {/* Ganti <i> dengan komponen ikon */}
          <Plus className="w-4 h-4" /> Catat Transaksi
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 sudut-custom border border-wealth-200 dark:border-wealth-700/50 p-5 shadow-sm relative overflow-hidden group card-hover glow-orange-hover">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-wealth-400/20 dark:bg-wealth-500/10 rounded-full blur-2xl group-hover:bg-primary-400/40 transition-colors duration-500"></div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Kekayaan Bersih</p>
            <div className="bg-gradient-to-br from-wealth-100 to-wealth-200 dark:from-wealth-900/60 dark:to-wealth-800/60 p-2.5 rounded-xl text-wealth-600 dark:text-wealth-400 group-hover:text-primary-600 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-sm">
              {/* Ganti <i> dengan komponen ikon */}
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 relative z-10">
            <span className="text-gray-500 dark:text-gray-400 font-bold">Rp</span>
            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">0</h3>
          </div>
        </div>
      </div>
    </>
  )
}