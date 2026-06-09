'use client';

import { useLivePrices } from '@/lib/useLivePrices';
import { useEffect, useState, useRef } from 'react';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { gsap } from 'gsap';

// ── Format ───────────────────────────────────────────────────────────────────
const formatRupiah = (v: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(v);

interface LiveNetWorthProps {
  initialCash: number;
  initialInvestment: number;
  variant?: 'hero' | 'card';
  label?: string;
  show?: 'total' | 'cash' | 'investment';
}

export default function LiveNetWorth({
  initialCash,
  initialInvestment,
  variant = 'hero',
  label,
  show = 'total',
}: LiveNetWorthProps) {
  const { netWorth, isValidating, updatedAt } = useLivePrices();
  const [flashClass, setFlashClass] = useState('');
  const prevValueRef  = useRef<number>(0);
  const amountRef     = useRef<HTMLElement | null>(null);
  const hasAnimated   = useRef(false);

  const cash        = netWorth.cash       || initialCash;
  const investment  = netWorth.investment || initialInvestment;
  const displayValue =
    show === 'cash'       ? cash :
    show === 'investment' ? investment :
    cash + investment;

  // ── Counter animation on first mount (plain useEffect, no useGSAP) ──────────
  useEffect(() => {
    if (hasAnimated.current) return;
    const el = amountRef.current;
    if (!el || displayValue === 0) return;

    hasAnimated.current = true;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: displayValue,
      duration: variant === 'hero' ? 1.4 : 0.9,
      ease: 'power3.out',
      onUpdate() {
        if (el) el.textContent = formatRupiah(Math.round(obj.val));
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — only on mount

  // ── Flash on live price change ───────────────────────────────────────────────
  useEffect(() => {
    if (prevValueRef.current === 0) {
      prevValueRef.current = displayValue;
      return;
    }
    if (displayValue > prevValueRef.current) setFlashClass('price-flash-up');
    else if (displayValue < prevValueRef.current) setFlashClass('price-flash-down');
    prevValueRef.current = displayValue;
    const t = setTimeout(() => setFlashClass(''), 1500);
    return () => clearTimeout(t);
  }, [displayValue]);

  const defaultLabel =
    show === 'cash'       ? 'Tunai & Bank' :
    show === 'investment' ? 'Nilai Portofolio' :
    'Total Kekayaan Bersih';

  // ── CARD VARIANT ─────────────────────────────────────────────────────────────
  if (variant === 'card') {
    return (
      <div className="relative">
        <span
          ref={el => { amountRef.current = el; }}
          className={`nums font-black tracking-tight transition-colors duration-500 ${flashClass}`}
          style={{ fontSize: 'var(--text-2xl)', color: 'var(--color-text-primary)' }}
        >
          {formatRupiah(displayValue)}
        </span>
        {isValidating && (
          <Activity
            className="animate-pulse absolute -right-1 -top-1"
            style={{ width: '0.75rem', height: '0.75rem', color: 'var(--color-brand-500)' }}
          />
        )}
      </div>
    );
  }

  // ── HERO VARIANT ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Live indicator row */}
      <div className="flex items-center gap-2.5 mb-3">
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: 'var(--color-wealth-400)' }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: 'var(--color-wealth-400)' }}
          />
        </span>
        <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'oklch(0.85 0.06 55)' }}>
          {label || defaultLabel}
        </p>
        {updatedAt && (
          <span
            className="ml-2 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'oklch(1 0 0 / 0.1)', color: 'oklch(0.88 0.05 55)' }}
          >
            LIVE
          </span>
        )}
      </div>

      {/* Amount */}
      <h1
        ref={el => { amountRef.current = el; }}
        className={`font-display font-black tracking-tight leading-none text-white transition-colors duration-500 nums ${flashClass}`}
        style={{ fontSize: 'clamp(2rem, 4vw + 1rem, 3.75rem)' }}
        title={formatRupiah(displayValue)}
      >
        {formatRupiah(displayValue)}
      </h1>

      {/* Sub-breakdown */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'oklch(0.75 0.05 55)' }}>
          <TrendingUp style={{ width: '0.875rem', height: '0.875rem', color: 'var(--color-wealth-400)' }} />
          Kas: {formatRupiah(cash)}
        </span>
        <span className="w-px h-3 opacity-30" style={{ backgroundColor: 'oklch(0.85 0 0)' }} />
        <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'oklch(0.75 0.05 55)' }}>
          <TrendingDown style={{ width: '0.875rem', height: '0.875rem', color: 'var(--color-brand-400)' }} />
          Investasi: {formatRupiah(investment)}
        </span>
        {updatedAt && (
          <>
            <span className="w-px h-3 opacity-30" style={{ backgroundColor: 'oklch(0.85 0 0)' }} />
            <span className="text-[10px]" style={{ color: 'oklch(0.55 0.03 55)' }}>
              {new Date(updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
