// app/page.tsx
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowUpRight, ArrowDownRight, Wallet, Rocket, 
  TrendingUp, TrendingDown, Clock, Plus, ArrowRight
} from 'lucide-react';
import DashboardCharts from '@/components/DashboardCharts';
import TransactionActivityChart from '@/components/TransactionActivityChart';

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

  const netWorth = totalCash + totalInvestment;

  // 4. Fetch ALL fiat transactions for the activity chart
  const allFiatTransactions = await prisma.fiat_transactions.findMany({
    where: { user_id: userId },
    select: { transaction_date: true, transaction_type: true, amount: true },
    orderBy: { transaction_date: 'asc' }
  });

  // 5. Fetch ALL investment transactions for the activity chart
  const allInvestmentTransactions = await prisma.asset_transactions.findMany({
    where: { user_id: userId },
    select: { transaction_date: true, transaction_type: true, total_amount: true },
    orderBy: { transaction_date: 'asc' }
  });

  // Serialize dates to ISO strings for client component transfer
  const fiatForChart = allFiatTransactions.map((t: { transaction_date: Date | null; transaction_type: string; amount: any }) => ({
    transaction_date: t.transaction_date?.toISOString() ?? new Date().toISOString(),
    transaction_type: t.transaction_type,
    amount: Number(t.amount || 0)
  }));
  const investForChart = allInvestmentTransactions.map((t: { transaction_date: Date | null; transaction_type: string; total_amount: any }) => ({
    transaction_date: t.transaction_date?.toISOString() ?? new Date().toISOString(),
    transaction_type: t.transaction_type,
    amount: Number(t.total_amount || 0)
  }));

  // 6. Fetch 5 Recent Transactions for display
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
          <div>
            <p className="text-[oklch(0.85_0.06_55)] text-xs font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Total Kekayaan Bersih
            </p>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-none">
              {formatRupiah(netWorth)}
            </h1>
            <p className="text-[oklch(0.78_0.08_55)] text-sm mt-3 font-medium">
              Halo, {session.user.name}. Hari ini adalah hari yang tepat untuk mencatat.
            </p>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <Link href="/transactions" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 border border-white/10 shadow-lg shadow-black/20">
              <Plus className="w-4 h-4" /> Catat Kas
            </Link>
            <Link href="/portfolios/transactions" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 shadow-lg shadow-orange-500/30">
              <Plus className="w-4 h-4" /> Investasi
            </Link>
          </div>
        </div>
      </div>

      {/* 2. MAIN METRICS GRID — data-forward, staggered entrance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">

        <div className="metric-card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-[shadow,transform] duration-300">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tunai &amp; Bank</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formatRupiah(totalCash)}</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Saldo aktif di dompetmu</span>
          </div>
        </div>

        <div className="metric-card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-[shadow,transform] duration-300">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Nilai Portofolio</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formatRupiah(totalInvestment)}</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
            <Rocket className="w-3.5 h-3.5 text-indigo-500" />
            <span>Estimasi nilai beli</span>
          </div>
        </div>

        <div className="metric-card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-[shadow,transform] duration-300">
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-2">Pemasukan Bulan Ini</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formatRupiah(monthlyIncome)}</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-600 dark:text-emerald-500">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Bulan {new Date().toLocaleDateString('id-ID', { month: 'long' })}</span>
          </div>
        </div>

        <div className="metric-card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-[shadow,transform] duration-300">
          <p className="text-[10px] font-bold text-rose-600 dark:text-rose-500 uppercase tracking-widest mb-2">Pengeluaran Bulan Ini</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formatRupiah(monthlyExpense)}</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-rose-600 dark:text-rose-500">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Bulan {new Date().toLocaleDateString('id-ID', { month: 'long' })}</span>
          </div>
        </div>

      </div>

      {/* 3. ACTIVITY LINE CHART */}
      <TransactionActivityChart
        fiatTransactions={fiatForChart}
        investmentTransactions={investForChart}
      />

      {/* 4. CHARTS (Pie + Bar) */}
      <DashboardCharts 
        income={monthlyIncome} 
        expense={monthlyExpense} 
        cash={totalCash} 
        investments={totalInvestment} 
      />

      {/* 4. RECENT TRANSACTIONS & QUICK INFO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" /> Transaksi Terakhir
            </h2>
            <Link href="/transactions" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 group">
              Lihat Semua <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 font-medium">Belum ada transaksi.</p>
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
                        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
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
                        isPemasukan ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
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

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="bg-orange-50 dark:bg-orange-500/10 p-6 rounded-full mb-4 ring-8 ring-orange-50/50 dark:ring-orange-500/5">
            <TrendingUp className="w-12 h-12 text-orange-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Perjalanan Bebas Finansial</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Terus pantau arus kas dan investasimu. Modul Insight lebih cerdas akan segera hadir!
          </p>
          <Link href="/goals" className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-slate-900/20">
            Lihat Target Impian
          </Link>
        </div>

      </div>
    </div>
  );
}