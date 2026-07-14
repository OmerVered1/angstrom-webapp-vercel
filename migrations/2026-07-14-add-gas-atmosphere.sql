-- Adds a gas atmosphere column to the analyses table.
-- Run in Supabase SQL editor. Safe to re-run (uses IF NOT EXISTS).

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS gas_atmosphere text;
