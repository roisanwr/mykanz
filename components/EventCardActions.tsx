'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFeedback } from '@/components/FeedbackProvider';
import { useRouter } from 'next/navigation';
import { Trash2, X } from 'lucide-react';

export default function EventCardActions({ event }: { event: any }) {
  const { showFeedback } = useFeedback();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events?id=${event.id}`, { method: 'DELETE' });
      const result = await res.json();
      
      if (!res.ok || result?.error) {
        showFeedback(result.error || 'Gagal menghapus event.', 'error');
      } else {
        showFeedback('Event berhasil dihapus', 'delete');
        setShowModal(false);
        router.refresh();
      }
    } catch {
      showFeedback('Gagal terhubung ke server.', 'error');
    }
    setIsDeleting(false);
  };

  const modalContent = (showModal && mounted) ? createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setShowModal(false)} 
    >
      <div 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-red-50/50 dark:bg-red-500/10">
          <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
            <Trash2 className="w-5 h-5"/> Hapus Event
          </h3>
          <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 bg-white/50 dark:bg-slate-800/50 hover:bg-red-100 dark:hover:bg-red-500/20 p-1.5 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-slate-600 dark:text-slate-300">
            Apakah kamu yakin ingin menghapus event <span className="font-bold text-slate-900 dark:text-white">{event.name}</span>? 
          </p>
          <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 p-3 rounded-xl">
            <p className="text-xs text-orange-800 dark:text-orange-300 leading-relaxed font-medium">
              Tenang saja, transaksi yang terhubung tidak akan ikut terhapus, hanya akan dilepaskan dari event ini.
            </p>
          </div>
          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Batal</button>
            <button 
              onClick={handleDelete} 
              disabled={isDeleting} 
              className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex justify-center items-center"
            >
              {isDeleting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="flex gap-2">
      <button
        onClick={() => router.push(`/events/${event.id}`)}
        className="px-3 py-1.5 rounded-lg text-sm font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors"
      >
        Lihat Detail
      </button>
      <button 
        onClick={() => setShowModal(true)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        aria-label="Hapus Event"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      {modalContent}
    </div>
  );
}
