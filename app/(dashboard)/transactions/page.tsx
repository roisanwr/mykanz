// app/(dashboard)/transactions/page.tsx
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AddTransactionModal from '@/components/AddTransactionModal';
import TransactionList from '@/components/TransactionList';
import TransactionFilters from '@/components/TransactionFilters';
import { TrendingDown, TrendingUp, FilterX } from 'lucide-react';
import { fiat_tx_type } from '@prisma/client';

export default async function TransactionsPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const searchParams = await props.searchParams;
  const { type, categoryId, walletId, startDate, endDate, search, minAmount, maxAmount } = searchParams;

  // Fetch Wallets for the Add form & Filters
  const wallets = await prisma.wallets.findMany({
    where: { user_id: session.user.id, deleted_at: null },
    select: { id: true, name: true, currency: true }
  });

  // Fetch Categories for the Add form & Filters
  const categories = await prisma.categories.findMany({
    where: { user_id: session.user.id, deleted_at: null },
    select: { id: true, name: true, type: true }
  });

  // Build Dynamic Where Clause based on Filters
  const whereClause: any = { user_id: session.user.id };

  if (type) {
    whereClause.transaction_type = type as fiat_tx_type;
  }
  
  if (categoryId && type !== 'TRANSFER') {
    whereClause.category_id = categoryId;
  }

  if (walletId) {
    whereClause.OR = [
      { wallet_id: walletId },
      { to_wallet_id: walletId }
    ];
  }

  if (startDate || endDate) {
    whereClause.transaction_date = {};
    if (startDate) {
      whereClause.transaction_date.gte = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      whereClause.transaction_date.lte = new Date(`${endDate}T23:59:59.999Z`);
    }
  }

  // Keyword search: match on description field (case-insensitive)
  if (search && search.trim()) {
    whereClause.description = { contains: search.trim(), mode: 'insensitive' };
  }

  // Amount range filter
  if (minAmount || maxAmount) {
    whereClause.amount = {};
    if (minAmount) whereClause.amount.gte = parseFloat(minAmount);
    if (maxAmount) whereClause.amount.lte = parseFloat(maxAmount);
  }

  // Fetch Transactions for List
  const transactionsRaw = await prisma.fiat_transactions.findMany({
    where: whereClause,
    orderBy: { transaction_date: 'desc' },
    take: 100, // Still limit to 100 on the UI
    include: {
      categories: { select: { name: true, type: true } },
      wallets_fiat_transactions_wallet_idTowallets: { select: { name: true, currency: true } },
      wallets_fiat_transactions_to_wallet_idTowallets: { select: { name: true, currency: true } }
    }
  });

  // Prisma Decimals to Numbers to fix NextJS server/client serialization warnings
  const transactions = transactionsRaw.map(tx => ({
    ...tx,
    amount: Number(tx.amount),
    exchange_rate: tx.exchange_rate ? Number(tx.exchange_rate) : null
  }));

  // Calculate Simple Monthly Stats (Pemasukan vs Pengeluaran berdasarkan filter yang aktif)
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
            <p className="text-emerald-800 dark:text-emerald-400 font-semibold mb-1">Pemasukan (Terfilter)</p>
            <h3 className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{formatRupiah(totalIncome)}</h3>
          </div>
          <div className="p-4 bg-emerald-200 dark:bg-emerald-500/20 rounded-full">
            <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-rose-800 dark:text-rose-400 font-semibold mb-1">Pengeluaran (Terfilter)</p>
            <h3 className="text-3xl font-black text-rose-700 dark:text-rose-300">{formatRupiah(totalExpense)}</h3>
          </div>
          <div className="p-4 bg-rose-200 dark:bg-rose-500/20 rounded-full">
            <TrendingDown className="w-8 h-8 text-rose-600 dark:text-rose-400" />
          </div>
        </div>
      </div>

      {/* FILTER COMPONENT */}
      <TransactionFilters categories={categories} wallets={wallets} />

      {/* TRANSACTION LIST SECTION */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Data Transaksi {transactions.length === 100 && <span className="text-orange-500 text-sm italic font-normal ml-2">(Max 100 data terbaru)</span>}
        </h3>
        
        {Object.keys(whereClause).length > 1 && transactions.length === 0 ? (
           <div className="text-center py-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <FilterX className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Berdasarkan filter saat ini,<br/>Belum ada transaksi yang ditemukan.</p>
           </div>
        ) : (
          <TransactionList transactions={transactions} />
        )}
      </div>

    </div>
  );
}
