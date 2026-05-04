'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFeedback } from '@/components/FeedbackProvider';

export default function AddEventModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showFeedback } = useFeedback();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [budgetInput, setBudgetInput] = useState('');
  
  // Custom Date (Default is Today YYYY-MM-DD local time)
  const [startDate, setStartDate] = useState(() => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzOffset)).toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    // Default endDate to 3 days from now
    return (new Date(Date.now() - tzOffset + (3 * 24 * 60 * 60 * 1000))).toISOString().split('T')[0];
  });

  const handleFormatChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setter('');
      return;
    }
    const formatted = new Intl.NumberFormat('id-ID').format(Number(rawValue));
    setter(formatted);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (new Date(endDate) < new Date(startDate)) {
      showFeedback('Tanggal selesai tidak boleh lebih kecil dari tanggal mulai!', 'warning');
      setIsLoading(false);
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const rawBudget = budgetInput.replace(/\D/g, '');

    const payload = {
      name,
      description,
      start_date: startDate,
      end_date: endDate,
      budget_limit: rawBudget ? parseFloat(rawBudget) : null
    };

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok || result?.error) {
        showFeedback(result.error || 'Gagal membuat event.', 'error');
      } else {
        showFeedback('Event berhasil dibuat!', 'success');
        setIsOpen(false);
        router.refresh();
      }
    } catch {
      showFeedback('Gagal terhubung ke server.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (isOpen && mounted) ? createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200"
      onClick={() => !isLoading && setIsOpen(false)} 
    >
      <div 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-orange-500" />
            Buat Event Baru
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

        <div className="overflow-y-auto p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* NAMA EVENT */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Event
              </label>
              <input 
                type="text" 
                name="name" 
                required
                maxLength={255}
                placeholder="Misal: Liburan Bali, Pernikahan, Mudik Lebaran..." 
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            {/* DESKRIPSI EVENT */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Deskripsi Singkat <span className="text-xs font-normal text-slate-500">(Opsional)</span>
              </label>
              <textarea 
                name="description" 
                rows={2}
                placeholder="Deskripsikan event ini..." 
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            {/* TANGGAL EVENT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tanggal Mulai
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tanggal Selesai
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* BUDGET LIMIT */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Batas Anggaran / Budget <span className="text-xs font-normal text-slate-500">(Opsional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                <input 
                  type="text" 
                  value={budgetInput}
                  onChange={(e) => handleFormatChange(e, setBudgetInput)}
                  placeholder="0" 
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-lg font-bold"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">Kosongkan jika event ini tidak memiliki target budget.</p>
            </div>

            {/* BUTTONS */}
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
                className="flex-[2] px-4 py-3 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors flex justify-center items-center shadow-lg shadow-orange-500/30"
              >
                {isLoading ? 'Menyimpan...' : 'Simpan Event'}
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
        className="flex items-center justify-center gap-2 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 hover:shadow-orange-500/50 transition-all duration-300"
      >
        <Plus className="w-5 h-5" />
        Buat Event Baru
      </button>

      {modalContent}
    </>
  );
}
