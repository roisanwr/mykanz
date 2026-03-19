// lib/useLivePrices.ts
// Custom SWR hook untuk polling harga live setiap 15 detik
'use client';

import useSWR from 'swr';
import { useRef, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────
export interface AssetPrice {
  price: number;
  currency: string;
  change24h?: number;
  source: 'API' | 'MANUAL';
}

export interface LivePriceData {
  prices: Record<string, AssetPrice>;
  netWorth: {
    cash: number;
    investment: number;
    total: number;
  };
  updatedAt: string;
}

export interface PriceChange {
  assetId: string;
  direction: 'up' | 'down' | 'none';
}

// ─── Fetcher ────────────────────────────────────────────
const fetcher = async (url: string): Promise<LivePriceData> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch live prices');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Unknown error');
  return json.data;
};

// ─── Hook ───────────────────────────────────────────────
interface UseLivePricesOptions {
  refreshInterval?: number; // default 15000ms (15 detik)
  enabled?: boolean;         // default true
}

export function useLivePrices(options: UseLivePricesOptions = {}) {
  const { refreshInterval = 15000, enabled = true } = options;
  const previousPricesRef = useRef<Record<string, number>>({});

  const { data, error, isLoading, isValidating, mutate } = useSWR<LivePriceData>(
    enabled ? '/api/prices/live' : null,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  // Track price changes for animation
  const getPriceChanges = useCallback((): Record<string, 'up' | 'down' | 'none'> => {
    if (!data?.prices) return {};

    const changes: Record<string, 'up' | 'down' | 'none'> = {};
    const prev = previousPricesRef.current;

    for (const [assetId, priceData] of Object.entries(data.prices)) {
      const oldPrice = prev[assetId];
      if (oldPrice === undefined) {
        changes[assetId] = 'none';
      } else if (priceData.price > oldPrice) {
        changes[assetId] = 'up';
      } else if (priceData.price < oldPrice) {
        changes[assetId] = 'down';
      } else {
        changes[assetId] = 'none';
      }
    }

    // Update previous prices for next comparison
    const newPrev: Record<string, number> = {};
    for (const [assetId, priceData] of Object.entries(data.prices)) {
      newPrev[assetId] = priceData.price;
    }
    previousPricesRef.current = newPrev;

    return changes;
  }, [data?.prices]);

  return {
    data,
    prices: data?.prices ?? {},
    netWorth: data?.netWorth ?? { cash: 0, investment: 0, total: 0 },
    updatedAt: data?.updatedAt ?? null,
    error,
    isLoading,
    isValidating,
    getPriceChanges,
    refresh: mutate,
  };
}
