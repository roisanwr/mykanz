// components/EditTransactionModal.tsx
'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRightLeft, ArrowDownLeft, ArrowUpRight, Calendar, Edit3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFeedback } from '@/components/FeedbackProvider';
import { updateTransactionAction } from '@/app/actions/transaction';
import { getTransactionFormMetadata } from '@/app/actions/metadata';
import type { Wallet, Category, TxType, FiatTransaction } from '@/types';

export default function EditTransactionModal({
  transaction,
  isOpen,
  onClose,
}: {
  transaction: FiatTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  // Form States
  const [txType, setTxType] = useState<TxType>('PENGELUARAN');
  const [sourceWalletId, setSourceWalletId] = useState('');
  const [destWalletId, setDestWalletId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [txDate, setTxDate] = useState('');
  
  const { showFeedback } = useFeedback();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Fetch metadata saat modal dibuka pertama kali
  useEffect(() => {
    if (isOpen && wallets.length === 0 && !isFetchingMetadata) {
      setIsFetchingMetadata(true);
      getTransactionFormMetadata().then((res) => {
        if (res.success && res.data) {
          setWallets(res.data.wallets);
          setCategories(res.data.categories);
          setEvents(res.data.events);
        } else {
          showFeedback(res.error || 'Gagal memuat data form', 'error');
        }
        setIsFetchingMetadata(false);
      });
    }
  }, [isOpen, wallets.length, isFetchingMetadata, showFeedback]);

  // Populate form saat transaksi yang dipilih berubah
  useEffect(() => {
    if (transaction) {
      setTxType(transaction.transaction_type as TxType);
      setSourceWalletId(transaction.wallet_id);
      setDestWalletId(transaction.to_wallet_id || '');
      setAmountInput(new Intl.NumberFormat('id-ID').format(Number(transaction.amount)));
      
      const date = new Date(transaction.transaction_date);
      // Format YYYY-MM-DD local timezone
      const tzOffset = date.getTimezoneOffset() * 60000;
      const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
      setTxDate(localISOTime);
    }
  }, [transaction]);

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
    if (!transaction) return;

    setIsLoading(true);
    
    if (txType === 'TRANSFER' && sourceWalletId === destWalletId) {
      showFeedback('Dompet asal dan tujuan tidak boleh sama!', 'warning', 'Invalid');
      setIsLoading(false);
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    const rawAmount = (formData.get('amount') as string || '').replace(/\D/g, '');

    const payload: any = {
      id: transaction.id,
      transaction_type: txType,
      wallet_id: sourceWalletId,
      amount: parseFloat(rawAmount) || 0,
      description: formData.get('description') as string || null,
      transaction_date: formData.get('transaction_date') as string,
    };

    if (txType === 'TRANSFER') {
      payload.to_wallet_id = destWalletId;
    } else {
      payload.category_id = formData.get('category_id') as string || null;
      payload.event_id = formData.get('event_id') as string || null;
    }

    try {
      const result = await updateTransactionAction(payload);

      if (result?.error) {
        showFeedback(result.error || 'Gagal mengupdate transaksi.', 'error');
      } else {
        showFeedback('Transaksi berhasil diperbarui!', 'success');
        onClose();
        router.refresh();
      }
    } catch {
      showFeedback('Gagal terhubung ke server.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !mounted || !transaction) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200"
      onClick={() => !isLoading && onClose()} 
    >
      <div 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-500" />
            Detail & Edit Transaksi
          </h3>
          <button 
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-none transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 relative">
          {isFetchingMetadata ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="text-sm text-slate-500">Memuat data form...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* INFO TIPE TRANSAKSI (Read-only) */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tipe Transaksi (Tidak Bisa Diubah)
                </label>
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-none opacity-80 cursor-not-allowed">
                  <button
                    type="button"
                    disabled
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-none transition-all ${
                      txType === 'PENGELUARAN' 
                      ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' 
                      : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" /> Pengeluaran
                  </button>
                  <button
                    type="button"
                    disabled
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-none transition-all ${
                      txType === 'PEMASUKAN' 
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' 
                      : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" /> Pemasukan
                  </button>
                  <button
                    type="button"
                    disabled
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-none transition-all ${
                      txType === 'TRANSFER' 
                      ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
                      : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4" /> Transfer
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TANGGAL TRANSAKSI */}
                <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tanggal Transaksi
                   </label>
                   <div className="relative">
                     <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                     <input 
                       type="date" 
                       name="transaction_date" 
                       value={txDate}
                       onChange={(e) => setTxDate(e.target.value)}
                       required
                       className="w-full pl-12 pr-4 py-2.5 rounded-none border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
                     />
                   </div>
                </div>
              </div>

              {/* DOMPET (Dinamis berdasarkan Tipe) */}
              {txType !== 'TRANSFER' ? (
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Dari/Ke Dompet
                  </label>
                  <select 
                    name="wallet_id" 
                    value={sourceWalletId}
                    onChange={(e) => setSourceWalletId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-none border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="" disabled>Pilih Dompet...</option>
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Dompet Asal
                    </label>
                    <select 
                      name="wallet_id" 
                      value={sourceWalletId}
                      onChange={(e) => setSourceWalletId(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-none border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      Dompet Tujuan
                      {sourceWalletId === destWalletId && <span className="text-[10px] text-red-500 uppercase">Tidak Valid!</span>}
                    </label>
                    <select 
                      name="to_wallet_id" 
                      value={destWalletId}
                      onChange={(e) => setDestWalletId(e.target.value)}
                      required
                      className={`w-full px-4 py-2.5 rounded-none border bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                        sourceWalletId === destWalletId ? 'border-red-500 ring-2 ring-red-500/50' : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* KATEGORI (Hanya untuk Pemasukan / Pengeluaran) */}
              {txType !== 'TRANSFER' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Kategori
                    </label>
                    <select 
                      name="category_id" 
                      defaultValue={transaction.category_id || ""}
                      className="w-full px-4 py-2.5 rounded-none border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="">Tanpa Kategori</option>
                      {categories.filter(c => c.type === txType).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Event <span className="text-xs font-normal text-slate-500">(Opsional)</span>
                    </label>
                    <select 
                      name="event_id" 
                      defaultValue={transaction.event_id || ""}
                      className="w-full px-4 py-2.5 rounded-none border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="">Pilih Event...</option>
                      {events.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* JUMLAH UTAMA */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Jumlah Uang
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                  <input 
                    type="text" 
                    name="amount" 
                    value={amountInput}
                    onChange={(e) => handleFormatChange(e, setAmountInput)}
                    required
                    placeholder="0" 
                    className="w-full pl-12 pr-4 py-3 rounded-none border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xl font-black"
                  />
                </div>
              </div>

              {/* DESKRIPSI (Opsional) */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Keterangan (Opsional)
                </label>
                <input 
                  type="text" 
                  name="description" 
                  defaultValue={transaction.description || ""}
                  placeholder="Misal: Makan Siang, Beli Bensin..." 
                  className="w-full px-4 py-2.5 rounded-none border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              {transaction.source_channel === 'GMAIL' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 text-xs border-l-2 border-blue-500 mt-2">
                  <strong>Info:</strong> Transaksi ini tercatat secara otomatis melalui integrasi Gmail. Mengedit transaksi akan menghilangkan tanda "Butuh Review".
                </div>
              )}

              {/* BUTTONS */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button 
                  type="button" 
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-none font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Tutup / Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading || (txType === 'TRANSFER' && sourceWalletId === destWalletId)}
                  className="flex-[2] px-4 py-3 rounded-none font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition-colors flex justify-center items-center shadow-lg shadow-blue-500/30"
                >
                  {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
              
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
