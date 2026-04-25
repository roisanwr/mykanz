// app/(dashboard)/wallets/loading.tsx
import { SkeletonLine, SkeletonCard } from '@/components/shared/Skeleton';

export default function WalletsLoading() {
  return (
    <div className="space-y-6" aria-label="Memuat dompet...">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLine className="h-7 w-36" />
          <SkeletonLine className="h-4 w-56" />
        </div>
        <SkeletonLine className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
