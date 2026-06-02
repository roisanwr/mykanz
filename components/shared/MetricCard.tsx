// components/shared/MetricCard.tsx
// Unified metric/stat card — replaces all ad-hoc stat boxes across the app

import { LucideIcon } from 'lucide-react';

type Variant = 'default' | 'wealth' | 'expense' | 'invest' | 'brand';

const VARIANT_STYLES: Record<Variant, { iconBg: string; iconColor: string; labelColor: string }> = {
  default: {
    iconBg:    'var(--color-bg-sunken)',
    iconColor: 'var(--color-text-tertiary)',
    labelColor:'var(--color-text-tertiary)',
  },
  wealth: {
    iconBg:    'var(--color-wealth-surface)',
    iconColor: 'var(--color-wealth-600)',
    labelColor:'var(--color-wealth-600)',
  },
  expense: {
    iconBg:    'var(--color-expense-surface)',
    iconColor: 'var(--color-expense-600)',
    labelColor:'var(--color-expense-600)',
  },
  invest: {
    iconBg:    'var(--color-invest-surface)',
    iconColor: 'var(--color-invest-600)',
    labelColor:'var(--color-invest-600)',
  },
  brand: {
    iconBg:    'var(--color-brand-surface)',
    iconColor: 'var(--color-brand-600)',
    labelColor:'var(--color-brand-600)',
  },
};

interface MetricCardProps {
  label: string;
  value: string | number;
  /** Secondary line under the value */
  sub?: string;
  icon: LucideIcon;
  variant?: Variant;
  /** Optional formatted value string (overrides numeric value display) */
  formattedValue?: string;
}

export function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  variant = 'default',
  formattedValue,
}: MetricCardProps) {
  const s = VARIANT_STYLES[variant];

  return (
    <div className="metric-card p-5">
      {/* Header row */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="p-2 rounded-lg shrink-0"
          style={{ backgroundColor: s.iconBg }}
        >
          <Icon style={{ width: '1rem', height: '1rem', color: s.iconColor }} />
        </div>
        <p
          className="text-xs font-bold uppercase tracking-wider truncate"
          style={{ color: s.labelColor }}
        >
          {label}
        </p>
      </div>

      {/* Value */}
      <p
        className="nums font-black tracking-tight"
        style={{ fontSize: 'var(--text-2xl)', color: 'var(--color-text-primary)' }}
      >
        {formattedValue ?? value}
      </p>

      {/* Sub text */}
      {sub && (
        <p className="mt-2 text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}
