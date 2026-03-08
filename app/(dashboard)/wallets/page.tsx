import { Plus, CreditCard, Banknote, Smartphone, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';

// ==========================================
// 1. MOCK DATA (Nanti diganti pakai Prisma/DB)
// ==========================================
const mockWallets = [
  { id: '1', name: 'Dompet Fisik', type: 'TUNAI', balance: 1500000, currency: 'IDR' },
  { id: '2', name: 'BCA Utama', type: 'BANK', balance: 12500000, currency: 'IDR' },
  { id: '3', name: 'GoPay', type: 'DOMPET_DIGITAL', balance: 350000, currency: 'IDR' },
];

const mockTotalBalance = mockWallets.reduce((acc, curr) => acc + curr.balance, 0);

// Helper untuk format Rupiah
const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

// Helper untuk memilih Ikon berdasarkan tipe dompet
const getWalletIcon = (type: string) => {
  switch (type) {
    case 'TUNAI': return <Banknote className="w-6 h-6" />;
    case 'BANK': return <CreditCard className="w-6 h-6" />;
    case 'DOMPET_DIGITAL': return <Smartphone className="w-6 h-6" />;
    default: return <CreditCard className="w-6 h-6" />;
  }
};

// ==========================================
// 2. KOMPONEN HALAMAN UTAMA
// ==========================================
export default function WalletsPage() {
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
        
        <button className="flex items-center justify-center gap-2 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-orange-500/30 hover:scale-105 transition-all duration-300">
          <Plus className="w-5 h-5" />
          Tambah Dompet
        </button>
      </div>

      {/* --- STATISTIC CARD --- */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
          <Banknote className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <p className="text-slate-300 font-medium mb-1">Total Kekayaan Tunai (IDR)</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-md">
            {formatRupiah(mockTotalBalance)}
          </h2>
        </div>
      </div>

      {/* --- WALLET GRID SECTION --- */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Daftar Dompet Aktif</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {mockWallets.map((wallet) => (
            <div 
              key={wallet.id} 
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-orange-300 dark:hover:border-orange-500/50 transition-all duration-300 group cursor-pointer relative overflow-hidden"
            >
              {/* Dekorasi Garis Atas */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 group-hover:from-orange-400 group-hover:to-orange-600 transition-all duration-300"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300 group-hover:bg-orange-50 group-hover:text-orange-600 dark:group-hover:bg-orange-500/10 dark:group-hover:text-orange-400 transition-colors">
                  {getWalletIcon(wallet.type)}
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-md">
                  {wallet.type}
                </span>
              </div>
              
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  {wallet.name}
                </h4>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                  {formatRupiah(wallet.balance)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}