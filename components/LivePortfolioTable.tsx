'use client';

import { useLivePrices, AssetPrice } from '@/lib/useLivePrices';
import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

// ─── Formatters ─────────────────────────────────────────
const formatRupiah = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

const formatUnit = (v: number, unitName?: string | null) => {
  const formatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 }).format(v);
  return unitName ? `${formatted} ${unitName}` : formatted;
};

const formatPct = (v: number) => {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
};

// ─── Types ──────────────────────────────────────────────
interface AssetRow {
  id: string;
  name: string;
  ticker: string | null;
  type: string;
  units: number;
  avgPrice: number;
  unitName: string | null;
}

interface LivePortfolioTableProps {
  assets: AssetRow[];
  assetTypeMeta: Record<string, { label: string; color: string }>;
  assetColors: string[];
}

const ASSET_TYPE_META: Record<string, { label: string; color: string }> = {
  SAHAM:       { label: 'Saham',         color: '#6366f1' },
  KRIPTO:      { label: 'Kriptokurensi', color: '#f97316' },
  LOGAM_MULIA: { label: 'Emas / Logam',  color: '#eab308' },
  PROPERTI:    { label: 'Properti',      color: '#10b981' },
  BISNIS:      { label: 'Bisnis',        color: '#3b82f6' },
  LAINNYA:     { label: 'Lainnya',       color: '#8b5cf6' },
};

const ASSET_COLORS = ['#6366f1','#f97316','#eab308','#10b981','#3b82f6','#8b5cf6','#ef4444','#06b6d4'];

