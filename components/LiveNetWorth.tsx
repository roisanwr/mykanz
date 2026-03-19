'use client';

import { useLivePrices } from '@/lib/useLivePrices';
import { useEffect, useState, useRef } from 'react';
import { Activity } from 'lucide-react';

const formatRupiah = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

interface LiveNetWorthProps {
  /** Initial SSR value for instant render */
  initialCash: number;
  initialInvestment: number;
  /** small = metric card, large = hero section */
  variant?: 'hero' | 'card';
  /** Custom label */
  label?: string;
  /** Show only investment or only cash or total */
  show?: 'total' | 'cash' | 'investment';
}

export default function LiveNetWorth({
  initialCash,
  initialInvestment,
  variant = 'hero',
  label,
  show = 'total',
}: LiveNetWorthProps) {
  const { netWorth, isLoading, isValidating, updatedAt } = useLivePrices();
  const [flashClass, setFlashClass] = useState('');
  const prevValueRef = useRef<number>(0);

  // Determine which value to display
  const cash = netWorth.cash || initialCash;
  const investment = netWorth.investment || initialInvestment;
  const displayValue =
    show === 'cash' ? cash :
    show === 'investment' ? investment :
    cash + investment;

  // Flash animation on value change
  useEffect(() => {
    if (prevValueRef.current === 0) {
      prevValueRef.current = displayValue;
      return;
    }

    if (displayValue > prevValueRef.current) {
      setFlashClass('price-flash-up');
    } else if (displayValue < prevValueRef.current) {
      setFlashClass('price-flash-down');
    }

    prevValueRef.current = displayValue;

    const timer = setTimeout(() => setFlashClass(''), 1500);
    return () => clearTimeout(timer);
  }, [displayValue]);

  const defaultLabel =
    show === 'cash' ? 'Tunai & Bank' :
    show === 'investment' ? 'Nilai Portofolio' :
    'Total Kekayaan Bersih';

  if (variant === 'card') {
    return (
      <div className="relative">
        <p className={`text-2xl font-black text-slate-900 dark:text-white tracking-tight transition-colors duration-500 ${flashClass}`}>
          {formatRupiah(displayValue)}
        </p>
        {isValidating && (
          <Activity className="w-3 h-3 text-indigo-500 animate-pulse absolute -right-1 -top-1" />
        )}
      </div>
    );
  }

  // Hero variant
  return (
    <div>
      <p className="text-indigo-200 dark:text-slate-400 font-medium mb-2 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
        {label || defaultLabel}
        {updatedAt && (
          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full ml-auto text-indigo-300 font-bold tracking-wider">
            🔴 LIVE
          </span>
        )}
      </p>
      <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight drop-shadow-lg transition-colors duration-500 ${flashClass}`}>
        {formatRupiah(displayValue)}
      </h1>
      {updatedAt && (
        <p className="text-[10px] text-indigo-300/60 mt-1 font-medium">
          Terakhir diperbarui: {new Date(updatedAt).toLocaleTimeString('id-ID')}
        </p>
      )}
    </div>
  );
}
