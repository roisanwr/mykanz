'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Mail, CircleAlert, X, Trash2 } from 'lucide-react';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'delete';

interface FeedbackContextType {
  showFeedback: (message: string, type: FeedbackType, title?: string) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: 'success' as FeedbackType, title: '' });

  const showFeedback = (message: string, type: FeedbackType = 'success', title?: string) => {
    // Judul default dalam Bahasa Indonesia
    const defaultTitle = title || {
      success: 'Berhasil',
      error:   'Gagal',
      warning: 'Perhatian',
      info:    'Informasi',
      delete:  'Dihapus'
    }[type];

    setFeedback({ message, type, title: defaultTitle });
    setIsOpen(true);
    setTimeout(() => {
      setIsOpen(false);
    }, 3500);
  };

  const dismissFeedback = () => setIsOpen(false);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Styling maps based on the user's reference image
  const styleMap = {
    success: {
      bg: 'bg-[#6DCB9F]',
      icon: <Check className="w-10 h-10 text-white" strokeWidth={3} />
    },
    error: {
      bg: 'bg-[#EF5350]', // Red
      icon: <X className="w-10 h-10 text-white" strokeWidth={3} />
    },
    warning: {
      bg: 'bg-[#F2CD49]',
      icon: <CircleAlert className="w-10 h-10 text-white fill-white stroke-[#F2CD49]" strokeWidth={2} />
    },
    info: {
      bg: 'bg-[#6CA5E0]',
      icon: <Mail className="w-10 h-10 text-white" strokeWidth={1.5} />
    },
    delete: {
      bg: 'bg-[#3D3D3D]', // Dark Gray for deletion
      icon: <Trash2 className="w-10 h-10 text-white" strokeWidth={2} />
    }
  };

  const currentStyle = styleMap[feedback.type] || styleMap.success;

  return (
    <FeedbackContext.Provider value={{ showFeedback }}>
      {children}
      {mounted && isOpen && createPortal(
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] pointer-events-none"
        >
          <div className={`pointer-events-auto ${currentStyle.bg} rounded-2xl shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300 w-full min-w-[300px] max-w-sm flex items-start p-4 gap-3`}>
            <div className="flex-shrink-0 mt-0.5">
              {currentStyle.icon}
            </div>
            <div className="flex-1 flex flex-col text-white min-w-0">
              <h3 className="text-base font-bold leading-tight">
                {feedback.title}
              </h3>
              {feedback.message && (
                <p className="text-white/85 text-sm font-medium mt-1 leading-snug">
                  {feedback.message}
                </p>
              )}
            </div>
            {/* Tombol dismiss manual */}
            <button
              onClick={dismissFeedback}
              aria-label="Tutup notifikasi"
              className="flex-shrink-0 text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </FeedbackContext.Provider>
  );
}

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used within FeedbackProvider');
  return context;
};
