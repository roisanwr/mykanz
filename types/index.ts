// types/index.ts — Proper TypeScript definitions untuk MyKanz

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface AppUser {
  id?:    string;
  email?: string | null;
  name?:  string | null;
  image?: string | null;
}

// ─── Wallet ──────────────────────────────────────────────────────────────────
export interface Wallet {
  id:       string;
  name:     string;
  currency: string;
}

// ─── Category ────────────────────────────────────────────────────────────────
export interface Category {
  id:   string;
  name: string;
  type?: string;
}

export interface Event {
  id:          string;
  name:        string;
  description?: string | null;
  start_date:  Date | string;
  end_date:    Date | string;
  budget_limit?: number | null;
  created_at?: Date | string | null;
}

// ─── Fiat Transactions ───────────────────────────────────────────────────────
export type TxType = 'PEMASUKAN' | 'PENGELUARAN' | 'TRANSFER';

export interface FiatTransaction {
  id:               string;
  transaction_type: TxType;
  amount:           number;
  description?:     string | null;
  transaction_date: Date | string;
  wallet_id:        string;
  to_wallet_id?:    string | null;
  category_id?:     string | null;
  event_id?:        string | null;
  exchange_rate?:   number | null;
  source_channel?:  string | null;
  categories?: {
    name: string;
    type: string;
  } | null;
  events?: {
    name: string;
  } | null;
  wallets_fiat_transactions_wallet_idTowallets: {
    name:     string;
    currency: string;
  };
  wallets_fiat_transactions_to_wallet_idTowallets?: {
    name:     string;
    currency: string;
  } | null;
}

// ─── Portfolio ───────────────────────────────────────────────────────────────
export interface Portfolio {
  id:               string;
  user_id:          string;
  total_units:      number;
  average_buy_price: number;
}

// ─── Filter Option (used in TransactionFilters multi-select) ─────────────────
export interface FilterOption {
  id:    string;
  name:  string;
  type?: string;
}

// ─── Chart Data ──────────────────────────────────────────────────────────────
export interface ChartDataPoint {
  transaction_date: string;
  transaction_type: string;
  amount:           number;
}
