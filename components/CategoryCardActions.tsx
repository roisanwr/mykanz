// components/CategoryCardActions.tsx
'use client'

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Edit2, Trash2, X, AlertTriangle, Save, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { updateCategory, deleteCategory } from '@/actions/category.actions';
import { useFeedback } from '@/components/FeedbackProvider';

export default function CategoryCardActions({ category }: { category: any }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'edit' | 'delete' | null>(null);
  
  // States for Editing
  const [isLoading, setIsLoading] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editType, setEditType] = useState<'PEMASUKAN'|'PENGELUARAN'>(category.type);
  
  const { showFeedback } = useFeedback();

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData();
    formData.append('id', category.id);
    formData.append('name', editName);
    formData.append('type', editType);
    
    const result = await updateCategory(formData);
    
    if (result?.error) {
      showFeedback(result.error, 'error');
    } else {
      showFeedback('Kategori berhasil diubah!', 'success');
      setActiveModal(null);
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    const result = await deleteCategory(category.id);
    if (result?.error) {
      showFeedback(result.error, 'error');
    } else {
      showFeedback('Kategori berhasil dihapus!', 'delete', 'Terhapus');
      setActiveModal(null);
    }
    setIsLoading(false);
  };

  const closeModal = () => {
    if (isLoading) return;
    setActiveModal(null);
    // reset form fields
    setEditName(category.name);
    setEditType(category.type);
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
              onMouseDown={() => { setIsDropdownOpen(false); setActiveModal('edit'); }}
              className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 dark:hover:text-orange-400 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <Edit2 className="w-4 h-4 mr-3" /> Edit Info
            </button>
            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1mx-2"></div>
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
    </div>
  );
}
