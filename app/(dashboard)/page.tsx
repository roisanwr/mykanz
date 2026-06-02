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
import { MetricCard } from '@/components/shared/MetricCard';
import { SectionCard } from '@/components/shared/SectionCard';
import { EmptyState } from '@/components/shared/EmptyState';

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
// PAGE COMPONENT (Server Component — NO event handlers allowed here)
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
  const totalInvestment = portfolios.reduce(
    (acc: number, p: { total_units: unknown; average_buy_price: unknown }) =>
      acc + Number(p.total_units || 0) * Number(p.average_buy_price || 0),
    0
  );

  let monthlyIncome  = 0;
  let monthlyExpense = 0;
  monthlyTxs.forEach((tx: { transaction_type: unknown; amount: unknown }) => {
    const a = Number(tx.amount || 0);
    if (tx.transaction_type === 'PEMASUKAN')   monthlyIncome  += a;
    if (tx.transaction_type === 'PENGELUARAN') monthlyExpense += a;
  });

  const netWorth     = totalCash + totalInvestment;
  const cashflow     = monthlyIncome - monthlyExpense;
  const currentMonth = namaBulan();

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-700"
      style={{ animationTimingFunction: 'var(--ease-out-expo)' }}>

      {/* ════════════════════════════════════════════════════════════════════
          1. HERO — Net Worth
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
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, oklch(0.70 0.185 47 / 0.6), transparent)' }}
        />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-7">
          <div className="flex-1 min-w-0">
            <LiveNetWorth
              initialCash={totalCash}
              initialInvestment={totalInvestment}
              variant="hero"
              show="total"
            />
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <Link
              href="/transactions"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white backdrop-blur-sm transition-all duration-200 border hover:brightness-110"
              style={{
                backgroundColor: 'oklch(1 0 0 / 0.08)',
                borderColor: 'oklch(1 0 0 / 0.15)',
              }}
            >
              <Plus className="w-4 h-4" /> Catat Kas
            </Link>
            <Link
              href="/portfolios/transactions"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:brightness-110"
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
          2. METRIC CARDS — using unified MetricCard component
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Tunai & Bank"
          value={fmtRupiah(totalCash)}
          sub="Saldo aktif"
          icon={Wallet}
          variant="wealth"
        />
        <MetricCard
          label="Portofolio"
          value={fmtRupiah(totalInvestment)}
          sub="Estimasi nilai beli"
          icon={Rocket}
          variant="invest"
        />
        <MetricCard
          label="Pemasukan"
          value={fmtRupiah(monthlyIncome)}
          sub={currentMonth}
          icon={TrendingUp}
          variant="wealth"
        />
        <MetricCard
          label="Pengeluaran"
          value={fmtRupiah(monthlyExpense)}
          sub={currentMonth}
          icon={TrendingDown}
          variant="expense"
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          3. LIVE NET WORTH cards (realtime) — Client Components
          Note: MetricCard above shows SSR values, LiveNetWorth shows live
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="metric-card p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-wealth-surface)' }}>
              <Wallet style={{ width: '1rem', height: '1rem', color: 'var(--color-wealth-600)' }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-wealth-600)' }}>
              Kas Live
            </p>
          </div>
          <LiveNetWorth initialCash={totalCash} initialInvestment={totalInvestment} variant="card" show="cash" />
          <p className="mt-2 text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>Real-time dari pasar</p>
        </div>
        <div className="metric-card p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-invest-surface)' }}>
              <Rocket style={{ width: '1rem', height: '1rem', color: 'var(--color-invest-600)' }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-invest-600)' }}>
              Portofolio Live
            </p>
          </div>
          <LiveNetWorth initialCash={totalCash} initialInvestment={totalInvestment} variant="card" show="investment" />
          <p className="mt-2 text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>Real-time harga aset</p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          4. CHARTS
      ════════════════════════════════════════════════════════════════════ */}
      <DashboardCharts
        income={monthlyIncome}
        expense={monthlyExpense}
        cash={totalCash}
        investments={totalInvestment}
      />

      {/* ════════════════════════════════════════════════════════════════════
          5. BOTTOM: Recent Transactions + Wealth Distribution
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

        {/* ── Recent Transactions (2/3) using SectionCard ─────────────── */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Transaksi Terakhir"
            titleIcon={Clock}
            action={
              <Link
                href="/transactions"
                className="text-xs font-bold flex items-center gap-1 group"
                style={{ color: 'var(--color-brand-500)' }}
              >
                Lihat Semua
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
          >
            <div className="space-y-0.5">
              {recentTxs.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="Belum ada transaksi"
                  description="Mulai catat pemasukan atau pengeluaranmu sekarang"
                  ctaLabel="Catat Sekarang"
                  ctaHref="/transactions"
                  minHeight="200px"
                />
              ) : (
                recentTxs.map((tx: {
                  id: string;
                  transaction_type: string;
                  amount: unknown;
                  transaction_date: Date | null;
                  categories: { name: string } | null;
                  wallets_fiat_transactions_wallet_idTowallets: { name: string };
                }) => {
                  const isPemasukan = tx.transaction_type === 'PEMASUKAN';
                  const isTransfer  = tx.transaction_type === 'TRANSFER';
                  const amount      = Number(tx.amount || 0);

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between px-3 py-3 rounded-xl transition-colors duration-150 hover:bg-[var(--color-bg-sunken)]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
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
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {tx.categories?.name || 'Lainnya'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
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
                      <p
                        className="text-sm font-black nums shrink-0 pl-3"
                        style={{
                          color: isPemasukan ? 'var(--color-wealth-500)' : 'var(--color-text-primary)',
                        }}
                      >
                        {isPemasukan ? '+' : isTransfer ? '' : '−'}{fmtRupiah(amount)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── Wealth Distribution (1/3) using SectionCard ─────────────── */}
        <SectionCard title="Distribusi" titleIcon={PieIcon}>
          {netWorth === 0 ? (
            <EmptyState
              icon={PieIcon}
              title="Belum ada kekayaan"
              description="Tambah saldo untuk mulai"
              minHeight="140px"
            />
          ) : (
            <div className="space-y-5">
              {/* Segmented bar */}
              <div
                className="w-full h-3 rounded-full overflow-hidden flex"
                style={{ backgroundColor: 'var(--color-bg-sunken)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(totalCash / netWorth) * 100}%`,
                    backgroundColor: 'var(--color-wealth-500)',
                  }}
                />
                <div
                  className="h-full rounded-full flex-1"
                  style={{ backgroundColor: 'var(--color-brand-500)' }}
                />
              </div>

              {/* Rows */}
              <div className="space-y-2">
                {[
                  {
                    label: 'Kas Bebas', value: totalCash,
                    pct: (totalCash / netWorth) * 100,
                    color: 'var(--color-wealth-500)',
                  },
                  {
                    label: 'Investasi', value: totalInvestment,
                    pct: (totalInvestment / netWorth) * 100,
                    color: 'var(--color-brand-500)',
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{
                      backgroundColor: 'var(--color-bg-sunken)',
                      border: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
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
                className="p-3 rounded-xl"
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

              <Link
                href="/goals"
                className="block w-full text-center py-2.5 rounded-xl text-sm font-bold transition-colors duration-150"
                style={{
                  backgroundColor: 'var(--color-bg-sunken)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Atur Target Impian →
              </Link>
            </div>
          )}
        </SectionCard>

      </div>
    </div>
  );
}
