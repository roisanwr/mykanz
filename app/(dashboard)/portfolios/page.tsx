// app/(dashboard)/portfolios/page.tsx
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Rocket, Package, ArrowUpRight, ArrowDownRight,
  Calendar, FileText, Plus, TrendingUp
} from 'lucide-react';
import PortfolioCharts from '@/components/PortfolioCharts';
import LiveNetWorth from '@/components/LiveNetWorth';
import LivePortfolioTable from '@/components/LivePortfolioTable';
import { SectionCard } from '@/components/shared/SectionCard';
import { EmptyState } from '@/components/shared/EmptyState';

// ── Asset Type Meta ───────────────────────────────────────────────────────────
const ASSET_TYPE_META: Record<string, { label: string; color: string }> = {
  SAHAM:       { label: 'Saham',         color: 'oklch(0.58 0.185 265)' },
  KRIPTO:      { label: 'Kriptokurensi', color: 'oklch(0.70 0.185 47)' },
  LOGAM_MULIA: { label: 'Emas / Logam',  color: 'oklch(0.78 0.160 85)' },
  PROPERTI:    { label: 'Properti',      color: 'oklch(0.64 0.185 152)' },
  BISNIS:      { label: 'Bisnis',        color: 'oklch(0.55 0.18 220)' },
  LAINNYA:     { label: 'Lainnya',       color: 'oklch(0.58 0.15 280)' },
};

const ASSET_COLORS = [
  'oklch(0.58 0.185 265)',
  'oklch(0.70 0.185 47)',
  'oklch(0.78 0.160 85)',
  'oklch(0.64 0.185 152)',
  'oklch(0.55 0.18 220)',
  'oklch(0.58 0.15 280)',
  'oklch(0.62 0.200 23)',
  'oklch(0.55 0.18 190)',
];

// ── Formatters ────────────────────────────────────────────────────────────────
const formatRupiah = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

const formatUnit = (v: string | number | null | undefined, unitName?: string | null) => {
  const num = Number(v || 0);
  const formatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 }).format(num);
  return unitName ? `${formatted} ${unitName}` : formatted;
};

