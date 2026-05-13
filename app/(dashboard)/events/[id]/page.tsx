import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, FileText, Wallet } from 'lucide-react';
import TransactionList from '@/components/TransactionList';
import AssignTransactionToEventModal from '@/components/AssignTransactionToEventModal';
import AddTransactionModal from '@/components/AddTransactionModal';

export default async function EventDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const resolvedParams = await props.params;
  const eventId = resolvedParams.id;

  const event = await prisma.events.findUnique({
    where: { id: eventId, user_id: session.user.id },
    include: {
      fiat_transactions: {
        orderBy: { transaction_date: 'desc' },
        include: {
          categories: { select: { name: true, type: true } },
          wallets_fiat_transactions_wallet_idTowallets: { select: { name: true, currency: true } },
          wallets_fiat_transactions_to_wallet_idTowallets: { select: { name: true, currency: true } },
        }
      }
    }
  });

  if (!event) {
    redirect('/events');
  }

  // Fetch Wallets & Categories for the AddTransactionModal
  const [wallets, categories, events] = await Promise.all([
    prisma.wallets.findMany({
      where: { user_id: session.user.id, deleted_at: null },
      select: { id: true, name: true, currency: true }
    }),
    prisma.categories.findMany({
      where: { user_id: session.user.id, deleted_at: null },
      select: { id: true, name: true, type: true }
    }),
    prisma.events.findMany({
      where: { user_id: session.user.id },
      select: { id: true, name: true }
    }),
  ]);

  const transactions = event.fiat_transactions.map((tx) => ({
    ...tx,
    amount: Number(tx.amount),
    exchange_rate: tx.exchange_rate ? Number(tx.exchange_rate) : null,
  }));

  let totalExpense = 0;
  let totalIncome = 0;

  transactions.forEach((tx) => {
    if (tx.transaction_type === 'PENGELUARAN') {
      totalExpense += tx.amount;
    } else if (tx.transaction_type === 'PEMASUKAN') {
      totalIncome += tx.amount;
    }
  });

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const today = new Date();
  
  let status = 'AKTIF';
  let statusColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
  
  if (endDate < today) {
    status = 'SELESAI';
    statusColor = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  } else if (startDate > today) {
    status = 'AKAN DATANG';
    statusColor = 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
  }

  let budgetPercentage = 0;
  if (event.budget_limit && Number(event.budget_limit) > 0) {
     budgetPercentage = Math.min(100, Math.round((totalExpense / Number(event.budget_limit)) * 100));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link 
          href="/events" 
          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-orange-500 hover:border-orange-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            {event.name}
            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${statusColor} align-middle`}>
              {status}
            </span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Event */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" /> Detail Event
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Tanggal Pelaksanaan</p>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} 
                  {' - '}
                  {endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>

              {event.description && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Deskripsi</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    {event.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-500" /> Ringkasan Keuangan
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                <span className="text-sm font-medium text-rose-700 dark:text-rose-400">Total Pengeluaran</span>
                <span className="font-bold text-rose-700 dark:text-rose-300">{formatRupiah(totalExpense)}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Total Pemasukan</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatRupiah(totalIncome)}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Selisih (Net)</span>
                <span className={`font-bold ${totalIncome - totalExpense >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {totalIncome - totalExpense >= 0 ? '+' : ''}{formatRupiah(totalIncome - totalExpense)}
                </span>
              </div>
              
              {event.budget_limit && (
                <div className="pt-2">
                  <div className="flex justify-between text-xs font-medium mb-2">
                    <span className="text-slate-500">Anggaran: {formatRupiah(Number(event.budget_limit))}</span>
                    <span className={budgetPercentage >= 100 ? 'text-red-500 font-bold' : 'text-slate-700 dark:text-slate-300 font-bold'}>{budgetPercentage}% Terpakai</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${budgetPercentage >= 100 ? 'bg-red-500' : budgetPercentage >= 80 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, budgetPercentage)}%` }}
                    ></div>
                  </div>
                  {budgetPercentage >= 100 && (
                     <p className="text-[10px] text-red-500 mt-1.5 font-semibold">⚠️ Pengeluaran telah melebihi batas anggaran!</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daftar Transaksi */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Transaksi Terkait ({transactions.length})
            </h3>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <AssignTransactionToEventModal eventId={event.id} />
              <AddTransactionModal wallets={wallets} categories={categories} events={events as any[]} defaultEventId={event.id} />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-1">
            <TransactionList transactions={transactions as any} />
          </div>
        </div>
      </div>
    </div>
  );
}
