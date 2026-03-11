// components/TransactionList.tsx
'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFeedback } from '@/components/FeedbackProvider';
import { deleteTransaction } from '@/actions/transaction.actions';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Trash2, X } from 'lucide-react';

export default function TransactionList({ transactions }: { transactions: any[] }) {
  const { showFeedback } = useFeedback();
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<any | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleDelete = async (id: string) => {
    setIsDeletingId(id);
    const res = await deleteTransaction(id);
    if (res?.error) {
      showFeedback(res.error, 'error');
    } else {
      showFeedback('Transaksi berhasil dihapus', 'delete');
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
              <Trash2 className="w-5 h-5"/> Hapus Transaksi
            </h3>
            <button onClick={() => setTransactionToDelete(null)} className="text-slate-400 hover:text-red-500 bg-white/50 dark:bg-slate-800/50 hover:bg-red-100 dark:hover:bg-red-500/20 p-1.5 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <p className="text-slate-600 dark:text-slate-300">
              Apakah kamu yakin ingin menghapus transaksi ini? Aksi ini tidak dapat dibatalkan dan akan mempengaruhi saldo dompet terkait.
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

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
        <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-full mb-4">
          <ArrowRightLeft className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Belum Ada Transaksi</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
          Catat pengeluaran atau pemasukan pertamamu hari ini!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((tx) => {
        // Tentukan UI berdasarkan Tipe
        let isIncome = false;
        let isTransfer = false;
        let bgColor = '';
        let iconColor = '';
        let IconComponent = ArrowUpRight;
        let title = '';
        let subtitle = new Date(tx.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        if (tx.transaction_type === 'PEMASUKAN') {
          isIncome = true;
          bgColor = 'bg-emerald-50 dark:bg-emerald-500/10';
          iconColor = 'text-emerald-600 dark:text-emerald-400';
          IconComponent = ArrowDownLeft;
          title = tx.categories?.name || 'Pemasukan';
          subtitle += ` • Ke: ${tx.wallets_fiat_transactions_wallet_idTowallets?.name}`;
        } else if (tx.transaction_type === 'PENGELUARAN') {
          bgColor = 'bg-rose-50 dark:bg-rose-500/10';
          iconColor = 'text-rose-600 dark:text-rose-400';
          title = tx.categories?.name || 'Pengeluaran';
          subtitle += ` • Dari: ${tx.wallets_fiat_transactions_wallet_idTowallets?.name}`;
        } else if (tx.transaction_type === 'TRANSFER') {
          isTransfer = true;
          bgColor = 'bg-blue-50 dark:bg-blue-500/10';
          iconColor = 'text-blue-600 dark:text-blue-400';
          IconComponent = ArrowRightLeft;
          title = 'Transfer';
          subtitle += ` • ${tx.wallets_fiat_transactions_wallet_idTowallets?.name} ➔ ${tx.wallets_fiat_transactions_to_wallet_idTowallets?.name}`;
        }

        return (
          <div key={tx.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
            
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${bgColor} ${iconColor}`}>
                <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg tracking-tight">
                  {title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {subtitle}
                </p>
                {tx.description && (
                  <p className="text-xs text-slate-400 mt-1 italic">
                    &quot;{tx.description}&quot;
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between w-full sm:w-auto gap-4">
              <div className="text-left sm:text-right">
                <p className={`font-black text-lg sm:text-xl tracking-tight ${isTransfer ? 'text-blue-600 dark:text-blue-400' : isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                  {!isTransfer && (isIncome ? '+' : '-')} {formatRupiah(Number(tx.amount))}
                </p>
              </div>

              {/* Action Bullets - Only visible on hover/focus on desktop, but always visible on mobile */}
              <button 
                onClick={() => setTransactionToDelete(tx)}
                disabled={isDeletingId === tx.id}
                className="p-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
                title="Hapus Transaksi"
              >
                {isDeletingId === tx.id ? <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/> : <Trash2 className="w-5 h-5" />}
              </button>
            </div>

          </div>
        );
      })}
      {renderModal()}
    </div>
  );
}
