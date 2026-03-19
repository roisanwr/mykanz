// app/api/prices/live/route.ts
// "Mandor Pabrik" — Aggregator harga live untuk semua aset di portofolio user
// Mengambil harga dari CoinGecko (kripto), Yahoo Finance (saham), dan DB (manual)
// Normalisasi ke IDR menggunakan kurs cache 1 jam

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import globalCache from '@/lib/cache';

// ─── Types ──────────────────────────────────────────────
interface AssetPrice {
  price: number;       // Harga per unit dalam IDR
  currency: string;    // Asal mata uang (IDR/USD)
  change24h?: number;  // Persentase perubahan 24 jam (jika tersedia)
  source: 'API' | 'MANUAL';
}

interface LivePriceResponse {
  prices: Record<string, AssetPrice>; // key = asset_id
  netWorth: {
    cash: number;
    investment: number;
    total: number;
  };
  updatedAt: string;
}

// ─── Forex Engine: Ambil kurs USD/IDR ────────────────────
const FOREX_CACHE_KEY = 'forex:USDIDR';
const FOREX_TTL = 3600; // 1 jam

async function getUsdToIdr(): Promise<number> {
  const cached = globalCache.get<number>(FOREX_CACHE_KEY);
  if (cached) return cached;

  try {
    // Menggunakan Yahoo Finance chart endpoint untuk kurs
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/USDIDR=X?range=1d&interval=1d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );

    if (!res.ok) throw new Error(`Yahoo Forex failed: ${res.status}`);

    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (price && price > 0) {
      globalCache.set(FOREX_CACHE_KEY, price, FOREX_TTL);
      return price;
    }

    throw new Error('Invalid forex data');
  } catch (error) {
    console.error('Forex fetch error:', error);
    // Fallback: kurs default jika API gagal
    return 16000;
  }
}

// ─── CoinGecko: Batch fetch harga kripto ─────────────────
const CRYPTO_PRICE_TTL = 15; // 15 detik

async function getCryptoPrices(
  tickers: string[]
): Promise<Record<string, { price: number; change24h?: number }>> {
  if (tickers.length === 0) return {};

  const cacheKey = `prices:crypto:${tickers.sort().join(',')}`;
  const cached = globalCache.get<Record<string, { price: number; change24h?: number }>>(cacheKey);
  if (cached) return cached;

  try {
    const ids = tickers.join(',');
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=idr&include_24hr_change=true`,
      { headers: { accept: 'application/json' } }
    );

    if (!res.ok) {
      console.error(`CoinGecko price fetch failed: ${res.status}`);
      return {};
    }

    const data = await res.json();
    const result: Record<string, { price: number; change24h?: number }> = {};

    for (const ticker of tickers) {
      if (data[ticker]) {
        result[ticker] = {
          price: data[ticker].idr || 0,
          change24h: data[ticker].idr_24h_change || undefined,
        };
      }
    }

    globalCache.set(cacheKey, result, CRYPTO_PRICE_TTL);
    return result;
  } catch (error) {
    console.error('CoinGecko price error:', error);
    return {};
  }
}

// ─── Yahoo Finance: Batch fetch harga saham ──────────────
const STOCK_PRICE_TTL = 15; // 15 detik

async function getStockPrice(
  ticker: string
): Promise<{ price: number; currency: string; change24h?: number } | null> {
  const cacheKey = `prices:stock:${ticker}`;
  const cached = globalCache.get<{ price: number; currency: string; change24h?: number }>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );

    if (!res.ok) {
      console.error(`Yahoo stock fetch failed for ${ticker}: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const currentPrice = meta.regularMarketPrice || 0;
    const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
    const changePercent = previousClose > 0
      ? ((currentPrice - previousClose) / previousClose) * 100
      : 0;

    const result = {
      price: currentPrice,
      currency: meta.currency || 'USD',
      change24h: changePercent,
    };

    globalCache.set(cacheKey, result, STOCK_PRICE_TTL);
    return result;
  } catch (error) {
    console.error(`Yahoo stock error for ${ticker}:`, error);
    return null;
  }
}

