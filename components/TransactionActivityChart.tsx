'use client';

import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { subYears, subMonths, format, eachDayOfInterval, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';

type RawTransaction = {
  transaction_date: string;
  transaction_type: string;
  amount: number;
};

interface TransactionActivityChartProps {
  fiatTransactions: RawTransaction[];
  investmentTransactions: RawTransaction[];
}

type Period = 'week' | 'month' | 'year' | 'all';
type ViewMode = 'count' | 'amount' | 'wealth';

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: 'Minggu', value: 'week' },
  { label: 'Bulan', value: 'month' },
  { label: 'Tahun', value: 'year' },
  { label: 'Semua', value: 'all' },
];

const ACTIVITY_LINE_STYLES = {
  pemasukan:   { color: '#10b981', label: 'Pemasukan' },
  pengeluaran: { color: '#f43f5e', label: 'Pengeluaran' },
  beli:        { color: '#6366f1', label: 'Investasi Beli' },
  jual:        { color: '#f97316', label: 'Investasi Jual' },
} as const;

const WEALTH_LINE_STYLES = {
  kas:      { color: '#3b82f6', label: 'Saldo Kas (Kumulatif)' },
  investasi: { color: '#8b5cf6', label: 'Nilai Investasi (Kumulatif)' },
} as const;

const formatRupiahShort = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
  return `${v}`;
};

const formatRupiahFull = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

function CustomDot(props: any) {
  const { cx, cy, value } = props;
  if (!value) return null;
  return <circle cx={cx} cy={cy} r={3.5} fill={props.stroke} stroke="white" strokeWidth={2} />;
}

