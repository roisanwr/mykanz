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
  });

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
                      {getAssetTypeName(asset.asset_type)}
                    </p>
                  </div>
                </div>
                <AssetCardActions asset={asset} />
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 flex justify-between items-center border border-slate-100 dark:border-slate-700/50">
                <div>
                   <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Ticker</p>
                   <p className="font-semibold text-slate-700 dark:text-slate-300">
                     {asset.ticker_symbol || '-'}
                   </p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Satuan</p>
                   <p className="font-semibold text-slate-700 dark:text-slate-300">
                     {asset.unit_name}
                   </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
