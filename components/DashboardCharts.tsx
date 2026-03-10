'use client';

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(angka);
};

interface DashboardChartsProps {
  income: number;
  expense: number;
  cash: number;
  investments: number;
}

export default function DashboardCharts({ 
  income, 
  expense, 
  cash, 
  investments 
}: DashboardChartsProps) {

  // Data for Cashflow Bar Chart
  const cashflowData = [
    { name: 'Pemasukan', amount: income, fill: '#10b981' }, // emerald-500
    { name: 'Pengeluaran', amount: expense, fill: '#ef4444' } // red-500
  ];

  // Data for Wealth Allocation Pie Chart
  const wealthData = [
    { name: 'Kas & Bank', value: cash, color: '#3b82f6' }, // blue-500
    { name: 'Investasi', value: investments, color: '#6366f1' }, // indigo-500
  ].filter(item => item.value > 0); // Only show segments with value

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      
      {/* 1. Alokasi Kekayaan (Pie Chart) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 text-center">
          Alokasi Kekayaan
        </h3>
        {wealthData.length > 0 ? (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={wealthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {wealthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`Rp ${formatRupiah(Number(value))}`, 'Nilai']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">
            Belum ada data kas atau investasi.
          </div>
        )}
      </div>

      {/* 2. Arus Kas Bulan Ini (Bar Chart) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 text-center">
          Arus Kas Bulan Ini
        </h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashflowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              <YAxis 
                hide={true} 
                domain={[0, 'dataMax + 100000']} 
              />
              <Tooltip
                cursor={{fill: 'transparent'}}
                formatter={(value: any) => [`Rp ${formatRupiah(Number(value))}`, 'Jumlah']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar 
                dataKey="amount" 
                radius={[6, 6, 6, 6]} 
                barSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