export default async function PortfolioDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  const assets = await prisma.assets.findMany({
    where: { user_id: userId },
    include: { user_portfolios: { where: { user_id: userId } } },
    orderBy: { created_at: 'asc' }
  });

  const recentTxs = await prisma.asset_transactions.findMany({
    where: { user_id: userId },
    orderBy: { transaction_date: 'desc' },
    take: 8,
    include: {
      user_portfolios: {
        include: { assets: { select: { name: true, ticker_symbol: true, unit_name: true, asset_type: true } } }
      }
    }
  });

  type AssetWithPortfolio = typeof assets[number];
  const activeAssets = assets.filter((a: AssetWithPortfolio) => {
    const p = a.user_portfolios?.[0];
    return p && Number(p.total_units || 0) > 0;
  });

  let totalPortfolioValue = 0;
  const assetValues: {
    id: string; name: string; ticker: string | null; type: string;
    value: number; units: number; avgPrice: number; unitName: string | null;
  }[] = [];

  assets.forEach((a: AssetWithPortfolio) => {
    const p = a.user_portfolios?.[0];
    const units    = Number(p?.total_units || 0);
    const avgPrice = Number(p?.average_buy_price || 0);
    const value    = units * avgPrice;
    totalPortfolioValue += value;
    assetValues.push({ id: a.id, name: a.name, ticker: a.ticker_symbol, type: a.asset_type, value, units, avgPrice, unitName: a.unit_name ?? null });
  });
  assetValues.sort((a, b) => b.value - a.value);

  const allocationMap: Record<string, number> = {};
  assetValues.forEach(a => { allocationMap[a.type] = (allocationMap[a.type] || 0) + a.value; });

  const allocationData = Object.entries(allocationMap)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      name: ASSET_TYPE_META[type]?.label ?? type,
      value,
      color: ASSET_TYPE_META[type]?.color ?? 'oklch(0.58 0.15 280)',
    }));

  const assetBarData = assetValues
    .filter(a => a.value > 0)
    .slice(0, 7)
    .map((a, i) => ({
      name: a.ticker ?? a.name.slice(0, 8),
      value: a.value,
      color: ASSET_COLORS[i % ASSET_COLORS.length],
    }));

  return (
    <div className="space-y-5">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-xl p-7 sm:p-10 text-white"
        style={{
          background: `
            radial-gradient(ellipse 70% 80% at 90% -20%, oklch(0.58 0.185 265 / 0.4), transparent),
            radial-gradient(ellipse 50% 60% at -10% 90%, oklch(0.70 0.185 47 / 0.25), transparent),
            oklch(0.155 0.025 250)
          `,
        }}
      >
        {/* Dot texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        {/* Decorative icon */}
        <div className="absolute right-8 top-6 pointer-events-none" style={{ opacity: 0.04 }}>
          <Rocket width={160} height={160} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div className="flex-1">
            <LiveNetWorth
              initialCash={0}
              initialInvestment={0}
              variant="hero"
              show="investment"
              label="Total Nilai Portofolio (Live)"
            />

            {/* Stats pills */}
            <div className="flex flex-wrap gap-5 mt-6">
              {[
                { label: 'Aset Aktif', val: activeAssets.length },
                { label: 'Total Aset', val: assets.length },
                { label: 'Jenis', val: Object.keys(allocationMap).length },
              ].map((stat, i, arr) => (
                <div key={stat.label} className="flex items-center gap-5">
                  <div className="flex flex-col">
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'oklch(0.60 0.03 55)' }}>
                      {stat.label}
                    </p>
                    <p className="text-2xl font-display font-black">{stat.val}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-px h-8" style={{ backgroundColor: 'oklch(1 0 0 / 0.1)' }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 flex-wrap shrink-0">
            <Link
              href="/portfolios/assets"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white backdrop-blur-sm transition-all border hover:brightness-110"
              style={{ backgroundColor: 'oklch(1 0 0 / 0.08)', borderColor: 'oklch(1 0 0 / 0.15)' }}
            >
              <Package className="w-4 h-4" /> Data Aset
            </Link>
            <Link
              href="/portfolios/transactions"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110"
              style={{
                backgroundColor: 'var(--color-brand-500)',
                color: '#fff',
                boxShadow: '0 4px 20px oklch(0.70 0.185 47 / 0.4)',
              }}
            >
              <Plus className="w-4 h-4" /> Catat Investasi
            </Link>
          </div>
        </div>
      </div>

      {/* ── CHARTS ──────────────────────────────────────────────────────── */}
      <PortfolioCharts allocationData={allocationData} assetBarData={assetBarData} />

      {/* ── LIVE TABLE ──────────────────────────────────────────────────── */}
      <LivePortfolioTable
        assets={assetValues.map(a => ({
          id: a.id, name: a.name, ticker: a.ticker,
          type: a.type, units: a.units, avgPrice: a.avgPrice, unitName: a.unitName,
        }))}
        assetTypeMeta={ASSET_TYPE_META}
        assetColors={ASSET_COLORS}
      />

      {/* ── RECENT ACTIVITY ─────────────────────────────────────────────── */}
      <SectionCard
        title="Aktivitas Investasi Terbaru"
        titleIcon={FileText}
        action={
          <Link
            href="/portfolios/transactions"
            className="text-xs font-bold flex items-center gap-1 group"
            style={{ color: 'var(--color-invest-500)' }}
          >
            Lihat Semua <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        }
        noPadding
      >
        {recentTxs.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={TrendingUp} title="Belum ada transaksi investasi" minHeight="120px" />
          </div>
        ) : (
          <div>
            {recentTxs.map((tx) => {
              const isBeli  = tx.transaction_type === 'BELI';
              const asset   = tx.user_portfolios?.assets;
              const txAmount = Number(tx.total_amount || 0);
              const txUnits  = Number(tx.units || 0);
              const txPrice  = Number(tx.price_per_unit || 0);

              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                  style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                >
                  <div
                    className="p-2.5 rounded-xl shrink-0"
                    style={{
                      backgroundColor: isBeli ? 'var(--color-invest-surface)' : 'var(--color-expense-surface)',
                      color:            isBeli ? 'var(--color-invest-600)'    : 'var(--color-expense-600)',
                    }}
                  >
                    {isBeli
                      ? <ArrowDownRight className="w-4 h-4" />
                      : <ArrowUpRight className="w-4 h-4" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: isBeli ? 'var(--color-invest-surface)' : 'var(--color-expense-surface)',
                          color:            isBeli ? 'var(--color-invest-700)'    : 'var(--color-expense-700)',
                        }}
                      >
                        {tx.transaction_type}
                      </span>
                      <p className="font-bold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {asset?.name ?? '—'}
                        {asset?.ticker_symbol && (
                          <span className="ml-1 text-xs font-normal" style={{ color: 'var(--color-text-tertiary)' }}>
                            ({asset.ticker_symbol})
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                      {formatUnit(txUnits, asset?.unit_name)} @ {formatRupiah(txPrice)} / unit
                      {tx.notes && <span className="ml-2 italic">{tx.notes}</span>}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className="font-black text-sm nums"
                      style={{ color: isBeli ? 'var(--color-invest-600)' : 'var(--color-expense-600)' }}
                    >
                      {isBeli ? '−' : '+'}{formatRupiah(txAmount)}
                    </p>
                    <p className="text-[10px] flex items-center gap-1 justify-end mt-0.5" style={{ color: 'var(--color-text-disabled)' }}>
                      <Calendar className="w-3 h-3" />
                      {new Date(tx.transaction_date!).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

    </div>
  );
}