export default function LivePortfolioTable({
  assets,
  assetTypeMeta = ASSET_TYPE_META,
  assetColors = ASSET_COLORS,
}: LivePortfolioTableProps) {
  const { prices, netWorth, isValidating, updatedAt, getPriceChanges } = useLivePrices();
  const [flashMap, setFlashMap] = useState<Record<string, string>>({});
  const prevPricesRef = useRef<Record<string, number>>({});

  // Compute live values
  const liveAssets = assets.map((a) => {
    const livePrice = prices[a.id];
    const pricePerUnit = livePrice?.price ?? (a.avgPrice > 0 ? a.avgPrice : 0);
    const marketValue = a.units * pricePerUnit;
    const costBasis = a.units * a.avgPrice;
    const unrealizedPL = a.avgPrice > 0 ? marketValue - costBasis : 0;
    const unrealizedPLPct = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;
    const change24h = livePrice?.change24h;
    const source = livePrice?.source ?? 'MANUAL';

    return {
      ...a,
      pricePerUnit,
      marketValue,
      costBasis,
      unrealizedPL,
      unrealizedPLPct,
      change24h,
      source,
      hasLivePrice: !!livePrice,
    };
  });

  // Sort by market value desc
  liveAssets.sort((a, b) => b.marketValue - a.marketValue);

  const totalMarketValue = liveAssets.reduce((sum, a) => sum + a.marketValue, 0);

  // Flash animation when prices change
  useEffect(() => {
    const newFlash: Record<string, string> = {};
    for (const a of liveAssets) {
      const prevPrice = prevPricesRef.current[a.id];
      if (prevPrice !== undefined && prevPrice !== a.pricePerUnit) {
        newFlash[a.id] = a.pricePerUnit > prevPrice ? 'price-flash-up' : 'price-flash-down';
      }
    }
    setFlashMap(newFlash);

    // Save current prices
    const curr: Record<string, number> = {};
    for (const a of liveAssets) {
      curr[a.id] = a.pricePerUnit;
    }
    prevPricesRef.current = curr;

    if (Object.keys(newFlash).length > 0) {
      const timer = setTimeout(() => setFlashMap({}), 1500);
      return () => clearTimeout(timer);
    }
  }, [JSON.stringify(prices)]);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Kepemilikan Aset
            {isValidating && <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
            Harga diperbarui otomatis setiap 15 detik
            {updatedAt && (
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                🔴 LIVE
              </span>
            )}
          </p>
        </div>
        {updatedAt && (
          <span className="text-[10px] text-slate-400 font-medium">
            {new Date(updatedAt).toLocaleTimeString('id-ID')}
          </span>
        )}
      </div>

      {liveAssets.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-slate-400 font-medium">Belum ada posisi aset.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/30">
                <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Aset</th>
                <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Unit</th>
                <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">
                  Harga Live
                </th>
                <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">24h</th>
                <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Nilai Pasar</th>
                <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Untung/Rugi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {liveAssets.map((a, i) => {
                const pct = totalMarketValue > 0 ? (a.marketValue / totalMarketValue) * 100 : 0;
                const meta = assetTypeMeta[a.type];
                const color = assetColors[i % assetColors.length];
                const flash = flashMap[a.id] || '';

                return (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                    {/* Asset Name */}
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
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}20`, color }}>
                              {meta?.label ?? a.type}
                            </span>
                            {a.hasLivePrice && (
                              <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1 py-0.5 rounded">
                                API
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Units */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {formatUnit(a.units, a.unitName)}
                      </span>
                    </td>

                    {/* Live Price */}
                    <td className="px-4 py-3.5 text-right">
                      <span className={`text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors duration-500 ${flash}`}>
                        {a.pricePerUnit > 0 ? formatRupiah(a.pricePerUnit) : <span className="text-slate-400">—</span>}
                      </span>
                    </td>

                    {/* 24h Change */}
                    <td className="px-4 py-3.5 text-right">
                      {a.change24h !== undefined && a.change24h !== null ? (
                        <span className={`text-xs font-bold flex items-center justify-end gap-0.5 ${
                          a.change24h > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                          a.change24h < 0 ? 'text-red-500 dark:text-red-400' :
                          'text-slate-400'
                        }`}>
                          {a.change24h > 0 ? <TrendingUp className="w-3 h-3" /> :
                           a.change24h < 0 ? <TrendingDown className="w-3 h-3" /> :
                           <Minus className="w-3 h-3" />}
                          {formatPct(a.change24h)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Market Value */}
                    <td className="px-4 py-3.5 text-right">
                      <span className={`text-sm font-black transition-colors duration-500 ${flash}`} style={{ color: a.marketValue > 0 ? color : '#94a3b8' }}>
                        {a.marketValue > 0 ? formatRupiah(a.marketValue) : <span className="text-slate-400 font-normal">—</span>}
                      </span>
                    </td>

                    {/* Unrealized P/L */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col items-end gap-0.5">
                        {a.avgPrice > 0 && a.units > 0 ? (
                          <>
                            <span className={`text-xs font-bold ${
                              a.unrealizedPL > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                              a.unrealizedPL < 0 ? 'text-red-500 dark:text-red-400' :
                              'text-slate-400'
                            }`}>
                              {a.unrealizedPL > 0 ? '+' : ''}{formatRupiah(a.unrealizedPL)}
                            </span>
                            <span className={`text-[10px] font-semibold ${
                              a.unrealizedPLPct > 0 ? 'text-emerald-500/70' :
                              a.unrealizedPLPct < 0 ? 'text-red-400/70' :
                              'text-slate-400'
                            }`}>
                              ({formatPct(a.unrealizedPLPct)})
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Footer Total */}
            <tfoot>
              <tr className="bg-slate-50 dark:bg-slate-700/30 border-t-2 border-slate-200 dark:border-slate-600">
                <td className="px-5 py-3 text-sm font-black text-slate-900 dark:text-white" colSpan={4}>Total Portofolio</td>
                <td className="px-4 py-3 text-right text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {formatRupiah(totalMarketValue)}
                </td>
                <td className="px-5 py-3 text-right text-sm font-black text-slate-900 dark:text-white">
                  {/* Net P/L */}
                  {(() => {
                    const totalCost = liveAssets.reduce((s, a) => s + a.costBasis, 0);
                    const totalPL = totalMarketValue - totalCost;
                    const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
                    return totalCost > 0 ? (
                      <span className={totalPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
                        {totalPL > 0 ? '+' : ''}{formatRupiah(totalPL)} ({formatPct(totalPLPct)})
                      </span>
                    ) : '—';
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
