'use client';

import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { subDays, subYears, subMonths, format, eachDayOfInterval, isSameDay } from 'date-fns';
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
type ViewMode = 'count' | 'amount';

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: 'Minggu Ini', value: 'week' },
  { label: 'Bulan Ini', value: 'month' },
  { label: 'Tahun Ini', value: 'year' },
  { label: 'Semua', value: 'all' },
];

const LINE_STYLES = {
  pemasukan:   { color: '#10b981', label: 'Pemasukan' },
  pengeluaran: { color: '#f43f5e', label: 'Pengeluaran' },
  beli:        { color: '#6366f1', label: 'Investasi Beli' },
  jual:        { color: '#f97316', label: 'Investasi Jual' },
};

function CustomDot(props: any) {
  const { cx, cy, value } = props;
  if (!value) return null;
  return <circle cx={cx} cy={cy} r={4} fill={props.stroke} stroke="white" strokeWidth={2} />;
}

const formatRupiah = (angka: number) => {
  if (angka >= 1_000_000_000) return `Rp ${(angka / 1_000_000_000).toFixed(1)}M`;
  if (angka >= 1_000_000) return `Rp ${(angka / 1_000_000).toFixed(1)}jt`;
  if (angka >= 1_000) return `Rp ${(angka / 1_000).toFixed(0)}rb`;
  return `Rp ${angka}`;
};

const formatRupiahFull = (angka: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-3 text-sm min-w-[180px]">
      <p className="font-bold text-slate-700 dark:text-white mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
          <span className="text-slate-500 dark:text-slate-400 text-xs">{entry.name}:</span>
          <span className="font-bold text-slate-800 dark:text-white text-xs ml-auto">
            {typeof entry.value === 'number' && entry.value > 999 
              ? formatRupiahFull(entry.value) 
              : `${entry.value}${entry.value > 999 ? '' : entry.unit ?? ' tx'}`}
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

    switch (period) {
      case 'week':  startDate = new Date(now); startDate.setDate(now.getDate() - 6); break;
      case 'month': startDate = subMonths(now, 1); break;
      case 'year':  startDate = subYears(now, 1); break;
      case 'all': {
        const allDates = [
          ...fiatTransactions.map(t => t.transaction_date),
          ...investmentTransactions.map(t => t.transaction_date),
        ].map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
        startDate = allDates.length ? new Date(Math.min(...allDates.map(d => d.getTime()))) : subMonths(now, 3);
        break;
      }
    }

    const days = eachDayOfInterval({ start: startDate, end: now });
    const isLong = days.length > 90;

    return days.map(day => {
      const fmt = isLong 
        ? format(day, 'MMM yy', { locale: id }) 
        : format(day, 'd MMM', { locale: id });

      const match = (txs: RawTransaction[], type: string) =>
        txs.filter(t => isSameDay(new Date(t.transaction_date), day) && t.transaction_type === type);

      const pemasukanTxs    = match(fiatTransactions, 'PEMASUKAN');
      const pengeluaranTxs  = match(fiatTransactions, 'PENGELUARAN');
      const beliTxs         = match(investmentTransactions, 'BELI');
      const jualTxs         = match(investmentTransactions, 'JUAL');

      if (viewMode === 'count') {
        return {
          date: fmt,
          pemasukan:   pemasukanTxs.length,
          pengeluaran: pengeluaranTxs.length,
          beli:        beliTxs.length,
          jual:        jualTxs.length,
        };
      } else {
        return {
          date: fmt,
          pemasukan:   pemasukanTxs.reduce((s, t) => s + t.amount, 0),
          pengeluaran: pengeluaranTxs.reduce((s, t) => s + t.amount, 0),
          beli:        beliTxs.reduce((s, t) => s + t.amount, 0),
          jual:        jualTxs.reduce((s, t) => s + t.amount, 0),
        };
      }
    });
  }, [period, viewMode, fiatTransactions, investmentTransactions]);

  const tickInterval = chartData.length > 60 ? Math.floor(chartData.length / 12) : chartData.length > 30 ? 3 : 0;

  const yAxisFormatter = (v: number) => viewMode === 'amount' ? formatRupiah(v) : `${v}`;
  const tooltipValueFormatter = (value: number) =>
    viewMode === 'amount' ? formatRupiahFull(value) : `${value} transaksi`;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm">
      
      {/* Header: Title + View Mode toggle + Period filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Keaktifan Transaksi</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {viewMode === 'count' ? 'Jumlah transaksi per hari' : 'Total nilai transaksi per hari'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('count')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'count'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Jumlah
            </button>
            <button
              onClick={() => setViewMode('amount')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'amount'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Nilai (Rp)
            </button>
          </div>

          {/* Period filters */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
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
      </div>

      {/* Chart */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: viewMode === 'amount' ? 15 : -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} vertical={false} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 11 }} 
              dy={6}
              interval={tickInterval}
            />
            <YAxis 
              allowDecimals={false} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 10 }} 
              width={viewMode === 'amount' ? 55 : 30}
              tickFormatter={yAxisFormatter}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />

            {(Object.entries(LINE_STYLES) as [keyof typeof LINE_STYLES, typeof LINE_STYLES[keyof typeof LINE_STYLES]][]).map(([key, style]) => (
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
        </ResponsiveContainer>
      </div>

      {/* Summary footers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        {(Object.entries(LINE_STYLES) as [keyof typeof LINE_STYLES, typeof LINE_STYLES[keyof typeof LINE_STYLES]][]).map(([key, style]) => {
          const total = chartData.reduce((sum, d) => sum + (Number(d[key as keyof typeof d]) || 0), 0);
          return (
            <div key={key} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/30">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: style.color }}></span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{style.label}</p>
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {viewMode === 'count' 
                    ? `${total} tx` 
                    : formatRupiah(total)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
