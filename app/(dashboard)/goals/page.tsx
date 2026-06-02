// app/(dashboard)/goals/page.tsx
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Target, TrendingUp, Bitcoin, CalendarClock, Trophy, CheckCircle2 } from 'lucide-react';
import AddGoalModal from '@/components/AddGoalModal';
import AddFundsModal from '@/components/AddFundsModal';
import GoalCardActions from '@/components/GoalCardActions';
import { EmptyState } from '@/components/shared/EmptyState';
import StaggerReveal from '@/components/shared/StaggerReveal';
import MotionSection from '@/components/shared/MotionSection';

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  const [goalsRaw, assets, wallets, portfolios] = await Promise.all([
    prisma.goals.findMany({ where: { user_id: userId }, orderBy: { created_at: 'desc' } }),
    prisma.assets.findMany({ where: { user_id: userId }, orderBy: { name: 'asc' } }),
    prisma.wallets.findMany({ where: { user_id: userId, deleted_at: null }, orderBy: { name: 'asc' } }),
    prisma.user_portfolios.findMany({ where: { user_id: userId } }),
  ]);

  const formatIDR = (val: unknown) => {
    const num = Number(val);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const formatUnit = (val: unknown) => {
    const num = Number(val);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(num);
  };

  const calculateProgress = (current: number, target: number) => {
    if (target <= 0) return 0;
    const p = (current / target) * 100;
    return p > 100 ? 100 : p;
  };

  const assetsById: Record<string, { id: string; name: string; unit_name: string | null }> = {};
  assets.forEach(a => { assetsById[a.id] = a; });

  const processedGoals = goalsRaw.map(goal => {
    const g = goal as Record<string, unknown>;
    const goalAsset = g.asset_id ? assetsById[g.asset_id as string] : null;
    const targetAssetUnits  = g.target_asset_units  ? Number(g.target_asset_units)  : null;
    const currentAssetUnits = g.current_asset_units ? Number(g.current_asset_units) : null;

    const safe = {
      id:           goal.id,
      name:         goal.name,
      target_amount:  Number(goal.target_amount),
      current_amount: goal.current_amount ? Number(goal.current_amount) : 0,
      deadline:     goal.deadline,
      asset_id:     (g.asset_id as string | null) ?? null,
      target_asset_units:  targetAssetUnits,
      current_asset_units: currentAssetUnits,
      assetName:    goalAsset?.name ?? null,
      assetUnitName: goalAsset?.unit_name ?? 'unit',
    };

    if (safe.asset_id) {
      const port = portfolios.find(p => p.asset_id === safe.asset_id);
      const currentUnits = Number(port?.total_units || 0);
      const targetUnits  = Number(safe.target_asset_units || 1);
      const progress     = calculateProgress(currentUnits, targetUnits);
      return { ...safe, computedCurrent: currentUnits, computedTarget: targetUnits, progress, isAsset: true };
    } else {
      const current  = safe.current_amount;
      const target   = safe.target_amount || 1;
      const progress = calculateProgress(current, target);
      return { ...safe, computedCurrent: current, computedTarget: target, progress, isAsset: false };
    }
  });

  const completedCount = processedGoals.filter(g => g.progress >= 100).length;

  return (
    <div className="space-y-5">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <MotionSection>
      <div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-xl p-5 sm:p-6"
        style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="p-3 rounded-xl"
            style={{ backgroundColor: 'var(--color-brand-surface)', color: 'var(--color-brand-600)' }}
          >
            <Target className="w-7 h-7" />
          </div>
          <div>
            <h1
              className="font-display font-black tracking-tight"
              style={{ fontSize: 'var(--text-2xl)', color: 'var(--color-text-primary)' }}
            >
              Target Impian
            </h1>
            <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {processedGoals.length} target · {completedCount} tercapai
            </p>
          </div>
        </div>
        <AddGoalModal assets={assets} />
      </div>
      </MotionSection>

      {/* ── GOAL GRID ──────────────────────────────────────────────────── */}
      {processedGoals.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Belum Ada Target Impian"
          description="Punya keinginan nyicil rumah? Beli kendaraan? Atau akumulasi 1 BTC? Buat target pertamamu sekarang!"
        />
      ) : (
        <StaggerReveal className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" stagger={0.06}>
          {processedGoals.map((goal) => {
            const isCompleted = goal.progress >= 100;

            return (
              <div
                key={goal.id}
                className="card relative flex flex-col p-5 overflow-hidden"
              >
                {/* Left accent bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                  style={{
                    backgroundColor: isCompleted
                      ? 'var(--color-wealth-500)'
                      : goal.isAsset
                      ? 'var(--color-brand-500)'
                      : 'var(--color-invest-500)',
                  }}
                />

                {/* Delete action */}
                <GoalCardActions goalId={goal.id} name={goal.name} />

                {/* Card header */}
                <div className="flex items-start gap-3.5 mb-5 pl-3">
                  <div
                    className="p-2.5 rounded-xl shrink-0"
                    style={{
                      backgroundColor: goal.isAsset ? 'var(--color-brand-surface)' : 'var(--color-invest-surface)',
                      color:            goal.isAsset ? 'var(--color-brand-600)'    : 'var(--color-invest-600)',
                    }}
                  >
                    {goal.isAsset
                      ? <Bitcoin className="w-5 h-5" />
                      : <TrendingUp className="w-5 h-5" />
                    }
                  </div>
                  <div className="pr-6 flex-1 min-w-0">
                    <h3
                      className="font-display font-bold leading-snug line-clamp-2"
                      style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-primary)' }}
                    >
                      {goal.name}
                    </h3>
                    <span
                      className="inline-block mt-1 text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: goal.isAsset ? 'var(--color-brand-surface)' : 'var(--color-invest-surface)',
                        color:            goal.isAsset ? 'var(--color-brand-700)'    : 'var(--color-invest-700)',
                      }}
                    >
                      {goal.isAsset ? `Aset: ${goal.assetName}` : 'Uang Fiat'}
                    </span>
                  </div>
                </div>

                {/* Progress info */}
                <div className="mb-3 pl-3">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                    Terkumpul
                  </p>
                  <div className="flex items-end gap-1.5">
                    <span
                      className="font-black leading-none nums"
                      style={{ fontSize: 'var(--text-2xl)', color: 'var(--color-text-primary)' }}
                    >
                      {goal.isAsset ? formatUnit(goal.computedCurrent) : `Rp ${formatIDR(goal.computedCurrent)}`}
                    </span>
                    <span className="text-sm font-bold mb-0.5" style={{ color: 'var(--color-text-disabled)' }}>
                      / {goal.isAsset ? formatUnit(goal.computedTarget) : formatIDR(goal.computedTarget)} {goal.isAsset ? goal.assetUnitName : ''}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4 pl-3">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span style={{ color: isCompleted ? 'var(--color-wealth-500)' : 'var(--color-text-tertiary)' }}>
                      {isCompleted ? 'Target Tercapai! 🎉' : `${goal.progress.toFixed(1)}%`}
                    </span>
                  </div>
                  <div
                    className="w-full rounded-full overflow-hidden"
                    style={{ height: '8px', backgroundColor: 'var(--color-bg-sunken)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${goal.progress}%`,
                        backgroundColor: isCompleted
                          ? 'var(--color-wealth-500)'
                          : goal.isAsset
                          ? 'var(--color-brand-500)'
                          : 'var(--color-invest-500)',
                        boxShadow: isCompleted ? 'var(--shadow-wealth)' : undefined,
                      }}
                    />
                  </div>
                </div>

                {/* Deadline */}
                {goal.deadline && (
                  <div
                    className="flex items-center gap-1.5 text-xs font-medium w-fit px-2.5 py-1 rounded-lg mb-3 ml-3"
                    style={{
                      backgroundColor: 'var(--color-bg-sunken)',
                      color: 'var(--color-text-tertiary)',
                      border: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    {new Date(goal.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Actions */}
                {!goal.isAsset && !isCompleted && (
                  <div className="pl-3">
                    <AddFundsModal goal={goal} wallets={wallets} />
                  </div>
                )}

                {goal.isAsset && !isCompleted && (
                  <div
                    className="mt-3 mx-3 px-3 py-2 text-center rounded-xl"
                    style={{
                      backgroundColor: 'var(--color-brand-surface)',
                      border: '1px solid oklch(from var(--color-brand-500) l c h / 0.15)',
                    }}
                  >
                    <p className="text-xs font-medium" style={{ color: 'var(--color-brand-600)' }}>
                      Progress terisi otomatis dari menu Investasi.
                    </p>
                  </div>
                )}

                {isCompleted && (
                  <div
                    className="mt-3 mx-3 px-3 py-2 text-center rounded-xl flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: 'var(--color-wealth-surface)',
                      border: '1px solid oklch(from var(--color-wealth-500) l c h / 0.2)',
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--color-wealth-600)' }} />
                    <p className="text-sm font-bold" style={{ color: 'var(--color-wealth-600)' }}>
                      Mission Accomplished 🏆
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </StaggerReveal>
      )}

    </div>
  );
}
