// app/(dashboard)/portfolios/page.tsx
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Rocket, TrendingUp, Package, ArrowUpRight, ArrowDownRight,
  Calendar, FileText, Plus
} from 'lucide-react';
import PortfolioCharts from '@/components/PortfolioCharts';
import LiveNetWorth from '@/components/LiveNetWorth';
import LivePortfolioTable from '@/components/LivePortfolioTable';

// ── Asset Type Meta ──────────────────────────────────────
const ASSET_TYPE_META: Record<string, { label: string; color: string }> = {
  SAHAM:       { label: 'Saham',         color: '#6366f1' },
  KRIPTO:      { label: 'Kriptokurensi', color: '#f97316' },
  LOGAM_MULIA: { label: 'Emas / Logam',  color: '#eab308' },
  PROPERTI:    { label: 'Properti',      color: '#10b981' },
  BISNIS:      { label: 'Bisnis',        color: '#3b82f6' },
  LAINNYA:     { label: 'Lainnya',       color: '#8b5cf6' },
};

const ASSET_COLORS = ['#6366f1','#f97316','#eab308','#10b981','#3b82f6','#8b5cf6','#ef4444','#06b6d4'];

// ── Formatters ───────────────────────────────────────────
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

  // 1. Fetch all assets with their portfolio position
  const assets = await prisma.assets.findMany({
    where: { user_id: userId },
    include: {
      user_portfolios: { where: { user_id: userId } }
    },
    orderBy: { created_at: 'asc' }
  });

  // 2. Fetch recent investment transactions (last 8)
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

  // 3. Compute portfolio stats
  type AssetWithPortfolio = typeof assets[number];
  const activeAssets = assets.filter((a: AssetWithPortfolio) => {
    const p = a.user_portfolios?.[0];
    return p && Number(p.total_units || 0) > 0;
  });

  let totalPortfolioValue = 0;
  const assetValues: { id: string; name: string; ticker: string | null; type: string; value: number; units: number; avgPrice: number; unitName: string | null }[] = [];

  assets.forEach((a: AssetWithPortfolio) => {
    const p = a.user_portfolios?.[0];
    const units = Number(p?.total_units || 0);
    const avgPrice = Number(p?.average_buy_price || 0);
    const value = units * avgPrice;
    totalPortfolioValue += value;
    assetValues.push({
      id: a.id,
      name: a.name,
      ticker: a.ticker_symbol,
      type: a.asset_type,
      value,
      units,
      avgPrice,
      unitName: a.unit_name ?? null
    });
  });

  // Sort by value desc
  assetValues.sort((a, b) => b.value - a.value);

  // 4. Allocation per type (for donut chart)
  const allocationMap: Record<string, number> = {};
  assetValues.forEach(a => {
    allocationMap[a.type] = (allocationMap[a.type] || 0) + a.value;
  });
  const allocationData = Object.entries(allocationMap)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      name: ASSET_TYPE_META[type]?.label ?? type,
      value,
      color: ASSET_TYPE_META[type]?.color ?? '#8b5cf6'
    }));

  // 5. Per-asset bar data (top 7)
  const assetBarData = assetValues
    .filter(a => a.value > 0)
    .slice(0, 7)
    .map((a, i) => ({
      name: a.ticker ?? a.name.slice(0, 8),
      value: a.value,
      color: ASSET_COLORS[i % ASSET_COLORS.length]
    }));

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">

      {/* ── HERO ─────────────────────────────────────────── */}
      <div
        className="rounded-3xl p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden group"
        style={{ backgroundColor: 'oklch(0.18 0.06 50)' }}
      >
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }} />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-orange-500 rounded-full blur-[120px] opacity-20 mix-blend-screen group-hover:opacity-30 transition-opacity duration-1000" />

        <div className="absolute top-6 right-8 opacity-[0.04]">
          <Rocket className="w-48 h-48" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-8 lg:gap-12">
          <div className="flex-1">
            <LiveNetWorth
              initialCash={0}
              initialInvestment={totalPortfolioValue}
              variant="hero"
              show="investment"
              label="Total Nilai Portofolio"
            />
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Aset Aktif</p>
                <p className="text-2xl font-display font-black">{activeAssets.length}</p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Total Aset</p>
                <p className="text-2xl font-display font-black">{assets.length}</p>
              </div>
              <div className="w-px bg-white/10" />
              <div className="flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Jenis</p>
                <p className="text-2xl font-display font-black">{Object.keys(allocationMap).length}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap md:flex-col lg:flex-row shrink-0">
            <Link href="/portfolios/assets" className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl text-sm font-bold transition-[transform,background-color] hover:-translate-y-0.5 border border-white/10">
              <Package className="w-4 h-4" /> Data Aset
            </Link>
            <Link href="/portfolios/transactions" className="flex items-center justify-center gap-2 bg-white text-orange-950 hover:bg-orange-50 px-6 py-3 rounded-xl text-sm font-bold transition-[transform,background-color] hover:-translate-y-0.5 shadow-xl shadow-orange-900/20">
              <Plus className="w-4 h-4" /> Catat Investasi
            </Link>
          </div>
        </div>
      </div>

      {/* ── CHARTS ───────────────────────────────────────── */}
      <PortfolioCharts allocationData={allocationData} assetBarData={assetBarData} />

      {/* ── LIVE ASSET TABLE ─────────────────────────────── */}
      <LivePortfolioTable
        assets={assetValues.map(a => ({
          id: a.id,
          name: a.name,
          ticker: a.ticker,
          type: a.type,
          units: a.units,
          avgPrice: a.avgPrice,
          unitName: a.unitName,
        }))}
        assetTypeMeta={ASSET_TYPE_META}
        assetColors={ASSET_COLORS}
      />

      {/* ── RECENT ACTIVITY ──────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" /> Aktivitas Investasi Terbaru
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">8 transaksi terakhir</p>
          </div>
          <Link href="/portfolios/transactions" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
            Lihat Semua <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTxs.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">Belum ada transaksi investasi.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {recentTxs.map((tx) => {
              const isBeli = tx.transaction_type === 'BELI';
              const asset = tx.user_portfolios?.assets;
              const txAmount = Number(tx.total_amount || 0);
              const txUnits = Number(tx.units || 0);
              const txPrice = Number(tx.price_per_unit || 0);
              return (
                <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    isBeli
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                      : 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
                  }`}>
                    {isBeli ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        isBeli ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                               : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                      }`}>
                        {tx.transaction_type}
                      </span>
                      <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {asset?.name ?? '—'}
                        {asset?.ticker_symbol && <span className="ml-1 text-slate-400 font-normal text-xs">({asset.ticker_symbol})</span>}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatUnit(txUnits, asset?.unit_name)} @ {formatRupiah(txPrice)} / unit
                      {tx.notes && <span className="ml-2 italic text-slate-400">• {tx.notes}</span>}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`font-black text-sm ${isBeli ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isBeli ? '-' : '+'}{formatRupiah(txAmount)}
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(tx.transaction_date!).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
