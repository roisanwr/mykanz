-- Migration: Tambah tabel gmail_category_rules
-- Jalankan ini di Supabase SQL Editor atau database langsung
-- setelah .env sudah terkonfigurasi dengan benar

CREATE TABLE IF NOT EXISTS gmail_category_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Kondisi matching
  -- 'RECIPIENT'   : nama penerima/biller (e.g. "SPayLater", "PLN")
  -- 'VA_NUMBER'   : nomor VA exact atau prefix
  -- 'MERCHANT'    : nama merchant/toko
  -- 'DESCRIPTION' : keyword bebas di deskripsi gabungan
  -- 'SOURCE'      : sumber bank (e.g. "Mandiri", "BCA")
  condition_type  VARCHAR(20) NOT NULL,
  condition_value VARCHAR(500) NOT NULL,
  -- 'EXACT'       : sama persis (case-insensitive)
  -- 'CONTAINS'    : substring match
  -- 'STARTS_WITH' : prefix matching (ideal untuk VA prefix)
  match_type      VARCHAR(15) NOT NULL DEFAULT 'CONTAINS',
  -- Target kategori
  category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  -- Kontrol
  priority        INTEGER NOT NULL DEFAULT 100,  -- lebih kecil = lebih prioritas
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query performa
CREATE INDEX IF NOT EXISTS idx_gmail_rules_user_active 
  ON gmail_category_rules(user_id, is_active, priority);

-- Verifikasi
SELECT 'Table gmail_category_rules created successfully!' as status;
