'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Search, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFeedback } from '@/components/FeedbackProvider';
import type { FiatTransaction } from '@/types';

export default function AssignTransactionToEventModal({ eventId }: { eventId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<FiatTransaction[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [search, setSearch] = useState('');
  
  const { showFeedback } = useFeedback();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) {
      const fetchTransactions = async () => {
        setLoadingData(true);
        try {
          // Fetch all transactions to show in list
          const res = await fetch('/api/transactions?type=SEMUA');
          const result = await res.json();
          if (res.ok && result.data) {
            // Filter only transactions that are NOT in this event already
            const available = result.data.filter((tx: any) => tx.event_id !== eventId && tx.transaction_type !== 'TRANSFER');
            setTransactions(available);
          }
        } catch (error) {
          console.error("Failed to fetch transactions:", error);
        }
        setLoadingData(false);
      };
      fetchTransactions();
    }
  }, [isOpen, eventId]);

  const handleAssign = async (transactionId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/transactions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: transactionId, action: 'assign' }),
      });
      const result = await res.json();

      if (!res.ok || result?.error) {
        showFeedback(result.error || 'Gagal menambahkan transaksi.', 'error');
      } else {
        showFeedback('Transaksi ditambahkan ke event!', 'success');
        // Remove from list
        setTransactions(prev => prev.filter(tx => tx.id !== transactionId));
        router.refresh();
      }
    } catch {
      showFeedback('Gagal terhubung ke server.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.categories?.name.toLowerCase().includes(search.toLowerCase()) || 
    (tx.description && tx.description.toLowerCase().includes(search.toLowerCase()))
  );

  const modalContent = (isOpen && mounted) ? createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200"
      onClick={() => !isLoading && setIsOpen(false)} 
    >
      <div 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-orange-500" />
            Tambahkan Transaksi ke Event
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

        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
           <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
             <input 
               type="text" 
               placeholder="Cari berdasarkan kategori atau deskripsi..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
             />
           </div>
        </div>

        <div className="overflow-y-auto p-2 flex-1">
          {loadingData ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-500 dark:text-slate-400">Tidak ada transaksi yang tersedia untuk ditambahkan.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map(tx => {
                const isIncome = tx.transaction_type === 'PEMASUKAN';
                const IconComponent = isIncome ? ArrowDownLeft : ArrowUpRight;
                const iconColor = isIncome ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10';
                
                return (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${iconColor}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          {tx.categories?.name || 'Transaksi'} {tx.event_id && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 ml-1">Sudah di event lain</span>}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(tx.transaction_date ?? new Date()).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })} • {tx.wallets_fiat_transactions_wallet_idTowallets.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className={`font-bold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                        {isIncome ? '+' : '-'}{formatRupiah(Number(tx.amount))}
                      </p>
                      <button
                        onClick={() => handleAssign(tx.id)}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-orange-500 hover:text-white transition-colors disabled:opacity-50"
                      >
                        Tambah
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <button 
            type="button" 
            onClick={() => setIsOpen(false)}
            className="w-full px-4 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-500/50 text-slate-700 dark:text-slate-300 hover:text-orange-600 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300"
      >
        <Plus className="w-5 h-5" />
        Tambah Transaksi ke Event
      </button>

      {modalContent}
    </>
  );
}
