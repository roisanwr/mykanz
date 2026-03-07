-- ==========================================
-- 0. TABEL NEXTAUTH
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    email TEXT UNIQUE,
    password_hash TEXT,
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 1. ENUMERATIONS
-- ==========================================
CREATE TYPE wallet_type AS ENUM ('TUNAI', 'BANK', 'DOMPET_DIGITAL');
CREATE TYPE fiat_tx_type AS ENUM ('PEMASUKAN', 'PENGELUARAN', 'TRANSFER');
CREATE TYPE asset_type AS ENUM ('KRIPTO', 'SAHAM', 'LOGAM_MULIA', 'PROPERTI', 'BISNIS', 'LAINNYA');
CREATE TYPE asset_tx_type AS ENUM ('BELI', 'JUAL', 'SALDO_AWAL');
CREATE TYPE valuation_source AS ENUM ('MANUAL', 'API');

-- ==========================================
-- 2. TABEL UTAMA (MASTER DATA & KAS)
-- ==========================================
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type wallet_type NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
    deleted_at TIMESTAMPTZ, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type fiat_tx_type NOT NULL,
    -- Tambahan Sparky: Soft Delete & Updated At untuk Kategori!
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, name, type)
);

CREATE TABLE fiat_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    to_wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    transaction_type fiat_tx_type NOT NULL,
    amount DECIMAL(18, 2) NOT NULL CHECK (amount > 0),
    exchange_rate DECIMAL(18, 6) DEFAULT 1.0, 
    description TEXT,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Tambahan Sparky: Jejak audit yang sempurna
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_not_same_wallet CHECK (
        transaction_type <> 'TRANSFER' OR (wallet_id IS DISTINCT FROM to_wallet_id)
    )
);

-- ==========================================
-- 3. FITUR MYDUITGUA (BUDGET & GOALS)
-- ==========================================
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    amount DECIMAL(18, 2) NOT NULL CHECK (amount > 0),
    period VARCHAR(20) NOT NULL, 
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_amount DECIMAL(18, 2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(18, 2) DEFAULT 0 CHECK (current_amount >= 0),
    deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. TABEL ASET (HYBRID MODE ACTIVATE! 🚀)
-- ==========================================
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, 
    name VARCHAR(255) NOT NULL,
    asset_type asset_type NOT NULL,
    ticker_symbol VARCHAR(50),
    unit_name VARCHAR(50) DEFAULT 'unit',
    -- Tambahan Sparky: Aset ini dinilai pakai mata uang apa? Sangat penting buat API!
    currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
    price_source valuation_source DEFAULT 'MANUAL',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_unique_global_assets 
ON assets (asset_type, ticker_symbol) WHERE user_id IS NULL;

CREATE UNIQUE INDEX idx_unique_user_assets 
ON assets (user_id, asset_type, ticker_symbol) WHERE user_id IS NOT NULL;


CREATE TABLE user_portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    total_units DECIMAL(18, 8) DEFAULT 0 CHECK (total_units >= 0),
    average_buy_price DECIMAL(18, 2) DEFAULT 0 CHECK (average_buy_price >= 0),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, asset_id)
);

CREATE TABLE asset_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id UUID NOT NULL REFERENCES user_portfolios(id) ON DELETE CASCADE,
    transaction_type asset_tx_type NOT NULL,
    units DECIMAL(18, 8) NOT NULL CHECK (units > 0),
    price_per_unit DECIMAL(18, 2) NOT NULL CHECK (price_per_unit >= 0),
    total_amount DECIMAL(18, 2) NOT NULL CHECK (total_amount >= 0),
    linked_fiat_transaction_id UUID REFERENCES fiat_transactions(id) ON DELETE SET NULL,
    notes TEXT,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE asset_valuations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    price_per_unit DECIMAL(18, 8) NOT NULL CHECK (price_per_unit >= 0),
    source valuation_source NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (asset_id, recorded_at)
);

-- ==========================================
-- 5. TRIGGERS (DCA OTOMATIS)
-- ==========================================
CREATE OR REPLACE FUNCTION update_portfolio_stats()
RETURNS TRIGGER AS $$
DECLARE
    target_portfolio_id UUID;
    new_units DECIMAL(18, 8) := 0;
    new_avg_price DECIMAL(18, 2) := 0;
    total_cost DECIMAL(18, 2) := 0;
    accumulated_units DECIMAL(18, 8) := 0;
    tx RECORD;
