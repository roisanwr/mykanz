'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, PiggyBank, Wallet as WalletIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFeedback } from '@/components/FeedbackProvider';

export default function AddFundsModal({ goal, wallets }: { goal: any, wallets: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { showFeedback } = useFeedback();
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const form = e.currentTarget;
    const wallet_id = (form.elements.namedItem('wallet_id') as HTMLSelectElement)?.value;
    const rawAmount = (form.elements.namedItem('amount') as HTMLInputElement)?.value.replace(/\./g, '') || '0';
    const amount = parseFloat(rawAmount);

    try {
      const res = await fetch('/api/goals/funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_id: goal.id, amount, wallet_id }),
      });
      const result = await res.json();
      if (!res.ok || result?.error) {
        showFeedback(result.error || 'Gagal menabung.', 'error');
      } else {
        showFeedback(`Berhasil menambahkan tabungan ke ${goal.name}! 🐷`, 'success');
        setIsOpen(false);
        router.refresh();
      }
    } catch {
      showFeedback('Gagal terhubung ke server.', 'error');
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

  // If this is an asset goal, user cannot add funds manually. It's automated!
  if (goal.asset_id) return null;

  const modalContent = (isOpen && mounted) ? createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200"
      onClick={() => !isLoading && setIsOpen(false)} 
    >
      <div 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-900/10">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-500" />
            Nabung Impian
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
          <div className="mb-5 text-center">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Target:</p>
            <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{goal.name}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                <span>Pilih Sumber Uang (Dompet)</span>
              </label>
              <select 
                name="wallet_id" 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">-- Pilih Dompet --</option>
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
                Uang di dompet yang dipilih akan dipotong dan tercatat sebagai Pengeluaran Tabungan.
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nominal Tabungan (Rp)
              </label>
              <input 
                type="text" 
                name="amount" 
                required
                onChange={handleNumberFormat}
                placeholder="Misal: 500.000" 
                className="w-full px-4 py-2.5 text-lg font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
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
                className="flex-[2] px-4 py-3 rounded-xl font-bold text-white transition-colors flex justify-center items-center shadow-lg disabled:opacity-50 bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
              >
                {isLoading ? 'Menyimpan...' : 'Nabung Sekarang 💰'}
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
        className="mt-4 w-full bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold py-2.5 px-4 rounded-xl border border-emerald-200 dark:border-emerald-500/30 transition-colors flex justify-center items-center gap-2 group"
      >
        <PiggyBank className="w-5 h-5 group-hover:scale-110 transition-transform" />
        Nabung
      </button>

      {modalContent}
    </>
  );
}
