import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Target, TrendingUp, Bitcoin, CalendarClock, Trophy } from 'lucide-react';
import AddGoalModal from '@/components/AddGoalModal';
import AddFundsModal from '@/components/AddFundsModal';
import GoalCardActions from '@/components/GoalCardActions';

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  
  const userId = session.user.id;

  // Fetch needed data
  const [goalsRaw, assets, wallets, portfolios] = await Promise.all([
    prisma.goals.findMany({ 
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    }),
    prisma.assets.findMany({ 
      where: { user_id: userId }, 
      orderBy: { name: 'asc' } 
    }),
    prisma.wallets.findMany({ 
      where: { user_id: userId, deleted_at: null }, 
      orderBy: { name: 'asc' } 
    }),
    prisma.user_portfolios.findMany({
      where: { user_id: userId }
    })
  ]);

  const formatIDR = (val: any) => {
    const num = Number(val);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const formatUnit = (val: any) => {
    const num = Number(val);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(num);
  };

  const calculateProgress = (current: number, target: number) => {
    if (target <= 0) return 0;
    const prog = (current / target) * 100;
    return prog > 100 ? 100 : prog;
  };

  // Map assets by ID for quick lookup
  const assetsById: Record<string, any> = {};
  assets.forEach(a => { assetsById[a.id] = a; });

  // Process goals dynamically, especially for Asset goals
  const processedGoals = goalsRaw.map(goal => {
    // Safely convert all Decimal fields to plain JS numbers for serialization    
    const goalAsset = (goal as any).asset_id ? assetsById[(goal as any).asset_id] : null;
    const targetAssetUnits = (goal as any).target_asset_units ? Number((goal as any).target_asset_units) : null;
    const currentAssetUnits = (goal as any).current_asset_units ? Number((goal as any).current_asset_units) : null;
    const assetId = (goal as any).asset_id ?? null;

    const safeGoal = {
      id: goal.id,
      user_id: goal.user_id,
      name: goal.name,
      target_amount: Number(goal.target_amount),
      current_amount: goal.current_amount ? Number(goal.current_amount) : 0,
      deadline: goal.deadline,
      created_at: goal.created_at,
      updated_at: goal.updated_at,
      asset_id: assetId,
      target_asset_units: targetAssetUnits,
      current_asset_units: currentAssetUnits,
      assetName: goalAsset?.name ?? null,
      assetUnitName: goalAsset?.unit_name ?? 'unit',
    };

    if (safeGoal.asset_id) {
       const port = portfolios.find(p => p.asset_id === safeGoal.asset_id);
       const currentUnits = Number(port?.total_units || 0);
       const targetUnits = Number(safeGoal.target_asset_units || 1);
       const progress = calculateProgress(currentUnits, targetUnits);
       
       return { ...safeGoal, computedCurrent: currentUnits, computedTarget: targetUnits, progress, isAsset: true };
    } else {
       const current = safeGoal.current_amount;
       const target = safeGoal.target_amount || 1;
       const progress = calculateProgress(current, target);
       
       return { ...safeGoal, computedCurrent: current, computedTarget: target, progress, isAsset: false };
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-orange-100 dark:bg-orange-900/50 p-3 rounded-xl">
            <Target className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Target Impian
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Capai *wishlist* kamu mulai dari Uang Tunai hingga Investasi Aset!
            </p>
          </div>
        </div>
        <AddGoalModal assets={assets} />
      </div>

      {processedGoals.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center flex flex-col items-center justify-center mt-6">
          <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-full mb-4">
            <Trophy className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Belum ada Target Impian</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-2">
            Punya keinginan nyicil rumah? Beli kendaraan? Atau investasi murni 1 BTC?
          </p>
          <p className="text-sm text-indigo-500 dark:text-indigo-400 font-medium">✨ Buat Target pertamamu sekarang!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6 mt-6">
          {processedGoals.map(goal => {
            const isCompleted = goal.progress >= 100;

            return (
              <div 
                key={goal.id} 
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col"
              >
                {/* Delete button (absolute) */}
                <GoalCardActions goalId={goal.id} name={goal.name} />

                {/* Card Header */}
                <div className="flex items-start gap-4 mb-5">
                  <div className={`p-3 rounded-xl shadow-inner flex-shrink-0 ${
                    goal.isAsset 
                      ? 'bg-orange-50 text-orange-500 dark:bg-orange-900/40 dark:text-orange-400'
                      : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-400'
                  }`}>
                    {goal.isAsset ? <Bitcoin className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
                  </div>
                  <div className="pr-6">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-snug line-clamp-2">
                      {goal.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                        goal.isAsset 
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                      }`}>
                        {goal.isAsset ? `ASET: ${goal.assetName}` : 'UANG FIAT'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Value Info */}
                <div className="mb-2">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Terkumpul
                  </p>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">
                      {goal.isAsset ? formatUnit(goal.computedCurrent) : `Rp ${formatIDR(goal.computedCurrent)}`}
                    </span>
                    <span className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-0.5">
                      / {goal.isAsset ? formatUnit(goal.computedTarget) : formatIDR(goal.computedTarget)} {goal.isAsset ? goal.assetUnitName : ''}
                    </span>
                  </div>
                </div>

                {/* Progress Bar Component */}
                <div className="mb-4 mt-2">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className={isCompleted ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400'}>
                      {isCompleted ? 'Target Tercapai! 🎉' : `${goal.progress.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-1000 ${
                        isCompleted 
                          ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                          : goal.isAsset ? 'bg-orange-500' : 'bg-indigo-500'
                      }`} 
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Deadline Data */}
                {goal.deadline && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 w-fit px-2 py-1 rounded-md mb-2">
                    <CalendarClock className="w-3.5 h-3.5" />
                    Deadline: {new Date(goal.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}

                {/* Footer Spacer */}
                <div className="flex-1"></div>

                {/* Action Buttons */}
                {!goal.isAsset && !isCompleted && (
                   <AddFundsModal goal={goal} wallets={wallets} />
                )}

                {goal.isAsset && !isCompleted && (
                   <div className="mt-4 p-2 5 text-center bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-500/20 rounded-xl">
                      <p className="text-xs text-orange-600/80 dark:text-orange-400 font-medium">
                        Progress terisi otomatis dari menu Investasi.
                      </p>
                   </div>
                )}

                {isCompleted && (
                   <div className="mt-4 p-2 text-center bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl">
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold">
                        Mission Accomplished 🏆
                      </p>
                   </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
