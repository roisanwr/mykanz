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
      <div className="bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-500 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-700" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-violet-500 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-700" />
        <div className="absolute top-4 right-6 opacity-[0.07]">
          <Rocket className="w-52 h-52" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-indigo-300 font-semibold mb-2 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              Total Nilai Portofolio
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-4">
              {formatRupiah(totalPortfolioValue)}
            </h1>
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2">
                <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-wider">Aset Aktif</p>
                <p className="text-white font-black text-xl">{activeAssets.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2">
                <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-wider">Total Aset</p>
                <p className="text-white font-black text-xl">{assets.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2">
                <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-wider">Jenis</p>
                <p className="text-white font-black text-xl">{Object.keys(allocationMap).length}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Link href="/portfolios/assets" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 border border-white/10">
              <Package className="w-4 h-4" /> Data Aset
            </Link>
            <Link href="/portfolios/transactions" className="flex items-center gap-2 bg-violet-500 hover:bg-violet-600 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 shadow-lg shadow-violet-500/30">
              <Plus className="w-4 h-4" /> Catat Investasi
            </Link>
          </div>
        </div>
      </div>

      {/* ── CHARTS ───────────────────────────────────────── */}
      <PortfolioCharts allocationData={allocationData} assetBarData={assetBarData} />

      {/* ── ASSET TABLE ──────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Kepemilikan Aset</h2>
            <p className="text-xs text-slate-400 mt-0.5">Diurutkan berdasarkan nilai estimasi tertinggi</p>
          </div>
          <Link href="/portfolios/assets" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
            Kelola Aset <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {assetValues.length === 0 ? (
          <div className="p-12 text-center">
            <Rocket className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Belum ada posisi aset.</p>
            <Link href="/portfolios/assets" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              <Plus className="w-4 h-4" /> Tambah Aset Pertama
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/30">
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Aset</th>
                  <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Unit</th>
                  <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Harga Rata-rata</th>
                  <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Estimasi Nilai</th>
                  <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">% Portfolio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {assetValues.map((a, i) => {
                  const pct = totalPortfolioValue > 0 ? (a.value / totalPortfolioValue) * 100 : 0;
                  const meta = ASSET_TYPE_META[a.type];
                  const color = ASSET_COLORS[i % ASSET_COLORS.length];
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {a.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {a.ticker && (
                                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                                  {a.ticker}
                                </span>
                              )}
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}20`, color: color }}>
                                {meta?.label ?? a.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {formatUnit(a.units, a.unitName)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {a.avgPrice > 0 ? formatRupiah(a.avgPrice) : <span className="text-slate-400">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-black" style={{ color: a.value > 0 ? color : '#94a3b8' }}>
                          {a.value > 0 ? formatRupiah(a.value) : <span className="text-slate-400 font-normal">—</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {pct.toFixed(1)}%
                          </span>
                          <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* FOOTER: total */}
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-700/30 border-t-2 border-slate-200 dark:border-slate-600">
                  <td className="px-5 py-3 text-sm font-black text-slate-900 dark:text-white" colSpan={3}>Total Portofolio</td>
                  <td className="px-4 py-3 text-right text-sm font-black text-indigo-600 dark:text-indigo-400">
                    {formatRupiah(totalPortfolioValue)}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-black text-slate-900 dark:text-white">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

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
