// app/(dashboard)/portfolios/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function PortfolioDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Portofolio Saya
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pantau seluruh aset investasi dan performa portofolio kamu di sini.
        </p>
      </div>
      
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Segera Hadir</h3>
        <p className="text-slate-500 dark:text-slate-400">Halaman ini sedang dalam tahap pengembangan.</p>
      </div>
    </div>
  );
}
