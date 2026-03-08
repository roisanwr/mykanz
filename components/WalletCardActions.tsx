// components/WalletCardActions.tsx
'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { History, Pencil, Trash2, X } from 'lucide-react';

export default function WalletCardActions({ wallet }: { wallet: any }) {
  // State untuk melacak pop-up mana yang sedang terbuka
  const [activeModal, setActiveModal] = useState<'history' | 'edit' | 'delete' | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const closeModal = () => setActiveModal(null);

  // Jurus Portal untuk memunculkan Modal di luar penjara layout
  const renderModal = () => {
    if (!mounted || !activeModal) return null;

    return createPortal(
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200"
        onClick={closeModal} // Tutup kalau klik area gelap
      >
        <div 
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()} // Biar nggak ketutup pas klik dalam kotak
        >
          {/* Header Modal Dinamis */}
          <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {activeModal === 'history' && <><History className="w-5 h-5 text-blue-500"/> Riwayat Transaksi</>}
              {activeModal === 'edit' && <><Pencil className="w-5 h-5 text-orange-500"/> Edit Dompet</>}
              {activeModal === 'delete' && <><Trash2 className="w-5 h-5 text-red-500"/> Hapus Dompet</>}
            </h3>
            <button onClick={closeModal} className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Konten Modal Sementara (Kerangka) */}
          <div className="p-5">
            <p className="text-slate-600 dark:text-slate-300 font-medium">
              {activeModal === 'history' && `Fitur riwayat transaksi untuk dompet ${wallet.name} akan segera hadir di sini!`}
              {activeModal === 'edit' && `Formulir untuk mengubah nama & tipe dompet ${wallet.name} akan segera hadir!`}
              {activeModal === 'delete' && `Apakah kamu yakin ingin menghapus dompet "${wallet.name}"? Semua transaksi di dalamnya mungkin akan ikut terhapus.`}
            </p>

            {/* Tombol Aksi Bawah */}
            <div className="mt-6 flex gap-3">
              <button onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                Batal
              </button>
              {activeModal === 'delete' && (
                <button className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors">
                  Ya, Hapus
                </button>
              )}
            </div>
          </div>

        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      {/* 3 ICON MUNGIL DI POJOK (Hanya muncul saat di-hover) */}
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

      {/* Render pop-up di sini */}
      {renderModal()}
    </>
  );
}