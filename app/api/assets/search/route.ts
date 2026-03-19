// app/api/assets/search/route.ts
// Proxy search API — meneruskan pencarian user ke CoinGecko atau Yahoo Finance
// Agar Frontend tidak berinteraksi langsung dengan API luar.

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import globalCache from '@/lib/cache';

interface SearchResult {
  name: string;
  ticker: string;
  type: string;
  exchange?: string;
}

// ─── CoinGecko Search ────────────────────────────────────
async function searchCrypto(query: string): Promise<SearchResult[]> {
  const cacheKey = `search:crypto:${query.toLowerCase()}`;
  const cached = globalCache.get<SearchResult[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
      { headers: { accept: 'application/json' } }
    );

    if (!res.ok) {
      console.error(`CoinGecko search failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const results: SearchResult[] = (data.coins || [])
      .slice(0, 10)
      .map((coin: any) => ({
        name: coin.name,
        ticker: coin.id, // CoinGecko uses id (e.g., "bitcoin") not symbol
        type: 'KRIPTO',
      }));

    // Cache selama 5 menit — data pencarian tidak berubah-ubah
    globalCache.set(cacheKey, results, 300);
    return results;
  } catch (error) {
    console.error('CoinGecko search error:', error);
    return [];
  }
}

// ─── Yahoo Finance Search ────────────────────────────────
async function searchStock(query: string): Promise<SearchResult[]> {
  const cacheKey = `search:stock:${query.toLowerCase()}`;
  const cached = globalCache.get<SearchResult[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      console.error(`Yahoo Finance search failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const results: SearchResult[] = (data.quotes || [])
      .filter((q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'MUTUALFUND')
      .slice(0, 10)
      .map((q: any) => ({
        name: q.longname || q.shortname || q.symbol,
        ticker: q.symbol,
        type: 'SAHAM',
        exchange: q.exchange,
      }));

    globalCache.set(cacheKey, results, 300);
    return results;
  } catch (error) {
    console.error('Yahoo Finance search error:', error);
    return [];
  }
}

// ─── Hardcoded: Logam Mulia ──────────────────────────────
function searchGold(query: string): SearchResult[] {
  const goldAssets: SearchResult[] = [
    { name: 'Emas (XAU/USD)', ticker: 'XAU', type: 'LOGAM_MULIA' },
    { name: 'Perak (XAG/USD)', ticker: 'XAG', type: 'LOGAM_MULIA' },
  ];

  if (!query) return goldAssets;
  const q = query.toLowerCase();
  return goldAssets.filter(
    (a) => a.name.toLowerCase().includes(q) || a.ticker.toLowerCase().includes(q)
  );
}

// ─── GET Handler ─────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim();
    const assetType = searchParams.get('type')?.toUpperCase();

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Parameter "q" minimal 2 karakter.' },
        { status: 400 }
      );
    }

    let results: SearchResult[] = [];

    switch (assetType) {
      case 'KRIPTO':
        results = await searchCrypto(query);
        break;
      case 'SAHAM':
        results = await searchStock(query);
        break;
      case 'LOGAM_MULIA':
        results = searchGold(query);
        break;
      case 'PROPERTI':
      case 'BISNIS':
      case 'LAINNYA':
        // Tipe ini tidak punya pencarian eksternal — user input manual
        results = [];
        break;
      default:
        // Jika type tidak diisi, cari di semua sumber
        const [crypto, stock] = await Promise.all([
          searchCrypto(query),
          searchStock(query),
        ]);
        results = [...crypto, ...stock, ...searchGold(query)];
        break;
    }

    return NextResponse.json({ success: true, data: results }, { status: 200 });
  } catch (error) {
    console.error('Asset search error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mencari aset.' },
      { status: 500 }
    );
  }
}
