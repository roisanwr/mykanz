'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';
import { deleteGoal } from '@/actions/goal.actions';
import { useFeedback } from '@/components/FeedbackProvider';

export default function GoalCardActions({ goalId, name }: { goalId: string, name: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showFeedback } = useFeedback();

  useEffect(() => setMounted(true), []);

  const handleDelete = async () => {
    setIsLoading(true);
    const result = await deleteGoal(goalId);
    if (result?.error) {
      showFeedback(result.error, 'error');
      setIsLoading(false);
    } else {
      showFeedback(`Target "${name}" berhasil dihapus.`, 'delete');
      setIsOpen(false);
    }
  };

  const renderModal = () => {
    if (!mounted || !isOpen) return null;

    return createPortal(
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setIsOpen(false)} 
      >
        <div 
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()} 
        >
          <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-red-50/50 dark:bg-red-500/10">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5"/> Hapus Target
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-red-500 bg-white/50 dark:bg-slate-800/50 hover:bg-red-100 dark:hover:bg-red-500/20 p-1.5 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <p className="text-slate-600 dark:text-slate-300">
              Apakah kamu yakin ingin menghapus target <span className="font-bold text-slate-900 dark:text-white">"{name}"</span>? Progress menabung yang tersimpan akan ikut terhapus.
            </p>
            <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-700 mt-2">
              <button onClick={() => setIsOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Batal</button>
              <button onClick={handleDelete} disabled={isLoading} className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex justify-center items-center">
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
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:scale-110 absolute top-3 right-3 opacity-0 group-hover:opacity-100 focus:opacity-100"
        title="Hapus Target"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      {renderModal()}
    </>
  );
}
