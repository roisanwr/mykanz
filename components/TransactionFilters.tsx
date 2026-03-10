'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { FilterX, Search, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

export default function TransactionFilters({ categories, wallets }: { categories: any[], wallets: any[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current values from URL
  const currentType       = searchParams.get('type') || '';
  const currentCategoryId = searchParams.get('categoryId') || '';
  const currentWalletId   = searchParams.get('walletId') || '';
  const currentStartDate  = searchParams.get('startDate') || '';
  const currentEndDate    = searchParams.get('endDate') || '';
  const currentSearch     = searchParams.get('search') || '';
  const currentMinAmount  = searchParams.get('minAmount') || '';
  const currentMaxAmount  = searchParams.get('maxAmount') || '';

  // Local state for search (debounce on submit) and amount
  const [localSearch, setLocalSearch] = useState(currentSearch);
  const [localMin, setLocalMin]       = useState(currentMinAmount);
  const [localMax, setLocalMax]       = useState(currentMaxAmount);
  
  // Toggle advanced filters panel
  const [showAdvanced, setShowAdvanced] = useState(
    !!(currentMinAmount || currentMaxAmount)
  );

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key === 'type') {
      params.delete('categoryId');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const applyMultiple = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyMultiple({ search: localSearch, minAmount: localMin, maxAmount: localMax });
  };

  const handleReset = () => {
    setLocalSearch('');
    setLocalMin('');
    setLocalMax('');
    router.push(pathname);
  };

  const hasActiveFilters = currentType || currentCategoryId || currentWalletId
    || currentStartDate || currentEndDate || currentSearch
    || currentMinAmount || currentMaxAmount;

  const activeCount = [currentType, currentCategoryId, currentWalletId,
    currentStartDate, currentEndDate, currentSearch, currentMinAmount, currentMaxAmount
  ].filter(Boolean).length;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden mb-6">
      
      {/* Header Bar */}
      <div className="flex items-center gap-3 px-4 md:px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-orange-500" />
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Filter Transaksi</h3>
          {activeCount > 0 && (
            <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              showAdvanced 
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white bg-slate-50 dark:bg-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Lanjutan
          </button>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <FilterX className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="p-4 md:p-5 space-y-4">

        {/* ROW 1: Keyword search — full width */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari berdasarkan deskripsi atau catatan..."
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-20 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => { setLocalSearch(''); if (currentSearch) updateFilter('search', ''); }}
              className="absolute right-14 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            Cari
          </button>
        </div>

        {/* ROW 2: Main dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* JENIS TRANSAKSI */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Jenis</label>
            <div className="relative">
              <select
                value={currentType}
                onChange={e => updateFilter('type', e.target.value)}
                className="w-full pl-3 pr-8 py-2 appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="">Semua Jenis</option>
                <option value="PEMASUKAN">✅ Pemasukan</option>
                <option value="PENGELUARAN">💸 Pengeluaran</option>
                <option value="TRANSFER">⇌ Transfer</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* KATEGORI */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kategori</label>
            <div className="relative">
              <select
                value={currentCategoryId}
                onChange={e => updateFilter('categoryId', e.target.value)}
                disabled={currentType === 'TRANSFER'}
                className="w-full pl-3 pr-8 py-2 appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
              >
                <option value="">Semua Kategori</option>
                {categories
                  .filter(c => currentType ? c.type === currentType : true)
                  .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                }
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* DOMPET */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Dompet</label>
            <div className="relative">
              <select
                value={currentWalletId}
                onChange={e => updateFilter('walletId', e.target.value)}
                className="w-full pl-3 pr-8 py-2 appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="">Semua Dompet</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* DATE RANGE — compact */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rentang Tanggal</label>
            <div className="flex gap-1.5">
              <input
                type="date"
                value={currentStartDate}
                onChange={e => updateFilter('startDate', e.target.value)}
                className="w-full px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
              <span className="text-slate-400 flex items-center text-xs shrink-0">–</span>
              <input
                type="date"
                value={currentEndDate}
                onChange={e => updateFilter('endDate', e.target.value)}
                className="w-full px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
          </div>
        </div>

        {/* ROW 3: Advanced — Amount Range */}
        {showAdvanced && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in slide-in-from-top-2 fade-in duration-200">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nominal Minimum (Rp)</label>
              <input
                type="number"
                min={0}
                placeholder="cth. 50000"
                value={localMin}
                onChange={e => setLocalMin(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nominal Maksimum (Rp)</label>
              <input
                type="number"
                min={0}
                placeholder="cth. 500000"
                value={localMax}
                onChange={e => setLocalMax(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-2 rounded-xl transition-colors shadow-md shadow-indigo-500/20"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        )}

      </form>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="px-4 md:px-5 pb-3.5 flex flex-wrap gap-2">
          {currentType && (
            <span className="flex items-center gap-1 text-xs font-bold bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 px-2.5 py-1 rounded-full">
              {currentType}
              <button onClick={() => updateFilter('type', '')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {currentCategoryId && (
            <span className="flex items-center gap-1 text-xs font-bold bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 px-2.5 py-1 rounded-full">
              {categories.find(c => c.id === currentCategoryId)?.name || 'Kategori'}
              <button onClick={() => updateFilter('categoryId', '')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {currentWalletId && (
            <span className="flex items-center gap-1 text-xs font-bold bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full">
              {wallets.find(w => w.id === currentWalletId)?.name || 'Dompet'}
              <button onClick={() => updateFilter('walletId', '')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {currentSearch && (
            <span className="flex items-center gap-1 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full">
              "{currentSearch}"
              <button onClick={() => { setLocalSearch(''); updateFilter('search', ''); }}><X className="w-3 h-3" /></button>
            </span>
          )}
          {(currentMinAmount || currentMaxAmount) && (
            <span className="flex items-center gap-1 text-xs font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full">
              {currentMinAmount ? `Min: Rp${Number(currentMinAmount).toLocaleString('id-ID')}` : ''}
              {currentMinAmount && currentMaxAmount ? ' – ' : ''}
              {currentMaxAmount ? `Max: Rp${Number(currentMaxAmount).toLocaleString('id-ID')}` : ''}
              <button onClick={() => { setLocalMin(''); setLocalMax(''); applyMultiple({ minAmount: '', maxAmount: '' }); }}><X className="w-3 h-3" /></button>
            </span>
          )}
          {(currentStartDate || currentEndDate) && (
            <span className="flex items-center gap-1 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full">
              📅 {currentStartDate || '...'} → {currentEndDate || '...'}
              <button onClick={() => applyMultiple({ startDate: '', endDate: '' })}><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
