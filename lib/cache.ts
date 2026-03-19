// lib/cache.ts
// In-memory cache engine dengan TTL (Time-To-Live)
// Digunakan untuk mencegah rate-limit dari API pihak ketiga (CoinGecko, Yahoo Finance)

interface CacheEntry<T> {
  data: T;
  expiresAt: number; // Unix timestamp ms
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * Simpan data ke cache dengan masa berlaku (TTL).
   * @param key - Kunci cache
   * @param data - Data yang akan disimpan
   * @param ttlSeconds - Masa berlaku dalam detik
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Ambil data dari cache. Return null jika tidak ada atau sudah expired.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Hapus entry tertentu dari cache.
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Bersihkan semua entry yang sudah expired.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton instance — shared across all API routes in the same server process
const globalCache = new MemoryCache();

export default globalCache;
