import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AddEventModal from '@/components/AddEventModal';
import EventCardActions from '@/components/EventCardActions';
import { CalendarRange, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default async function EventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const events = await prisma.events.findMany({
    where: { user_id: session.user.id },
    orderBy: { start_date: 'asc' },
    include: {
      _count: {
        select: { fiat_transactions: true }
      },
      fiat_transactions: {
        select: { amount: true, transaction_type: true }
      }
    }
  });

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  const today = new Date();
  let activeCount = 0;
  let upcomingCount = 0;
  let pastCount = 0;

  events.forEach(e => {
    if (new Date(e.end_date) < today) pastCount++;
    else if (new Date(e.start_date) > today) upcomingCount++;
    else activeCount++;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Event & Bucket Transaksi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelompokkan transaksimu untuk liburan, pernikahan, atau momen spesial lainnya.
          </p>
        </div>
        <AddEventModal />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-5 flex items-center justify-between">
          <div>
             <p className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm mb-0.5">Sedang Berlangsung</p>
             <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-300 leading-tight">{activeCount}</h3>
          </div>
          <div className="p-3 bg-emerald-200 dark:bg-emerald-500/20 rounded-full shrink-0"><CalendarRange className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /></div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-5 flex items-center justify-between">
          <div>
             <p className="text-blue-700 dark:text-blue-400 font-semibold text-sm mb-0.5">Akan Datang</p>
             <h3 className="text-2xl font-black text-blue-700 dark:text-blue-300 leading-tight">{upcomingCount}</h3>
          </div>
          <div className="p-3 bg-blue-200 dark:bg-blue-500/20 rounded-full shrink-0"><CalendarRange className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex items-center justify-between">
          <div>
             <p className="text-slate-700 dark:text-slate-400 font-semibold text-sm mb-0.5">Selesai</p>
             <h3 className="text-2xl font-black text-slate-700 dark:text-slate-300 leading-tight">{pastCount}</h3>
          </div>
          <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded-full shrink-0"><CalendarRange className="w-6 h-6 text-slate-600 dark:text-slate-400" /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {events.length === 0 ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl text-center px-4">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Belum Ada Event</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              Mulai buat "bucket" untuk melacak pengeluaran khusus seperti Mudik Lebaran, Liburan, atau Renovasi Rumah.
            </p>
          </div>
        ) : (
          events.map((event) => {
            let total_expense = 0;
            let total_income = 0;
      
            event.fiat_transactions.forEach(tx => {
              if (tx.transaction_type === 'PENGELUARAN') {
                total_expense += Number(tx.amount);
              } else if (tx.transaction_type === 'PEMASUKAN') {
                total_income += Number(tx.amount);
              }
            });

            const startDate = new Date(event.start_date);
            const endDate = new Date(event.end_date);
            
            let status = 'AKTIF';
            let statusColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
            
            if (endDate < today) {
              status = 'SELESAI';
              statusColor = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
            } else if (startDate > today) {
              status = 'AKAN DATANG';
              statusColor = 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
            }

            // Hitung persentase budget jika ada
            let budgetPercentage = 0;
            if (event.budget_limit && event.budget_limit.toNumber() > 0) {
               budgetPercentage = Math.min(100, Math.round((total_expense / event.budget_limit.toNumber()) * 100));
            }

            return (
              <div key={event.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 hover:shadow-lg transition-shadow group flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${statusColor}`}>
                    {status}
                  </span>
                  <EventCardActions event={event} />
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">
                  {event.name}
                </h3>
                
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-medium">
                  {startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} 
                  {' - '}
                  {endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                
                {event.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-4">
                    {event.description}
                  </p>
                )}

                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Pengeluaran:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{formatRupiah(total_expense)}</span>
                  </div>
                  
                  {event.budget_limit && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-500">Budget: {formatRupiah(event.budget_limit.toNumber())}</span>
                        <span className={budgetPercentage >= 100 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}>{budgetPercentage}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${budgetPercentage >= 100 ? 'bg-red-500' : budgetPercentage >= 80 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                          style={{ width: `${budgetPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-slate-500 font-medium">
                      {event._count.fiat_transactions} Transaksi
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
