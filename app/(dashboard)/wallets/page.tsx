// app/(dashboard)/wallets/page.tsx
import { Plus, CreditCard, Banknote, Smartphone, Wallet as WalletIcon } from 'lucide-react';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AddWalletModal from '@/components/AddWalletModal';
import WalletCardActions from '@/components/WalletCardActions';

// ==========================================
// HELPER FUNCTIONS
// ==========================================
const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

const getWalletIcon = (type: string) => {
  switch (type) {
    case 'TUNAI': return <Banknote className="w-6 h-6" />;
    case 'BANK': return <CreditCard className="w-6 h-6" />;
    case 'DOMPET_DIGITAL': return <Smartphone className="w-6 h-6" />;
    default: return <CreditCard className="w-6 h-6" />;
  }
};

// ==========================================
// SERVER COMPONENT (Langsung tarik data DB!)
// ==========================================
export default async function WalletsPage() {
  // 1. Autentikasi: Ambil sesi user yang lagi login
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login'); // Lempar ke login kalau belum masuk
  }

  // 2. Fetch Data Asli! 
  // Sparky pakai $queryRaw biar kita bisa Join tabel 'wallets' dengan View 'wallet_balances' buatanmu!
  const walletsDataRaw = await prisma.$queryRaw<any[]>`
    SELECT 
      w.id, 
      w.name, 
      w.type, 
      w.currency, 
      COALESCE(wb.balance, 0) as balance
    FROM wallets w
    LEFT JOIN wallet_balances wb ON w.id = wb.wallet_id
    WHERE w.user_id = ${session.user.id}::uuid AND w.deleted_at IS NULL
    ORDER BY w.created_at ASC
  `;
  const walletsData = walletsDataRaw.map(w => ({ ...w, balance: Number(w.balance) }));

  // 3. Kalkulasi Total
  const totalBalance = walletsData.reduce((acc, curr) => acc + curr.balance, 0);

  return (
    <div className="space-y-6">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Manajemen Kas & Dompet
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pantau semua aliran uang fiat kamu di satu tempat.
          </p>
        </div>
        
        {/* Tombol ini nanti kita fungsikan buat buka Modal Tambah Dompet */}
        <AddWalletModal />
      </div>

      {/* --- STATISTIC CARD --- */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
          <Banknote className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <p className="text-slate-300 font-medium mb-1">Total Kekayaan Tunai (IDR)</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-md">
            {formatRupiah(totalBalance)}
          </h2>
        </div>
      </div>

      {/* --- WALLET GRID SECTION --- */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Daftar Dompet Aktif</h3>
        
        {/* STATE KETIKA KOSONG (Belum ada dompet di DB) */}
        {walletsData.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
            <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-full mb-4">
              <WalletIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Belum Ada Dompet</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
              Mulai perjalanan finansialmu dengan menambahkan dompet pertamamu sekarang!
            </p>
            <button className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-semibold hover:scale-105 transition-all duration-300">
              <Plus className="w-5 h-5" />
              Tambah Dompet Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {walletsData.map((wallet) => (
              <div 
                key={wallet.id} 
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-orange-300 dark:hover:border-orange-500/50 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between min-h-[160px]"
              >
                {/* Dekorasi Garis Atas */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 group-hover:from-orange-400 group-hover:to-orange-600 transition-all duration-300"></div>
                
                {/* INI DIA KOMPONEN 3 ICON MUNGILNYA! */}
                <WalletCardActions wallet={wallet} />

                {/* Bagian Atas: Icon & Badge */}
                <div className="flex flex-col items-start gap-3 mb-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300 group-hover:bg-orange-50 group-hover:text-orange-600 dark:group-hover:bg-orange-500/10 dark:group-hover:text-orange-400 transition-colors">
                    {getWalletIcon(wallet.type)}
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-extrabold px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg tracking-wider">
                      {wallet.type}
                    </span>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg tracking-wider">
                      {wallet.currency}
                    </span>
                  </div>
                </div>
                
                {/* Bagian Bawah: Nama & Saldo */}
                <div className="mt-auto pt-2">
                  <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 truncate">
                    {wallet.name}
                  </h4>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {formatRupiah(Number(wallet.balance))}
                  </p>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}