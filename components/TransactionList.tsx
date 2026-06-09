// components/TransactionList.tsx
'use client'

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFeedback } from '@/components/FeedbackProvider';
import { useRouter } from 'next/navigation';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Trash2, X, Pin, Eye } from 'lucide-react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import type { FiatTransaction } from '@/types';
import EditTransactionModal from './EditTransactionModal';

// ── Formatters ────────────────────────────────────────────────────────────────
const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

// ── Type config map ───────────────────────────────────────────────────────────
const TX_CONFIG = {
  PEMASUKAN:   {
    iconBg:    'var(--color-wealth-surface)',
    iconColor: 'var(--color-wealth-600)',
    amountColor: 'var(--color-wealth-600)',
    Icon:      ArrowDownLeft,
    prefix:    '+',
  },
  PENGELUARAN: {
    iconBg:    'var(--color-expense-surface)',
    iconColor: 'var(--color-expense-600)',
    amountColor: 'var(--color-text-primary)',
    Icon:      ArrowUpRight,
    prefix:    '−',
  },
  TRANSFER: {
    iconBg:    'var(--color-invest-surface)',
    iconColor: 'var(--color-invest-600)',
    amountColor: 'var(--color-invest-600)',
    Icon:      ArrowRightLeft,
    prefix:    '',
  },
} as const;