function CustomTooltip({ active, payload, label, viewMode }: { active?: boolean; payload?: any[]; label?: string; viewMode: ViewMode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-3 text-sm min-w-[200px]">
      <p className="font-bold text-slate-700 dark:text-white mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
          <span className="text-slate-500 dark:text-slate-400 text-xs">{entry.name}:</span>
          <span className="font-bold text-slate-800 dark:text-white text-xs ml-auto">
            {viewMode === 'count' ? `${entry.value} tx` : formatRupiahFull(Number(entry.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TransactionActivityChart({
  fiatTransactions,
  investmentTransactions,
}: TransactionActivityChartProps) {
  const [period, setPeriod] = useState<Period>('month');
  const [viewMode, setViewMode] = useState<ViewMode>('count');

  const chartData = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    // For wealth mode, always start from earliest transaction to show full picture
    const getEarliestDate = () => {
      const all = [
        ...fiatTransactions.map(t => new Date(t.transaction_date)),
        ...investmentTransactions.map(t => new Date(t.transaction_date)),
      ].filter(d => !isNaN(d.getTime()));
      return all.length ? new Date(Math.min(...all.map(d => d.getTime()))) : subMonths(now, 3);
    };

    switch (period) {
      case 'week':  startDate = new Date(now); startDate.setDate(now.getDate() - 6); break;
      case 'month': startDate = subMonths(now, 1); break;
      case 'year':  startDate = subYears(now, 1); break;
      case 'all':   startDate = getEarliestDate(); break;
      default:      startDate = subMonths(now, 1);
    }

    const days = eachDayOfInterval({ start: startDate, end: now });
    const isLong = days.length > 90;

    if (viewMode === 'wealth') {
      // Calculate running balance for all transactions up to each day
      // We need to start from the very beginning (not just the period)
      // so cumulative values are accurate
      const sortedFiat = [...fiatTransactions].sort(
        (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
      );
      const sortedInvest = [...investmentTransactions].sort(
        (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
      );

      let runningKas = 0;
      let runningInvestasi = 0;

      // Pre-calculate the running balance before the period start
      sortedFiat.forEach(t => {
        const txDate = new Date(t.transaction_date);
        if (txDate < startDate) {
          if (t.transaction_type === 'PEMASUKAN') runningKas += t.amount;
          if (t.transaction_type === 'PENGELUARAN') runningKas -= t.amount;
        }
      });
      sortedInvest.forEach(t => {
        const txDate = new Date(t.transaction_date);
        if (txDate < startDate) {
          if (t.transaction_type === 'BELI') runningInvestasi += t.amount;
          if (t.transaction_type === 'JUAL') runningInvestasi -= t.amount;
        }
      });

      return days.map(day => {
        const fmt = isLong ? format(day, 'MMM yy', { locale: id }) : format(day, 'd MMM', { locale: id });

        // Add this day's transactions
        sortedFiat.filter(t => isSameDay(new Date(t.transaction_date), day)).forEach(t => {
          if (t.transaction_type === 'PEMASUKAN') runningKas += t.amount;
          if (t.transaction_type === 'PENGELUARAN') runningKas -= t.amount;
        });
        sortedInvest.filter(t => isSameDay(new Date(t.transaction_date), day)).forEach(t => {
          if (t.transaction_type === 'BELI') runningInvestasi += t.amount;
          if (t.transaction_type === 'JUAL') runningInvestasi -= t.amount;
        });

        return { date: fmt, kas: Math.max(0, runningKas), investasi: Math.max(0, runningInvestasi) };
      });
    }

    // count or amount mode
    return days.map(day => {
      const fmt = isLong ? format(day, 'MMM yy', { locale: id }) : format(day, 'd MMM', { locale: id });

      const matchFiat = (type: string) =>
        fiatTransactions.filter(t => isSameDay(new Date(t.transaction_date), day) && t.transaction_type === type);
      const matchInvest = (type: string) =>
        investmentTransactions.filter(t => isSameDay(new Date(t.transaction_date), day) && t.transaction_type === type);

      if (viewMode === 'count') {
        return {
          date: fmt,
          pemasukan:   matchFiat('PEMASUKAN').length,
          pengeluaran: matchFiat('PENGELUARAN').length,
          beli:        matchInvest('BELI').length,
          jual:        matchInvest('JUAL').length,
        };
      } else {
        return {
          date: fmt,
          pemasukan:   matchFiat('PEMASUKAN').reduce((s, t) => s + t.amount, 0),
          pengeluaran: matchFiat('PENGELUARAN').reduce((s, t) => s + t.amount, 0),
          beli:        matchInvest('BELI').reduce((s, t) => s + t.amount, 0),
          jual:        matchInvest('JUAL').reduce((s, t) => s + t.amount, 0),
        };
      }
    });
  }, [period, viewMode, fiatTransactions, investmentTransactions]);

  const tickInterval = chartData.length > 60 ? Math.floor(chartData.length / 12) : chartData.length > 30 ? 3 : 0;
  const yAxisWidth = viewMode !== 'count' ? 60 : 30;
  const yAxisFormatter = (v: number) => viewMode === 'count' ? `${v}` : `${formatRupiahShort(v)}`;

  const VIEW_MODES: { label: string; value: ViewMode; desc: string }[] = [
    { label: 'Jumlah', value: 'count', desc: 'Jumlah transaksi per hari' },
    { label: 'Nilai (Rp)', value: 'amount', desc: 'Total nilai transaksi per hari' },
    { label: 'Kekayaan', value: 'wealth', desc: 'Saldo kas & investasi kumulatif' },
  ];

  const activeLineStyles = viewMode === 'wealth' ? WEALTH_LINE_STYLES : ACTIVITY_LINE_STYLES;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm">
      
      {/* Header */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {viewMode === 'wealth' ? 'Tren Kekayaan' : 'Keaktifan Transaksi'}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {VIEW_MODES.find(m => m.value === viewMode)?.desc}
            </p>
          </div>

          {/* Period filters */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl self-start sm:self-auto">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  period === opt.value
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* View mode pills */}
        <div className="flex gap-2 flex-wrap">
          {VIEW_MODES.map(mode => (
            <button
              key={mode.value}
              onClick={() => setViewMode(mode.value)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                viewMode === mode.value
                  ? mode.value === 'wealth'
                    ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-500/30'
                    : mode.value === 'amount'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/30'
                    : 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/30'
                  : 'bg-white dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-indigo-300'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'wealth' ? (
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
              <defs>
                <linearGradient id="gradKas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={WEALTH_LINE_STYLES.kas.color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={WEALTH_LINE_STYLES.kas.color} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradInvestasi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={WEALTH_LINE_STYLES.investasi.color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={WEALTH_LINE_STYLES.investasi.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={6} interval={tickInterval} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} width={yAxisWidth} tickFormatter={yAxisFormatter} />
              <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
              <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="kas" name={WEALTH_LINE_STYLES.kas.label} stroke={WEALTH_LINE_STYLES.kas.color} fill="url(#gradKas)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, stroke: 'white', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="investasi" name={WEALTH_LINE_STYLES.investasi.label} stroke={WEALTH_LINE_STYLES.investasi.color} fill="url(#gradInvestasi)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, stroke: 'white', strokeWidth: 2 }} />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: viewMode === 'amount' ? 15 : -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={6} interval={tickInterval} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} width={yAxisWidth} tickFormatter={yAxisFormatter} />
              <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
              <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
              {(Object.entries(ACTIVITY_LINE_STYLES) as [keyof typeof ACTIVITY_LINE_STYLES, typeof ACTIVITY_LINE_STYLES[keyof typeof ACTIVITY_LINE_STYLES]][]).map(([key, style]) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={style.label}
                  stroke={style.color}
                  strokeWidth={2.5}
                  strokeDasharray={key === 'beli' || key === 'jual' ? '5 3' : undefined}
                  dot={<CustomDot stroke={style.color} />}
                  activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Summary footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        {viewMode === 'wealth' ? (
          <>
            {(Object.entries(WEALTH_LINE_STYLES) as [keyof typeof WEALTH_LINE_STYLES, typeof WEALTH_LINE_STYLES[keyof typeof WEALTH_LINE_STYLES]][]).map(([key, style]) => {
              const lastVal = chartData.length ? Number((chartData[chartData.length - 1] as any)[key] || 0) : 0;
              return (
                <div key={key} className="col-span-2 sm:col-span-2 flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: style.color }}></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{style.label}</p>
                    <p className="text-base font-black text-slate-900 dark:text-white truncate">{formatRupiahFull(lastVal)}</p>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          (Object.entries(ACTIVITY_LINE_STYLES) as [keyof typeof ACTIVITY_LINE_STYLES, typeof ACTIVITY_LINE_STYLES[keyof typeof ACTIVITY_LINE_STYLES]][]).map(([key, style]) => {
            const total = chartData.reduce((sum, d) => sum + (Number((d as any)[key] || 0)), 0);
            return (
              <div key={key} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: style.color }}></span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{style.label}</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {viewMode === 'count' ? `${total} tx` : formatRupiahFull(total)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
