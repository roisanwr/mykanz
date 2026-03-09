'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { FilterX, Search, ChevronDown } from 'lucide-react';

export default function TransactionFilters({ categories, wallets }: { categories: any[], wallets: any[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current values from URL
  const currentType = searchParams.get('type') || '';
  const currentCategoryId = searchParams.get('categoryId') || '';
  const currentWalletId = searchParams.get('walletId') || '';
  const currentStartDate = searchParams.get('startDate') || '';
  const currentEndDate = searchParams.get('endDate') || '';

  // Handle immediate change via URL
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // If we changed type, clear categoryId because categories are tied to type conceptually
    if (key === 'type') {
      params.delete('categoryId');
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleReset = () => {
    router.push(pathname);
  };

  const hasActiveFilters = currentType || currentCategoryId || currentWalletId || currentStartDate || currentEndDate;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 md:p-5 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-orange-500" />
        <h3 className="font-bold text-slate-900 dark:text-white">Filter Transaksi</h3>
        
        {hasActiveFilters && (
          <button 
            onClick={handleReset}
            className="ml-auto flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <FilterX className="w-3.5 h-3.5" />
            Reset Filter
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        
        {/* RANGE TANGGAL */}
        <div>
           <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Dari Tanggal</label>
           <input 
             type="date"
             value={currentStartDate}
             onChange={(e) => updateFilter('startDate', e.target.value)}
             className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
           />
        </div>
        <div>
           <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Sampai Tanggal</label>
           <input 
             type="date"
             value={currentEndDate}
             onChange={(e) => updateFilter('endDate', e.target.value)}
             className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
           />
        </div>

        {/* JENIS TRANSAKSI */}
        <div>
           <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Jenis Transaksi</label>
           <div className="relative">
             <select 
               value={currentType}
               onChange={(e) => updateFilter('type', e.target.value)}
               className="w-full pl-3 pr-8 py-2 appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
             >
               <option value="">Semua Jenis</option>
               <option value="PEMASUKAN">Pemasukan (+)</option>
               <option value="PENGELUARAN">Pengeluaran (-)</option>
               <option value="TRANSFER">Transfer (⇌)</option>
             </select>
             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
           </div>
        </div>

        {/* DOMPET (Filter global wallet mana yang terlibat) */}
        <div>
           <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Dompet / Rekening</label>
           <div className="relative">
             <select 
               value={currentWalletId}
               onChange={(e) => updateFilter('walletId', e.target.value)}
               className="w-full pl-3 pr-8 py-2 appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
             >
               <option value="">Semua Dompet</option>
               {wallets.map(w => (
                 <option key={w.id} value={w.id}>{w.name}</option>
               ))}
             </select>
             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
           </div>
        </div>

        {/* KATEGORI */}
        <div>
           <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Kategori</label>
           <div className="relative">
             <select 
               value={currentCategoryId}
               onChange={(e) => updateFilter('categoryId', e.target.value)}
               disabled={currentType === 'TRANSFER'} // Transfer tak punya list kategori global selain otomatis
               className="w-full pl-3 pr-8 py-2 appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
             >
               <option value="">Semua Kategori</option>
               {categories
                 .filter(c => currentType ? c.type === currentType : true)
                 .map(c => (
                 <option key={c.id} value={c.id}>{c.name}</option>
               ))}
             </select>
             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
           </div>
        </div>

      </div>
    </div>
  );
}
