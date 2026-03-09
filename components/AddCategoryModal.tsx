// components/AddCategoryModal.tsx
'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { createCategory } from '@/actions/category.actions';
import { useFeedback } from '@/components/FeedbackProvider';

export default function AddCategoryModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [txType, setTxType] = useState<'PEMASUKAN' | 'PENGELUARAN'>('PENGELUARAN');
  const { showFeedback } = useFeedback();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    const result = await createCategory(formData);
    
    if (result?.error) {
      showFeedback(result.error, 'error');
    } else {
      showFeedback('Kategori berhasil dibuat!', 'success');
      setIsOpen(false);
    }
    setIsLoading(false);
  };

  const modalContent = (isOpen && mounted) ? createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200"
      onClick={() => !isLoading && setIsOpen(false)} 
    >
      <div 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-orange-500" />
            Tambah Kategori Baru
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
          <form action={handleSubmit} className="space-y-5">
            
            {/* TIPE TRANSAKSI (TABS) */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Ini kategori untuk apa?
              </label>
              <input type="hidden" name="type" value={txType} />
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTxType('PENGELUARAN')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                    txType === 'PENGELUARAN' 
                    ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" /> Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('PEMASUKAN')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                    txType === 'PEMASUKAN' 
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" /> Pemasukan
                </button>
              </div>
            </div>

            {/* NAMA KATEGORI */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Kategori
              </label>
              <input 
                type="text" 
                name="name" 
                required
                maxLength={50}
                placeholder={txType === 'PENGELUARAN' ? "Misal: Transportasi, Makanan, Tagihan..." : "Misal: Gaji, Bonus, Usaha..."} 
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            {/* BUTTONS */}
            <div className="flex gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                className="flex-[2] px-4 py-3 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors flex justify-center items-center shadow-lg shadow-orange-500/30"
              >
                {isLoading ? 'Menyimpan...' : 'Simpan Kategori'}
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
        className="flex items-center justify-center gap-2 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-orange-500/30 hover:scale-105 transition-all duration-300"
      >
        <Plus className="w-5 h-5" />
        Tambah Kategori
      </button>
      {modalContent}
    </>
  );
}