// ─── GET Handler ─────────────────────────────────────────
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Ambil semua portofolio user beserta data aset
    const portfolios = await prisma.user_portfolios.findMany({
      where: { user_id: userId },
      include: {
        assets: true,
      },
    });

    // 2. Kelompokkan aset berdasarkan tipe
    const cryptoAssets: { assetId: string; ticker: string }[] = [];
    const stockAssets: { assetId: string; ticker: string; currency: string }[] = [];
    const manualAssets: string[] = [];

    for (const p of portfolios) {
      const asset = p.assets;
      if (!asset.ticker_symbol) {
        manualAssets.push(asset.id);
        continue;
      }

      switch (asset.asset_type) {
        case 'KRIPTO':
          cryptoAssets.push({ assetId: asset.id, ticker: asset.ticker_symbol.toLowerCase() });
          break;
        case 'SAHAM':
          stockAssets.push({ assetId: asset.id, ticker: asset.ticker_symbol, currency: asset.currency });
          break;
        case 'LOGAM_MULIA':
          stockAssets.push({ assetId: asset.id, ticker: 'GC=F', currency: 'USD' });
          break;
        default:
          manualAssets.push(asset.id);
          break;
      }
    }

    // 3. Fetch harga dari API (paralel)
    const [cryptoPrices, usdToIdr] = await Promise.all([
      getCryptoPrices(cryptoAssets.map((a) => a.ticker)),
      stockAssets.length > 0 ? getUsdToIdr() : Promise.resolve(16000),
    ]);

    // Fetch harga saham secara paralel (per ticker)
    const stockPriceResults = await Promise.all(
      stockAssets.map(async (a) => ({
        assetId: a.assetId,
        ticker: a.ticker,
        dbCurrency: a.currency,
        result: await getStockPrice(a.ticker),
      }))
    );

    // 4. Fetch harga manual dari DB (latest_asset_prices view via asset_valuations)
    const manualPricesRaw = manualAssets.length > 0
      ? await prisma.asset_valuations.findMany({
          where: { asset_id: { in: manualAssets } },
          orderBy: { recorded_at: 'desc' },
          distinct: ['asset_id'],
        })
      : [];

    const manualPriceMap = new Map<string, number>();
    for (const v of manualPricesRaw) {
      manualPriceMap.set(v.asset_id, Number(v.price_per_unit));
    }

    // 5. Normalisasi harga ke IDR & build result
    const prices: Record<string, AssetPrice> = {};

    // Kripto — CoinGecko sudah return harga IDR
    for (const a of cryptoAssets) {
      const p = cryptoPrices[a.ticker];
      if (p) {
        prices[a.assetId] = {
          price: p.price,
          currency: 'IDR',
          change24h: p.change24h,
          source: 'API',
        };
      }
    }

    // Saham & Emas — konversi USD & Ounce → IDR & Gram jika perlu
    for (const s of stockPriceResults) {
      if (!s.result) continue;

      let priceInIdr = s.result.price;
      const nativeCurrency = s.result.currency;

      // Konversi Emas (Troy Ounce ke Gram)
      // 1 Troy Ounce = 31.1034768 gram
      if (s.ticker === 'GC=F') {
        priceInIdr = priceInIdr / 31.1034768; 
      }

      // Jika harga dari Yahoo dalam USD dan ticker bukan saham IDR, konversi
      if (nativeCurrency === 'USD' || (nativeCurrency !== 'IDR' && !s.ticker.endsWith('.JK'))) {
        priceInIdr = priceInIdr * usdToIdr;
      }

      prices[s.assetId] = {
        price: priceInIdr,
        currency: 'IDR',
        change24h: s.result.change24h,
        source: 'API',
      };
    }

    // Manual — harga dari DB (sudah dalam mata uang aset, asumsikan IDR)
    for (const assetId of manualAssets) {
      const dbPrice = manualPriceMap.get(assetId);
      if (dbPrice !== undefined) {
        prices[assetId] = {
          price: dbPrice,
          currency: 'IDR',
          source: 'MANUAL',
        };
      }
    }

    // 6. Hitung nilai portofolio berdasarkan harga live
    let totalInvestment = 0;
    for (const p of portfolios) {
      const units = Number(p.total_units || 0);
      const livePrice = prices[p.asset_id];

      if (livePrice) {
        totalInvestment += units * livePrice.price;
      } else {
        // Fallback ke average buy price jika tidak ada harga live
        totalInvestment += units * Number(p.average_buy_price || 0);
      }
    }

    // 7. Hitung saldo kas (pakai query yang sama seperti dashboard)
    const cashResult = await prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(wb.balance), 0) as total_balance
      FROM wallets w
      LEFT JOIN wallet_balances wb ON w.id = wb.wallet_id
      WHERE w.user_id = ${userId}::uuid AND w.deleted_at IS NULL
    `;
    const totalCash = Number(cashResult[0]?.total_balance || 0);

    // 8. Kirim response
    const response: LivePriceResponse = {
      prices,
      netWorth: {
        cash: totalCash,
        investment: totalInvestment,
        total: totalCash + totalInvestment,
      },
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: response }, { status: 200 });
  } catch (error) {
    console.error('Live prices error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil harga live.' },
      { status: 500 }
    );
  }
}
