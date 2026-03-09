// components/AddTransactionModal.tsx
'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, ArrowRightLeft, ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';
import { createTransaction } from '@/actions/transaction.actions';
import { useFeedback } from '@/components/FeedbackProvider';

export default function AddTransactionModal({ wallets, categories }: { wallets: any[], categories: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // States untuk mengatur form secara dinamis
  const [txType, setTxType] = useState<'PEMASUKAN' | 'PENGELUARAN' | 'TRANSFER'>('PENGELUARAN');
  const [sourceWalletId, setSourceWalletId] = useState(wallets[0]?.id || '');
  const [destWalletId, setDestWalletId] = useState(wallets.length > 1 ? wallets[1]?.id : '');
  
  // Formatted Inputs
  const [amountInput, setAmountInput] = useState('');
  const [adminFeeInput, setAdminFeeInput] = useState('');
  
  // Custom Date (Default is Today YYYY-MM-DD local time)
  const [txDate, setTxDate] = useState(() => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1);
    return localISOTime.split('T')[0];
  });
  
  const { showFeedback } = useFeedback();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleFormatChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setter('');
      return;
    }
    const formatted = new Intl.NumberFormat('id-ID').format(Number(rawValue));
    setter(formatted);
  };

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    
    // Validasi Transfer Otomatis di Client sebelum ke Server
    if (txType === 'TRANSFER' && sourceWalletId === destWalletId) {
      showFeedback('Dompet asal dan tujuan tidak boleh sama!', 'warning', 'Invalid');
      setIsLoading(false);
      return;
    }

    const result = await createTransaction(formData);
    
    if (result?.error) {
      showFeedback(result.error, 'error');
      setIsLoading(false);
    } else {
      showFeedback('Transaksi berhasil dicatat!', 'success');
      setIsOpen(false);
      setIsLoading(false);
      
      // Reset form on success
      setTxType('PENGELUARAN');
      setAmountInput('');
      setAdminFeeInput('');
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
            Catat Transaksi Baru
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
          <form action={handleSubmit} className="space-y-5">
            
            {/* TIPE TRANSAKSI (TABS) */}
            <div>
              <input type="hidden" name="transaction_type" value={txType} />
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTxType('PENGELUARAN')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
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
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
                    txType === 'PEMASUKAN' 
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" /> Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('TRANSFER')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
                    txType === 'TRANSFER' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
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
                     className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                   />
                 </div>
              </div>
            </div>

            {/* DOMPET (Dinamis berdasarkan Tipe) */}
            {txType !== 'TRANSFER' ? (
              // Mode Pemasukan / Pengeluaran (Hanya butuh 1 Dompet)
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Dari/Ke Dompet
                </label>
                <select 
                  name="wallet_id" 
                  value={sourceWalletId}
                  onChange={(e) => setSourceWalletId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>
                  ))}
                </select>
              </div>
            ) : (
              // Mode Transfer (Butuh Opsi Asal dan Tujuan)
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
                    className="w-full px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-500/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
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
                    className={`w-full px-4 py-2.5 rounded-xl border bg-emerald-50 dark:bg-emerald-500/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      sourceWalletId === destWalletId ? 'border-red-500 ring-2 ring-red-500/50' : 'border-emerald-300 dark:border-emerald-500/50'
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
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kategori
                </label>
                <select 
                  name="category_id" 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  <option value="">Tanpa Kategori</option>
                  {/* Filter kategori sesuai tipe. Anggap type di kategori sama dengan transaksi (PEMASUKAN/PENGELUARAN) */}
                  {categories.filter(c => c.type === txType).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
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
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-xl font-black"
                />
              </div>
            </div>

            {/* BIAYA ADMIN (Khusus Transfer) */}
            {txType === 'TRANSFER' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  Biaya Admin / Potongan
                  <span className="text-xs font-normal text-slate-500">(Opsional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">Rp</span>
                  <input 
                    type="text" 
                    name="admin_fee" 
                    value={adminFeeInput}
                    onChange={(e) => handleFormatChange(e, setAdminFeeInput)}
                    placeholder="0" 
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5 italic">
                  Biaya admin akan otomatis dicatat sebagai Pengeluaran dari Dompet Asal.
                </p>
              </div>
            )}

            {/* DESKRIPSI (Opsional) */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Keterangan (Opsional)
              </label>
              <input 
                type="text" 
                name="description" 
                placeholder="Misal: Makan Siang, Beli Bensin..." 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
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
                disabled={isLoading || (txType === 'TRANSFER' && sourceWalletId === destWalletId)}
                className="flex-[2] px-4 py-3 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors flex justify-center items-center shadow-lg shadow-orange-500/30"
              >
                {isLoading ? 'Menyimpan...' : 'Simpan Transaksi'}
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
        Tambah Transaksi
      </button>

      {modalContent}
    </>
  );
}
