// app/(dashboard)/error.tsx
// Global error boundary for all dashboard routes
'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service (e.g., Sentry) in production
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-red-50 dark:bg-red-500/10 p-5 rounded-2xl mb-6 ring-8 ring-red-50/50 dark:ring-red-500/5">
        <AlertTriangle className="w-10 h-10 text-red-500 dark:text-red-400" />
      </div>

      <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
        Sesuatu tidak berjalan semestinya
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-8 leading-relaxed">
        Terjadi kesalahan saat memuat halaman ini. Data keuanganmu aman — ini hanya masalah tampilan sementara.
      </p>

      {process.env.NODE_ENV === 'development' && (
        <pre className="text-xs text-left bg-slate-900 text-red-400 p-4 rounded-xl mb-6 max-w-lg w-full overflow-auto">
          {error.message}
        </pre>
      )}

      <button
        onClick={reset}
        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-orange-500/20"
      >
        <RefreshCw className="w-4 h-4" />
        Coba Lagi
      </button>
    </div>
  );
}
