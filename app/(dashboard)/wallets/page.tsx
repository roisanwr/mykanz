import { Plus, CreditCard, Banknote, Smartphone, Wallet as WalletIcon } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AddWalletModal from '@/components/AddWalletModal';
import WalletCardActions from '@/components/WalletCardActions';
import { EmptyState } from '@/components/shared/EmptyState';
import MotionSection from '@/components/shared/MotionSection';
import StaggerReveal from '@/components/shared/StaggerReveal';

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const formatCompact = (n: number) =>
  new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

function WalletTypeIcon({ type, size = 24 }: { type: string; size?: number }) {
  const props = { width: size, height: size };
  switch (type) {
    case 'TUNAI':        return <Banknote {...props} />;
    case 'BANK':         return <CreditCard {...props} />;
    case 'DOMPET_DIGITAL': return <Smartphone {...props} />;
    default:             return <CreditCard {...props} />;
  }
}

// ── Type badge color mapping ─────────────────────────────────────────────────
const TYPE_LABEL: Record<string, string> = {
  TUNAI:          'Tunai',
  BANK:           'Bank',
  DOMPET_DIGITAL: 'E-Wallet',
};

export default async function WalletsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const walletsDataRaw = await prisma.$queryRaw<{
    id: string; name: string; type: string; currency: string; balance: unknown;
  }[]>`
    SELECT 
      w.id, w.name, w.type, w.currency,
      COALESCE(wb.balance, 0) as balance
    FROM wallets w
    LEFT JOIN wallet_balances wb ON w.id = wb.wallet_id
    WHERE w.user_id = ${session.user.id}::uuid AND w.deleted_at IS NULL
    ORDER BY w.created_at ASC
  `;
  const walletsData = walletsDataRaw.map(w => ({ ...w, balance: Number(w.balance) }));
  const totalBalance = walletsData.reduce((acc, curr) => acc + curr.balance, 0);

  return (
    <div className="space-y-5">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="font-display font-black tracking-tight"
            style={{ fontSize: 'var(--text-3xl)', color: 'var(--color-text-primary)' }}
          >
            Kas &amp; Dompet
          </h1>
          <p className="mt-1 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Pantau semua aliran uang fiat kamu di satu tempat.
          </p>
        </div>
        <AddWalletModal />
      </div>

      {/* ── HERO BALANCE CARD ──────────────────────────────────────────── */}
      <MotionSection>
      <div
        className="relative overflow-hidden rounded-xl p-7 sm:p-10 text-white"
        style={{
          background: `
            radial-gradient(ellipse 70% 80% at 90% -20%, oklch(0.70 0.185 47 / 0.4), transparent),
            radial-gradient(ellipse 40% 60% at 0% 100%, oklch(0.64 0.185 152 / 0.2), transparent),
            oklch(0.155 0.025 250)
          `,
        }}
      >
        {/* Dot texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        {/* Large decorative icon */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none" style={{ opacity: 0.04 }}>
          <Banknote width={180} height={180} />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] mb-2" style={{ color: 'oklch(0.75 0.05 55)' }}>
              Total Kekayaan Tunai (IDR)
            </p>
            <p
              className="font-display font-black tracking-tight leading-none"
              style={{ fontSize: 'clamp(1.75rem, 4vw + 1rem, 3.5rem)' }}
            >
              {formatRupiah(totalBalance)}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: 'oklch(1 0 0 / 0.08)' }}>
            <TrendingUp width={16} height={16} style={{ color: 'oklch(0.75 0.18 152)' }} />
            <span className="text-sm font-bold" style={{ color: 'oklch(0.85 0.06 55)' }}>
              {walletsData.length} Dompet Aktif
            </span>
          </div>
        </div>
      </div>
      </MotionSection>

      {/* ── WALLET GRID ────────────────────────────────────────────────── */}
      <div>
        <h2
          className="font-display font-bold mb-4"
          style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}
        >
          Daftar Dompet
        </h2>

        {walletsData.length === 0 ? (
          <EmptyState
            icon={WalletIcon}
            title="Belum Ada Dompet"
            description="Mulai perjalanan finansialmu dengan menambahkan dompet pertamamu sekarang!"
            ctaLabel="+ Tambah Dompet"
            ctaHref="#"
          />
        ) : (
          <StaggerReveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {walletsData.map((wallet) => (
              <div
                key={wallet.id}
                className="card relative overflow-hidden flex flex-col justify-between p-5 min-h-[160px] group"
              >
                {/* Top accent bar — brand gradient on hover via CSS group trick */}
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ background: 'linear-gradient(90deg, var(--color-brand-400), var(--color-brand-600))' }}
                />

                {/* 3-dot actions */}
                <WalletCardActions wallet={wallet} />

                {/* Icon + type badge */}
                <div className="flex flex-col items-start gap-2.5 mb-4">
                  <div
                    className="p-3 rounded-xl"
                    style={{
                      backgroundColor: 'var(--color-brand-surface)',
                      color: 'var(--color-brand-600)',
                    }}
                  >
                    <WalletTypeIcon type={wallet.type} size={20} />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider"
                      style={{
                        backgroundColor: 'var(--color-bg-sunken)',
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      {TYPE_LABEL[wallet.type] ?? wallet.type}
                    </span>
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider"
                      style={{
                        backgroundColor: 'var(--color-wealth-surface)',
                        color: 'var(--color-wealth-600)',
                      }}
                    >
                      {wallet.currency}
                    </span>
                  </div>
                </div>

                {/* Name + Balance */}
                <div className="mt-auto pt-2">
                  <p className="text-xs font-semibold mb-0.5 truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                    {wallet.name}
                  </p>
                  <p
                    className="font-black tracking-tight nums"
                    style={{ fontSize: 'clamp(1.2rem, 2vw + 0.8rem, 1.6rem)', color: 'var(--color-text-primary)' }}
                  >
                    {formatCompact(wallet.balance)}
                  </p>
                  <p className="text-xs mt-0.5 nums" style={{ color: 'var(--color-text-disabled)' }}>
                    {formatRupiah(wallet.balance)}
                  </p>
                </div>
              </div>
            ))}

            {/* Add wallet shortcut card */}
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-xl p-5 min-h-[160px] border-2 border-dashed transition-colors"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-sunken)' }}
            >
              <div
                className="p-3 rounded-xl"
                style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-disabled)' }}
              >
                <Plus width={20} height={20} />
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-text-disabled)' }}>
                Tambah Dompet
              </p>
            </div>
          </StaggerReveal>
        )}
      </div>

    </div>
  );
}