// components/shared/EmptyState.tsx
// Reusable empty-state panel — consistent across all pages

import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Optional extra content (e.g. a filter reset button) */
  children?: React.ReactNode;
  /** Override min height */
  minHeight?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  children,
  minHeight = '280px',
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed px-8 py-12"
      style={{
        minHeight,
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg-sunken)',
      }}
    >
      <div
        className="p-4 rounded-2xl mb-5"
        style={{ backgroundColor: 'var(--color-bg-elevated)', boxShadow: 'var(--shadow-xs)' }}
      >
        <Icon
          style={{
            width: '2rem',
            height: '2rem',
            color: 'var(--color-text-disabled)',
          }}
          strokeWidth={1.5}
        />
      </div>

      <h3
        className="font-display font-bold mb-1.5"
        style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}
      >
        {title}
      </h3>

      {description && (
        <p
          className="max-w-xs leading-relaxed mb-6"
          style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}
        >
          {description}
        </p>
      )}

      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm transition-all"
          style={{
            backgroundColor: 'var(--color-brand-500)',
            boxShadow: 'var(--shadow-brand)',
          }}
        >
          {ctaLabel}
        </Link>
      )}

      {children}
    </div>
  );
}
