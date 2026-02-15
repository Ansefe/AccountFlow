-- 006: Add 'Unranked' value to elo_rank enum
-- Must be run manually: psql or Supabase SQL Editor
-- ============================================================

ALTER TYPE elo_rank ADD VALUE IF NOT EXISTS 'Unranked' BEFORE 'Iron';
