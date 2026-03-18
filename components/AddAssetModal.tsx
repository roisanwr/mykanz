'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Rocket, Boxes } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFeedback } from '@/components/FeedbackProvider';

const ASSET_TYPES = [
  { id: 'SAHAM', label: 'Saham' },
  { id: 'KRIPTO', label: 'Kripto' },
  { id: 'REKSADANA', label: 'Reksadana' },
  { id: 'LOGAM_MULIA', label: 'Emas / Logam Mulia' },
  { id: 'PROPERTI', label: 'Properti' },
  { id: 'BISNIS', label: 'Bisnis / Kepemilikan' },
  { id: 'LAINNYA', label: 'Lainnya' },
];

export default function AddAssetModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showFeedback } = useFeedback();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement)?.value;
    const ticker_symbol = (form.elements.namedItem('ticker_symbol') as HTMLInputElement)?.value;
    const unit_name = (form.elements.namedItem('unit_name') as HTMLInputElement)?.value;
    let asset_type = (form.elements.namedItem('asset_type') as HTMLSelectElement)?.value;
    if (asset_type === 'REKSADANA') asset_type = 'LAINNYA';

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, asset_type, ticker_symbol, unit_name }),
      });
      const result = await res.json();
      if (!res.ok || result?.error) {
        showFeedback(result.error || 'Gagal menambahkan aset.', 'error');
      } else {
        showFeedback('Aset baru berhasil ditambahkan!', 'success');
        setIsOpen(false);
        router.refresh();
      }
    } catch {
      showFeedback('Gagal terhubung ke server.', 'error');
    }
    setIsLoading(false);
  };

  const modalContent = (isOpen && mounted) ? createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200"
      onClick={() => !isLoading && setIsOpen(false)} 
    >
      <div 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Rocket className="w-5 h-5 text-indigo-500" />
            Tambah Aset Investasi
          </h3>
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Jenis Instrumen
              </label>
              <select 
                name="asset_type" 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {ASSET_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Aset
              </label>
              <input 
                type="text" 
                name="name" 
                required
                placeholder="Misal: BBCA, Bitcoin, Reksadana Sucor" 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                   Kode Ticker <span className="text-xs text-slate-400 font-normal ml-1">(Opsional)</span>
                 </label>
                 <input 
                   type="text" 
                   name="ticker_symbol" 
                   placeholder="BBCA.JK / BTC" 
                   className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 uppercase"
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                   Satuan Unit
                 </label>
                 <input 
                   type="text" 
                   name="unit_name" 
                   defaultValue="unit"
                   placeholder="Lembar / koin / lot" 
                   className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                 />
               </div>
            </div>

            <div className="flex gap-3 pt-4 mt-6 border-t border-slate-100 dark:border-slate-700">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
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
