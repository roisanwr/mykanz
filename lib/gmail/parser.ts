// lib/gmail/parser.ts
// Parser email transaksi dari berbagai bank/e-wallet Indonesia
//
// FIX BUG #3: parseRupiah diperbaiki untuk menangani format "1.500.000,00" dengan benar
// FIX BUG #5: Pencocokan sender diubah dari exact-match ke domain-based matching
// FITUR: Testing Mode — jika GMAIL_TEST_MODE=true di env, subject "[TEST:MANDIRI]" dll.
//        akan mem-bypass pencocokan sender dan langsung parse menggunakan parser yang sesuai

import { inferCategoryHint, type CategoryHint } from '../category-matcher';

export interface ParsedGmailTx {
  source: string;           // Nama bank/e-wallet, e.g. "BCA", "GoPay"
  type: 'PEMASUKAN' | 'PENGELUARAN';
  amount: number;           // dalam Rupiah (integer)
  merchant: string | null;  // nama merchant/toko jika ada
  currency: string;         // default "IDR"
  date: Date;               // tanggal transaksi dari isi email
  category_hint: CategoryHint; // tebakan kategori untuk fuzzy-match ke kategori user
}

interface EmailParts {
  subject: string;
  body: string;
  date: Date;
  from: string;
}

// ─── FIX BUG #5: Domain-based matching ────────────────────────────────────────
// Sebelumnya: exact email address match (sangat rapuh, bisa gagal jika bank ganti sender)
// Sekarang: cukup cocokkan domain pengirim (@bankmandiri.co.id, @bca.co.id, dll.)

interface SenderRule {
  domains: string[];
  parser: (parts: EmailParts) => ParsedGmailTx | null;
}

const SENDER_DOMAIN_RULES: SenderRule[] = [
  { domains: ['bca.co.id'], parser: parseBCA },
  { domains: ['gojek.com', 'goto.com', 'gojekmsg.com'], parser: parseGoPay },
  { domains: ['ovo.id'], parser: parseOVO },
  { domains: ['bankmandiri.co.id'], parser: parseMandiri },
  { domains: ['tokopedia.com'], parser: parseTokopedia },
  { domains: ['shopee.co.id', 'shopee.com'], parser: parseShopee },
];

// Map keyword di subject untuk Testing Mode (GMAIL_TEST_MODE=true)
const TEST_MODE_KEYWORDS: Record<string, (parts: EmailParts) => ParsedGmailTx | null> = {
  'TEST:BCA': parseBCA,
  'TEST:GOPAY': parseGoPay,
  'TEST:OVO': parseOVO,
  'TEST:MANDIRI': parseMandiri,
  'TEST:TOKOPEDIA': parseTokopedia,
  'TEST:SHOPEE': parseShopee,
};

// ─── Tipe minimal Gmail API ─────────────────────────────────────────────────

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  mimeType: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

