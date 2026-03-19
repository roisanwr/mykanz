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
    // Default titles based on type
    const defaultTitle = title || {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Message',
      delete: 'Deleted'
    }[type];

    setFeedback({ message, type, title: defaultTitle });
    setIsOpen(true);
    setTimeout(() => {
      setIsOpen(false);
    }, 3000); // Auto close after 3 seconds
  };

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
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] pointer-events-none">
          <div className={`pointer-events-auto ${currentStyle.bg} rounded-xl shadow-lg animate-in slide-in-from-top-10 fade-in duration-300 w-full min-w-[320px] max-w-md flex items-center p-4 gap-4`}>
             <div className="flex-shrink-0">
               {currentStyle.icon}
             </div>
             <div className="flex flex-col text-white">
               <h3 className="text-xl font-medium tracking-wide">
                 {feedback.title}
               </h3>
               {feedback.message && (
                 <p className="text-white/90 text-sm font-medium mt-0.5 max-w-[200px] leading-tight">
                   {feedback.message}
                 </p>
               )}
               {/* Decorative Lines mimicking the image */}
               <div className="mt-2 space-y-1.5 opacity-90">
                 <div className="h-1.5 bg-white rounded-full w-full"></div>
                 <div className="h-1.5 bg-white rounded-full w-2/3"></div>
               </div>
             </div>
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
