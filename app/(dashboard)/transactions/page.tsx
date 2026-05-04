// app/(dashboard)/transactions/page.tsx
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AddTransactionModal from '@/components/AddTransactionModal';
import TransactionList from '@/components/TransactionList';
import TransactionFilters from '@/components/TransactionFilters';
import { TrendingDown, TrendingUp, FilterX, ArrowLeftRight } from 'lucide-react';
import { fiat_tx_type } from '@prisma/client';

const PAGE_SIZE = 50;

export default async function TransactionsPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const searchParams = await props.searchParams;
  const {
    type,
    categoryIds, // comma-separated IDs, e.g. "id1,id2"
    walletIds,   // comma-separated IDs, e.g. "id1,id2"
    startDate,
    endDate,
    search,
    minAmount,
    maxAmount,
    page,
  } = searchParams;

  const currentPage = Math.max(1, parseInt(page || '1', 10));

  // Fetch Wallets & Categories for the filter UI (lightweight)
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

  // ─── Build Dynamic Where Clause ──────────────────────────────────────────────
  const whereClause: any = { user_id: session.user.id };

  if (type) {
    whereClause.transaction_type = type as fiat_tx_type;
  }

  // Multi-select categories (comma-separated)
  const categoryIdList = categoryIds
    ? categoryIds.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  if (categoryIdList.length > 0 && type !== 'TRANSFER') {
    whereClause.category_id = { in: categoryIdList };
  }

  // Multi-select wallets (comma-separated) — matches source OR destination
  const walletIdList = walletIds
    ? walletIds.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  if (walletIdList.length > 0) {
    whereClause.OR = [
      { wallet_id: { in: walletIdList } },
      { to_wallet_id: { in: walletIdList } },
    ];
  }

  if (startDate || endDate) {
    whereClause.transaction_date = {};
    if (startDate) whereClause.transaction_date.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate)   whereClause.transaction_date.lte = new Date(`${endDate}T23:59:59.999Z`);
  }

  if (search?.trim()) {
    whereClause.description = { contains: search.trim(), mode: 'insensitive' };
  }

  if (minAmount || maxAmount) {
    whereClause.amount = {};
    if (minAmount) whereClause.amount.gte = parseFloat(minAmount);
    if (maxAmount) whereClause.amount.lte = parseFloat(maxAmount);
  }

  // ─── QUERY 1: Full summary (no limit) — for accurate totals ──────────────────
  // Only selects the two columns we need, very cheap even with 10k+ rows
  const summaryRows = await prisma.fiat_transactions.findMany({
    where: whereClause,
    select: { transaction_type: true, amount: true },
  });

  const totalIncome   = summaryRows
    .filter(tx => tx.transaction_type === 'PEMASUKAN')
    .reduce((acc, tx) => acc + Number(tx.amount), 0);
  const totalExpense  = summaryRows
    .filter(tx => tx.transaction_type === 'PENGELUARAN')
    .reduce((acc, tx) => acc + Number(tx.amount), 0);
  const totalTransfer = summaryRows
    .filter(tx => tx.transaction_type === 'TRANSFER')
    .reduce((acc, tx) => acc + Number(tx.amount), 0);

  const totalCount = summaryRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage   = Math.min(currentPage, totalPages);

  // ─── QUERY 2: Paginated list for display ─────────────────────────────────────
  const transactionsRaw = await prisma.fiat_transactions.findMany({
    where: whereClause,
    orderBy: { transaction_date: 'desc' },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      categories: { select: { name: true, type: true } },
      events: { select: { name: true } },
      wallets_fiat_transactions_wallet_idTowallets:    { select: { name: true, currency: true } },
      wallets_fiat_transactions_to_wallet_idTowallets: { select: { name: true, currency: true } },
    },
  });

  const transactions = transactionsRaw.map(tx => ({
    ...tx,
    amount:        Number(tx.amount),
    exchange_rate: tx.exchange_rate ? Number(tx.exchange_rate) : null,
  }));

  const formatRupiah = (angka: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

  const hasActiveFilters = !!(type || categoryIds || walletIds || startDate || endDate || search || minAmount || maxAmount);

  return (
    <div className="space-y-6">

      {/* ── HEADER ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Riwayat Transaksi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pantau arus kas masuk, keluar, dan transfer uangmu.
            {hasActiveFilters && (
              <span className="ml-2 text-orange-500 font-semibold">
                ({totalCount.toLocaleString('id-ID')} transaksi ditemukan)
              </span>
            )}
          </p>
        </div>
        <AddTransactionModal wallets={wallets} categories={categories} events={events as any[]} />
      </div>

      {/* ── SUMMARY STATS (based on ALL matching rows, not just current page) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pemasukan */}
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm mb-0.5">
              Total Pemasukan
            </p>
            <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-300 leading-tight">
              {formatRupiah(totalIncome)}
            </h3>
            {hasActiveFilters && (
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500 mt-1">
                dari {summaryRows.filter(t => t.transaction_type === 'PEMASUKAN').length} transaksi
              </p>
            )}
          </div>
          <div className="p-3 bg-emerald-200 dark:bg-emerald-500/20 rounded-full shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        {/* Pengeluaran */}
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-rose-700 dark:text-rose-400 font-semibold text-sm mb-0.5">
              Total Pengeluaran
            </p>
            <h3 className="text-2xl font-black text-rose-700 dark:text-rose-300 leading-tight">
              {formatRupiah(totalExpense)}
            </h3>
            {hasActiveFilters && (
              <p className="text-[10px] text-rose-600/70 dark:text-rose-500 mt-1">
                dari {summaryRows.filter(t => t.transaction_type === 'PENGELUARAN').length} transaksi
              </p>
            )}
          </div>
          <div className="p-3 bg-rose-200 dark:bg-rose-500/20 rounded-full shrink-0">
            <TrendingDown className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          </div>
        </div>

        {/* Net / Transfer */}
        <div className="bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm mb-0.5">
              Selisih (Net)
            </p>
            <h3 className={`text-2xl font-black leading-tight ${
              totalIncome - totalExpense >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {totalIncome - totalExpense >= 0 ? '+' : ''}{formatRupiah(totalIncome - totalExpense)}
            </h3>
            {totalTransfer > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">
                Transfer: {formatRupiah(totalTransfer)}
              </p>
            )}
          </div>
          <div className="p-3 bg-slate-200 dark:bg-slate-600 rounded-full shrink-0">
            <ArrowLeftRight className="w-6 h-6 text-slate-500 dark:text-slate-300" />
          </div>
        </div>
      </div>

      {/* ── FILTER COMPONENT ───────────────────────────────────────────────────── */}
      <TransactionFilters categories={categories} wallets={wallets} />

      {/* ── TRANSACTION LIST ───────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Data Transaksi
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Halaman {safePage} / {totalPages}
            {' '}·{' '}
            {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, totalCount)} dari {totalCount.toLocaleString('id-ID')}
          </span>
        </div>

        {hasActiveFilters && transactions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
            <FilterX className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Berdasarkan filter saat ini,<br />Belum ada transaksi yang ditemukan.
            </p>
          </div>
        ) : (
          <TransactionList transactions={transactions} />
        )}

        {/* ── PAGINATION ─────────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <PaginationBar currentPage={safePage} totalPages={totalPages} searchParams={searchParams} />
        )}
      </div>

    </div>
  );
}

// ─── Server-side pagination component ────────────────────────────────────────
function PaginationBar({
  currentPage,
  totalPages,
  searchParams,
}: {
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}) {
  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== 'page') params.set(k, v);
    });
    if (p > 1) params.set('page', String(p));
    const q = params.toString();
    return `/transactions${q ? `?${q}` : ''}`;
  };

  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('…');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  return (
    <div className="mt-6 flex items-center justify-center gap-1 flex-wrap">
      {/* Prev */}
      {currentPage > 1 ? (
        <a
          href={buildUrl(currentPage - 1)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-orange-400 hover:text-orange-500 transition-colors"
        >
          ← Prev
        </a>
      ) : (
        <span className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 cursor-not-allowed">
          ← Prev
        </span>
      )}

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-slate-400">…</span>
        ) : (
          <a
            key={p}
            href={buildUrl(p as number)}
            className={`min-w-[36px] text-center px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
              p === currentPage
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-orange-400 hover:text-orange-500'
            }`}
          >
            {p}
          </a>
        )
      )}

      {/* Next */}
      {currentPage < totalPages ? (
        <a
          href={buildUrl(currentPage + 1)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-orange-400 hover:text-orange-500 transition-colors"
        >
          Next →
        </a>
      ) : (
        <span className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 cursor-not-allowed">
          Next →
        </span>
      )}
    </div>
  );
}
