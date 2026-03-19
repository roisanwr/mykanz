'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Rocket, Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFeedback } from '@/components/FeedbackProvider';

const ASSET_TYPES = [
  { id: 'SAHAM', label: 'Saham', searchable: true, defaultCurrency: 'IDR', defaultUnit: 'lembar' },
  { id: 'KRIPTO', label: 'Kripto', searchable: true, defaultCurrency: 'USD', defaultUnit: 'koin' },
  { id: 'REKSADANA', label: 'Reksadana', searchable: false, defaultCurrency: 'IDR', defaultUnit: 'unit' },
  { id: 'LOGAM_MULIA', label: 'Emas / Logam Mulia', searchable: true, defaultCurrency: 'USD', defaultUnit: 'gram' },
  { id: 'PROPERTI', label: 'Properti', searchable: false, defaultCurrency: 'IDR', defaultUnit: 'unit' },
  { id: 'BISNIS', label: 'Bisnis / Kepemilikan', searchable: false, defaultCurrency: 'IDR', defaultUnit: 'unit' },
  { id: 'LAINNYA', label: 'Lainnya', searchable: false, defaultCurrency: 'IDR', defaultUnit: 'unit' },
];

interface SearchResult {
  name: string;
  ticker: string;
  type: string;
  exchange?: string;
}

