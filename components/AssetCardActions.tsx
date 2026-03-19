'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Pencil, Trash2, X, Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFeedback } from '@/components/FeedbackProvider';

const SEARCHABLE_TYPES = ['SAHAM', 'KRIPTO', 'LOGAM_MULIA'];

interface SearchResult {
  name: string;
  ticker: string;
  type: string;
  exchange?: string;
}

export default function AssetCardActions({ asset }: { asset: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { showFeedback } = useFeedback();
  const router = useRouter();

  // Edit form states
  const [editName, setEditName] = useState(asset.name || '');
  const [editTicker, setEditTicker] = useState(asset.ticker_symbol || '');
  const [editUnit, setEditUnit] = useState(asset.unit_name || 'unit');

  // Live search states for edit modal
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedFromSearch, setSelectedFromSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSearchable = SEARCHABLE_TYPES.includes(asset.asset_type) && asset.asset_type !== 'LOGAM_MULIA';

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

  // Reset edit state when modal opens
  const openEditModal = () => {
    setEditName(asset.name || '');
    setEditTicker(asset.ticker_symbol || '');
    setEditUnit(asset.unit_name || 'unit');
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setSelectedFromSearch(false);
    setIsEditModalOpen(true);
    setIsOpen(false);
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
      performSearch(value, asset.asset_type);
    }, 350);
  };

  const selectSearchResult = (result: SearchResult) => {
    setEditName(result.name);
    setEditTicker(result.ticker);
    setSearchQuery(result.name);
    setSelectedFromSearch(true);
    setShowDropdown(false);
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/assets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: asset.id, name: editName, ticker_symbol: editTicker, unit_name: editUnit }),
      });
      const result = await res.json();
      if (!res.ok || result?.error) {
        showFeedback(result.error || 'Gagal memperbarui aset.', 'error');
      } else {
        showFeedback('Aset berhasil diperbarui', 'success');
        setIsEditModalOpen(false);
        setIsOpen(false);
        router.refresh();
      }
    } catch {
      showFeedback('Gagal terhubung ke server.', 'error');
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/assets?id=${asset.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok || result?.error) {
        showFeedback(result.error || 'Gagal menghapus aset.', 'error');
      } else {
        showFeedback('Aset berhasil dihapus', 'delete');
        setIsDeleteModalOpen(false);
        router.refresh();
      }
    } catch {
      showFeedback('Gagal terhubung ke server.', 'error');
    }
    setIsLoading(false);
  };

  const renderDeleteModal = () => {
    if (!mounted || !isDeleteModalOpen) return null;

    return createPortal(
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setIsDeleteModalOpen(false)} 
      >
        <div 
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()} 
        >
          <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-red-50/50 dark:bg-red-500/10">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5"/> Hapus Aset
            </h3>
            <button onClick={() => setIsDeleteModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white/50 dark:bg-slate-800/50 hover:bg-red-100 dark:hover:bg-red-500/20 p-1.5 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <p className="text-slate-600 dark:text-slate-300">
              Yakin ingin menghapus aset <span className="font-bold">"{asset.name}"</span>? Ini akan menghapus portofolio dan riwayat transaksi terkait. (Aksi ini tidak bisa dibatalkan)
            </p>
            <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-700 mt-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Batal</button>
              <button 
                onClick={handleDelete} 
                disabled={isLoading} 
                className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex justify-center items-center"
              >
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderEditModal = () => {
    if (!mounted || !isEditModalOpen) return null;

    return createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200"
        onClick={() => !isLoading && setIsEditModalOpen(false)}
      >
        <div
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Pencil className="w-4 h-4 text-indigo-500" /> Edit Aset
            </h3>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isLoading}
              className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-5 overflow-y-auto">
            <form onSubmit={handleEdit} className="space-y-4">

              {/* Live Search — hanya untuk tipe searchable (bukan LOGAM_MULIA karena sudah fix XAU) */}
              {isSearchable && (
                <div ref={searchRef} className="relative">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-indigo-500" />
                    Cari {asset.asset_type === 'KRIPTO' ? 'Koin / Token' : 'Saham / ETF'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchInput(e.target.value)}
                      placeholder={asset.asset_type === 'KRIPTO' ? 'Ketik: Bitcoin, Ethereum...' : 'Ketik: BBCA, Apple, Tesla...'}
                      className="w-full px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-900/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 pr-10"
                      autoComplete="off"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Hint */}
                  {!selectedFromSearch && searchQuery.length === 0 && (
                    <p className="text-xs text-indigo-500/70 mt-1.5 font-medium">
                      💡 Pilih dari pencarian agar nama &amp; ticker terisi otomatis
                    </p>
                  )}
                  {selectedFromSearch && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 font-semibold flex items-center gap-1">
                      ✅ Aset terpilih — nama &amp; ticker diperbarui otomatis
                    </p>
                  )}

                  {/* Dropdown */}
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

              {/* Nama Aset */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nama Aset</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => { setEditName(e.target.value); setSelectedFromSearch(false); }}
                  required
                  readOnly={selectedFromSearch}
                  className={`w-full px-4 py-2.5 rounded-xl border text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    selectedFromSearch
                      ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                  }`}
                />
              </div>

              {/* Ticker + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    Kode Ticker <span className="text-xs text-slate-400 font-normal">(Opt)</span>
                  </label>
                  <input
                    type="text"
                    value={editTicker}
                    onChange={(e) => { setEditTicker(e.target.value); setSelectedFromSearch(false); }}
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
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Satuan Unit</label>
                  <input
                    type="text"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    placeholder="unit"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] px-4 py-2.5 rounded-xl font-bold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 transition-colors flex justify-center items-center shadow-lg shadow-indigo-500/30"
                >
                  {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={openEditModal}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Pencil className="w-4 h-4 mr-3 text-indigo-500" />
              Edit Aset
            </button>
            <button
              onClick={() => { setIsDeleteModalOpen(true); setIsOpen(false); }}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
            >
              <Trash2 className="w-4 h-4 mr-3" />
              {isLoading ? 'Menghapus...' : 'Hapus (Permanen)'}
            </button>
          </div>
        </>
      )}

      {/* EDIT MODAL */}
      {renderEditModal()}

      {/* DELETE MODAL */}
      {renderDeleteModal()}
    </div>
  );
}
