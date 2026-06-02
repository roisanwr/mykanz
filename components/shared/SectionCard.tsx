// components/shared/SectionCard.tsx
// Standardized card with header (title + optional right slot) and body

import { LucideIcon } from 'lucide-react';

interface SectionCardProps {
  title: string;
  titleIcon?: LucideIcon;
  /** Right-aligned slot: links, badges, buttons */
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Extra CSS className on the root div */
  className?: string;
  /** Remove default padding from body */
  noPadding?: boolean;
}

export function SectionCard({
  title,
  titleIcon: Icon,
  action,
  children,
  className = '',
  noPadding = false,
}: SectionCardProps) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        <h2
          className="font-display font-bold flex items-center gap-2"
          style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-primary)' }}
        >
          {Icon && (
            <span
              className="p-1.5 rounded-lg"
              style={{ backgroundColor: 'var(--color-bg-sunken)', color: 'var(--color-text-tertiary)' }}
            >
              <Icon style={{ width: '0.875rem', height: '0.875rem' }} />
            </span>
          )}
          {title}
        </h2>
        {action && <div>{action}</div>}
      </div>

      {/* Body */}
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  );
}
