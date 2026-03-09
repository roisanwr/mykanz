import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ArrowRightLeft } from 'lucide-react';
import AddInvestmentModal from '@/components/AddInvestmentModal';
import InvestmentTransactionList from '@/components/InvestmentTransactionList';

export default async function PortfolioTransactionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  
  const userId = session.user.id;

  // Fetch needed data for the modal
  const [assets, wallets, transactions] = await Promise.all([
    prisma.assets.findMany({ where: { user_id: userId }, orderBy: { name: 'asc' } }),
    prisma.wallets.findMany({ where: { user_id: userId, deleted_at: null }, orderBy: { name: 'asc' } }),
    prisma.asset_transactions.findMany({
      where: { user_id: userId },
      orderBy: { transaction_date: 'desc' },
      include: {
        user_portfolios: {
          include: { assets: true }
        }
      }
    })
  ]);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-xl">
            <ArrowRightLeft className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Catatan Investasi
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Kelola dan pantau aktivitas pembelian / penjualan aset investasimu.
            </p>
          </div>
        </div>
        <AddInvestmentModal assets={assets} wallets={wallets} />
      </div>

      {transactions.length > 0 && (
         <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm mt-6">
           <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Riwayat Transaksi</h2>
           <InvestmentTransactionList transactions={transactions} />
         </div>
      )}

      {transactions.length === 0 && (
         <InvestmentTransactionList transactions={[]} />
      )}

    </div>
  );
}
