// lib/gmail/rule-engine.ts
// User-defined category rules engine untuk Gmail auto-import.
// Rules disimpan di DB (tabel gmail_category_rules) — bukan hardcode.
// User input sendiri via UI di Settings → bisa diubah kapan saja.
//
// Priority: angka lebih kecil = lebih tinggi prioritas.
// Match order: EXACT > STARTS_WITH > CONTAINS (dari paling spesifik ke paling umum)
// Algoritma: first-match-wins setelah sort by priority ASC.

import type { ParsedGmailTx } from './parser';

export interface GmailCategoryRule {
  id: string;
  condition_type: 'RECIPIENT' | 'VA_NUMBER' | 'MERCHANT' | 'DESCRIPTION' | 'SOURCE';
  condition_value: string;
  match_type: 'EXACT' | 'CONTAINS' | 'STARTS_WITH';
  category_id: string;
  priority: number;
  is_active: boolean;
}

/**
 * Ambil teks target dari transaksi berdasarkan condition_type rule.
 */
function getTargetText(tx: ParsedGmailTx, conditionType: string): string | null {
  switch (conditionType) {
    case 'RECIPIENT':
      return tx.recipient ?? null;
    case 'VA_NUMBER':
      return tx.va_number ?? null;
    case 'MERCHANT':
      return tx.merchant ?? null;
    case 'DESCRIPTION':
      // Gabungkan semua info yang relevan untuk full-text matching
      return [tx.merchant, tx.recipient, tx.source]
        .filter(Boolean)
        .join(' ')
        .trim() || null;
    case 'SOURCE':
      return tx.source;
    default:
      return null;
  }
}

/**
 * Cek apakah teks cocok dengan pattern berdasarkan match type.
 * Semua comparison case-insensitive.
 */
function isMatch(text: string, pattern: string, matchType: string): boolean {
  const t = text.toLowerCase().trim();
  const p = pattern.toLowerCase().trim();

  if (!t || !p) return false;

  switch (matchType) {
    case 'EXACT':
      return t === p;
    case 'STARTS_WITH':
      return t.startsWith(p);
    case 'CONTAINS':
      return t.includes(p);
    default:
      return false;
  }
}

/**
 * Terapkan user-defined rules ke sebuah transaksi yang sudah diparsing.
 *
 * @param rules  - Semua rules aktif user, diambil dari DB
 * @param tx     - Hasil parsing email (ParsedGmailTx)
 * @returns      - category_id jika ada rule yang match, null jika tidak ada
 *
 * Contoh penggunaan:
 *   rules = [{ condition_type: 'RECIPIENT', condition_value: 'SPayLater',
 *               match_type: 'CONTAINS', category_id: 'uuid-cicilan', priority: 10 }]
 *   tx    = { recipient: 'SPayLater', va_number: '89618039610856197', ... }
 *   → return 'uuid-cicilan'
 */
export function applyUserRules(
  rules: GmailCategoryRule[],
  tx: ParsedGmailTx,
): string | null {
  // Filter hanya yang aktif, sort by priority ASC (angka kecil = prioritas lebih tinggi)
  const activeRules = rules
    .filter((r) => r.is_active)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of activeRules) {
    const targetText = getTargetText(tx, rule.condition_type);
    if (!targetText) continue;

    if (isMatch(targetText, rule.condition_value, rule.match_type)) {
      console.log(
        `[Rule Engine] Match! Rule "${rule.condition_type}:${rule.condition_value}" ` +
        `(${rule.match_type}) → category ${rule.category_id}`,
      );
      return rule.category_id;
    }
  }

  return null;
}

/**
 * Label yang ditampilkan di UI untuk setiap condition_type.
 */
export const CONDITION_TYPE_LABELS: Record<string, string> = {
  RECIPIENT:   'Nama Penerima',
  VA_NUMBER:   'Nomor VA',
  MERCHANT:    'Nama Merchant',
  DESCRIPTION: 'Kata Kunci Deskripsi',
  SOURCE:      'Sumber Bank/Wallet',
};

/**
 * Label yang ditampilkan di UI untuk setiap match_type.
 */
export const MATCH_TYPE_LABELS: Record<string, string> = {
  EXACT:       'Sama persis',
  CONTAINS:    'Mengandung',
  STARTS_WITH: 'Diawali dengan',
};

/**
 * Validasi rule sebelum disimpan ke DB.
 * Return pesan error, atau null jika valid.
 */
export function validateRule(
  conditionType: string,
  conditionValue: string,
  matchType: string,
): string | null {
  const value = conditionValue.trim();

  if (!value) return 'Nilai kondisi tidak boleh kosong.';

  // Untuk VA_NUMBER: harus angka saja
  if (conditionType === 'VA_NUMBER') {
    if (!/^\d+$/.test(value)) return 'Nomor VA hanya boleh berisi angka.';
    if (value.length < 5) return 'Nomor VA minimal 5 digit.';
    return null;
  }

  // Untuk CONTAINS: minimal 4 karakter untuk menghindari false positive
  if (matchType === 'CONTAINS' && value.length < 4) {
    return 'Nilai minimal 4 karakter untuk mode "Mengandung" (hindari false positive).';
  }

  // Untuk STARTS_WITH: minimal 3 karakter
  if (matchType === 'STARTS_WITH' && value.length < 3) {
    return 'Nilai minimal 3 karakter untuk mode "Diawali dengan".';
  }

  return null;
}
