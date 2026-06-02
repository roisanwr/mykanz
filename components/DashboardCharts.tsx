'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useId } from 'react';

// ── Format ────────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);

// ── Brand OKLCH colors (CSS string values) ────────────────────────────────────
// Dipakai di chart karena Recharts butuh string warna, bukan CSS var()
const COLORS = {
  wealth:  'oklch(0.64 0.185 152)',  // wealth-500: emerald
  brand:   'oklch(0.70 0.185 47)',   // brand-500:  orange
  expense: 'oklch(0.62 0.200 23)',   // expense-500: rose
  invest:  'oklch(0.58 0.185 265)',  // invest-500: violet
};

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; payload?: { fill?: string } }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm font-semibold shadow-xl"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)',
        boxShadow: 'var(--shadow-lg)',
        minWidth: '160px',
      }}
    >
      {label && (
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.7rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {label}
        </p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2">
          {entry.payload?.fill && (
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.payload.fill }}
            />
          )}
          Rp {fmt(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ── Custom Legend ─────────────────────────────────────────────────────────────
interface LegendEntry { color: string; name: string }
function CustomLegend({ items }: { items: LegendEntry[] }) {
  return (
    <div className="flex items-center justify-center gap-5 mt-3 flex-wrap">
      {items.map(item => (
        <div key={item.name} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
            {item.name}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Bar gradient defs ─────────────────────────────────────────────────────────
function GradientDefs() {
  const idIncome  = 'grad-income';
  const idExpense = 'grad-expense';
  return (
    <defs>
      <linearGradient id={idIncome} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor={COLORS.wealth}  stopOpacity={1} />
        <stop offset="100%" stopColor={COLORS.wealth}  stopOpacity={0.6} />
      </linearGradient>
      <linearGradient id={idExpense} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor={COLORS.expense} stopOpacity={1} />
        <stop offset="100%" stopColor={COLORS.expense} stopOpacity={0.6} />
      </linearGradient>
    </defs>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5 sm:p-6"
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <h3
        className="font-display font-bold mb-5 text-center"
        style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-primary)' }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
interface DashboardChartsProps {
  income: number;
  expense: number;
  cash: number;
  investments: number;
}

export default function DashboardCharts({ income, expense, cash, investments }: DashboardChartsProps) {

  // ── Cashflow bar data ──────────────────────────────────────────────────────
  const cashflowData = [
    { name: 'Pemasukan',   amount: income,  fill: `url(#grad-income)`,  fillSolid: COLORS.wealth },
    { name: 'Pengeluaran', amount: expense, fill: `url(#grad-expense)`, fillSolid: COLORS.expense },
  ];

  // ── Wealth pie data ────────────────────────────────────────────────────────
  const wealthData = [
    { name: 'Kas & Bank', value: cash,        color: COLORS.wealth },
    { name: 'Investasi',  value: investments, color: COLORS.brand  },
  ].filter(d => d.value > 0);

  const total = cash + investments;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

      {/* ── 1. Alokasi Kekayaan (Donut) ─────────────────────────────────── */}
      <ChartCard title="Alokasi Kekayaan">
        {wealthData.length > 0 ? (
          <>
            <div className="h-[220px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={wealthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={900}
                  >
                    {wealthData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color}
                        stroke="transparent"
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<CustomTooltip />}
                    wrapperStyle={{ outline: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-disabled)' }}>
                  Total
                </p>
                <p className="text-sm font-black nums" style={{ color: 'var(--color-text-primary)' }}>
                  {new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(total)}
                </p>
              </div>
            </div>

            <CustomLegend items={wealthData.map(d => ({ name: d.name, color: d.color }))} />
          </>
        ) : (
          <div
            className="h-[220px] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-disabled)' }}
          >
            <p className="text-sm font-medium">Belum ada data</p>
            <p className="text-xs">Tambah saldo kas atau investasi</p>
          </div>
        )}
      </ChartCard>

      {/* ── 2. Arus Kas Bulan Ini (Bar) ─────────────────────────────────── */}
      <ChartCard title="Arus Kas Bulan Ini">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={cashflowData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              barCategoryGap="40%"
            >
              <GradientDefs />
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--color-border-subtle)"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: 'var(--color-text-tertiary)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
                dy={8}
              />
              <YAxis hide domain={[0, (max: number) => Math.max(max * 1.2, 100000)]} />
              <Tooltip
                cursor={{ fill: 'var(--color-bg-sunken)', radius: 8 } as object}
                content={<CustomTooltip />}
                wrapperStyle={{ outline: 'none' }}
              />
              <Bar
                dataKey="amount"
                radius={[8, 8, 4, 4]}
                maxBarSize={64}
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
              >
                {cashflowData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary row */}
        <div className="flex items-center justify-around mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-disabled)' }}>Pemasukan</p>
            <p className="text-sm font-black nums mt-0.5" style={{ color: 'var(--color-wealth-500)' }}>
              +{new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(income)}
            </p>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: 'var(--color-border)' }} />
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-disabled)' }}>Pengeluaran</p>
            <p className="text-sm font-black nums mt-0.5" style={{ color: 'var(--color-expense-500)' }}>
              -{new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(expense)}
            </p>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: 'var(--color-border)' }} />
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-disabled)' }}>Selisih</p>
            <p
              className="text-sm font-black nums mt-0.5"
              style={{ color: income - expense >= 0 ? 'var(--color-wealth-500)' : 'var(--color-expense-500)' }}
            >
              {income - expense >= 0 ? '+' : ''}
              {new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(income - expense)}
            </p>
          </div>
        </div>
      </ChartCard>

    </div>
  );
}
