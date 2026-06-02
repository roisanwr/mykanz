// app/(dashboard)/transactions/page.tsx
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AddTransactionModal from '@/components/AddTransactionModal';
import TransactionList from '@/components/TransactionList';
import TransactionFilters from '@/components/TransactionFilters';
import { TrendingDown, TrendingUp, ArrowLeftRight, FilterX, Plus, Receipt } from 'lucide-react';
import { MetricCard } from '@/components/shared/MetricCard';
import { EmptyState } from '@/components/shared/EmptyState';

const PAGE_SIZE = 50;

export default async function TransactionsPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const searchParams = await props.searchParams;
  const {
    type,
    categoryIds,
    walletIds,
    startDate,
    endDate,
    search,
    minAmount,
    maxAmount,
    page,
  } = searchParams;

  const currentPage = Math.max(1, parseInt(page || '1', 10));

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

  const whereClause: Record<string, unknown> = { user_id: session.user.id };

  if (type) whereClause.transaction_type = type;

  const categoryIdList = categoryIds
    ? categoryIds.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  if (categoryIdList.length > 0 && type !== 'TRANSFER') {
    whereClause.category_id = { in: categoryIdList };
  }

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
    whereClause.transaction_date = {} as Record<string, unknown>;
    const dateClause = whereClause.transaction_date as Record<string, unknown>;
    if (startDate) dateClause.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate)   dateClause.lte = new Date(`${endDate}T23:59:59.999Z`);
  }

  if (search?.trim()) {
    whereClause.description = { contains: search.trim(), mode: 'insensitive' };
  }

  if (minAmount || maxAmount) {
    whereClause.amount = {} as Record<string, unknown>;
    const amtClause = whereClause.amount as Record<string, unknown>;
    if (minAmount) amtClause.gte = parseFloat(minAmount);
    if (maxAmount) amtClause.lte = parseFloat(maxAmount);
  }

  // Query 1: summary totals
  const summaryRows = await prisma.fiat_transactions.findMany({
    where: whereClause,
    select: { transaction_type: true, amount: true },
  });

  const totalIncome   = summaryRows.filter(tx => tx.transaction_type === 'PEMASUKAN').reduce((s, tx) => s + Number(tx.amount), 0);
  const totalExpense  = summaryRows.filter(tx => tx.transaction_type === 'PENGELUARAN').reduce((s, tx) => s + Number(tx.amount), 0);
  const totalTransfer = summaryRows.filter(tx => tx.transaction_type === 'TRANSFER').reduce((s, tx) => s + Number(tx.amount), 0);

  const totalCount = summaryRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage   = Math.min(currentPage, totalPages);

  // Query 2: paginated list
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

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
  const formatCompact = (n: number) =>
    new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

  const net = totalIncome - totalExpense;
  const hasActiveFilters = !!(type || categoryIds || walletIds || startDate || endDate || search || minAmount || maxAmount);

  return (
    <div className="space-y-5">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="font-display font-black tracking-tight"
            style={{ fontSize: 'var(--text-3xl)', color: 'var(--color-text-primary)' }}
          >
            Riwayat Transaksi
          </h1>
          <p className="mt-1 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Pantau arus kas masuk, keluar, dan transfer uangmu.
            {hasActiveFilters && (
              <span className="ml-2 font-bold" style={{ color: 'var(--color-brand-500)' }}>
                ({totalCount.toLocaleString('id-ID')} hasil ditemukan)
              </span>
            )}
          </p>
        </div>
        <AddTransactionModal wallets={wallets} categories={categories} events={events as unknown[]} />
      </div>

      {/* ── SUMMARY STAT CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <MetricCard
          label="Total Pemasukan"
          value={formatRupiah(totalIncome)}
          sub={hasActiveFilters ? `${summaryRows.filter(t => t.transaction_type === 'PEMASUKAN').length} transaksi` : undefined}
          icon={TrendingUp}
          variant="wealth"
        />
        <MetricCard
          label="Total Pengeluaran"
          value={formatRupiah(totalExpense)}
          sub={hasActiveFilters ? `${summaryRows.filter(t => t.transaction_type === 'PENGELUARAN').length} transaksi` : undefined}
          icon={TrendingDown}
          variant="expense"
        />
        <MetricCard
          label="Selisih (Net)"
          value={`${net >= 0 ? '+' : ''}${formatCompact(net)}`}
          formattedValue={`${net >= 0 ? '+' : ''}${formatRupiah(net)}`}
          sub={totalTransfer > 0 ? `Transfer: ${formatRupiah(totalTransfer)}` : undefined}
          icon={ArrowLeftRight}
          variant={net >= 0 ? 'wealth' : 'expense'}
        />
      </div>

      {/* ── FILTERS ────────────────────────────────────────────────────── */}
      <TransactionFilters categories={categories} wallets={wallets} />

      {/* ── TRANSACTION LIST ───────────────────────────────────────────── */}
      <div>
        {/* List header */}
        <div
          className="flex items-center justify-between mb-3 px-1"
        >
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Data Transaksi
          </h3>
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-disabled)' }}>
            Halaman {safePage}/{totalPages}
            {' · '}
            {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, totalCount)} dari {totalCount.toLocaleString('id-ID')}
          </span>
        </div>

        {hasActiveFilters && transactions.length === 0 ? (
          <EmptyState
            icon={FilterX}
            title="Tidak ada hasil"
            description="Tidak ada transaksi yang cocok dengan filter saat ini. Coba ubah atau reset filter."
          />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Belum ada transaksi"
            description="Mulai catat pemasukan atau pengeluaranmu sekarang."
            ctaLabel="+ Catat Transaksi"
            ctaHref="#"
          />
        ) : (
          <TransactionList transactions={transactions} />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <PaginationBar currentPage={safePage} totalPages={totalPages} searchParams={searchParams} />
        )}
      </div>

    </div>
  );
}

// ── Server-side pagination ─────────────────────────────────────────────────────
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

  const linkStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '36px',
    padding: '6px 12px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 700,
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-surface)',
    color: 'var(--color-text-secondary)',
    transition: 'all 150ms',
  } as React.CSSProperties;

  const activeStyle = {
    ...linkStyle,
    backgroundColor: 'var(--color-brand-500)',
    borderColor: 'transparent',
    color: '#fff',
    boxShadow: 'var(--shadow-brand)',
  } as React.CSSProperties;

  const disabledStyle = {
    ...linkStyle,
    backgroundColor: 'var(--color-bg-sunken)',
    color: 'var(--color-text-disabled)',
    cursor: 'not-allowed',
  } as React.CSSProperties;

  return (
    <div className="mt-6 flex items-center justify-center gap-1.5 flex-wrap">
      {currentPage > 1 ? (
        <Link href={buildUrl(currentPage - 1)} style={linkStyle}>← Prev</Link>
      ) : (
        <span style={disabledStyle}>← Prev</span>
      )}

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e-${i}`} className="px-1 text-sm" style={{ color: 'var(--color-text-disabled)' }}>…</span>
        ) : (
          <Link key={p} href={buildUrl(p as number)} style={p === currentPage ? activeStyle : linkStyle}>
            {p}
          </Link>
        )
      )}

      {currentPage < totalPages ? (
        <Link href={buildUrl(currentPage + 1)} style={linkStyle}>Next →</Link>
      ) : (
        <span style={disabledStyle}>Next →</span>
      )}
    </div>
  );
}
