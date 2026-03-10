'use client';

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

// ── Types ───────────────────────────────────────────────
interface AllocationSlice {
  name: string;
  value: number;
  color: string;
}
interface AssetBar {
  name: string;
  value: number;
  color: string;
}

interface PortfolioChartsProps {
  allocationData: AllocationSlice[];
  assetBarData: AssetBar[];
}

// ── Helpers ─────────────────────────────────────────────
const formatRupiahShort = (v: number) => {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}rb`;
  return `Rp ${v}`;
};
const formatRupiahFull = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

// ── Custom Tooltip ───────────────────────────────────────
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-3 text-sm min-w-[160px]">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.payload?.color ?? d.fill }} />
        <span className="font-bold text-slate-800 dark:text-white">{d.name || d.payload?.name}</span>
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-xs">{formatRupiahFull(d.value)}</p>
    </div>
  );
}

// ── Custom Pie Label ─────────────────────────────────────
function PieLabel({ cx, cy, midAngle, outerRadius, percent }: any) {
  if (percent < 0.05) return null; // don't show tiny labels
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 22;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#94a3b8" fontSize={11} fontWeight={700} textAnchor="middle" dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ── Main Component ───────────────────────────────────────
export default function PortfolioCharts({ allocationData, assetBarData }: PortfolioChartsProps) {
  const hasData = allocationData.some(d => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* LEFT: Donut – Alokasi per Tipe */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Alokasi per Tipe Aset</h3>
        <p className="text-xs text-slate-400 mb-4">Proporsi nilai investasi berdasarkan kategori</p>

        {hasData ? (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  labelLine={false}
                  label={PieLabel}
                >
                  {allocationData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={30}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">
            Belum ada data portofolio.
          </div>
        )}
      </div>

      {/* RIGHT: Horizontal bar – Nilai per Aset */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Nilai per Aset</h3>
        <p className="text-xs text-slate-400 mb-4">Estimasi nilai berdasarkan harga beli rata-rata</p>

        {assetBarData.length > 0 ? (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={assetBarData}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(v) => formatRupiahShort(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={70}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                  {assetBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">
            Belum ada aset aktif.
          </div>
        )}
      </div>

    </div>
  );
}
