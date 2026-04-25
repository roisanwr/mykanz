'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  FilterX, Search, SlidersHorizontal, X, ChevronDown, CalendarDays, Check,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FilterOption { id: string; name: string; type?: string }
interface Props {
  categories: FilterOption[];
  wallets:    FilterOption[];
}

// ─── Date preset helpers ──────────────────────────────────────────────────────
function toLocalISO(d: Date) {
  // Return YYYY-MM-DD in local timezone (not UTC)
  return d.toLocaleDateString('sv-SE'); // 'sv-SE' gives ISO-like format
}

const DATE_PRESETS = [
  {
    label: 'Bulan Ini',
    get() {
      const now  = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: toLocalISO(start), endDate: toLocalISO(end) };
    },
  },
  {
    label: 'Bulan Lalu',
    get() {
      const now   = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end   = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: toLocalISO(start), endDate: toLocalISO(end) };
    },
  },
  {
    label: '3 Bulan',
    get() {
      const end   = new Date();
      const start = new Date(end.getFullYear(), end.getMonth() - 2, 1);
      return { startDate: toLocalISO(start), endDate: toLocalISO(end) };
    },
  },
  {
    label: 'Tahun Ini',
    get() {
      const y    = new Date().getFullYear();
      return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
    },
  },
] as const;

