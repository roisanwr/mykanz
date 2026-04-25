// app/(dashboard)/transactions/loading.tsx

import { SkeletonMetricGrid, SkeletonFilterBar, SkeletonTransactionRow } from '@/components/shared/Skeleton';
import { SkeletonLine } from '@/components/shared/Skeleton';

export default function TransactionsLoading() {
  return (
    <div className="space-y-6" aria-label="Memuat riwayat transaksi...">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <SkeletonLine className="h-7 w-48" />
          <SkeletonLine className="h-4 w-72" />
        </div>
        <SkeletonLine className="h-10 w-36 rounded-xl" />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 animate-pulse">
            <SkeletonLine className="h-3 w-28 mb-3" />
            <SkeletonLine className="h-8 w-36" />
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <SkeletonFilterBar />

      {/* Transaction list */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonTransactionRow key={i} />
        ))}
      </div>
    </div>
  );
}
