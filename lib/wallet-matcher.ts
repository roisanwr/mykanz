// lib/wallet-matcher.ts
// Smart wallet matching: cocokkan sumber bank/e-wallet dengan nama dompet user
// Mirip seperti category-matcher.ts tapi untuk dompet

interface WalletCandidate {
  id: string;
  name: string;
}

// Keywords yang diasosiasikan dengan masing-masing bank/e-wallet
// Key = nama sumber dari parser (tx.source), Values = keyword yang mungkin ada di nama dompet user
const SOURCE_KEYWORDS: Record<string, string[]> = {
  BCA:        ['bca', 'central asia', 'klikbca'],
  MANDIRI:    ['mandiri', 'livin'],
  BNI:        ['bni', 'negara indonesia'],
  BRI:        ['bri', 'rakyat indonesia', 'brimo'],
  CIMB:       ['cimb', 'niaga', 'ocbc'],
  DANAMON:    ['danamon'],
  PERMATA:    ['permata', 'permatabank'],
  GOPAY:      ['gopay', 'gojek', 'goto'],
  OVO:        ['ovo'],
  DANA:       ['dana'],
  SHOPEE:     ['shopeepay', 'shopee'],
  TOKOPEDIA:  ['tokopedia', 'gopay'],
  JAGO:       ['jago', 'bank jago'],
  JENIUS:     ['jenius', 'btpn'],
  FLIP:       ['flip'],
  LIVIN:      ['mandiri', 'livin'],
};

/**
 * Cari dompet terbaik yang cocok dengan sumber transaksi.
 * 
 * Contoh: 
 *   source = "BCA", wallets = [{name: "Rekening BCA Utama"}, {name: "Tabungan Mandiri"}]
 *   → Return dompet "Rekening BCA Utama"
 * 
 * @param wallets  - Daftar semua dompet aktif user
 * @param source   - Nama sumber bank/e-wallet dari parser (e.g. "BCA", "GoPay")
 * @returns Dompet yang paling cocok, atau null jika tidak ada
 */
export function findBestMatchingWallet(
  wallets: WalletCandidate[],
  source: string,
): WalletCandidate | null {
  if (!wallets.length || !source) return null;

  // Ambil keyword yang diasosiasikan dengan sumber ini
  const sourceUpper = source.toUpperCase();
  const keywords = SOURCE_KEYWORDS[sourceUpper] ?? [source.toLowerCase()];

  for (const wallet of wallets) {
    const walletNameLower = wallet.name.toLowerCase();
    
    // Cek apakah nama dompet mengandung salah satu keyword
    const isMatch = keywords.some((kw) => walletNameLower.includes(kw));
    if (isMatch) {
      return wallet;
    }
  }

  return null;
}
