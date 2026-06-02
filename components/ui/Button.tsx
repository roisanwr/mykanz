// components/ui/Button.tsx
// Unified button system — premium hover/active/focus states via design tokens
// Usage: <Button variant="primary" size="md">Simpan</Button>
'use client';

import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'wealth';
type Size    = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant;
  size?:     Size;
  loading?:  boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const SIZE: Record<Size, string> = {
  xs: 'px-3 py-1.5 text-xs  gap-1.5 rounded-lg',
  sm: 'px-4 py-2   text-sm  gap-2   rounded-xl',
  md: 'px-5 py-2.5 text-sm  gap-2   rounded-xl',
  lg: 'px-6 py-3   text-base gap-2.5 rounded-xl',
};

const VARIANT_STYLE: Record<Variant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--color-brand-500)',
    color: '#fff',
    boxShadow: '0 1px 3px oklch(0.70 0.185 47 / 0.3)',
  },
  secondary: {
    backgroundColor: 'var(--color-bg-surface)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-xs)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
  },
  danger: {
    backgroundColor: 'var(--color-expense-500)',
    color: '#fff',
    boxShadow: '0 1px 3px oklch(0.62 0.200 23 / 0.3)',
  },
  wealth: {
    backgroundColor: 'var(--color-wealth-500)',
    color: '#fff',
    boxShadow: '0 1px 3px oklch(0.64 0.185 152 / 0.3)',
  },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  style,
  ...props
}, ref) => {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-bold
        transition-all select-none
        active:scale-[0.97]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${SIZE[size]}
        ${className}
      `}
      style={{
        ...VARIANT_STYLE[variant],
        transitionProperty: 'background-color, box-shadow, transform, opacity, border-color',
        transitionDuration: 'var(--duration-fast)',
        transitionTimingFunction: 'var(--ease-out-expo)',
        focusVisibleRingColor: 'var(--color-brand-400)',
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <>
          <span
            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70"
            aria-hidden
          />
          <span className="opacity-70">{children}</span>
        </>
      ) : (
        <>
          {leftIcon  && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';
