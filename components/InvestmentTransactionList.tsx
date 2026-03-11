'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownRight, ArrowUpRight, Trash2, X } from 'lucide-react';
import { deleteInvestment } from '@/actions/investment.actions';
import { useFeedback } from '@/components/FeedbackProvider';

export default function InvestmentTransactionList({ transactions }: { transactions: any[] }) {
  const { showFeedback } = useFeedback();
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<any | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleDelete = async (id: string) => {
    setIsDeletingId(id);
    
    const result = await deleteInvestment(id);
    if (result?.error) {
      showFeedback(result.error, 'error');
    } else {
      showFeedback('Transaksi investasi dihapus.', 'delete');
    }
    setIsDeletingId(null);
    setTransactionToDelete(null);
  };

  const renderModal = () => {
    if (!mounted || !transactionToDelete) return null;

    return createPortal(
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setTransactionToDelete(null)} 
      >
        <div 
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()} 
        >
          <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-red-50/50 dark:bg-red-500/10">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5"/> Hapus Riwayat
            </h3>
            <button onClick={() => setTransactionToDelete(null)} className="text-slate-400 hover:text-red-500 bg-white/50 dark:bg-slate-800/50 hover:bg-red-100 dark:hover:bg-red-500/20 p-1.5 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <p className="text-slate-600 dark:text-slate-300">
              Yakin ingin menghapus catatan investasi ini? Ini akan mengubah rata-rata saldo portofolio kamu.
            </p>
            <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-700 mt-2">
              <button onClick={() => setTransactionToDelete(null)} className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Batal</button>
              <button 
                onClick={() => handleDelete(transactionToDelete.id)} 
                disabled={isDeletingId === transactionToDelete.id} 
                className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex justify-center items-center"
              >
                {isDeletingId === transactionToDelete.id ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const formatIDR = (val: string | number) => {
    const num = Number(val);
    if (isNaN(num)) return '-';
    // Remove trailing .00 decimals
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const formatUnit = (val: string | number) => {
    const num = Number(val);
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(num);
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 mt-6">
        <p className="text-slate-500 dark:text-slate-400 font-medium">Belum ada riwayat transaksi investasi.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {transactions.map((tx) => {
        const isBeli = tx.transaction_type === 'BELI';
        
        return (
          <div 
            key={tx.id} 
            className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all group"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className={`p-3 rounded-xl shadow-sm ${
                isBeli 
                  ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' 
                  : 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400'
              }`}>
                {isBeli ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {tx.user_portfolios?.assets?.name || 'Aset Terhapus'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    isBeli ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' 
                           : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                  }`}>
                    {tx.transaction_type}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <p>
                    {new Date(tx.transaction_date).toLocaleDateString('id-ID', { 
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                  <p className="hidden sm:block">•</p>
                  <p className="font-medium">
                    {formatUnit(tx.units)} {tx.user_portfolios?.assets?.unit_name || 'unit'} @ Rp {formatIDR(tx.price_per_unit)}
                  </p>
                </div>

                {tx.notes && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">
                    "{tx.notes}"
                  </p>
                )}
                
                {tx.linked_fiat_transaction_id && (
                  <p className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 inline-block px-2 py-0.5 rounded-md mt-1.5 border border-slate-200 dark:border-slate-600">
                    Disimpan ke Dompet ✨
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-end border-t border-slate-100 dark:border-slate-700 sm:border-0 pt-3 sm:pt-0">
               <div className="text-left sm:text-right">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Nilai</p>
                 <p className={`font-bold text-lg ${isBeli ? 'text-slate-900 dark:text-white' : 'text-orange-600 dark:text-orange-400'}`}>
                   Rp {formatIDR(tx.total_amount)}
                 </p>
               </div>
               <button 
                 onClick={() => setTransactionToDelete(tx)}
                 disabled={isDeletingId === tx.id}
                 className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                 title="Hapus Catatan"
               >
                 <Trash2 className="w-5 h-5" />
               </button>
            </div>
          </div>
        );
      })}
      {renderModal()}
    </div>
  );
}
