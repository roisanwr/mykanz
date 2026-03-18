// components/CategoryCardActions.tsx
'use client'

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Edit2, Trash2, X, AlertTriangle, Save, ArrowUpRight, ArrowDownLeft, History, Search, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFeedback } from '@/components/FeedbackProvider';

export default function CategoryCardActions({ category }: { category: any }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'edit' | 'delete' | 'history' | null>(null);
  
  // States for Editing
  const [isLoading, setIsLoading] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editType, setEditType] = useState<'PEMASUKAN'|'PENGELUARAN'>(category.type);
  
  // States for History
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalFilteredAmount, setTotalFilteredAmount] = useState(0);

  const { showFeedback } = useFeedback();
  const router = useRouter();

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: category.id, name: editName, type: editType }),
      });
      const result = await res.json();
      if (!res.ok || result?.error) {
        showFeedback(result.error || 'Gagal mengubah kategori.', 'error');
      } else {
        showFeedback('Kategori berhasil diubah!', 'success');
        setActiveModal(null);
        router.refresh();
      }
    } catch {
      showFeedback('Gagal terhubung ke server.', 'error');
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/categories?id=${category.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok || result?.error) {
        showFeedback(result.error || 'Gagal menghapus kategori.', 'error');
      } else {
        showFeedback('Kategori berhasil dihapus!', 'delete', 'Terhapus');
        setActiveModal(null);
        router.refresh();
      }
    } catch {
      showFeedback('Gagal terhubung ke server.', 'error');
    }
    setIsLoading(false);
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    await fetchHistoryWrapper(startDate, endDate);
    setIsLoading(false);
  };

  // Kapan modal history pertama kali dibuka -> Auto Fetch All
  const openHistory = () => {
    setIsDropdownOpen(false);
    setActiveModal('history');
    setStartDate('');
    setEndDate('');
    fetchHistoryWrapper('', ''); // Load all
  };

  // Custom fetch function to handle initial load where state might not be set yet
  const fetchHistoryWrapper = async (start: string, end: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ categoryId: category.id });
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);
      const res = await fetch(`/api/categories/history?${params.toString()}`);
      const result = await res.json();
      if (result.success && result.data) {
        setHistoryData(result.data);
        const total = result.data.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
        setTotalFilteredAmount(total);
      }
    } catch { /* silently fail */ }
    setIsLoading(false);
  }

  // Called when user clicks "Cari" button inside history modal
  const handleFilterSearch = async () => {
    await fetchHistoryWrapper(startDate, endDate);
  };

  const closeModal = () => {
    if (isLoading) return;
    setActiveModal(null);
    setEditName(category.name);
    setEditType(category.type);
    setHistoryData([]);
  };

  const formatRupiah = (angka: number) => {
    // Memastikan angka yang dikembalikan menggunakan . sebagai pemisah ribuan khusus IDR
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
        className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {/* DROPDOWN MENU */}
      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 z-50">
          <div className="p-1">
            <button 
              onMouseDown={openHistory}
              className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              <History className="w-4 h-4 mr-3" /> Riwayat
            </button>
            <button 
              onMouseDown={() => { setIsDropdownOpen(false); setActiveModal('edit'); }}
              className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 dark:hover:text-orange-400 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <Edit2 className="w-4 h-4 mr-3" /> Edit Info
            </button>
            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2"></div>
            <button 
              onMouseDown={() => { setIsDropdownOpen(false); setActiveModal('delete'); }}
              className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <Trash2 className="w-4 h-4 mr-3" /> Hapus
            </button>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {activeModal === 'edit' && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-orange-500" />
                Edit Kategori
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              <form onSubmit={handleEdit} className="space-y-4">
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Tipe Kategori</label>
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setEditType('PENGELUARAN')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                        editType === 'PENGELUARAN' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" /> Pengeluaran
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditType('PEMASUKAN')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                        editType === 'PEMASUKAN' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <ArrowDownLeft className="w-4 h-4" /> Pemasukan
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nama Kategori</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-100 dark:border-slate-700">
                   <button type="button" onClick={closeModal} disabled={isLoading} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Batal</button>
                   <button type="submit" disabled={isLoading} className="px-5 py-2.5 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-lg shadow-orange-500/30">
                     <Save className="w-4 h-4" /> {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                   </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE MODAL */}
      {activeModal === 'delete' && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Hapus Kategori?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
              Anda yakin ingin menghapus kategori <strong>"{category.name}"</strong>? Data transaksi historis tidak akan hilang. Data yang dihapus tidak dapat dikembalikan.
            </p>
            <div className="flex gap-3">
              <button onClick={closeModal} disabled={isLoading} className="flex-1 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">Batal</button>
              <button onClick={handleDelete} disabled={isLoading} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors flex justify-center items-center shadow-lg shadow-red-500/30">
                {isLoading ? 'Menghapus...' : 'Hapus Kategori'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* HISTORY MODAL */}
      {activeModal === 'history' && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[85vh]">
            
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-orange-500" />
                  Riwayat: {category.name}
                </h3>
                {totalFilteredAmount > 0 && (
                  <p className="text-sm font-bold text-slate-500 mt-1">
                    Total: <span className={category.type === 'PEMASUKAN' ? 'text-emerald-500' : 'text-rose-500'}>
                      {formatRupiah(totalFilteredAmount)}
                    </span>
                  </p>
                )}
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-red-500 self-start"><X className="w-6 h-6" /></button>
            </div>

            {/* Filters */}
            <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 shrink-0 flex flex-col sm:flex-row gap-4 items-end">
               <div className="flex-1 w-full">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dari Tanggal</label>
                 <div className="relative">
                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input 
                     type="date" 
                     value={startDate}
                     onChange={(e) => setStartDate(e.target.value)}
                     className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                   />
                 </div>
               </div>
               <div className="flex-1 w-full">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sampai Tanggal</label>
                 <div className="relative">
                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input 
                     type="date" 
                     value={endDate}
                     onChange={(e) => setEndDate(e.target.value)}
                     className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                   />
                 </div>
               </div>
               <button 
                 onClick={handleFilterSearch}
                 disabled={isLoading}
                 className="w-full sm:w-auto px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg font-bold hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
               >
                 <Search className="w-4 h-4" /> Cari
               </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-900/20">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-10">
                  <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Berdasarkan filter saat ini,<br/>Belum ada transaksi di kategori ini.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyData.map((tx) => (
                    <div key={tx.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row justify-between gap-3 hover:border-orange-300 transition-colors">
                      <div className="flex items-start gap-3">
                         <div className={`mt-1 p-2 rounded-full ${category.type === 'PEMASUKAN' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                           {category.type === 'PEMASUKAN' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                         </div>
                         <div>
                           <p className="font-bold text-slate-900 dark:text-white leading-tight">
                             {tx.description || category.name}
                           </p>
                           <p className="text-xs text-slate-500 mt-1">
                             {new Date(tx.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} • {tx.wallets_fiat_transactions_wallet_idTowallets?.name}
                           </p>
                         </div>
                      </div>
                      <div className={`font-black tracking-tight text-lg text-right ${category.type === 'PEMASUKAN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                        {category.type === 'PEMASUKAN' ? '+' : '-'}{formatRupiah(Number(tx.amount))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
