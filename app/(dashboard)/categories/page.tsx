// app/(dashboard)/categories/page.tsx
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Tags, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import AddCategoryModal from '@/components/AddCategoryModal';
import CategoryCardActions from '@/components/CategoryCardActions';

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const categories = await prisma.categories.findMany({
    where: { user_id: session.user.id, deleted_at: null },
    orderBy: { created_at: 'desc' }
  });

  const pemasukan = categories.filter(c => c.type === 'PEMASUKAN');
  const pengeluaran = categories.filter(c => c.type === 'PENGELUARAN');

  const renderCategoryCard = (category: any) => (
    <div key={category.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-colors group">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${category.type === 'PEMASUKAN' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
           {category.type === 'PEMASUKAN' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2">
            {category.name}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">{category.type.toLowerCase()}</p>
        </div>
      </div>
      <div>
        <CategoryCardActions category={category} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
               <Tags className="w-6 h-6" />
            </div>
            Daftar Kategori
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelompokkan jenis pengeluaran dan pemasukan Anda.
          </p>
        </div>
        
        <AddCategoryModal />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
        
        {/* PENGELUARAN COLUMN */}
        <div className="space-y-4">
          <div className="bg-rose-50 dark:bg-rose-500/10 border-b-2 border-rose-200 dark:border-rose-500/20 p-4 rounded-xl flex items-center gap-3">
             <ArrowUpRight className="w-6 h-6 text-rose-600 dark:text-rose-400" />
             <h2 className="text-lg font-black text-rose-800 dark:text-rose-400">Kategori Pengeluaran</h2>
             <span className="ml-auto bg-white/50 dark:bg-black/20 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-full text-sm font-bold">
               {pengeluaran.length}
             </span>
          </div>
          
          <div className="space-y-3">
            {pengeluaran.length > 0 ? (
              pengeluaran.map(renderCategoryCard)
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-sm italic py-4 text-center">Belum ada kategori pengeluaran.</p>
            )}
          </div>
        </div>

        {/* PEMASUKAN COLUMN */}
        <div className="space-y-4">
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border-b-2 border-emerald-200 dark:border-emerald-500/20 p-4 rounded-xl flex items-center gap-3">
             <ArrowDownLeft className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
             <h2 className="text-lg font-black text-emerald-800 dark:text-emerald-400">Kategori Pemasukan</h2>
             <span className="ml-auto bg-white/50 dark:bg-black/20 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-sm font-bold">
               {pemasukan.length}
             </span>
          </div>
          
          <div className="space-y-3">
            {pemasukan.length > 0 ? (
              pemasukan.map(renderCategoryCard)
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-sm italic py-4 text-center">Belum ada kategori pemasukan.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
