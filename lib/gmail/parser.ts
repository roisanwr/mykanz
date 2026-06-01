// lib/gmail/parser.ts
// Parser email transaksi dari berbagai bank/e-wallet Indonesia

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

// Map pengirim email ke fungsi parser-nya
const KNOWN_SENDERS: Record<string, (parts: EmailParts) => ParsedGmailTx | null> = {
  'notifikasi@bca.co.id': parseBCA,
  'no-reply@gojek.com': parseGoPay,
  'no-reply@ovo.id': parseOVO,
  'mandiri.notifikasi@bankmandiri.co.id': parseMandiri,
  'noreply@tokopedia.com': parseTokopedia,
  'cs@shopee.co.id': parseShopee,
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

  const parserFn = KNOWN_SENDERS[senderEmail];
  if (!parserFn) return null;

  const body = extractBody(gmailMessage.payload);
  const date = gmailMessage.internalDate
    ? new Date(Number(gmailMessage.internalDate))
    : new Date();

  try {
    return parserFn({ subject, body, date, from: senderEmail });
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
 * Konversi string angka Rupiah (misal "1.500.000") ke integer.
 */
function parseRupiah(str: string): number {
  // Hapus semua non-digit kecuali koma dan titik
  // Format: 1.500.000 atau 1.500.000,00
  return parseInt(str.replace(/[.,]/g, '').replace(/\D/g, ''), 10);
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

  const amountMatch = body.match(/Rp\s?([\d.,]+)/i) ?? subject.match(/Rp\s?([\d.,]+)/i);
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

  const amountMatch = body.match(/Rp\s?([\d.,]+)/i) ?? subject.match(/Rp\s?([\d.,]+)/i);
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

  const amountMatch = body.match(/Rp\s?([\d.,]+)/i) ?? subject.match(/Rp\s?([\d.,]+)/i);
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
  const isDebit = /debit|pembayaran|transfer keluar|pembelian/i.test(subject + body);
  const isCredit = /kredit|transfer masuk|terima/i.test(subject + body);

  if (!isDebit && !isCredit) return null;

  const amountMatch = body.match(/Rp\.?\s?([\d.,]+)/i) ?? subject.match(/Rp\.?\s?([\d.,]+)/i);
  if (!amountMatch) return null;

  const amount = parseRupiah(amountMatch[1]);
  if (isNaN(amount) || amount <= 0) return null;

  const merchantMatch = body.match(/(?:kepada|ke|tujuan|merchant)\s*[:\-]?\s*([^\n\r,]+)/i);
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
    body.match(/(?:total|grand total|jumlah)\s*[:\-]?\s*Rp\s?([\d.,]+)/i) ??
    body.match(/Rp\s?([\d.,]+)/i);
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
    body.match(/(?:total|jumlah|grand total)\s*[:\-]?\s*Rp\s?([\d.,]+)/i) ??
    body.match(/Rp\s?([\d.,]+)/i);
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
