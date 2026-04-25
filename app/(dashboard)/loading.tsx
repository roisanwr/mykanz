// app/(dashboard)/loading.tsx
// Automatically used by Next.js App Router as Suspense fallback for dashboard root

import { SkeletonHero, SkeletonMetricGrid, SkeletonTransactionRow } from '@/components/shared/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-label="Memuat dashboard...">
      {/* Hero skeleton */}
      <SkeletonHero />

      {/* Metric cards */}
      <SkeletonMetricGrid />

      {/* Chart placeholder */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 h-64 animate-pulse" />

      {/* Recent transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonTransactionRow key={i} />
          ))}
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl animate-pulse h-48" />
      </div>
    </div>
  );
}
