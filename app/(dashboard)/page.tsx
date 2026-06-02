import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowUpRight, ArrowDownRight, Wallet, Rocket,
  TrendingUp, TrendingDown, Clock, Plus, ArrowRight,
  PieChart as PieIcon,
} from 'lucide-react';
import DashboardCharts from '@/components/DashboardCharts';
import LiveNetWorth from '@/components/LiveNetWorth';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n);

const fmtCompact = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    notation: 'compact', maximumFractionDigits: 1,
  }).format(n);

const namaBulan = () =>
  new Date().toLocaleDateString('id-ID', { month: 'long' });

// ── Relative date helper ──────────────────────────────────────────────────────
function relativeDate(date: Date | null | undefined): string {
  if (!date) return '';
  const now  = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60)     return 'Baru saja';
  if (diff < 3600)   return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 172800) return 'Kemarin';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  const now             = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // All queries in parallel — no waterfall
  const [walletsRaw, portfolios, monthlyTxs, recentTxs] = await Promise.all([
    prisma.$queryRaw<{ total_balance: unknown }[]>`
      SELECT COALESCE(SUM(wb.balance), 0) AS total_balance
      FROM wallets w
      LEFT JOIN wallet_balances wb ON w.id = wb.wallet_id
      WHERE w.user_id = ${userId}::uuid AND w.deleted_at IS NULL
    `,
    prisma.user_portfolios.findMany({ where: { user_id: userId } }),
    prisma.fiat_transactions.findMany({
      where: {
        user_id: userId,
        transaction_date: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      },
    }),
    prisma.fiat_transactions.findMany({
      where: { user_id: userId },
      orderBy: { transaction_date: 'desc' },
      take: 6,
      include: {
        categories: true,
        wallets_fiat_transactions_wallet_idTowallets: true,
      },
    }),
  ]);

  const totalCash = Number(walletsRaw[0]?.total_balance || 0);
  const totalInvestment = portfolios.reduce((acc, p) =>
    acc + Number(p.total_units || 0) * Number(p.average_buy_price || 0), 0);

  let monthlyIncome = 0;
  let monthlyExpense = 0;
  monthlyTxs.forEach(tx => {
    const a = Number(tx.amount || 0);
    if (tx.transaction_type === 'PEMASUKAN')   monthlyIncome  += a;
    if (tx.transaction_type === 'PENGELUARAN') monthlyExpense += a;
  });

  const netWorth = totalCash + totalInvestment;
  const cashflow = monthlyIncome - monthlyExpense;
  const currentMonth = namaBulan();

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-700" style={{ animationTimingFunction: 'var(--ease-out-expo)' }}>

      {/* ════════════════════════════════════════════════════════════════════
          1. HERO — Net Worth
          Layered: base dark → radial glow → noise grain → content
      ════════════════════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden rounded-xl p-7 sm:p-10"
        style={{
          background: `
            radial-gradient(ellipse 80% 80% at 80% -10%, oklch(0.70 0.185 47 / 0.35), transparent),
            radial-gradient(ellipse 50% 60% at -10% 80%, oklch(0.64 0.185 152 / 0.20), transparent),
            oklch(0.155 0.025 250)
          `,
        }}
      >
        {/* Subtle grid texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, oklch(0.70 0.185 47 / 0.6), transparent)' }}
        />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-7">
          {/* Net Worth display */}
          <div className="flex-1 min-w-0">
            <LiveNetWorth
              initialCash={totalCash}
              initialInvestment={totalInvestment}
              variant="hero"
              show="total"
            />
          </div>

          {/* CTA buttons */}
          <div className="flex gap-3 shrink-0 flex-wrap">
            <Link
              href="/transactions"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white backdrop-blur-sm transition-all duration-200 border"
              style={{
                backgroundColor: 'oklch(1 0 0 / 0.08)',
                borderColor: 'oklch(1 0 0 / 0.15)',
              }}
              onMouseEnter={undefined}
            >
              <Plus className="w-4 h-4" /> Catat Kas
            </Link>
            <Link
              href="/portfolios/transactions"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200"
              style={{
                backgroundColor: 'var(--color-brand-500)',
                boxShadow: '0 4px 20px oklch(0.70 0.185 47 / 0.4)',
              }}
            >
              <Plus className="w-4 h-4" /> Investasi
            </Link>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          2. METRIC CARDS — 4-column grid
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

        {/* Tunai & Bank */}
        <div className="metric-card p-5 group">
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="p-2 rounded-lg transition-colors duration-200"
              style={{ backgroundColor: 'var(--color-wealth-surface)', color: 'var(--color-wealth-600)' }}
            >
              <Wallet style={{ width: '1rem', height: '1rem' }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
              Tunai & Bank
            </p>
          </div>
          <LiveNetWorth initialCash={totalCash} initialInvestment={totalInvestment} variant="card" show="cash" />
          <p className="mt-2.5 text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-wealth-500)' }}>
            <TrendingUp style={{ width: '0.75rem', height: '0.75rem' }} />
            Saldo aktif
          </p>
        </div>

        {/* Nilai Portofolio */}
        <div className="metric-card p-5 group">
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="p-2 rounded-lg transition-colors duration-200"
              style={{ backgroundColor: 'var(--color-invest-surface)', color: 'var(--color-invest-600)' }}
            >
              <Rocket style={{ width: '1rem', height: '1rem' }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
              Portofolio
            </p>
          </div>
          <LiveNetWorth initialCash={totalCash} initialInvestment={totalInvestment} variant="card" show="investment" />
          <p className="mt-2.5 text-xs font-medium" style={{ color: 'var(--color-text-disabled)' }}>
            Estimasi nilai beli
          </p>
        </div>

        {/* Pemasukan */}
        <div className="metric-card p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'var(--color-wealth-surface)', color: 'var(--color-wealth-600)' }}
            >
              <TrendingUp style={{ width: '1rem', height: '1rem' }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-wealth-600)' }}>
              Pemasukan
            </p>
          </div>
          <p className="font-black tracking-tight nums" style={{ fontSize: 'var(--text-2xl)', color: 'var(--color-text-primary)' }}>
            {fmtRupiah(monthlyIncome)}
          </p>
          <p className="mt-2.5 text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
            {currentMonth}
          </p>
        </div>

        {/* Pengeluaran */}
        <div className="metric-card p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'var(--color-expense-surface)', color: 'var(--color-expense-600)' }}
            >
              <TrendingDown style={{ width: '1rem', height: '1rem' }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-expense-600)' }}>
              Pengeluaran
            </p>
          </div>
          <p className="font-black tracking-tight nums" style={{ fontSize: 'var(--text-2xl)', color: 'var(--color-text-primary)' }}>
            {fmtRupiah(monthlyExpense)}
          </p>
          <p className="mt-2.5 text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
            {currentMonth}
          </p>
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════════
          3. CHARTS
      ════════════════════════════════════════════════════════════════════ */}
      <DashboardCharts
        income={monthlyIncome}
        expense={monthlyExpense}
        cash={totalCash}
        investments={totalInvestment}
      />

      {/* ════════════════════════════════════════════════════════════════════
          4. BOTTOM GRID — Recent Transactions + Wealth Distribution
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* ── Recent Transactions (2/3 width) ─────────────────────────── */}
        <div
          className="lg:col-span-2 rounded-xl p-5 sm:p-6"
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2
              className="font-display font-bold flex items-center gap-2"
              style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-primary)' }}
            >
              <span
                className="p-1.5 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg-sunken)', color: 'var(--color-text-tertiary)' }}
              >
                <Clock style={{ width: '0.875rem', height: '0.875rem' }} />
              </span>
              Transaksi Terakhir
            </h2>
            <Link
              href="/transactions"
              className="text-xs font-bold flex items-center gap-1 transition-colors duration-150 group"
              style={{ color: 'var(--color-brand-500)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-brand-600)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-brand-500)' }}
            >
              Lihat Semua
              <ArrowRight
                style={{ width: '0.875rem', height: '0.875rem', transition: 'transform 150ms var(--ease-spring)' }}
                className="group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          {/* List */}
          <div className="space-y-1">
            {recentTxs.length === 0 ? (
              // Empty state
              <div
                className="py-12 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-disabled)' }}
              >
                <Clock style={{ width: '2rem', height: '2rem', opacity: 0.4 }} />
                <div className="text-center">
                  <p className="text-sm font-semibold">Belum ada transaksi</p>
                  <p className="text-xs mt-1">Mulai catat pemasukan atau pengeluaranmu</p>
                </div>
                <Link
                  href="/transactions"
                  className="mt-1 px-4 py-2 rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--color-brand-500)' }}
                >
                  Catat Sekarang
                </Link>
              </div>
            ) : (
              recentTxs.map((tx) => {
                const isPemasukan = tx.transaction_type === 'PEMASUKAN';
                const isTransfer  = tx.transaction_type === 'TRANSFER';
                const amount      = Number(tx.amount || 0);

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-150 group"
                    style={{ borderWidth: '1px', borderColor: 'transparent' }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.backgroundColor = 'var(--color-bg-sunken)';
                      el.style.borderColor = 'var(--color-border-subtle)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.backgroundColor = '';
                      el.style.borderColor = 'transparent';
                    }}
                  >
                    {/* Left: icon + info */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Type icon */}
                      <div
                        className="p-2 rounded-xl shrink-0"
                        style={{
                          backgroundColor: isPemasukan
                            ? 'var(--color-wealth-surface)'
                            : isTransfer
                            ? 'var(--color-invest-surface)'
                            : 'var(--color-expense-surface)',
                          color: isPemasukan
                            ? 'var(--color-wealth-600)'
                            : isTransfer
                            ? 'var(--color-invest-600)'
                            : 'var(--color-expense-600)',
                        }}
                      >
                        {isPemasukan
                          ? <ArrowDownRight style={{ width: '1rem', height: '1rem' }} />
                          : isTransfer
                          ? <ArrowRight style={{ width: '1rem', height: '1rem' }} />
                          : <ArrowUpRight style={{ width: '1rem', height: '1rem' }} />
                        }
                      </div>

                      {/* Text */}
                      <div className="min-w-0">
                        <p
                          className="text-sm font-semibold truncate transition-colors duration-150"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {tx.categories?.name || 'Lainnya'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span
                            className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--color-bg-sunken)',
                              color: 'var(--color-text-tertiary)',
                            }}
                          >
                            {tx.wallets_fiat_transactions_wallet_idTowallets.name}
                          </span>
                          <span style={{ color: 'var(--color-text-disabled)', fontSize: '10px' }}>·</span>
                          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                            {relativeDate(tx.transaction_date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: amount */}
                    <p
                      className="text-sm font-black nums shrink-0 pl-3"
                      style={{
                        color: isPemasukan
                          ? 'var(--color-wealth-500)'
                          : 'var(--color-text-primary)',
                      }}
                    >
                      {isPemasukan ? '+' : isTransfer ? '' : '−'}
                      {fmtRupiah(amount)}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Wealth Distribution (1/3 width) ─────────────────────────── */}
        <div
          className="rounded-xl p-5 sm:p-6 flex flex-col"
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <h2
            className="font-display font-bold flex items-center gap-2 mb-5"
            style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-primary)' }}
          >
            <span
              className="p-1.5 rounded-lg"
              style={{ backgroundColor: 'var(--color-brand-surface)', color: 'var(--color-brand-600)' }}
            >
              <PieIcon style={{ width: '0.875rem', height: '0.875rem' }} />
            </span>
            Distribusi
          </h2>

          {netWorth === 0 ? (
            // Empty state
            <div
              className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-disabled)', minHeight: '140px' }}
            >
              <p className="text-sm font-semibold">Belum ada kekayaan</p>
              <p className="text-xs">Tambah saldo untuk mulai</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-5">
              {/* Segmented bar */}
              <div>
                <div
                  className="w-full h-3 rounded-full overflow-hidden flex gap-0.5"
                  style={{ backgroundColor: 'var(--color-bg-sunken)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(totalCash / netWorth) * 100}%`,
                      backgroundColor: 'var(--color-wealth-500)',
                      transitionTimingFunction: 'var(--ease-out-expo)',
                    }}
                    title={`Kas: ${fmtRupiah(totalCash)}`}
                  />
                  <div
                    className="h-full rounded-full flex-1 transition-all duration-700"
                    style={{
                      backgroundColor: 'var(--color-brand-500)',
                      transitionTimingFunction: 'var(--ease-out-expo)',
                    }}
                    title={`Investasi: ${fmtRupiah(totalInvestment)}`}
                  />
                </div>
              </div>

              {/* Breakdown rows */}
              <div className="space-y-2.5">
                {[
                  { label: 'Kas Bebas', value: totalCash, pct: (totalCash / netWorth) * 100, color: 'var(--color-wealth-500)', surface: 'var(--color-wealth-surface)', textColor: 'var(--color-wealth-700)' },
                  { label: 'Investasi', value: totalInvestment, pct: (totalInvestment / netWorth) * 100, color: 'var(--color-brand-500)', surface: 'var(--color-brand-surface)', textColor: 'var(--color-brand-700)' },
                ].map(item => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 rounded-xl transition-colors duration-150"
                    style={{ backgroundColor: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-subtle)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = item.color }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-subtle)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black nums" style={{ color: 'var(--color-text-primary)' }}>
                        {item.pct.toFixed(1)}%
                      </span>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-disabled)' }}>
                        {fmtCompact(item.value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cashflow summary */}
              <div
                className="mt-auto p-3 rounded-xl"
                style={{ backgroundColor: cashflow >= 0 ? 'var(--color-wealth-surface)' : 'var(--color-expense-surface)' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                  Selisih {currentMonth}
                </p>
                <p
                  className="text-base font-black nums mt-0.5"
                  style={{ color: cashflow >= 0 ? 'var(--color-wealth-600)' : 'var(--color-expense-600)' }}
                >
                  {cashflow >= 0 ? '+' : ''}{fmtRupiah(cashflow)}
                </p>
              </div>
            </div>
          )}

          {/* CTA */}
          <Link
            href="/goals"
            className="mt-4 w-full text-center py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
            style={{
              backgroundColor: 'var(--color-bg-sunken)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.backgroundColor = 'var(--color-brand-surface)';
              el.style.color = 'var(--color-brand-600)';
              el.style.borderColor = 'var(--color-brand-300)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.backgroundColor = 'var(--color-bg-sunken)';
              el.style.color = 'var(--color-text-secondary)';
              el.style.borderColor = 'var(--color-border)';
            }}
          >
            Atur Target Impian →
          </Link>
        </div>

      </div>
    </div>
  );
}
