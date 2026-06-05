// lib/category-matcher.ts
// Shared utility untuk kategori matching — dipakai oleh Gmail & Telegram bot.
// Satu sumber kebenaran untuk logika inferensi dan fuzzy-matching kategori.
//
// IMPROVEMENT: Fix false positive — hapus keyword pendek ambigu ('tri', 'xl', 'air'),
//   naikkan threshold dari 50 ke 60, tambah word-boundary check.

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
// CATATAN: Jangan taruh keyword < 4 huruf di sini — risiko false positive tinggi!
// Contoh keyword bermasalah yang SUDAH DIHAPUS: 'tri', 'xl', 'air'
const HINT_KEYWORDS: Record<string, string[]> = {
  makanan: [
    'makan', 'kuliner', 'resto', 'restaurant', 'food', 'minum', 'kopi', 'coffee',
    'cafe', 'warung', 'padang', 'nasi', 'bakso', 'soto', 'burger', 'pizza', 'ayam',
    'seafood', 'sushi', 'minuman', 'snack', 'jajanan', 'kantin',
  ],
  transportasi: [
    'transport', 'grab', 'gojek', 'ojek', 'goride', 'gocar', 'bensin', 'bbm',
    'parkir', 'tol', 'busway', 'krl', 'kereta', 'taksi', 'taxi', 'bahan bakar',
    'pertamina', 'spbu',
  ],
  belanja_online: [
    'belanja', 'online', 'tokopedia', 'shopee', 'lazada', 'blibli', 'bukalapak',
    'ecommerce', 'marketplace',
  ],
  belanja_harian: [
    'harian', 'indomaret', 'alfamart', 'supermarket', 'minimarket',
    'giant', 'carrefour', 'hypermart', 'lottemart', 'groceries', 'sembako',
  ],
  tagihan: [
    'tagihan', 'listrik', 'pln', 'pdam', 'telepon', 'internet', 'indihome',
    'telkomsel', 'smartfren', 'iuran', 'cicilan', 'angsuran', 'kpr', 'bpjs',
    'asuransi', 'pulsa',
  ],
  hiburan: [
    'hiburan', 'entertainment', 'netflix', 'spotify', 'bioskop', 'cinema', 'game',
    'youtube', 'disney', 'steam', 'playstation', 'rekreasi', 'liburan', 'wisata',
  ],
  kesehatan: [
    'sehat', 'dokter', 'klinik', 'apotek', 'obat', 'rumah sakit', 'puskesmas',
    'vitamin', 'suplemen', 'kimia farma', 'guardian', 'century', 'medis',
  ],
  gaji: [
    'gaji', 'salary', 'upah', 'bonus', 'honorarium', 'pendapatan',
    'pemasukan', 'transfer masuk',
  ],
  investasi: [
    'investasi', 'saham', 'reksa dana', 'deposito', 'emas', 'crypto', 'kripto',
    'obligasi', 'tabungan',
  ],
  lainnya: ['lainnya', 'other', 'misc', 'umum'],
};

interface CategoryLike {
  id: string;
  name: string;
}

/**
 * Cari kategori terbaik dari list berdasarkan hint string.
 * Return kategori dengan score tertinggi, atau null jika tidak ada yang cocok (score < 60).
 *
 * IMPROVEMENT: Threshold dinaikkan dari 50 ke 60, dan menggunakan word-boundary check
 * untuk menghindari false positive seperti 'tri' matching 'Nutrisi' atau 'Listrik'.
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
      // Partial match dengan hint string (e.g. hint="makanan", kategori="pengeluaran makanan")
      score = 80;
    } else {
      // Word-boundary keyword match — lebih ketat dari substring biasa
      // "listrik" match "Tagihan Listrik" ✓, tapi "tri" TIDAK match "Listrik" ✓
      for (const kw of hintKeywords) {
        // Escape karakter regex di keyword
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Gunakan word boundary \b untuk whole-word match
        const wordBoundaryRegex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (wordBoundaryRegex.test(catLower)) {
          score = 60;
          break;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = cat;
    }
  }

  // Threshold dinaikkan dari 50 ke 60 untuk mengurangi false positive
  return bestScore >= 60 ? bestMatch : null;
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
  if (/grab|gojek|goride|gocar|gobus|gotrip|taksi|taxi|tol|parkir|bensin|bbm|pertamina/.test(text)) return 'transportasi';
  // Catatan: 'tri' dan 'xl' DIHAPUS dari sini karena terlalu ambigus
  if (/pln|pdam|telkom|indihome|telkomsel|smartfren|listrik|internet|pulsa|bpjs/.test(text)) return 'tagihan';
  if (/netflix|spotify|youtube|disney|bioskop|cinema|game|steam/.test(text)) return 'hiburan';
  if (/apotek|klinik|dokter|rumah sakit|puskesmas|kimia farma|guardian|century|medis/.test(text)) return 'kesehatan';
  if (/gaji|salary|transfer masuk|terima dari/.test(text)) return 'gaji';
  if (/cafe|kopi|coffee|resto|restaurant|warung|padang|nasi|bakso|soto|burger|pizza|ayam|makan|minum|food/.test(text)) return 'makanan';

  return 'lainnya';
}
