-- ================================================
-- PANTRY / FRIDGE TRACKER — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ================================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------
-- TABLE: pantry_items
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS pantry_items (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID          REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id         UUID,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Identity
  name               TEXT          NOT NULL,
  emoji              TEXT          NOT NULL DEFAULT '🥡',
  category           TEXT          NOT NULL DEFAULT 'Other',     -- Sayuran, Buah, Daging/Protein, Bumbu, Minuman, Susu/Olahan, Karbohidrat, Beku, Other
  storage_location   TEXT          NOT NULL DEFAULT 'Kulkas Atas', -- Kulkas Atas, Kulkas Bawah, Freezer, Lemari Dapur, Meja Dapur

  -- Quantity & Unit
  quantity_initial   NUMERIC       NOT NULL DEFAULT 1,
  quantity_unit      TEXT          NOT NULL DEFAULT 'pcs',       -- gram, ml, pcs, botol, bungkus, kg, liter
  quantity_remaining NUMERIC       NOT NULL DEFAULT 1,
  quantity_fraction  TEXT          NOT NULL DEFAULT 'full',      -- full, three-quarters, half, quarter, empty

  -- Dates
  purchase_date      DATE          NOT NULL DEFAULT CURRENT_DATE,
  expired_date       DATE,                                       -- optional
  shelf_life_days    INT,                                        -- optional: how many days this lasts from purchase

  -- Notes
  notes              TEXT          DEFAULT '',
  brand              TEXT          DEFAULT ''
);

-- ------------------------------------------------
-- Auto-update updated_at
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION update_pantry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_pantry_updated_at ON pantry_items;
CREATE TRIGGER set_pantry_updated_at
  BEFORE UPDATE ON pantry_items
  FOR EACH ROW EXECUTE PROCEDURE update_pantry_updated_at();

-- ------------------------------------------------
-- RLS Policies
-- ------------------------------------------------
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own pantry items" ON pantry_items;
CREATE POLICY "Users can manage their own pantry items"
  ON pantry_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------
-- Indexes for performance
-- ------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pantry_items_user_id ON pantry_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_profile_id ON pantry_items(profile_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_category ON pantry_items(category);
CREATE INDEX IF NOT EXISTS idx_pantry_items_storage ON pantry_items(storage_location);
CREATE INDEX IF NOT EXISTS idx_pantry_items_expired ON pantry_items(expired_date);
