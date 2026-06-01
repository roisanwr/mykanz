// lib/category-matcher.ts
// Shared utility untuk kategori matching — dipakai oleh Gmail & Telegram bot.
// Satu sumber kebenaran untuk logika inferensi dan fuzzy-matching kategori.

export type CategoryHint =
  | 'makanan'
  | 'transportasi'
  | 'belanja_online'
  | 'belanja_harian'
  | 'tagihan'
  | 'hiburan'
  | 'kesehatan'
  | 'gaji'
  | 'investasi'
  | 'lainnya';

// Keywords yang diasosiasikan ke setiap hint (untuk fuzzy-match ke nama kategori user)
const HINT_KEYWORDS: Record<string, string[]> = {
  makanan: [
    'makan', 'kuliner', 'resto', 'restaurant', 'food', 'minum', 'kopi', 'coffee',
    'cafe', 'warung', 'padang', 'nasi', 'bakso', 'soto', 'burger', 'pizza', 'ayam',
    'seafood', 'sushi', 'minuman', 'snack', 'jajanan',
  ],
  transportasi: [
    'transport', 'grab', 'gojek', 'ojek', 'goride', 'gocar', 'bensin', 'bbm',
    'parkir', 'tol', 'busway', 'krl', 'kereta', 'bus', 'taksi', 'taxi', 'bahan bakar',
  ],
  belanja_online: [
    'belanja', 'online', 'tokopedia', 'shopee', 'lazada', 'blibli', 'bukalapak',
    'e-commerce', 'ecommerce', 'marketplace',
  ],
  belanja_harian: [
    'belanja', 'harian', 'indomaret', 'alfamart', 'supermarket', 'minimarket',
    'giant', 'carrefour', 'hypermart', 'hero', 'lottemart', 'groceries',
  ],
  tagihan: [
    'tagih', 'listrik', 'pln', 'pdam', 'air', 'telepon', 'internet', 'indihome',
    'telkomsel', 'xl', 'tri', 'smartfren', 'iuran', 'cicilan', 'angsuran', 'kpr',
  ],
  hiburan: [
    'hiburan', 'entertainment', 'netflix', 'spotify', 'bioskop', 'cinema', 'game',
    'youtube', 'disney', 'steam', 'playstation', 'xbox', 'rekreasi', 'liburan',
  ],
  kesehatan: [
    'sehat', 'dokter', 'klinik', 'apotek', 'obat', 'rumah sakit', 'puskesmas',
    'vitamin', 'suplemen', 'kimia farma', 'guardian', 'century', 'medis',
  ],
  gaji: [
    'gaji', 'salary', 'upah', 'thr', 'bonus', 'honorarium', 'pendapatan',
    'pemasukan', 'transfer masuk',
  ],
  investasi: [
    'investasi', 'saham', 'reksa', 'dana', 'deposito', 'emas', 'crypto', 'kripto',
    'obligasi', 'tabungan',
  ],
  lainnya: ['lain', 'other', 'misc', 'umum'],
};

interface CategoryLike {
  id: string;
  name: string;
}

/**
 * Cari kategori terbaik dari list berdasarkan hint string.
 * Return kategori dengan score tertinggi, atau null jika tidak ada yang cocok (score < 50).
 */
export function findBestMatchingCategory<T extends CategoryLike>(
  categories: T[],
  hint: string | null | undefined,
): T | null {
  if (!hint || categories.length === 0) return null;

  const hintLower = hint.toLowerCase().replace(/_/g, ' ');
  const hintKeywords = HINT_KEYWORDS[hint] ?? [hintLower];

  let bestMatch: T | null = null;
  let bestScore = 0;

  for (const cat of categories) {
    const catLower = cat.name.toLowerCase();
    let score = 0;

    if (catLower === hintLower) {
      // Exact match
      score = 100;
    } else if (catLower.includes(hintLower) || hintLower.includes(catLower)) {
      // Partial match with hint string
      score = 80;
    } else {
      // Keyword match
      for (const kw of hintKeywords) {
        if (catLower.includes(kw)) {
          score = 50;
          break;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = cat;
    }
  }

  return bestScore >= 50 ? bestMatch : null;
}

/**
 * Sort kategori: yang paling cocok dengan hint ada di paling atas.
 * Return array of { category, isMatch } agar UI bisa highlight yang cocok.
 */
export function sortCategoriesByHint<T extends CategoryLike>(
  categories: T[],
  hint: string | null | undefined,
): { category: T; isMatch: boolean }[] {
  const best = findBestMatchingCategory(categories, hint);
  return [
    ...categories
      .filter((c) => c.id === best?.id)
      .map((c) => ({ category: c, isMatch: true })),
    ...categories
      .filter((c) => c.id !== best?.id)
      .map((c) => ({ category: c, isMatch: false })),
  ];
}

/**
 * Infer category hint dari nama merchant + source transaksi (bank/e-wallet).
 * Dipakai oleh Gmail parser untuk mengisi field `category_hint`.
 */
export function inferCategoryHint(
  merchant: string | null,
  source: string,
): CategoryHint {
  const text = `${merchant ?? ''} ${source}`.toLowerCase();

  // Urutan: lebih spesifik dulu
  if (/tokopedia|shopee|lazada|blibli|bukalapak/.test(text)) return 'belanja_online';
  if (/indomaret|alfamart|supermarket|hypermart|giant|carrefour|lottemart/.test(text)) return 'belanja_harian';
  if (/grab|gojek|goride|gocar|gobus|gotrip|taxi|tol|parkir|bensin|bbm|pertamina/.test(text)) return 'transportasi';
  if (/pln|pdam|telkom|indihome|telkomsel|xl|tri |smartfren|listrik|internet/.test(text)) return 'tagihan';
  if (/netflix|spotify|youtube|disney|bioskop|cinema|game|steam/.test(text)) return 'hiburan';
  if (/apotek|klinik|dokter|rumah sakit|puskesmas|kimia farma|guardian|century|medis/.test(text)) return 'kesehatan';
  if (/gaji|salary|transfer masuk|terima dari/.test(text)) return 'gaji';
  if (/cafe|kopi|coffee|resto|restaurant|warung|padang|nasi|bakso|soto|burger|pizza|ayam|makan|minum|food/.test(text)) return 'makanan';

  return 'lainnya';
}
