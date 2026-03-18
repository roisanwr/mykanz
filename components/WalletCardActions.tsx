// components/WalletCardActions.tsx
'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { History, Pencil, Trash2, X, ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from 'lucide-react';

import { useRouter } from 'next/navigation';
import { useFeedback } from '@/components/FeedbackProvider';

export default function WalletCardActions({ wallet }: { wallet: any }) {
  const [activeModal, setActiveModal] = useState<'history' | 'edit' | 'delete' | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const router = useRouter();
  const { showFeedback } = useFeedback();

  // History state
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => setMounted(true), []);

  const closeModal = () => {
    setActiveModal(null);
    setErrorMsg('');
  };

  const handleEdit = async (formData: FormData) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/wallets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: wallet.id,
          name: formData.get('name'),
          type: formData.get('type'),
        }),
      });
      const result = await res.json();
      if (!res.ok || result?.error) {
        setErrorMsg(result.error || 'Gagal memperbarui dompet.');
        showFeedback(result.error || 'Gagal memperbarui dompet.', 'error');
      } else {
        showFeedback('Dompet berhasil diperbarui!', 'success');
        closeModal();
        router.refresh();
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan.');
      showFeedback('Terjadi kesalahan jaringan.', 'error');
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/wallets?id=${wallet.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok || result?.error) {
        setErrorMsg(result.error || 'Gagal menghapus dompet.');
        showFeedback(result.error || 'Gagal menghapus dompet.', 'error');
      } else {
        showFeedback('Dompet berhasil dihapus!', 'delete', 'Terhapus');
        closeModal();
        router.refresh();
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan.');
      showFeedback('Terjadi kesalahan jaringan.', 'error');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (activeModal === 'history') {
      const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
          const res = await fetch(`/api/wallets/history?walletId=${wallet.id}`);
          const result = await res.json();
          if (result?.success) {
            setHistoryData(result.data);
          }
        } catch {
          // silently fail, empty list will be shown
        }
        setIsLoadingHistory(false);
      };
      fetchHistory();
    }
  }, [activeModal, wallet.id]);

  const renderModal = () => {
    if (!mounted || !activeModal) return null;

    return createPortal(
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200"
        onClick={closeModal} 
      >
        <div 
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()} 
        >
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {activeModal === 'history' && <><History className="w-5 h-5 text-blue-500"/> Riwayat Transaksi</>}
              {activeModal === 'edit' && <><Pencil className="w-5 h-5 text-orange-500"/> Edit Dompet</>}
              {activeModal === 'delete' && <><Trash2 className="w-5 h-5 text-red-500"/> Hapus Dompet</>}
            </h3>
            <button onClick={closeModal} className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Message Global */}
          {errorMsg && (
            <div className="mx-5 mt-5 p-3 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-lg text-sm font-medium">
              {errorMsg}
            </div>
          )}

          {/* Body */}
          <div className="p-5 overflow-y-auto">
            {activeModal === 'history' && (
              <div className="space-y-4">
                {isLoadingHistory ? (
                  <p className="text-center text-slate-500 py-4">Memuat riwayat...</p>
                ) : historyData.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">Belum ada transaksi untuk dompet ini.</p>
                ) : (
                  <div className="space-y-3">
                    {historyData.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${tx.isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {tx.typeLabel.includes('Trf') ? <ArrowRightLeft className="w-4 h-4"/> : 
                             tx.isIncome ? <ArrowDownLeft className="w-4 h-4"/> : <ArrowUpRight className="w-4 h-4"/>}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{tx.category !== '-' ? tx.category : tx.typeLabel}</p>
                            <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString('id-ID')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${tx.isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.isIncome ? '+' : '-'} {new Intl.NumberFormat('id-ID', { style: 'currency', currency: wallet.currency || 'IDR', minimumFractionDigits: 0 }).format(tx.amount)}
                          </p>
                          {tx.description !== '-' && (
                            <p className="text-xs text-slate-500 truncate max-w-[100px]">{tx.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeModal === 'edit' && (
              <form action={handleEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nama Dompet</label>
                  <input type="text" name="name" defaultValue={wallet.name} required className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Tipe Dompet</label>
                  <select name="type" defaultValue={wallet.type} required className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                    <option value="TUNAI">💵 Tunai (Uang Fisik)</option>
                    <option value="BANK">🏦 Rekening Bank</option>
                    <option value="DOMPET_DIGITAL">📱 Dompet Digital (E-Wallet)</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4 mt-6 border-t border-slate-100 dark:border-slate-700">
                  <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Batal</button>
                  <button type="submit" disabled={isLoading} className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-orange-500 text-white disabled:opacity-50 hover:bg-orange-600">{isLoading ? 'Menyimpan...' : 'Simpan'}</button>
                </div>
              </form>
            )}

            {activeModal === 'delete' && (
              <div className="space-y-4">
                <p className="text-slate-600 dark:text-slate-300">Apakah kamu yakin ingin menghapus dompet <span className="font-bold">"{wallet.name}"</span>? Transaksi yang terkait mungkin tetap dipertahankan, namun dompet tidak akan muncul lagi.</p>
                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Batal</button>
                  <button onClick={handleDelete} disabled={isLoading} className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">{isLoading ? 'Menghapus...' : 'Ya, Hapus'}</button>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer actions for history modal since it has no form buttons */}
          {activeModal === 'history' && (
             <div className="p-5 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
               <button onClick={closeModal} className="w-full px-4 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Tutup Riwayat</button>
             </div>
          )}

        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
        <button onClick={() => setActiveModal('history')} className="p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/20 text-slate-400 dark:text-slate-500 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:scale-110" title="Riwayat">
          <History className="w-4 h-4" />
        </button>
        <button onClick={() => setActiveModal('edit')} className="p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-500/20 text-slate-400 dark:text-slate-500 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:scale-110" title="Edit">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => setActiveModal('delete')} className="p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/20 text-slate-400 dark:text-slate-500 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:scale-110" title="Hapus">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {renderModal()}
    </>
  );
}