export default function AddAssetModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showFeedback } = useFeedback();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Form states
  const [selectedType, setSelectedType] = useState('SAHAM');
  const [assetName, setAssetName] = useState('');
  const [tickerSymbol, setTickerSymbol] = useState('');
  const [unitName, setUnitName] = useState('lembar');
  const [currency, setCurrency] = useState('IDR');

  // Live search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedFromSearch, setSelectedFromSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTypeConfig = ASSET_TYPES.find(t => t.id === selectedType);
  const isSearchable = currentTypeConfig?.searchable ?? false;

  // Auto-update defaults when type changes
  const handleTypeChange = (typeId: string) => {
    setSelectedType(typeId);
    const config = ASSET_TYPES.find(t => t.id === typeId);
    if (config) {
      setUnitName(config.defaultUnit);
      setCurrency(config.defaultCurrency);
    }
    // Reset search state
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setSelectedFromSearch(false);
    setAssetName('');
    setTickerSymbol('');

    // Auto-fill for LOGAM_MULIA
    if (typeId === 'LOGAM_MULIA') {
      setTickerSymbol('XAU');
      setAssetName('Emas (XAU)');
      setCurrency('USD');
    }
  };

  // Debounced search
  const performSearch = useCallback(async (query: string, type: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/assets/search?q=${encodeURIComponent(query)}&type=${type}`);
      const data = await res.json();
      if (data.success && data.data) {
        setSearchResults(data.data);
        setShowDropdown(data.data.length > 0);
      }
    } catch {
      setSearchResults([]);
    }
    setIsSearching(false);
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setSelectedFromSearch(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      performSearch(value, selectedType);
    }, 350);
  };

  const selectSearchResult = (result: SearchResult) => {
    setAssetName(result.name);
    setTickerSymbol(result.ticker);
    setSearchQuery(result.name);
    setSelectedFromSearch(true);
    setShowDropdown(false);

    // Auto-set currency based on exchange
    if (result.type === 'SAHAM') {
      if (result.exchange === 'JKT' || result.ticker.endsWith('.JK')) {
        setCurrency('IDR');
      } else {
        setCurrency('USD');
      }
    } else if (result.type === 'KRIPTO') {
      setCurrency('USD');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    let asset_type = selectedType;
    if (asset_type === 'REKSADANA') asset_type = 'LAINNYA';

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: assetName,
          asset_type,
          ticker_symbol: tickerSymbol || undefined,
          unit_name: unitName,
          currency,
        }),
      });
      const result = await res.json();
      if (!res.ok || result?.error) {
        showFeedback(result.error || 'Gagal menambahkan aset.', 'error');
      } else {
        showFeedback('Aset baru berhasil ditambahkan!', 'success');
        resetAndClose();
        router.refresh();
      }
    } catch {
      showFeedback('Gagal terhubung ke server.', 'error');
    }
    setIsLoading(false);
  };

  const resetAndClose = () => {
    setIsOpen(false);
    setAssetName('');
    setTickerSymbol('');
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setSelectedFromSearch(false);
    setSelectedType('SAHAM');
    setUnitName('lembar');
    setCurrency('IDR');
  };

  const modalContent = (isOpen && mounted) ? createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200"
      onClick={() => !isLoading && resetAndClose()} 
    >
      <div 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Rocket className="w-5 h-5 text-indigo-500" />
            Tambah Aset Investasi
          </h3>
          <button 
            type="button"
            onClick={resetAndClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 1. Jenis Instrumen */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Jenis Instrumen
              </label>
              <select 
                value={selectedType}
                onChange={(e) => handleTypeChange(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {ASSET_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* 2. Live Search (untuk KRIPTO / SAHAM / LOGAM_MULIA) */}
            {isSearchable && selectedType !== 'LOGAM_MULIA' && (
              <div ref={searchRef} className="relative">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-indigo-500" />
                  Cari {selectedType === 'KRIPTO' ? 'Koin / Token' : 'Saham / ETF'}
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    placeholder={selectedType === 'KRIPTO' ? 'Ketik: Bitcoin, Ethereum...' : 'Ketik: BBCA, Apple, Tesla...'}
                    className="w-full px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-900/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 pr-10"
                    autoComplete="off"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Search Hint */}
                {!selectedFromSearch && searchQuery.length === 0 && (
                  <p className="text-xs text-indigo-500/70 mt-1.5 font-medium">
                    💡 Pilih dari pencarian agar ticker terisi otomatis
                  </p>
                )}
                {selectedFromSearch && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 font-semibold flex items-center gap-1">
                    ✅ Aset terpilih — nama & ticker terisi otomatis
                  </p>
                )}

                {/* Search Results Dropdown */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.ticker}-${index}`}
                        type="button"
                        onClick={() => selectSearchResult(result)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-left border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {result.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {result.exchange ? `${result.ticker} · ${result.exchange}` : result.ticker}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shrink-0 ml-2">
                          {result.type === 'KRIPTO' ? 'Crypto' : 'Stock'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Nama Aset (manual untuk tipe non-searchable, atau readonly jika sudah dipilih dari search) */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Aset
              </label>
              <input 
                type="text" 
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                required
                readOnly={selectedFromSearch}
                placeholder={isSearchable ? 'Pilih dari pencarian di atas' : 'Misal: Rumah, Tanah, PT Maju Jaya'} 
                className={`w-full px-4 py-2.5 rounded-xl border text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  selectedFromSearch
                    ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                }`}
              />
            </div>

            {/* 4. Ticker + Unit + Currency */}
            <div className="grid grid-cols-3 gap-3">
               <div>
                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                   Ticker <span className="text-xs text-slate-400 font-normal">(Opt)</span>
                 </label>
                 <input 
                   type="text" 
                   value={tickerSymbol}
                   onChange={(e) => setTickerSymbol(e.target.value)}
                   readOnly={selectedFromSearch}
                   placeholder="BTC" 
                   className={`w-full px-3 py-2.5 rounded-xl border text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 uppercase text-sm ${
                     selectedFromSearch
                       ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10'
                       : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                   }`}
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                   Satuan
                 </label>
                 <input 
                   type="text" 
                   value={unitName}
                   onChange={(e) => setUnitName(e.target.value)}
                   placeholder="unit" 
                   className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                   Mata Uang
                 </label>
                 <select
                   value={currency}
                   onChange={(e) => setCurrency(e.target.value)}
                   className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                 >
                   <option value="IDR">🇮🇩 IDR</option>
                   <option value="USD">🇺🇸 USD</option>
                 </select>
               </div>
            </div>

            <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100 dark:border-slate-700">
              <button 
                type="button" 
                onClick={resetAndClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit" 
                disabled={isLoading || (isSearchable && !assetName && selectedType !== 'LOGAM_MULIA')}
                className="flex-[2] px-4 py-2.5 rounded-xl font-bold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 transition-colors flex justify-center items-center shadow-lg shadow-indigo-500/30"
              >
                {isLoading ? 'Menyimpan...' : 'Simpan Aset'}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:scale-105 transition-all duration-300"
      >
        <Plus className="w-5 h-5" />
        Tambah Aset
      </button>

      {modalContent}
    </>
  );
}
