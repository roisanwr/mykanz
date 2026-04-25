import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowUpRight, ArrowDownRight, Wallet, Rocket, 
  TrendingUp, TrendingDown, Clock, Plus, ArrowRight, PieChart
} from 'lucide-react';
import { Prisma } from '@prisma/client';
import DashboardCharts from '@/components/DashboardCharts';
import LiveNetWorth from '@/components/LiveNetWorth';

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  // 1. Fetch Total Wallet (Cash) Balance
  const walletsDataRaw = await prisma.$queryRaw<any[]>`
    SELECT COALESCE(SUM(wb.balance), 0) as total_balance
    FROM wallets w
    LEFT JOIN wallet_balances wb ON w.id = wb.wallet_id
    WHERE w.user_id = ${userId}::uuid AND w.deleted_at IS NULL
  `;
  const totalCash = Number(walletsDataRaw[0]?.total_balance || 0);

  // 2. Fetch Total Investment Portfolio Balance
  const portfolios = await prisma.user_portfolios.findMany({
    where: { user_id: userId }
  });
  const totalInvestment = portfolios.reduce((acc, port) => {
    const units = Number(port.total_units || 0);
    const avgPrice = Number(port.average_buy_price || 0);
    return acc + (units * avgPrice);
  }, 0);

  // 3. Fetch Monthly Cashflow (Fiat Transactions)
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const monthlyTransactions = await prisma.fiat_transactions.findMany({
    where: {
      user_id: userId,
      transaction_date: { gte: firstDayOfMonth, lte: lastDayOfMonth },
    }
  });

  let monthlyIncome = 0;
  let monthlyExpense = 0;

  monthlyTransactions.forEach(tx => {
    const amount = Number(tx.amount || 0);
    if (tx.transaction_type === 'PEMASUKAN') monthlyIncome += amount;
    if (tx.transaction_type === 'PENGELUARAN') monthlyExpense += amount;
  });

  // Calculate Net Worth
  const netWorth = totalCash + totalInvestment;

  // 4. Fetch 5 Recent Transactions
  const recentTransactions = await prisma.fiat_transactions.findMany({
    where: { user_id: userId },
    orderBy: { transaction_date: 'desc' },
    take: 5,
    include: {
      categories: true,
      wallets_fiat_transactions_wallet_idTowallets: true
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      
      {/* 1. HERO SECTION: NET WORTH — brand-specific, no AI gradient */}
      <div className="rounded-3xl p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden" style={{ backgroundColor: 'oklch(0.18 0.06 50)' }}>
        {/* Warm glow: brand orange, bukan indigo */}
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, oklch(0.72 0.18 55), transparent)' }}></div>
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, oklch(0.85 0.12 80), transparent)' }}></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <LiveNetWorth
            initialCash={totalCash}
            initialInvestment={totalInvestment}
            variant="hero"
            show="total"
          />
          
          <div className="flex gap-3">
            <Link href="/transactions" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 border border-white/10 shadow-lg shadow-black/20">
              <Plus className="w-4 h-4" /> Catat Kas
            </Link>
            <Link href="/portfolios/transactions" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 shadow-lg shadow-orange-500/30">
              <Plus className="w-4 h-4" /> Investasi
            </Link>
          </div>
        </div>
      </div>

      {/* 2. MAIN METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        
        {/* Kas Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-xl text-slate-600 dark:text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-600 dark:text-slate-400 text-sm">Tunai & Bank</h3>
          </div>
          <LiveNetWorth initialCash={totalCash} initialInvestment={totalInvestment} variant="card" show="cash" />
        </div>

        {/* Investasi Card */}
        <div className="metric-card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-[shadow,transform] duration-300 group">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Nilai Portofolio</p>
          <LiveNetWorth initialCash={totalCash} initialInvestment={totalInvestment} variant="card" show="investment" />
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
            <Rocket className="w-3.5 h-3.5 text-indigo-500" />
            <span>Estimasi nilai beli</span>
          </div>
        </div>

        {/* Pemasukan Card */}
        <div className="metric-card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-[shadow,transform] duration-300">
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-2">Pemasukan Bulan Ini</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatRupiah(monthlyIncome)}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-600 dark:text-emerald-500">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Bulan {new Date().toLocaleDateString('id-ID', { month: 'long' })}</span>
          </div>
        </div>

        {/* Pengeluaran Card */}
        <div className="metric-card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-[shadow,transform] duration-300">
          <p className="text-[10px] font-bold text-rose-600 dark:text-rose-500 uppercase tracking-widest mb-2">Pengeluaran Bulan Ini</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatRupiah(monthlyExpense)}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-rose-600 dark:text-rose-500">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Bulan {new Date().toLocaleDateString('id-ID', { month: 'long' })}</span>
          </div>
        </div>

      </div>

      {/* 3. CHARTS DATA VISUALIZATION */}
      <DashboardCharts 
        income={monthlyIncome} 
        expense={monthlyExpense} 
        cash={totalCash} 
        investments={totalInvestment} 
      />

      {/* 4. RECENT TRANSACTIONS & QUICK INFO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Recent Transactions */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" /> Transaksi Terakhir
            </h2>
            <Link href="/transactions" className="text-sm font-bold text-orange-500 dark:text-orange-400 hover:text-orange-600 flex items-center gap-1 group">
              Lihat Semua <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 font-medium">Belum ada transaksi bulan ini.</p>
              </div>
            ) : (
              recentTransactions.map((tx) => {
                const isPemasukan = tx.transaction_type === 'PEMASUKAN';
                const isTransfer = tx.transaction_type === 'TRANSFER';
                
                return (
                  <div key={tx.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors group border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl shadow-sm ${
                        isPemasukan ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' :
                        isTransfer ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' :
                        'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                      }`}>
                        {isPemasukan ? <ArrowDownRight className="w-5 h-5" /> : 
                         isTransfer ? <ArrowRight className="w-5 h-5" /> :
                         <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors">
                          {tx.categories?.name || 'Lainnya'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
                             {tx.wallets_fiat_transactions_wallet_idTowallets.name}
                          </span>
                          <span>•</span>
                          <span>{tx.transaction_date?.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                          {tx.description && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[120px]">{tx.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right pl-4">
                      <p className={`font-black tracking-tight ${
                        isPemasukan ? 'text-emerald-600 dark:text-emerald-400' : 
                        isTransfer ? 'text-slate-900 dark:text-white' : 
                        'text-slate-900 dark:text-white'
                      }`}>
                        {isPemasukan ? '+' : isTransfer ? '' : '-'}Rp {new Intl.NumberFormat('id-ID').format(Number(tx.amount))}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Distribusi Kekayaan */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
              <span className="p-1.5 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg">
                <PieChart className="w-4 h-4" />
              </span>
              Distribusi Kekayaan
            </h2>

            {netWorth === 0 ? (
              <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl relative overflow-hidden group">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest relative z-10 group-hover:scale-105 transition-transform duration-300">Net Worth Nol</p>
                <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900/50 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Visual Bar */}
                <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                  <div 
                    title={`Kas: Rp ${new Intl.NumberFormat('id-ID').format(totalCash)}`}
                    className="h-full bg-emerald-500 hover:bg-emerald-400 transition-all hover:brightness-110 cursor-help relative group"
                    style={{ width: `${(totalCash / netWorth) * 100}%` }}
                  ></div>
                  <div 
                    title={`Investasi: Rp ${new Intl.NumberFormat('id-ID').format(totalInvestment)}`}
                    className="h-full bg-orange-500 hover:bg-orange-400 transition-all hover:brightness-110 cursor-help relative group"
                    style={{ width: `${(totalInvestment / netWorth) * 100}%` }}
                  ></div>
                </div>

                {/* Legend */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Kas Bebas</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {((totalCash / netWorth) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-orange-200 dark:hover:border-orange-900 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Investasi</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {((totalInvestment / netWorth) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link href="/goals" className="mt-8 w-full block text-center bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 text-sm">
            Atur Target Impian
          </Link>
        </div>

      </div>
    </div>
  );
}
