'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Rocket, ArrowRightLeft, Percent, Wallet as WalletIcon } from 'lucide-react';
import { createInvestment } from '@/actions/investment.actions';
import { useFeedback } from '@/components/FeedbackProvider';

export default function AddInvestmentModal({ assets, wallets }: { assets: any[], wallets: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'BELI' | 'JUAL'>('BELI');
  const [saveToWallet, setSaveToWallet] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { showFeedback } = useFeedback();

  useEffect(() => setMounted(true), []);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    formData.append('transaction_type', activeTab);
    if (saveToWallet) {
      formData.append('save_to_wallet', 'true');
    }

    const result = await createInvestment(formData);
    
    if (result?.error) {
       showFeedback(result.error, 'error');
    } else {
       showFeedback(`Berhasil mencatat transaksi ${activeTab === 'BELI' ? 'Pembelian' : 'Penjualan'} Aset!`, 'success');
       setIsOpen(false);
    }
    setIsLoading(false);
  };

  // Format IDR function using regex to add dots
  const formatIDR = (value: string) => {
    const rawValue = value.replace(/\./g, '');
    if (!rawValue) return '';
    return rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only format dot separators for display purpuses if user is inputting prices
    const input = e.target;
    const value = input.value;
    input.value = formatIDR(value);
  };

  const activeStyles = "bg-indigo-500 text-white shadow-md shadow-indigo-500/20";
  const inactiveStyles = "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600";
  const activeStylesJual = "bg-orange-500 text-white shadow-md shadow-orange-500/20";

  const modalContent = (isOpen && mounted) ? createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200"
      onClick={() => !isLoading && setIsOpen(false)} 
    >
      <div 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
            Catat Investasi
          </h3>
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
           {/* Transaction Type Tabs */}
           <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1 mb-5">
             <button
               type="button"
               onClick={() => setActiveTab('BELI')}
               className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'BELI' ? activeStyles : inactiveStyles}`}
             >
               Beli Aset
             </button>
             <button
               type="button"
               onClick={() => { setActiveTab('JUAL'); setSaveToWallet(false); }}
               className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'JUAL' ? activeStylesJual : inactiveStyles}`}
             >
               Jual Aset
             </button>
           </div>

          <form action={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                <span>Pilih Aset</span>
                <span className="text-xs font-normal text-slate-400">Pastikan aset sudah terdaftar di Data Aset</span>
              </label>
              <select 
                name="asset_id" 
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">-- Pilih Aset --</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.ticker_symbol || a.asset_type})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                   Jumlah Unit
                 </label>
                 <input 
                   type="text" 
                   name="units" 
                   required
                   onChange={handleCurrencyChange}
                   placeholder="Misal: 100" 
                   className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                   <span>Harga / Unit (Rp)</span> <span className="text-xs font-normal text-slate-400">(Opsional)</span>
                 </label>
                 <input 
                   type="text" 
                   name="price_per_unit" 
                   onChange={handleCurrencyChange}
                   placeholder="1.000.000" 
                   className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                 />
               </div>
            </div>

            {/* Wallet Options Container for Both BELI and JUAL */}
            <div className={`border rounded-xl p-4 mt-2 space-y-3 ${
              activeTab === 'BELI' 
                ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-500/30' 
                : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-500/30'
            }`}>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="save_to_wallet"
                  checked={saveToWallet}
                  onChange={(e) => setSaveToWallet(e.target.checked)}
                  className={`w-4 h-4 bg-white border-slate-300 rounded dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 ${
                    activeTab === 'BELI' 
                      ? 'text-indigo-500 focus:ring-indigo-500 dark:focus:ring-indigo-600' 
                      : 'text-orange-500 focus:ring-orange-500 dark:focus:ring-orange-600'
                  }`}
                />
                <label htmlFor="save_to_wallet" className="text-sm font-bold text-slate-800 dark:text-slate-200 select-none cursor-pointer">
                  {activeTab === 'BELI' ? 'Gunakan saldo dari Dompet' : 'Simpan hasil penjualan ke Dompet'}
                </label>
              </div>
              
              {saveToWallet && (
                <div className="pl-7 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    {activeTab === 'BELI' ? 'Pilih Dompet Sumber Dana' : 'Pilih Dompet Penerima Masuk'}
                  </label>
                  <select 
                    name="wallet_id" 
                    required={saveToWallet}
                    className={`w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                      activeTab === 'BELI' ? 'focus:ring-indigo-500/50' : 'focus:ring-orange-500/50'
                    }`}
                  >
                    <option value="">-- Pilih Dompet --</option>
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                   Tanggal Transaksi
                 </label>
                 <input 
                   type="datetime-local" 
                   name="transaction_date" 
                   defaultValue={new Date().toISOString().slice(0, 16)}
                   required
                   className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                   <span>Catatan</span> <span className="text-xs font-normal text-slate-400">(Opsional)</span>
                 </label>
                 <input 
                   type="text" 
                   name="notes"
                   placeholder="Misal: Beli cicil" 
                   className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                 />
               </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                className={`flex-[2] px-4 py-2.5 rounded-xl font-bold text-white transition-colors flex justify-center items-center shadow-lg disabled:opacity-50
                  ${activeTab === 'BELI' ? 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/30' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30'}
                `}
              >
                {isLoading ? 'Menyimpan...' : (activeTab === 'BELI' ? 'Simpan Pembelian' : 'Jual & Simpan')}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:scale-105 transition-all duration-300"
      >
        <Plus className="w-5 h-5" />
        Catat Investasi
      </button>

      {modalContent}
    </>
  );
}
