import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { PieChart, ShieldAlert, CheckCircle2, TrendingDown } from 'lucide-react';
import AddBudgetModal from '@/components/AddBudgetModal';
import BudgetCardActions from '@/components/BudgetCardActions';

export default async function BudgetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  
  const userId = session.user.id;

  // 1. Fetch categories for the modal
  const categories = await prisma.categories.findMany({ 
    where: { user_id: userId, deleted_at: null },
    orderBy: { name: 'asc' } 
  });

  // 2. Fetch all budgets including their budget_categories connecting table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const budgets = await (prisma.budgets as any).findMany({ 
    where: { user_id: userId },
    orderBy: { start_date: 'desc' },
    include: {
      budget_categories: {
        include: {
          categories: true
        }
      }
    }
  }) as any[];

  // 3. For each budget, fetch total transactions within its date range for its mapped categories
  const processedBudgets = await Promise.all(
    budgets.map(async (budget: any) => {
      const categoryIds = (budget.budget_categories || []).map((bc: any) => bc.category_id);
      
      let usedAmount = 0;
      
      // Only fetch if there are categories assigned
      if (categoryIds.length > 0) {
        const txs = await prisma.fiat_transactions.aggregate({
          where: {
            user_id: userId,
            transaction_type: 'PENGELUARAN',
            category_id: { in: categoryIds },
            transaction_date: {
              gte: budget.start_date,
              lte: budget.end_date
            }
          },
          _sum: {
            amount: true
          }
        });
        usedAmount = Number(txs._sum.amount || 0);
      }

      const limit = Number(budget.amount);
      const percentage = limit > 0 ? (usedAmount / limit) * 100 : 0;
      const cappedPercentage = percentage > 100 ? 100 : percentage;
      
      return {
        ...budget,
        usedAmount,
        percentage,
        cappedPercentage,
        isWarning: percentage >= 80 && percentage < 100,
        isDanger: percentage >= 100
      };
    })
  );

  const formatIDR = (val: any) => {
    const num = Number(val);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-rose-100 dark:bg-rose-900/50 p-3 rounded-xl">
            <PieChart className="w-8 h-8 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Anggaran Pengeluaran
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Batasi pengeluaran per kategori agar tidak overbudget setiap bulannya.
            </p>
          </div>
        </div>
        <AddBudgetModal categories={categories} />
      </div>

      {processedBudgets.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center flex flex-col items-center justify-center mt-6">
          <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-full mb-4">
            <ShieldAlert className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Belum ada Anggaran Terpasang</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-2">
            Pasang alarm otomatis untuk kategori seperti Kopi atau Belanja biar ga kebablasan!
          </p>
          <p className="text-sm text-rose-500 dark:text-rose-400 font-medium">✨ Yuk buat anggaran pertamamu!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6 mt-6">
          {processedBudgets.map(budget => {
            return (
              <div 
                key={budget.id} 
                className={`bg-white dark:bg-slate-800 border-2 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col ${
                  budget.isDanger 
                    ? 'border-red-300 dark:border-red-500/50' 
                    : budget.isWarning 
                      ? 'border-orange-300 dark:border-orange-500/50'
                      : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {/* Delete button (absolute) */}
                <BudgetCardActions budgetId={budget.id} />

                {/* Card Header */}
                <div className="flex items-start gap-4 mb-5">
                  <div className={`p-3 rounded-xl shadow-inner flex-shrink-0 ${
                    budget.isDanger 
                      ? 'bg-red-50 text-red-500 dark:bg-red-900/40 dark:text-red-400'
                      : budget.isWarning
                        ? 'bg-orange-50 text-orange-500 dark:bg-orange-900/40 dark:text-orange-400'
                        : 'bg-rose-50 text-rose-500 dark:bg-rose-900/40 dark:text-rose-400'
                  }`}>
                    {budget.isDanger ? <ShieldAlert className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                  </div>
                  <div className="pr-6">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-snug">
                       Kategori Diawasi: {budget.budget_categories.length}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                       {budget.budget_categories.map(c => c.categories?.name).join(', ')}
                    </div>
                  </div>
                </div>

                {/* Info Text */}
                <div className="mb-2 flex justify-between items-end">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Terpakai
                    </p>
                    <div className="flex items-end gap-1">
                      <span className={`text-2xl font-black leading-none ${
                        budget.isDanger ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'
                      }`}>
                        Rp {formatIDR(budget.usedAmount)}
                      </span>
                      <span className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-0.5">
                        / Rp {formatIDR(budget.amount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar Component */}
                <div className="mb-4 mt-2">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className={
                      budget.isDanger ? 'text-red-500' : budget.isWarning ? 'text-orange-500' : 'text-slate-500 dark:text-slate-400'
                    }>
                      {budget.isDanger ? 'OVERBUDGET! 🚨' : budget.isWarning ? 'Mendekati Batas ⚠️' : 'Aman Terkendali 🛡️'}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {budget.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-3 rounded-full transition-all duration-1000 ${
                        budget.isDanger 
                          ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' 
                          : budget.isWarning
                            ? 'bg-orange-500'
                            : 'bg-emerald-500'
                      }`} 
                      style={{ width: `${budget.cappedPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Footer Period Spacer */}
                <div className="flex-1"></div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 px-3 py-2 rounded-lg">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                     {budget.period}
                   </div>
                   <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                     {formatDate(budget.start_date)} - {formatDate(budget.end_date)}
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