// ─── Multi-select Dropdown ────────────────────────────────────────────────────
function MultiSelectDropdown({
  label,
  placeholder,
  options,
  selectedIds,
  onChange,
  disabled,
}: {
  label: string;
  placeholder: string;
  options: FilterOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter(s => s !== id)
        : [...selectedIds, id]
    );
  };

  const selectedNames = options
    .filter(o => selectedIds.includes(o.id))
    .map(o => o.name);

  return (
    <div ref={ref} className="relative">
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
        {selectedIds.length > 0 && (
          <span className="ml-1.5 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            {selectedIds.length}
          </span>
        )}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-sm transition-all text-left
          ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:border-orange-400/60'}
          ${open
            ? 'border-orange-400 ring-2 ring-orange-500/20 bg-white dark:bg-slate-900'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'}
          text-slate-900 dark:text-white focus:outline-none`}
      >
        <span className={`truncate ${selectedIds.length === 0 ? 'text-slate-400' : ''}`}>
          {selectedIds.length === 0
            ? placeholder
            : selectedIds.length === 1
              ? selectedNames[0]
              : `${selectedIds.length} dipilih`}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[180px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Clear all */}
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border-b border-slate-100 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <X className="w-3 h-3" /> Hapus semua pilihan
            </button>
          )}
          {options.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-400 text-center">
              Tidak ada opsi tersedia
            </div>
          ) : (
            options.map(opt => (
              <button
                type="button"
                key={opt.id}
                onClick={() => toggle(opt.id)}
                className="w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <span className="text-slate-800 dark:text-slate-200">{opt.name}</span>
                {selectedIds.includes(opt.id) && (
                  <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TransactionFilters({ categories, wallets }: Props) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  // Read URL state ─────────────────────────────────────────────────────────────
  const currentType       = searchParams.get('type') || '';
  const currentCategoryIds = searchParams.get('categoryIds')?.split(',').filter(Boolean) || [];
  const currentWalletIds   = searchParams.get('walletIds')?.split(',').filter(Boolean) || [];
  const currentStartDate  = searchParams.get('startDate') || '';
  const currentEndDate    = searchParams.get('endDate') || '';
  const currentSearch     = searchParams.get('search') || '';
  const currentMinAmount  = searchParams.get('minAmount') || '';
  const currentMaxAmount  = searchParams.get('maxAmount') || '';

  // Local state ────────────────────────────────────────────────────────────────
  const [localSearch, setLocalSearch] = useState(currentSearch);
  const [localMin, setLocalMin]       = useState(currentMinAmount);
  const [localMax, setLocalMax]       = useState(currentMaxAmount);
  const [showAdvanced, setShowAdvanced] = useState(!!(currentMinAmount || currentMaxAmount));

  // Keep local search in sync when URL changes (e.g. browser back)
  useEffect(() => { setLocalSearch(currentSearch); }, [currentSearch]);

  // ─── URL helpers ─────────────────────────────────────────────────────────────
  const buildParams = useCallback(
    (updates: Record<string, string | string[]>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page'); // reset to page 1 on any filter change
      Object.entries(updates).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          if (v.length > 0) params.set(k, v.join(','));
          else params.delete(k);
        } else {
          if (v) params.set(k, v);
          else params.delete(k);
        }
      });
      return params.toString();
    },
    [searchParams]
  );

  const push = useCallback(
    (updates: Record<string, string | string[]>) => {
      const q = buildParams(updates);
      router.push(`${pathname}${q ? `?${q}` : ''}`);
    },
    [buildParams, pathname, router]
  );

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleTypeChange = (val: string) => {
    // Changing type resets category selection
    push({ type: val, categoryIds: [], page: '' });
  };

  const handleCategoryChange = (ids: string[]) => push({ categoryIds: ids });
  const handleWalletChange   = (ids: string[]) => push({ walletIds: ids });

  const handleDateChange = (key: 'startDate' | 'endDate', val: string) =>
    push({ [key]: val });

  const applyPreset = (preset: typeof DATE_PRESETS[number]) => {
    const { startDate, endDate } = preset.get();
    push({ startDate, endDate });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    push({ search: localSearch, minAmount: localMin, maxAmount: localMax });
  };

  const handleReset = () => {
    setLocalSearch('');
    setLocalMin('');
    setLocalMax('');
    router.push(pathname);
  };

  // ─── Derived ─────────────────────────────────────────────────────────────────
  const hasActiveFilters = !!(currentType || currentCategoryIds.length || currentWalletIds.length
    || currentStartDate || currentEndDate || currentSearch || currentMinAmount || currentMaxAmount);

  const activeCount = [
    currentType,
    ...currentCategoryIds,
    ...currentWalletIds,
    currentStartDate ? '1' : '',
    currentSearch,
    currentMinAmount,
    currentMaxAmount,
  ].filter(Boolean).length;

  // Filter categories by selected type for the dropdown
  const filteredCategories = currentType
    ? categories.filter(c => c.type === currentType)
    : categories;

  const isPresetActive = (preset: typeof DATE_PRESETS[number]) => {
    const { startDate, endDate } = preset.get();
    return currentStartDate === startDate && currentEndDate === endDate;
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden mb-6">

      {/* ── Header bar ─────────────────────────────────────────────────────────── */}
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

        {/* ── ROW 1: Keyword search ─────────────────────────────────────────────── */}
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
              onClick={() => { setLocalSearch(''); if (currentSearch) push({ search: '' }); }}
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

        {/* ── ROW 2: Main dropdowns ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* Jenis */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Jenis
            </label>
            <div className="relative">
              <select
                value={currentType}
                onChange={e => handleTypeChange(e.target.value)}
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

          {/* Kategori — multi-select */}
          <MultiSelectDropdown
            label="Kategori"
            placeholder="Semua Kategori"
            options={filteredCategories}
            selectedIds={currentCategoryIds}
            onChange={handleCategoryChange}
            disabled={currentType === 'TRANSFER'}
          />

          {/* Dompet — multi-select */}
          <MultiSelectDropdown
            label="Dompet"
            placeholder="Semua Dompet"
            options={wallets}
            selectedIds={currentWalletIds}
            onChange={handleWalletChange}
          />
        </div>

        {/* ── ROW 3: Date range + Presets ──────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rentang Tanggal</span>
            {/* Quick preset pills */}
            {DATE_PRESETS.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all ${
                  isPresetActive(preset)
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-orange-100 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={currentStartDate}
              onChange={e => handleDateChange('startDate', e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
            <span className="text-slate-400 text-sm shrink-0">→</span>
            <input
              type="date"
              value={currentEndDate}
              onChange={e => handleDateChange('endDate', e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
            {(currentStartDate || currentEndDate) && (
              <button
                type="button"
                onClick={() => push({ startDate: '', endDate: '' })}
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── ROW 4: Advanced — Amount Range ───────────────────────────────────── */}
        {showAdvanced && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in slide-in-from-top-2 fade-in duration-200">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nominal Minimum (Rp)
              </label>
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nominal Maksimum (Rp)
              </label>
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
                Terapkan Filter Nominal
              </button>
            </div>
          </div>
        )}
      </form>

      {/* ── Active filter chips ───────────────────────────────────────────────── */}
      {hasActiveFilters && (
        <div className="px-4 md:px-5 pb-3.5 flex flex-wrap gap-2">
          {currentType && (
            <span className="flex items-center gap-1 text-xs font-bold bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 px-2.5 py-1 rounded-full">
              {currentType}
              <button type="button" onClick={() => handleTypeChange('')}><X className="w-3 h-3" /></button>
            </span>
          )}

          {currentCategoryIds.map(cid => {
            const cat = categories.find(c => c.id === cid);
            return (
              <span key={cid} className="flex items-center gap-1 text-xs font-bold bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 px-2.5 py-1 rounded-full">
                {cat?.name || 'Kategori'}
                <button type="button" onClick={() => handleCategoryChange(currentCategoryIds.filter(i => i !== cid))}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {currentWalletIds.map(wid => {
            const wallet = wallets.find(w => w.id === wid);
            return (
              <span key={wid} className="flex items-center gap-1 text-xs font-bold bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full">
                {wallet?.name || 'Dompet'}
                <button type="button" onClick={() => handleWalletChange(currentWalletIds.filter(i => i !== wid))}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {currentSearch && (
            <span className="flex items-center gap-1 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full">
              &quot;{currentSearch}&quot;
              <button type="button" onClick={() => { setLocalSearch(''); push({ search: '' }); }}><X className="w-3 h-3" /></button>
            </span>
          )}

          {(currentMinAmount || currentMaxAmount) && (
            <span className="flex items-center gap-1 text-xs font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full">
              {currentMinAmount ? `Min: Rp${Number(currentMinAmount).toLocaleString('id-ID')}` : ''}
              {currentMinAmount && currentMaxAmount ? ' – ' : ''}
              {currentMaxAmount ? `Max: Rp${Number(currentMaxAmount).toLocaleString('id-ID')}` : ''}
              <button type="button" onClick={() => { setLocalMin(''); setLocalMax(''); push({ minAmount: '', maxAmount: '' }); }}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {(currentStartDate || currentEndDate) && (
            <span className="flex items-center gap-1 text-xs font-bold bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full">
              📅 {currentStartDate || '...'} → {currentEndDate || '...'}
              <button type="button" onClick={() => push({ startDate: '', endDate: '' })}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
