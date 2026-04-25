// app/(dashboard)/goals/loading.tsx
import { SkeletonLine, SkeletonCard } from '@/components/shared/Skeleton';

export default function GoalsLoading() {
  return (
    <div className="space-y-6" aria-label="Memuat target impian...">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLine className="h-7 w-40" />
          <SkeletonLine className="h-4 w-60" />
        </div>
        <SkeletonLine className="h-10 w-36 rounded-xl" />
      </div>
      {/* Goal progress cards */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <SkeletonLine className="h-5 w-40" />
              <SkeletonLine className="h-5 w-20" />
            </div>
            <SkeletonLine className="h-2 w-full rounded-full" />
            <SkeletonLine className="h-3 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
