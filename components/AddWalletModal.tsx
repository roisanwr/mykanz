// components/AddWalletModal.tsx
'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // JURUS SAKTI PORTAL!
import { Plus, X, Wallet, Banknote, CreditCard, Smartphone } from 'lucide-react';
import { createWallet } from '@/actions/wallet.actions';
import { useFeedback } from '@/components/FeedbackProvider';

export default function AddWalletModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // State baru untuk memantau jenis mata uang yang dipilih
  const [currencySelection, setCurrencySelection] = useState('IDR');
  
  // Provider Animasi Feedback
  const { showFeedback } = useFeedback();

  // State ini penting di Next.js agar Portal tidak error saat SSR (Server-Side Rendering)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setErrorMsg('');
    
    const result = await createWallet(formData);
    
    if (result?.error) {
      setErrorMsg(result.error);
      showFeedback(result.error, 'error');
      setIsLoading(false);
    } else {
      showFeedback('Dompet berhasil dibuat!', 'success');
      setIsOpen(false);
      setIsLoading(false);
    }
  };

  // ==========================================
  // KONTEN MODAL YANG AKAN DI-PORTAL
  // ==========================================
  const modalContent = (isOpen && mounted) ? createPortal(
    // 1. OVERLAY (Latar Belakang Gelap TANPA Blur)
    // Tambahkan onClick untuk menutup modal saat area luar diklik
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200"
      onClick={() => setIsOpen(false)} 
    >
      
      {/* 2. KOTAK MODAL UTAMA */}
      {/* Gunakan e.stopPropagation() agar saat kita klik bagian dalam kotak form, modal TIDAK ikut tertutup */}
      <div 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} 
      >
        
        {/* Header Modal */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-orange-500" />
            Tambah Dompet Baru
          </h3>
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Konten */}
        <form action={handleSubmit} className="p-5 space-y-4">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-lg text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Dompet
            </label>
            <input 
              type="text" 
              name="name" 
              required
              placeholder="Misal: BCA Utama, Dompet Darurat..." 
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tipe Dompet
            </label>
            <select 
              name="type" 
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
            >
              <option value="TUNAI">💵 Tunai (Uang Fisik)</option>
              <option value="BANK">🏦 Rekening Bank</option>
              <option value="DOMPET_DIGITAL">📱 Dompet Digital (E-Wallet)</option>
            </select>
          </div>

          {/* ========================================== */}
          {/* INPUT MATA UANG (DENGAN FITUR CUSTOM)      */}
          {/* ========================================== */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Mata Uang Utama
            </label>
            
            {/* Dropdown Pilihan */}
            <div className="relative mb-2">
              <select 
                value={currencySelection}
                onChange={(e) => setCurrencySelection(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all appearance-none"
              >
                <option value="IDR">🇮🇩 IDR - Rupiah Indonesia</option>
                <option value="USD">🇺🇸 USD - Dolar Amerika</option>
                <option value="EUR">🇪🇺 EUR - Euro</option>
                <option value="SGD">🇸🇬 SGD - Dolar Singapura</option>
                <option value="MYR">🇲🇾 MYR - Ringgit Malaysia</option>
                <option value="JPY">🇯🇵 JPY - Yen Jepang</option>
                <option value="CUSTOM">✨ Custom (Ketik Sendiri...)</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>

            {/* Kolom Input Ajaib: Hanya muncul kalau milih CUSTOM */}
            {currencySelection === 'CUSTOM' ? (
              <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                <input 
                  type="text" 
                  name="currency" // Namanya "currency" supaya dikirim ke Server Action
                  required
                  maxLength={10}
                  placeholder="Ketik mata uang (Misal: BTC, USDT, XAU)" 
                  className="w-full px-4 py-2.5 rounded-xl border border-orange-300 dark:border-orange-500/50 bg-orange-50 dark:bg-orange-500/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all uppercase placeholder:normal-case font-bold tracking-wider"
                />
              </div>
            ) : (
              // Kalau milih IDR/USD dkk, kirim nilainya diam-diam pakai hidden input
              <input type="hidden" name="currency" value={currencySelection} />
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-6">
            <button 
              type="button" 
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex justify-center items-center"
            >
              {isLoading ? 'Menyimpan...' : 'Simpan Dompet'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body // <-- INI DIA KUNCINYA! Merender langsung di dalam tag <body> paling luar
  ) : null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-orange-500/30 hover:scale-105 transition-all duration-300"
      >
        <Plus className="w-5 h-5" />
        Tambah Dompet
      </button>

      {/* Tampilkan konten yang sudah di-Portal */}
      {modalContent}
    </>
  );
}