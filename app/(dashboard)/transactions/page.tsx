// app/(dashboard)/transactions/page.tsx
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AddTransactionModal from '@/components/AddTransactionModal';
import TransactionList from '@/components/TransactionList';
import { ArrowRightLeft, TrendingDown, TrendingUp } from 'lucide-react';

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // Fetch Wallets for the Add form
  const wallets = await prisma.wallets.findMany({
    where: { user_id: session.user.id, deleted_at: null },
    select: { id: true, name: true, currency: true }
  });

  // Fetch Categories for the Add form
  const categories = await prisma.categories.findMany({
    where: { user_id: session.user.id, deleted_at: null },
    select: { id: true, name: true, type: true }
  });

  // Fetch Transactions for List
  const transactionsRaw = await prisma.fiat_transactions.findMany({
    where: { user_id: session.user.id },
    orderBy: { transaction_date: 'desc' },
    take: 100,
    include: {
      categories: { select: { name: true, type: true } },
      wallets_fiat_transactions_wallet_idTowallets: { select: { name: true, currency: true } },
      wallets_fiat_transactions_to_wallet_idTowallets: { select: { name: true, currency: true } }
    }
  });

  // Prisma Decimals to Numbers to fix NextJS server/client serialization warnings
  const transactions = transactionsRaw.map(tx => ({
    ...tx,
    amount: Number(tx.amount)
  }));

  // Calculate Simple Monthly Stats (Pemasukan vs Pengeluaran Global)
  const totalIncome = transactions
    .filter(tx => tx.transaction_type === 'PEMASUKAN')
    .reduce((acc, curr) => acc + curr.amount, 0);
    
  const totalExpense = transactions
    .filter(tx => tx.transaction_type === 'PENGELUARAN')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Riwayat Transaksi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pantau arus kas masuk, keluar, dan transfer uangmu.
          </p>
        </div>
        
        {/* MODAL TRIGGER */}
        <AddTransactionModal wallets={wallets} categories={categories} />
      </div>

      {/* STATS SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-emerald-800 dark:text-emerald-400 font-semibold mb-1">Total Pemasukan</p>
            <h3 className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{formatRupiah(totalIncome)}</h3>
          </div>
          <div className="p-4 bg-emerald-200 dark:bg-emerald-500/20 rounded-full">
            <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-rose-800 dark:text-rose-400 font-semibold mb-1">Total Pengeluaran</p>
            <h3 className="text-3xl font-black text-rose-700 dark:text-rose-300">{formatRupiah(totalExpense)}</h3>
          </div>
          <div className="p-4 bg-rose-200 dark:bg-rose-500/20 rounded-full">
            <TrendingDown className="w-8 h-8 text-rose-600 dark:text-rose-400" />
          </div>
        </div>
      </div>

      {/* TRANSACTION LIST SECTION */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Transaksi Terakhir</h3>
        <TransactionList transactions={transactions} />
      </div>

    </div>
  );
}
