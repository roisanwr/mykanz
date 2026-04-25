// components/shared/Skeleton.tsx
// Reusable skeleton loading components

export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-slate-200 dark:bg-slate-700 rounded animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 ${className}`}
      aria-hidden="true"
    >
      <SkeletonLine className="h-3 w-24 mb-3" />
      <SkeletonLine className="h-7 w-36 mb-4" />
      <SkeletonLine className="h-3 w-28" />
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div
      className="rounded-3xl p-8 sm:p-10 relative overflow-hidden"
      style={{ backgroundColor: 'oklch(0.18 0.06 50)' }}
      aria-hidden="true"
    >
      <div className="space-y-4">
        <SkeletonLine className="h-3 w-40 opacity-40" />
        <SkeletonLine className="h-14 w-72 sm:w-96 opacity-60" />
        <SkeletonLine className="h-3 w-56 opacity-30" />
      </div>
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

export function SkeletonTransactionRow() {
  return (
    <div
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 flex items-center gap-4"
      aria-hidden="true"
    >
      <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-4 w-32" />
        <SkeletonLine className="h-3 w-48" />
      </div>
      <SkeletonLine className="h-5 w-24 shrink-0" />
    </div>
  );
}

export function SkeletonMetricGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonFilterBar() {
  return (
    <div
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 animate-pulse"
      aria-hidden="true"
    >
      <div className="flex gap-3 mb-4">
        <SkeletonLine className="h-4 w-32" />
        <SkeletonLine className="h-4 w-20 ml-auto" />
      </div>
      <SkeletonLine className="h-10 w-full mb-3" />
      <div className="grid grid-cols-3 gap-3">
        <SkeletonLine className="h-10" />
        <SkeletonLine className="h-10" />
        <SkeletonLine className="h-10" />
      </div>
    </div>
  );
}
