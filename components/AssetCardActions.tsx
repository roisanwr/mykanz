'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Edit2, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFeedback } from '@/components/FeedbackProvider';

export default function AssetCardActions({ asset }: { asset: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { showFeedback } = useFeedback();
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement)?.value;
    const ticker_symbol = (form.elements.namedItem('ticker_symbol') as HTMLInputElement)?.value;
    const unit_name = (form.elements.namedItem('unit_name') as HTMLInputElement)?.value;
    try {
      const res = await fetch('/api/assets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: asset.id, name, ticker_symbol, unit_name }),
      });
      const result = await res.json();
      if (!res.ok || result?.error) {
        showFeedback(result.error || 'Gagal memperbarui aset.', 'error');
      } else {
        showFeedback('Aset berhasil diperbarui', 'success');
        setIsEditModalOpen(false);
        setIsOpen(false);
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
      const res = await fetch(`/api/assets?id=${asset.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok || result?.error) {
        showFeedback(result.error || 'Gagal menghapus aset.', 'error');
      } else {
        showFeedback('Aset berhasil dihapus', 'delete');
        setIsDeleteModalOpen(false);
        router.refresh();
      }
    } catch {
      showFeedback('Gagal terhubung ke server.', 'error');
    }
    setIsLoading(false);
  };

  const renderDeleteModal = () => {
    if (!mounted || !isDeleteModalOpen) return null;

    return createPortal(
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setIsDeleteModalOpen(false)} 
      >
        <div 
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()} 
        >
          <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-red-50/50 dark:bg-red-500/10">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5"/> Hapus Aset
            </h3>
            <button onClick={() => setIsDeleteModalOpen(false)} className="text-slate-400 hover:text-red-500 bg-white/50 dark:bg-slate-800/50 hover:bg-red-100 dark:hover:bg-red-500/20 p-1.5 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <p className="text-slate-600 dark:text-slate-300">
              Yakin ingin menghapus aset <span className="font-bold">"{asset.name}"</span>? Ini akan menghapus portofolio dan riwayat transaksi terkait. (Aksi ini tidak bisa dibatalkan)
            </p>
            <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-700 mt-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Batal</button>
              <button 
                onClick={handleDelete} 
                disabled={isLoading} 
                className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex justify-center items-center"
              >
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => { setIsEditModalOpen(true); setIsOpen(false); }}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Edit2 className="w-4 h-4 mr-3 text-indigo-500" />
              Edit Aset
            </button>
            <button
              onClick={() => { setIsDeleteModalOpen(true); setIsOpen(false); }}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
            >
              <Trash2 className="w-4 h-4 mr-3" />
              {isLoading ? 'Menghapus...' : 'Hapus (Permanen)'}
            </button>
          </div>
        </>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                <Edit2 className="w-4 h-4 text-indigo-500 mr-2" /> Edit Aset
              </h3>
            </div>
            <div className="p-5">
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Aset</label>
                  <input type="text" name="name" defaultValue={asset.name} required className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kode Ticker</label>
                    <input type="text" name="ticker_symbol" defaultValue={asset.ticker_symbol || ''} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500/50 uppercase" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Satuan Unit</label>
                    <input type="text" name="unit_name" defaultValue={asset.unit_name || 'unit'} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl">Batal</button>
                  <button type="submit" disabled={isLoading} className="flex-1 py-2 font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl">{isLoading ? 'Loading..' : 'Simpan'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {renderDeleteModal()}
    </div>
  );
}
