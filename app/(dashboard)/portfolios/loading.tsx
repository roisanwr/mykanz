// app/(dashboard)/portfolios/loading.tsx
import { SkeletonLine, SkeletonCard } from '@/components/shared/Skeleton';

export default function PortfoliosLoading() {
  return (
    <div className="space-y-6" aria-label="Memuat portofolio...">
      {/* Summary hero */}
      <div className="rounded-2xl p-6 animate-pulse" style={{ backgroundColor: 'oklch(0.18 0.06 50)' }}>
        <SkeletonLine className="h-3 w-32 mb-3 opacity-30" />
        <SkeletonLine className="h-12 w-56 opacity-50" />
      </div>
      {/* Asset table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3 animate-pulse">
        <SkeletonLine className="h-5 w-40 mb-4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
            <SkeletonLine className="h-4 w-24 flex-1" />
            <SkeletonLine className="h-4 w-20" />
            <SkeletonLine className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
