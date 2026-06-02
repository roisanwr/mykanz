// app/(dashboard)/loading.tsx
// Polished skeleton loading state — matches the actual dashboard layout

import React from 'react';

// ── Skeleton primitives ────────────────────────────────────────────────────
function SkeletonBox({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className ?? ''}`} style={style} />;
}

function SkeletonText({ width = '60%', height = '14px' }: { width?: string; height?: string }) {
  return (
    <div className="skeleton rounded-md" style={{ width, height, borderRadius: '6px' }} />
  );
}

// ── Hero skeleton ────────────────────────────────────────────────────────────
function SkeletonHero() {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-7 sm:p-10"
      style={{ backgroundColor: 'oklch(0.155 0.025 250)' }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, oklch(0.70 0.185 47 / 0.3), transparent)' }}
      />
      <div className="space-y-3">
        <SkeletonText width="120px" height="10px" />
        <SkeletonBox className="rounded-lg" style={{ width: 'min(380px, 70%)', height: '52px' }} />
        <div className="flex gap-4 mt-4">
          <SkeletonText width="140px" height="12px" />
          <SkeletonText width="140px" height="12px" />
        </div>
        <div className="flex gap-3 mt-6">
          <SkeletonBox className="rounded-xl" style={{ width: '110px', height: '40px' }} />
          <SkeletonBox className="rounded-xl" style={{ width: '120px', height: '40px' }} />
        </div>
      </div>
    </div>
  );
}

// ── Metric card skeleton ─────────────────────────────────────────────────────
function SkeletonMetricCard() {
  return (
    <div
      className="p-5 rounded-xl"
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <SkeletonBox className="rounded-lg" style={{ width: '32px', height: '32px' }} />
        <SkeletonText width="80px" height="10px" />
      </div>
      <SkeletonText width="65%" height="24px" />
      <SkeletonText width="45%" height="10px" />
    </div>
  );
}

// ── Transaction row skeleton ─────────────────────────────────────────────────
function SkeletonTxRow() {
  return (
    <div
      className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl"
      style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid transparent' }}
    >
      <SkeletonBox className="rounded-xl shrink-0" style={{ width: '40px', height: '40px' }} />
      <div className="flex-1 space-y-2">
        <SkeletonText width="50%" height="12px" />
        <SkeletonText width="35%" height="10px" />
      </div>
      <SkeletonText width="80px" height="14px" />
    </div>
  );
}

// ── Distribution skeleton ────────────────────────────────────────────────────
function SkeletonDistribution() {
  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-2 mb-5">
        <SkeletonBox className="rounded-lg" style={{ width: '28px', height: '28px' }} />
        <SkeletonText width="100px" height="12px" />
      </div>
      <SkeletonBox className="rounded-full w-full" style={{ height: '10px' }} />
      <div className="mt-4 space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-sunken)' }}>
            <SkeletonText width="60px" height="11px" />
            <SkeletonText width="50px" height="11px" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chart skeleton ───────────────────────────────────────────────────────────
function SkeletonChart() {
  return (
    <div
      className="rounded-xl p-6 h-64 flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <SkeletonText width="140px" height="14px" />
      <div className="flex-1 mt-4 flex items-end gap-3 justify-center">
        {[80, 45, 70, 55, 90, 40, 65].map((h, i) => (
          <SkeletonBox
            key={i}
            className="rounded-t-lg flex-1"
            style={{ height: `${h}%`, maxWidth: '36px' }}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function DashboardLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Memuat dashboard...">

      {/* Hero */}
      <SkeletonHero />

      {/* 4 metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map(i => <SkeletonMetricCard key={i} />)}
      </div>

      {/* 2 live metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {[1, 2].map(i => <SkeletonMetricCard key={i} />)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SkeletonChart />
        <SkeletonChart />
      </div>

      {/* Bottom: transactions + distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Transactions (2/3) */}
        <div
          className="lg:col-span-2 rounded-xl overflow-hidden"
          style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
            <SkeletonText width="140px" height="13px" />
            <SkeletonText width="80px" height="12px" />
          </div>
          {/* Rows */}
          <div className="p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonTxRow key={i} />
            ))}
          </div>
        </div>

        {/* Distribution (1/3) */}
        <SkeletonDistribution />
      </div>
    </div>
  );
}