export default function TransactionList({ transactions }: { transactions: FiatTransaction[] }) {
  const { showFeedback } = useFeedback();
  const router = useRouter();

  const [isDeletingId, setIsDeletingId]     = useState<string | null>(null);
  const [toDelete, setToDelete]             = useState<FiatTransaction | null>(null);
  const [editingTx, setEditingTx]           = useState<FiatTransaction | null>(null);
  const [deletedIds, setDeletedIds]         = useState<string[]>([]);
  const [mounted, setMounted]               = useState(false);
  const listRef                             = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // GSAP stagger on mount / data change
  useGSAP(() => {
    const container = listRef.current;
    if (!container || transactions.length === 0) return;
    const rows = container.querySelectorAll<HTMLElement>('[data-tx-row]');
    gsap.fromTo(
      rows,
      { opacity: 0, y: 12, filter: 'blur(3px)' },
      {
        opacity: 1, y: 0, filter: 'blur(0px)',
        duration: 0.45, stagger: 0.04, ease: 'yui',
        clearProps: 'all',
      }
    );
  }, { dependencies: [transactions], scope: listRef });

  const handleDelete = async (id: string) => {
    setDeletedIds(prev => [...prev, id]);
    setIsDeletingId(id);
    try {
      const res    = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok || result?.error) {
        setDeletedIds(prev => prev.filter(d => d !== id));
        showFeedback(result.error || 'Gagal menghapus transaksi.', 'error');
      } else {
        showFeedback('Transaksi berhasil dihapus', 'delete');
        router.refresh();
      }
    } catch {
      setDeletedIds(prev => prev.filter(d => d !== id));
      showFeedback('Gagal terhubung ke server.', 'error');
    }
    setIsDeletingId(null);
    setToDelete(null);
  };

  // ── Delete confirmation modal ──────────────────────────────────────────────
  const renderModal = () => {
    if (!mounted || !toDelete) return null;
    return createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
        style={{ backgroundColor: 'oklch(0.10 0.02 250 / 0.65)', backdropFilter: 'blur(8px)' }}
        onClick={() => setToDelete(null)}
      >
        <div
          className="w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-xl)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex justify-between items-center p-5"
            style={{
              borderBottom: '1px solid var(--color-border-subtle)',
              backgroundColor: 'var(--color-expense-surface)',
            }}
          >
            <h3
              className="text-base font-bold flex items-center gap-2"
              style={{ color: 'var(--color-expense-700)' }}
            >
              <Trash2 className="w-5 h-5" /> Hapus Transaksi
            </h3>
            <button
              onClick={() => setToDelete(null)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Yakin ingin menghapus transaksi ini? Aksi tidak dapat dibatalkan dan akan mempengaruhi saldo dompet terkait.
            </p>

            <div
              className="flex gap-3 pt-5"
              style={{ borderTop: '1px solid var(--color-border-subtle)' }}
            >
              <button
                onClick={() => setToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--color-bg-sunken)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(toDelete.id)}
                disabled={isDeletingId === toDelete.id}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-expense-500)' }}
              >
                {isDeletingId === toDelete.id ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Ya, Hapus'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  const visible = transactions.filter(tx => !deletedIds.includes(tx.id));

  if (visible.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center p-10 rounded-2xl border-2 border-dashed"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-sunken)' }}
      >
        <div
          className="p-4 rounded-2xl mb-5"
          style={{ backgroundColor: 'var(--color-bg-elevated)' }}
        >
          <ArrowRightLeft style={{ width: '2rem', height: '2rem', color: 'var(--color-text-disabled)' }} />
        </div>
        <h4 className="font-display font-bold mb-1.5" style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)' }}>
          Daftar Masih Kosong
        </h4>
        <p className="text-sm max-w-xs leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
          Catat pengeluaran atau pemasukan pertamamu. Setiap rupiah yang dicatat satu langkah lebih dekat ke tujuan.
        </p>
      </div>
    );
  }

  // ── Transaction rows ───────────────────────────────────────────────────────
  return (
    <div ref={listRef} className="space-y-1.5">
      {visible.map((tx) => {
        const type   = tx.transaction_type as keyof typeof TX_CONFIG;
        const cfg    = TX_CONFIG[type] ?? TX_CONFIG.PENGELUARAN;
        const Icon   = cfg.Icon;
        const amount = Number(tx.amount);

        const walletFrom = tx.wallets_fiat_transactions_wallet_idTowallets?.name;
        const walletTo   = tx.wallets_fiat_transactions_to_wallet_idTowallets?.name;
        const dateLine   = new Date(tx.transaction_date ?? new Date())
          .toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });

        let subtitle = dateLine;
        if (type === 'PEMASUKAN')   subtitle += ` · Ke: ${walletFrom}`;
        if (type === 'PENGELUARAN') subtitle += ` · Dari: ${walletFrom}`;
        if (type === 'TRANSFER')    subtitle += ` · ${walletFrom} → ${walletTo}`;

        const title = type === 'TRANSFER'
          ? 'Transfer'
          : tx.categories?.name || (type === 'PEMASUKAN' ? 'Pemasukan' : 'Pengeluaran');

        return (
          <div
            key={tx.id}
            data-tx-row
            className="group flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl transition-all duration-150 cursor-default"
            style={{
              border: '1px solid transparent',
              backgroundColor: 'var(--color-bg-surface)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.backgroundColor = 'var(--color-bg-elevated)';
              el.style.borderColor = 'var(--color-border-subtle)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.backgroundColor = 'var(--color-bg-surface)';
              el.style.borderColor = 'transparent';
            }}
          >
            {/* Left: icon + text */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className="p-2.5 rounded-xl shrink-0"
                style={{ backgroundColor: cfg.iconBg, color: cfg.iconColor }}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4
                    className="font-semibold text-sm truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {title}
                  </h4>
                  {tx.events?.name && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0"
                      style={{
                        backgroundColor: 'var(--color-brand-surface)',
                        color: 'var(--color-brand-700)',
                      }}
                      title={tx.events.name}
                    >
                      <Pin className="w-2.5 h-2.5" />
                      {tx.events.name.length > 14 ? tx.events.name.slice(0, 14) + '…' : tx.events.name}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                  {subtitle}
                </p>
                {tx.description && (
                  <p className="text-xs italic mt-0.5 truncate" style={{ color: 'var(--color-text-disabled)' }}>
                    "{tx.description}"
                  </p>
                )}
              </div>
            </div>

            {/* Right: amount + actions */}
            <div className="flex items-center gap-3 shrink-0">
              <p
                className="font-black text-sm sm:text-base nums"
                style={{ color: cfg.amountColor }}
              >
                {cfg.prefix}{formatRupiah(amount)}
              </p>

              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 gap-1">
                <button
                  onClick={() => setEditingTx(tx)}
                  className="p-1.5 rounded-lg transition-all duration-150 active:scale-95 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                  title="Lihat Detail / Edit"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setToDelete(tx)}
                  disabled={isDeletingId === tx.id}
                  className="p-1.5 rounded-lg transition-all duration-150 active:scale-95 disabled:opacity-30 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  title="Hapus Transaksi"
                >
                  {isDeletingId === tx.id
                    ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {renderModal()}
      
      {mounted && (
        <EditTransactionModal
          transaction={editingTx}
          isOpen={!!editingTx}
          onClose={() => setEditingTx(null)}
        />
      )}
    </div>
  );
}