BEGIN
    -- 1. Tentukan portfolio mana yang terpengaruh (DELETE pakai OLD, INSERT/UPDATE pakai NEW)
    IF TG_OP = 'DELETE' THEN
        target_portfolio_id := OLD.portfolio_id;
    ELSE
        target_portfolio_id := NEW.portfolio_id;
    END IF;

    -- 2. Kalkulasi ulang SEMUA transaksi dari awal untuk portfolio ini (Mode Bulletproof! 🛡️)
    FOR tx IN (SELECT * FROM asset_transactions WHERE portfolio_id = target_portfolio_id ORDER BY transaction_date ASC, created_at ASC) LOOP
        IF tx.transaction_type IN ('BELI', 'SALDO_AWAL') THEN
            total_cost := total_cost + (tx.units * tx.price_per_unit);
            accumulated_units := accumulated_units + tx.units;
        ELSIF tx.transaction_type = 'JUAL' THEN
            accumulated_units := accumulated_units - tx.units;
            -- Jual tidak mengubah harga rata-rata (average_buy_price) dari sisa unit
            IF accumulated_units > 0 THEN
                total_cost := accumulated_units * (total_cost / (accumulated_units + tx.units));
            ELSE
                total_cost := 0;
            END IF;
        END IF;
    END LOOP;

    -- 3. Set hasil akhir
    new_units := accumulated_units;
    IF new_units > 0 THEN
        new_avg_price := total_cost / new_units;
    ELSE
        new_avg_price := 0;
    END IF;

    -- 4. Simpan ke tabel portofolio
    UPDATE user_portfolios
    SET total_units = new_units, average_buy_price = new_avg_price, updated_at = NOW()
    WHERE id = target_portfolio_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Hapus trigger lama (jika ada), buat yang super canggih!
DROP TRIGGER IF EXISTS after_asset_transaction_insert ON asset_transactions;

CREATE TRIGGER after_asset_transaction_change
AFTER INSERT OR UPDATE OR DELETE ON asset_transactions
FOR EACH ROW EXECUTE FUNCTION update_portfolio_stats();

-- ==========================================
-- 6. VIEWS (KALKULASI SALDO OTOMATIS)
-- ==========================================
CREATE OR REPLACE VIEW wallet_balances AS
SELECT
    w.id AS wallet_id,
    w.user_id,
    w.name,
    COALESCE(SUM(
        CASE
            WHEN ft.transaction_type = 'PEMASUKAN' AND ft.wallet_id = w.id THEN ft.amount
            WHEN (ft.transaction_type = 'PENGELUARAN' OR ft.transaction_type = 'TRANSFER') AND ft.wallet_id = w.id THEN -ft.amount
            WHEN ft.transaction_type = 'TRANSFER' AND ft.to_wallet_id = w.id THEN ft.amount
            ELSE 0
        END
    ), 0) AS balance
FROM wallets w
LEFT JOIN fiat_transactions ft ON w.id = ft.wallet_id OR w.id = ft.to_wallet_id
WHERE w.deleted_at IS NULL 
GROUP BY w.id, w.user_id, w.name;

CREATE OR REPLACE VIEW latest_asset_prices AS
SELECT DISTINCT ON (asset_id) asset_id, price_per_unit, recorded_at
FROM asset_valuations ORDER BY asset_id, recorded_at DESC;

-- Sparky Tweaks: Ganti nama dan pisahkan kalkulasi berdasarkan mata uang!
DROP VIEW IF EXISTS user_net_worth;

CREATE OR REPLACE VIEW user_asset_value_by_currency AS
SELECT 
    up.user_id, 
    a.currency, 
    SUM(up.total_units * lap.price_per_unit) AS total_asset_value
FROM user_portfolios up
JOIN assets a ON up.asset_id = a.id
JOIN latest_asset_prices lap ON lap.asset_id = up.asset_id 
GROUP BY up.user_id, a.currency;

-- ==========================================
-- 7. INDEXES (BIAR DATABASE NGEBUT SAAT DATA JUTAAN ⚡)
-- ==========================================
CREATE INDEX idx_fiat_tx_user_date ON fiat_transactions(user_id, transaction_date);
CREATE INDEX idx_fiat_tx_wallet ON fiat_transactions(wallet_id);
CREATE INDEX idx_asset_tx_portfolio ON asset_transactions(portfolio_id);
CREATE INDEX idx_budgets_user_date ON budgets(user_id, start_date, end_date);