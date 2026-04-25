// app/(dashboard)/budgets/loading.tsx
import { SkeletonLine } from '@/components/shared/Skeleton';

export default function BudgetsLoading() {
  return (
    <div className="space-y-6" aria-label="Memuat anggaran...">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLine className="h-7 w-32" />
          <SkeletonLine className="h-4 w-52" />
        </div>
        <SkeletonLine className="h-10 w-36 rounded-xl" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <SkeletonLine className="h-4 w-36" />
              <SkeletonLine className="h-4 w-24" />
            </div>
            <SkeletonLine className="h-2.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
