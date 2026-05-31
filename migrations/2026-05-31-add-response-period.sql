-- Adds diagnostic source/response period columns to the analyses table.
-- Run in Supabase SQL editor. Safe to re-run (uses IF NOT EXISTS).

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS period_t_resp double precision,
  ADD COLUMN IF NOT EXISTS frequency_f_resp double precision;
