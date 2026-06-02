'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ── Format ────────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);

// ── Brand OKLCH — must be string values, not CSS vars (Recharts needs literals) ──
const C = {
  wealth:  'oklch(0.64 0.185 152)',  // emerald
  brand:   'oklch(0.70 0.185 47)',   // orange
  expense: 'oklch(0.62 0.200 23)',   // rose
};

// ── Custom Tooltip (dark-mode aware via CSS tokens) ───────────────────────────
interface TooltipPayload {
  value: number;
  name?: string;
  payload?: { fill?: string; name?: string };
}
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '10px 14px',
        boxShadow: 'var(--shadow-lg)',
        minWidth: '140px',
        color: 'var(--color-text-primary)',
        fontSize: '13px',
        fontWeight: 600,
      }}
    >
      {label && (
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
          {label}
        </p>
      )}
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {entry.payload?.fill && (
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: entry.payload.fill, flexShrink: 0 }} />
          )}
          <span>Rp {fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px', flexWrap: 'wrap' }}>
      {items.map(item => (
        <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color, display: 'inline-block' }} />
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>{item.name}</span>
        </div>
      ))}
    </div>
  );
}

// ── Chart Card wrapper ────────────────────────────────────────────────────────
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '16px',
      padding: '20px 24px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '15px',
        color: 'var(--color-text-primary)',
        textAlign: 'center',
        marginBottom: '20px',
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
interface DashboardChartsProps {
  income: number;
  expense: number;
  cash: number;
  investments: number;
}

export default function DashboardCharts({ income, expense, cash, investments }: DashboardChartsProps) {

  const cashflowData = [
    { name: 'Pemasukan',   amount: income,  fill: C.wealth },
    { name: 'Pengeluaran', amount: expense, fill: C.expense },
  ];

  const wealthData = [
    { name: 'Kas & Bank', value: cash,        color: C.wealth },
    { name: 'Investasi',  value: investments, color: C.brand  },
  ].filter(d => d.value > 0);

  const total = cash + investments;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>

      {/* ── Alokasi Kekayaan (Donut) ── */}
      <ChartCard title="Alokasi Kekayaan">
        {wealthData.length > 0 ? (
          <>
            <div style={{ height: '220px', position: 'relative' }}>
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
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<CustomTooltip />}
                    wrapperStyle={{ outline: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center label */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-disabled)' }}>
                  Total
                </span>
                <span style={{ fontSize: '14px', fontWeight: 900, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(total)}
                </span>
              </div>
            </div>
            <Legend items={wealthData.map(d => ({ name: d.name, color: d.color }))} />
          </>
        ) : (
          <div style={{
            height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '8px', borderRadius: '12px', border: '2px dashed var(--color-border)',
            color: 'var(--color-text-disabled)',
          }}>
            <p style={{ fontSize: '14px', fontWeight: 600 }}>Belum ada data</p>
            <p style={{ fontSize: '12px' }}>Tambah saldo kas atau investasi</p>
          </div>
        )}
      </ChartCard>

      {/* ── Arus Kas Bulan Ini (Bar) ── */}
      <ChartCard title="Arus Kas Bulan Ini">
        <div style={{ height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={cashflowData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              barCategoryGap="40%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--color-border-subtle)"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12, fontWeight: 600 }}
                dy={8}
              />
              <YAxis hide domain={[0, (max: number) => Math.max(max * 1.2, 100000)]} />
              <Tooltip
                cursor={{ fill: 'var(--color-bg-sunken)' }}
                content={<CustomTooltip />}
                wrapperStyle={{ outline: 'none' }}
              />
              <Bar dataKey="amount" radius={[8, 8, 4, 4]} maxBarSize={64} isAnimationActive animationDuration={900}>
                {cashflowData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          marginTop: '12px', paddingTop: '12px',
          borderTop: '1px solid var(--color-border-subtle)',
        }}>
          {[
            { label: 'Pemasukan', val: income,            color: C.wealth,  prefix: '+' },
            { label: 'Pengeluaran', val: expense,         color: C.expense, prefix: '−' },
            { label: 'Selisih',     val: income - expense, color: income - expense >= 0 ? C.wealth : C.expense, prefix: income - expense >= 0 ? '+' : '' },
          ].map((item, i, arr) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-disabled)' }}>
                  {item.label}
                </p>
                <p style={{ fontSize: '13px', fontWeight: 900, color: item.color, fontVariantNumeric: 'tabular-nums', marginTop: '2px' }}>
                  {item.prefix}{new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.abs(item.val))}
                </p>
              </div>
              {i < arr.length - 1 && (
                <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--color-border)', margin: '0 16px' }} />
              )}
            </div>
          ))}
        </div>
      </ChartCard>

    </div>
  );
}
