'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Target, Bitcoin } from 'lucide-react';
import { createGoal } from '@/actions/goal.actions';
import { useFeedback } from '@/components/FeedbackProvider';

export default function AddGoalModal({ assets }: { assets: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Track toggle states
  const [isAssetTarget, setIsAssetTarget] = useState(false);

  const { showFeedback } = useFeedback();

  useEffect(() => setMounted(true), []);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    formData.append('is_asset_target', isAssetTarget.toString());
    
    const result = await createGoal(formData);
    
    if (result?.error) {
       showFeedback(result.error, 'error');
    } else {
       showFeedback('Berhasil membuat Target Impian baru! 🎯', 'success');
       setIsOpen(false);
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
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-500" />
            Buat Target Impian
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
          <form action={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Impian (Target)
              </label>
              <input 
                type="text" 
                name="name" 
                required
                placeholder="Misal: Beli MacBook Pro, Liburan ke Jepang..." 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Target Mode Toggle */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bitcoin className={`w-5 h-5 ${isAssetTarget ? 'text-orange-500' : 'text-slate-400'}`} />
                <div>
                   <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Target berupa Aset / Kripto?</p>
                   <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">Aktifkan jika target ini untuk ngumpulin Aset berdasar Portfolio</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isAssetTarget}
                  onChange={(e) => setIsAssetTarget(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-orange-500"></div>
              </label>
            </div>

            {/* Dynamic Inputs Based on Toggle */}
            {isAssetTarget ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/30 rounded-xl p-4">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                    <span>Pilih Aset</span>
                  </label>
                  <select 
                    name="asset_id" 
                    required={isAssetTarget}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 mb-4"
                  >
                    <option value="">-- Aset yang dituju --</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.ticker_symbol || a.asset_type})</option>
                    ))}
                  </select>

                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Jumlah Unit / Lembar / Koin
                  </label>
                  <input 
                    type="text" 
                    name="target_asset_units" 
                    required={isAssetTarget}
                    onChange={handleNumberFormat}
                    placeholder="Misal: 1 atau 100" 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                  <p className="text-[10px] text-orange-600/80 dark:text-orange-400 mt-2 font-medium">
                     ✨ Target akan terisi otomatis setiap kali kamu mencatat pembelian aset ini di menu Investasi.
                  </p>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Nominal uang (Rp)
                </label>
                <input 
                  type="text" 
                  name="target_amount" 
                  required={!isAssetTarget}
                  onChange={handleNumberFormat}
                  placeholder="Misal: 10.000.000" 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-semibold"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                <span>Tenggat Waktu / Deadline</span> <span className="text-xs font-normal text-slate-400">(Opsional)</span>
              </label>
              <input 
                type="date" 
                name="deadline" 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
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
                className={`flex-[2] px-4 py-2.5 rounded-xl font-bold text-white transition-colors flex justify-center items-center shadow-lg disabled:opacity-50 ${isAssetTarget ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30' : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/30'}`}
              >
                {isLoading ? 'Menyimpan...' : 'Simpan Target 🎯'}
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
        className="flex items-center justify-center gap-2 bg-gradient-to-br flex-1 sm:flex-none from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:scale-105 transition-all duration-300"
      >
        <Plus className="w-5 h-5 flex-shrink-0" />
        <span className="truncate">Impian Baru</span>
      </button>

      {modalContent}
    </>
  );
}
