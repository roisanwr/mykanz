// components/TransactionList.tsx
'use client'

import { useState } from 'react';
import { useFeedback } from '@/components/FeedbackProvider';
import { deleteTransaction } from '@/actions/transaction.actions';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Trash2 } from 'lucide-react';

export default function TransactionList({ transactions }: { transactions: any[] }) {
  const { showFeedback } = useFeedback();
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setIsDeletingId(id);
    const res = await deleteTransaction(id);
    if (res?.error) {
      showFeedback(res.error, 'error');
    } else {
      showFeedback('Transaksi berhasil dihapus', 'delete');
    }
    setIsDeletingId(null);
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
                onClick={() => handleDelete(tx.id)}
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
    </div>
  );
}
