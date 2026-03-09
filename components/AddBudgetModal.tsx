'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, PieChart, Check } from 'lucide-react';
import { createBudget } from '@/actions/budget.actions';
import { useFeedback } from '@/components/FeedbackProvider';

export default function AddBudgetModal({ categories }: { categories: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Track selected categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // Filter only pengeluaran categories
  const expenseCategories = categories.filter(c => c.type === 'PENGELUARAN');

  const { showFeedback } = useFeedback();

  useEffect(() => setMounted(true), []);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    
    // Pass selected categories as JSON string to form
    formData.append('category_ids', JSON.stringify(selectedCategories));
    
    const result = await createBudget(formData);
    
    if (result?.error) {
       showFeedback(result.error, 'error');
    } else {
       showFeedback('Berhasil membuat Anggaran baru! 📊', 'success');
       setIsOpen(false);
       setSelectedCategories([]);
    }
    setIsLoading(false);
  };

  const formatIDR = (value: string) => {
    const rawValue = value.replace(/\./g, '');
    if (!rawValue) return '';
    return rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleNumberFormat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    input.value = formatIDR(input.value);
  };

  const modalContent = (isOpen && mounted) ? createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200"
      onClick={() => !isLoading && setIsOpen(false)} 
    >
      <div 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-rose-50/50 dark:bg-rose-900/10 shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-rose-500" />
            Buat Anggaran Pengeluaran
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

        <div className="p-5 overflow-y-auto">
          <form action={handleSubmit} className="space-y-5">
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                <span>Batas Pengeluaran (Rp)</span>
              </label>
              <input 
                type="text" 
                name="amount" 
                required
                onChange={handleNumberFormat}
                placeholder="Misal: 3.000.000" 
                className="w-full px-4 py-2.5 text-lg font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Periode
                  </label>
                  <select 
                    name="period" 
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  >
                    <option value="BULANAN">Bulanan</option>
                    <option value="MINGGUAN">Mingguan</option>
                  </select>
               </div>
               <div>
                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                   <span>Mulai Tanggal</span>
                 </label>
                 <input 
                   type="date" 
                   name="date" 
                   required
                   defaultValue={new Date().toISOString().split('T')[0]}
                   className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                 />
               </div>
            </div>

            {/* Dynamic Multi-Select for Categories */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
               <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                 Pilih Kategori (<span className="text-rose-500">{selectedCategories.length}</span>)
               </label>
               <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                 Pilih satu atau beberapa kategori pengeluaran yang ingin diawasi menggunakan batas anggaran ini.
               </p>
               
               <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                 {expenseCategories.length === 0 ? (
                    <p className="text-sm text-slate-500">Belum ada kategori pengeluaran terdaftar.</p>
                 ) : (
                    expenseCategories.map(cat => {
                      const isSelected = selectedCategories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border ${
                            isSelected 
                              ? 'bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-900/40 dark:border-rose-700/50 dark:text-rose-300 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          {cat.name}
                        </button>
                      );
                    })
                 )}
               </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
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
                disabled={isLoading || selectedCategories.length === 0}
                className="flex-[2] px-4 py-2.5 rounded-xl font-bold text-white transition-colors flex justify-center items-center shadow-lg disabled:opacity-50 bg-rose-500 hover:bg-rose-600 shadow-rose-500/30"
              >
                {isLoading ? 'Menyimpan...' : 'Simpan Anggaran 🛡️'}
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
        className="flex items-center justify-center gap-2 bg-gradient-to-br flex-1 sm:flex-none from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-rose-500/30 hover:scale-105 transition-all duration-300"
      >
        <Plus className="w-5 h-5 flex-shrink-0" />
        <span className="truncate">Anggaran Baru</span>
      </button>

      {modalContent}
    </>
  );
}
