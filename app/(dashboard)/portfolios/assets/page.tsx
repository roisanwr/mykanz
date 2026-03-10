import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Rocket, Box, Database, TrendingUp, HelpCircle } from 'lucide-react';
import AddAssetModal from '@/components/AddAssetModal';
import AssetCardActions from '@/components/AssetCardActions';

// Helper to get nice icon and color for asset types
function getAssetTypeIcon(type: string) {
  switch (type) {
    case 'SAHAM': return <TrendingUp className="w-5 h-5 text-indigo-500" />;
    case 'KRIPTO': return <Database className="w-5 h-5 text-orange-500" />;
    case 'LOGAM_MULIA': return <Box className="w-5 h-5 text-yellow-500" />;
    case 'PROPERTI': return <Box className="w-5 h-5 text-emerald-500" />;
    case 'BISNIS': return <Box className="w-5 h-5 text-blue-500" />;
    default: return <HelpCircle className="w-5 h-5 text-slate-500" />;
  }
}

function getAssetTypeName(type: string) {
  switch (type) {
    case 'SAHAM': return 'Saham';
    case 'KRIPTO': return 'Kriptokurensi';
    case 'LOGAM_MULIA': return 'Emas / Logam Mulia';
    case 'PROPERTI': return 'Properti';
    case 'BISNIS': return 'Bisnis';
    case 'LAINNYA': return 'Lainnya';
    default: return type;
  }
}

export default async function PortfolioAssetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const assets = await prisma.assets.findMany({
    where: { user_id: session.user.id },
    orderBy: { created_at: 'desc' },
    include: {
      user_portfolios: {
        where: { user_id: session.user.id }
      }
    }
  });

  // Calculate total active portfolio value (Estimasi)
  let totalPortfolioValue = 0;
  assets.forEach(asset => {
    const portfolio = asset.user_portfolios?.[0];
    if (portfolio) {
      const units = Number(portfolio.total_units || 0);
      const avgPrice = Number(portfolio.average_buy_price || 0);
      totalPortfolioValue += (units * avgPrice);
    }
  });

  const formatRupiah = (angka: number) => {
    // Only return IDR format if greater than 0, otherwise Rp 0
    if (!angka || isNaN(angka)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  const formatUnit = (val: string | number | undefined | null) => {
    if (!val) return '0';
    const num = Number(val);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(num);
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-xl">
            <Rocket className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Data Aset Investasi
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Kelola daftar instrumen investasi kamu, seperti Saham, Kripto, atau Reksadana.
            </p>
          </div>
        </div>
        <AddAssetModal />
      </div>

      {/* STATISTIC CARD */}
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden group mb-6">
        <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
          <Rocket className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <p className="text-indigo-200 dark:text-slate-300 font-medium mb-1">Total Nilai Portofolio (IDR)</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-md">
            {formatRupiah(totalPortfolioValue)}
          </h2>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-full mb-4">
            <Rocket className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Belum ada aset terdaftar</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 relative z-0">
            Mulai tambahkan instrumen investasi kamu untuk mencatat portofolio.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {assets.map((asset) => (
            <div 
              key={asset.id} 
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all group"
            >
              {/* Upper Section (Icon, Badge, Actions) */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-2.5 shadow-inner">
                    {getAssetTypeIcon(asset.asset_type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">
                      {asset.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      {getAssetTypeName(asset.asset_type)} {asset.ticker_symbol ? `• ${asset.ticker_symbol}` : ''}
                    </p>
                  </div>
                </div>
                <AssetCardActions asset={{
                  ...asset,
                  user_portfolios: asset.user_portfolios?.map(up => ({
                    ...up,
                    total_units: up.total_units?.toString() || '0',
                    average_buy_price: up.average_buy_price?.toString() || '0'
                  }))
                }} />
              </div>

              {/* Lower Section (Balances) */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 flex flex-col gap-3 border border-slate-100 dark:border-slate-700/50">
                {(() => {
                  const p = asset.user_portfolios?.[0];
                  const units = Number(p?.total_units || 0);
                  const avgPrice = Number(p?.average_buy_price || 0);
                  const totalEst = units * avgPrice;

                  return (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Saldo Unit</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                           {formatUnit(units)} {asset.unit_name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Harga Rata-rata</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                           {formatRupiah(avgPrice)}
                        </span>
                      </div>
                      <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400 font-semibold">Estimasi Nilai</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                           {formatRupiah(totalEst)}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