export interface GmailMessage {
  payload?: {
    headers?: GmailHeader[];
    body?: { data?: string };
    parts?: GmailPart[];
    mimeType?: string;
  };
  internalDate?: string;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Coba parse email Gmail menjadi data transaksi.
 * Return null jika pengirim tidak dikenal atau bukan email transaksi.
 */
export function parseTransactionFromEmail(
  gmailMessage: GmailMessage,
): ParsedGmailTx | null {
  const headers = gmailMessage.payload?.headers ?? [];
  const fromHeader = getHeader(headers, 'From');
  const subject = getHeader(headers, 'Subject');

  // Ekstrak alamat email dari header "From: Nama <email@domain.com>"
  const emailMatch = fromHeader.match(/<([^>]+)>/) ?? fromHeader.match(/(\S+@\S+)/);
  const senderEmail = (emailMatch?.[1] ?? fromHeader).toLowerCase().trim();

  const body = extractBody(gmailMessage.payload);
  const date = gmailMessage.internalDate
    ? new Date(Number(gmailMessage.internalDate))
    : new Date();

  // ── TESTING MODE ──────────────────────────────────────────────────────────
  // Jika GMAIL_TEST_MODE=true, cek apakah subject mengandung keyword [TEST:BANK]
  // Ini memungkinkan pengiriman email dari email pribadi untuk pengujian
  if (process.env.GMAIL_TEST_MODE === 'true') {
    const subjectUpper = subject.toUpperCase();
    for (const [keyword, parserFn] of Object.entries(TEST_MODE_KEYWORDS)) {
      if (subjectUpper.includes(keyword)) {
        console.log(`[Gmail Parser] TEST MODE — keyword "${keyword}" ditemukan di subject, bypass sender check`);
        try {
          return parserFn({ subject, body, date, from: senderEmail });
        } catch (err) {
          console.error(`[Gmail Parser] Error parsing test email dengan keyword ${keyword}:`, err);
          return null;
        }
      }
    }
  }

  // ── NORMAL MODE: Domain-based sender matching ─────────────────────────────
  const senderDomain = senderEmail.split('@')[1] ?? '';
  const rule = SENDER_DOMAIN_RULES.find((r) => r.domains.includes(senderDomain));

  if (!rule) return null;

  try {
    return rule.parser({ subject, body, date, from: senderEmail });
  } catch (err) {
    console.error(`[Gmail Parser] Error parsing email dari ${senderEmail}:`, err);
    return null;
  }
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function getHeader(headers: GmailHeader[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

/**
 * Ekstrak teks dari payload Gmail (handle nested multipart MIME).
 */
function extractBody(
  payload: GmailMessage['payload'],
  preferHtml = false,
): string {
  if (!payload) return '';

  // Pesan sederhana (bukan multipart)
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf8');
  }

  const parts = payload.parts ?? [];

  // Cari text/plain dulu, lalu text/html sebagai fallback
  const preferredMime = preferHtml ? 'text/html' : 'text/plain';
  const fallbackMime = preferHtml ? 'text/plain' : 'text/html';

  for (const mime of [preferredMime, fallbackMime]) {
    const part = findPart(parts, mime);
    if (part?.body?.data) {
      const raw = Buffer.from(part.body.data, 'base64url').toString('utf8');
      // Strip HTML tags untuk text/html
      return mime === 'text/html' ? raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : raw;
    }
  }

  return '';
}

function findPart(parts: GmailPart[], mimeType: string): GmailPart | null {
  for (const part of parts) {
    if (part.mimeType === mimeType) return part;
    if (part.parts) {
      const found = findPart(part.parts, mimeType);
      if (found) return found;
    }
  }
  return null;
}

/**
 * FIX BUG #3: Konversi string angka Rupiah ke integer dengan benar.
 *
 * Format Indonesia: 1.500.000 (titik = pemisah ribuan), 1.500.000,00 (koma = desimal)
 *
 * SEBELUM (SALAH): "1.500.000,00" → hapus semua titik & koma → "150000000" → 150.000.000 (100x!)
 * SESUDAH (BENAR): "1.500.000,00" → hapus ",00" → "1.500.000" → hapus titik → "1500000" → 1.500.000 ✓
 */
function parseRupiah(str: string): number {
  return parseInt(
    str
      .replace(/,\d{1,2}$/, '')  // 1. Hapus desimal di akhir: ",00" atau ",5"
      .replace(/\./g, '')          // 2. Hapus titik pemisah ribuan
      .replace(/\D/g, ''),         // 3. Hapus karakter non-digit sisanya (spasi, dsb)
    10,
  );
}

// ─── Per-bank parsers ─────────────────────────────────────────────────────────

function parseBCA({ subject, body, date }: EmailParts): ParsedGmailTx | null {
  // Contoh subject: "Informasi Transaksi BCA - Pembayaran"
  // Contoh body: "Rp 150.000 kepada Tokopedia"

  // Deteksi debit (pengeluaran) vs kredit (pemasukan)
  const isDebit =
    /debit|pembayaran|transfer keluar|pembelian/i.test(subject + body);
  const isCredit =
    /kredit|transfer masuk|terima|masuk ke rekening/i.test(subject + body);

  if (!isDebit && !isCredit) return null;

  const amountMatch = body.match(/Rp\.?\s?([\d.,]+)/i) ?? subject.match(/Rp\.?\s?([\d.,]+)/i);
  if (!amountMatch) return null;

  const amount = parseRupiah(amountMatch[1]);
  if (isNaN(amount) || amount <= 0) return null;

  // Coba ekstrak nama merchant/tujuan
  const merchantMatch =
    body.match(/(?:kepada|ke|merchant|toko)\s*[:\-]?\s*([^\n\r,]+)/i) ??
    body.match(/(?:at|to|Merchant)\s*:\s*([^\n\r,]+)/i);
  const merchant = merchantMatch?.[1]?.trim() ?? null;

  return {
    source: 'BCA',
    type: isDebit ? 'PENGELUARAN' : 'PEMASUKAN',
    amount,
    merchant,
    currency: 'IDR',
    date,
    category_hint: inferCategoryHint(merchant, 'BCA'),
  };
}

function parseGoPay({ subject, body, date }: EmailParts): ParsedGmailTx | null {
  // GoPay: "Pembayaran GoPay berhasil" / "Saldo GoPay masuk"
  const isOut = /pembayaran|bayar|kirim|transfer keluar/i.test(subject + body);
  const isIn = /masuk|terima|top.?up|topup/i.test(subject + body);

  if (!isOut && !isIn) return null;

  const amountMatch = body.match(/Rp\.?\s?([\d.,]+)/i) ?? subject.match(/Rp\.?\s?([\d.,]+)/i);
  if (!amountMatch) return null;

  const amount = parseRupiah(amountMatch[1]);
  if (isNaN(amount) || amount <= 0) return null;

  const merchantMatch = body.match(/(?:di|ke|kepada|to|merchant)\s*[:\-]?\s*([^\n\r,]+)/i);
  const merchant = merchantMatch?.[1]?.trim() ?? null;

  return {
    source: 'GoPay',
    type: isOut ? 'PENGELUARAN' : 'PEMASUKAN',
    amount,
    merchant,
    currency: 'IDR',
    date,
    category_hint: inferCategoryHint(merchant, 'GoPay'),
  };
}

function parseOVO({ subject, body, date }: EmailParts): ParsedGmailTx | null {
  const isOut = /pembayaran|bayar|kirim|debit/i.test(subject + body);
  const isIn = /masuk|terima|top.?up|kredit/i.test(subject + body);

  if (!isOut && !isIn) return null;

  const amountMatch = body.match(/Rp\.?\s?([\d.,]+)/i) ?? subject.match(/Rp\.?\s?([\d.,]+)/i);
  if (!amountMatch) return null;

  const amount = parseRupiah(amountMatch[1]);
  if (isNaN(amount) || amount <= 0) return null;

  const merchantMatch = body.match(/(?:di|ke|kepada|merchant)\s*[:\-]?\s*([^\n\r,]+)/i);
  const merchant = merchantMatch?.[1]?.trim() ?? null;

  return {
    source: 'OVO',
    type: isOut ? 'PENGELUARAN' : 'PEMASUKAN',
    amount,
    merchant,
    currency: 'IDR',
    date,
    category_hint: inferCategoryHint(merchant, 'OVO'),
  };
}

function parseMandiri({ subject, body, date }: EmailParts): ParsedGmailTx | null {
  const combined = subject + ' ' + body;
  const isDebit = /debit|pembayaran|transfer keluar|pembelian|keluar/i.test(combined);
  const isCredit = /kredit|transfer masuk|terima|masuk/i.test(combined);

  if (!isDebit && !isCredit) return null;

  // Mandiri sering pakai "Rp." atau "Rp " atau "IDR"
  const amountMatch =
    body.match(/Rp\.?\s?([\d.,]+)/i) ??
    body.match(/IDR\s?([\d.,]+)/i) ??
    subject.match(/Rp\.?\s?([\d.,]+)/i);
  if (!amountMatch) return null;

  const amount = parseRupiah(amountMatch[1]);
  if (isNaN(amount) || amount <= 0) return null;

  const merchantMatch = body.match(/(?:kepada|ke|tujuan|merchant|beneficiary)\s*[:\-]?\s*([^\n\r,]+)/i);
  const merchant = merchantMatch?.[1]?.trim() ?? null;

  return {
    source: 'Mandiri',
    type: isDebit ? 'PENGELUARAN' : 'PEMASUKAN',
    amount,
    merchant,
    currency: 'IDR',
    date,
    category_hint: inferCategoryHint(merchant, 'Mandiri'),
  };
}

function parseTokopedia({ subject, body, date }: EmailParts): ParsedGmailTx | null {
  // Tokopedia: konfirmasi pembayaran / invoice
  const isPurchase = /pembayaran|invoice|pesanan|order/i.test(subject + body);
  if (!isPurchase) return null;

  const amountMatch =
    body.match(/(?:total|grand total|jumlah)\s*[:\-]?\s*Rp\.?\s?([\d.,]+)/i) ??
    body.match(/Rp\.?\s?([\d.,]+)/i);
  if (!amountMatch) return null;

  const amount = parseRupiah(amountMatch[1]);
  if (isNaN(amount) || amount <= 0) return null;

  // Coba ambil nama toko/produk dari subject
  const merchantMatch = subject.match(/(?:dari|from|toko|shop)\s*[:\-]?\s*([^\n\r,\-]+)/i);
  const merchant = merchantMatch?.[1]?.trim() ?? 'Tokopedia';

  return {
    source: 'Tokopedia',
    type: 'PENGELUARAN',
    amount,
    merchant,
    currency: 'IDR',
    date,
    category_hint: 'belanja_online', // Tokopedia selalu belanja online
  };
}

function parseShopee({ subject, body, date }: EmailParts): ParsedGmailTx | null {
  const isPurchase = /pembayaran|pesanan|order|invoice|konfirmasi/i.test(subject + body);
  if (!isPurchase) return null;

  const amountMatch =
    body.match(/(?:total|jumlah|grand total)\s*[:\-]?\s*Rp\.?\s?([\d.,]+)/i) ??
    body.match(/Rp\.?\s?([\d.,]+)/i);
  if (!amountMatch) return null;

  const amount = parseRupiah(amountMatch[1]);
  if (isNaN(amount) || amount <= 0) return null;

  const merchantMatch = subject.match(/(?:toko|seller|dari)\s*[:\-]?\s*([^\n\r,\-]+)/i);
  const merchant = merchantMatch?.[1]?.trim() ?? 'Shopee';

  return {
    source: 'Shopee',
    type: 'PENGELUARAN',
    amount,
    merchant,
    currency: 'IDR',
    date,
    category_hint: 'belanja_online', // Shopee selalu belanja online
  };
}
