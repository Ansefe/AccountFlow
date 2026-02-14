-- 004_match_based_rentals.sql
-- Migrates rental model from time-based to match-based.
-- Rentals are now purchased by number of matches — duration_minutes and expires_at are removed.

-- ============================================================
-- 1. ADD MATCH COLUMNS TO RENTALS
-- ============================================================

ALTER TABLE rentals
  ADD COLUMN matches_total   INTEGER NOT NULL DEFAULT 1,   -- total matches purchased
  ADD COLUMN matches_used    INTEGER NOT NULL DEFAULT 0,   -- matches consumed so far
  ADD COLUMN last_match_at   TIMESTAMPTZ;                  -- timestamp of last detected match

-- Drop legacy time-based columns
ALTER TABLE rentals DROP COLUMN IF EXISTS duration_minutes;
ALTER TABLE rentals DROP COLUMN IF EXISTS expires_at;

-- ============================================================
-- 2. RENTAL_MATCHES — individual match log per rental
-- ============================================================

CREATE TABLE rental_matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id     UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  match_id      TEXT NOT NULL,                  -- Riot match ID e.g. "LA1_12345"
  game_mode     TEXT,                           -- CLASSIC, ARAM, etc.
  champion      TEXT,                           -- champion played
  win           BOOLEAN,
  duration_secs INTEGER,                        -- match duration in seconds
  detected_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rental_id, match_id)                   -- prevent double-counting
);

CREATE INDEX idx_rental_matches_rental ON rental_matches(rental_id);
CREATE INDEX idx_rental_matches_match  ON rental_matches(match_id);

-- RLS
ALTER TABLE rental_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rental matches"
  ON rental_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rentals r
      WHERE r.id = rental_matches.rental_id
        AND (r.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "System can insert rental matches"
  ON rental_matches FOR INSERT
  WITH CHECK (is_admin());

-- Enable realtime for rental_matches so client sees updates live
ALTER PUBLICATION supabase_realtime ADD TABLE rental_matches;

-- ============================================================
-- 3. ADD NEW EVENT TYPES TO activity_event_type ENUM
-- ============================================================

ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'match_detected';
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'idle_timeout';
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'rental_completed';

-- ============================================================
-- 4. ADD NEW RENTAL STATUS
-- ============================================================

ALTER TYPE rental_status ADD VALUE IF NOT EXISTS 'completed';

-- ============================================================
-- 5. SEED DEFAULT SETTINGS FOR MATCH-BASED RENTALS
-- ============================================================

-- Match packages: { matches: credits_cost }
-- Pricing: 1000 credits/month ≈ 25-30 single matches
INSERT INTO app_settings (key, value)
VALUES (
  'match_packages',
  '{"1": 35, "3": 95, "5": 150, "10": 270}'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Idle timeout in minutes (configurable by admin)
INSERT INTO app_settings (key, value)
VALUES (
  'idle_timeout_minutes',
  '60'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
