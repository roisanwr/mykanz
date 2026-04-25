// app/(dashboard)/settings/loading.tsx
import { SkeletonLine } from '@/components/shared/Skeleton';

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-2xl" aria-label="Memuat pengaturan...">
      <div className="space-y-2">
        <SkeletonLine className="h-7 w-36" />
        <SkeletonLine className="h-4 w-56" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4 animate-pulse">
          <SkeletonLine className="h-5 w-40" />
          <SkeletonLine className="h-10 w-full rounded-xl" />
          <SkeletonLine className="h-10 w-full rounded-xl" />
          <SkeletonLine className="h-10 w-32 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
