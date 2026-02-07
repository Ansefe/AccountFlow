-- AccountFlow Initial Schema
-- Run this in Supabase SQL Editor

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE plan_type AS ENUM ('none', 'basic', 'unlimited');
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'semi_active');
CREATE TYPE ban_type AS ENUM ('permanent', 'normals_required');
CREATE TYPE rental_status AS ENUM ('active', 'expired', 'cancelled', 'force_released');
CREATE TYPE credit_balance_type AS ENUM ('subscription', 'purchased');
CREATE TYPE credit_transaction_type AS ENUM (
  'subscription_grant', 'subscription_reset', 'rental_spend',
  'package_purchase', 'admin_adjustment', 'refund'
);
CREATE TYPE payment_provider AS ENUM ('stripe', 'manual_crypto');
CREATE TYPE payment_type AS ENUM ('subscription', 'credit_package');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE activity_event_type AS ENUM (
  'login', 'logout', 'rental_start', 'rental_end', 'rental_force_release',
  'payment_completed', 'plan_change', 'credit_purchase',
  'account_login_launched', 'app_closed', 'heartbeat_timeout', 'admin_action'
);
CREATE TYPE elo_rank AS ENUM (
  'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum',
  'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger'
);
CREATE TYPE server_region AS ENUM (
  'NA', 'EUW', 'EUNE', 'LAN', 'LAS', 'BR', 'KR', 'JP',
  'OCE', 'TR', 'RU', 'PH', 'SG', 'TW', 'TH', 'VN'
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  discord_id TEXT,
  subscription_credits INTEGER NOT NULL DEFAULT 0,
  purchased_credits INTEGER NOT NULL DEFAULT 0,
  role user_role NOT NULL DEFAULT 'user',
  plan_type plan_type NOT NULL DEFAULT 'none',
  plan_expires_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ACCOUNTS (LoL accounts pool)
-- ============================================================

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  riot_username TEXT NOT NULL,
  riot_tag TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  server server_region NOT NULL,
  elo elo_rank NOT NULL DEFAULT 'Iron',
  elo_division SMALLINT CHECK (elo_division BETWEEN 1 AND 4),
  lp INTEGER NOT NULL DEFAULT 0,
  status account_status NOT NULL DEFAULT 'active',
  is_banned BOOLEAN NOT NULL DEFAULT false,
  ban_type ban_type,
  puuid TEXT,
  current_rental_id UUID,
  last_stats_sync TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RENTALS
-- ============================================================

CREATE TABLE rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  credits_spent INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  status rental_status NOT NULL DEFAULT 'active'
);

-- Add FK from accounts to rentals (deferred to avoid circular)
ALTER TABLE accounts
  ADD CONSTRAINT fk_current_rental
  FOREIGN KEY (current_rental_id) REFERENCES rentals(id) ON DELETE SET NULL;

CREATE INDEX idx_rentals_user ON rentals(user_id);
CREATE INDEX idx_rentals_account ON rentals(account_id);
CREATE INDEX idx_rentals_status ON rentals(status);

-- ============================================================
-- CREDIT TRANSACTIONS
-- ============================================================

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_type credit_balance_type NOT NULL,
  type credit_transaction_type NOT NULL,
  reference_id UUID,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider payment_provider NOT NULL,
  provider_payment_id TEXT,
  amount_usd DECIMAL(10,2) NOT NULL,
  type payment_type NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user ON payments(user_id);

-- ============================================================
-- CREDIT PACKAGES
-- ============================================================

CREATE TABLE credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  credits INTEGER NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Seed default packages
INSERT INTO credit_packages (name, description, credits, price_usd) VALUES
  ('Starter', '500 créditos extra', 500, 5.00),
  ('Popular', '1,200 créditos extra — Más vendido', 1200, 10.00),
  ('Pro', '3,000 créditos extra — Mejor valor', 3000, 22.00);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type activity_event_type NOT NULL,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_type ON activity_log(event_type);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- ============================================================
-- APP SETTINGS
-- ============================================================

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default settings
INSERT INTO app_settings (key, value) VALUES
  ('rental_durations', '{"30": 25, "60": 50, "120": 90, "240": 160, "480": 280, "1440": 500}'),
  ('plans', '{"basic": {"price_usd": 10, "credits": 1000}, "unlimited": {"price_usd": 30}}');

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_accounts_updated_at
  BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admin can update any profile"
  ON profiles FOR UPDATE USING (is_admin());

-- ACCOUNTS (public columns visible to all authenticated, passwords hidden via column selection)
CREATE POLICY "Authenticated users can view accounts"
  ON accounts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert accounts"
  ON accounts FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admin can update accounts"
  ON accounts FOR UPDATE USING (is_admin() OR current_rental_id IS NOT NULL);

CREATE POLICY "Admin can delete accounts"
  ON accounts FOR DELETE USING (is_admin());

-- RENTALS
CREATE POLICY "Users can view own rentals"
  ON rentals FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create rentals"
  ON rentals FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own active rentals"
  ON rentals FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- CREDIT TRANSACTIONS
CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "System/admin can insert transactions"
  ON credit_transactions FOR INSERT WITH CHECK (is_admin() OR user_id = auth.uid());

-- PAYMENTS
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Admin can insert payments"
  ON payments FOR INSERT WITH CHECK (is_admin() OR user_id = auth.uid());

-- CREDIT PACKAGES (public read)
CREATE POLICY "Anyone authenticated can view packages"
  ON credit_packages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage packages"
  ON credit_packages FOR ALL USING (is_admin());

-- ACTIVITY LOG
CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "System can insert activity"
  ON activity_log FOR INSERT WITH CHECK (user_id = auth.uid() OR is_admin());

-- APP SETTINGS (public read, admin write)
CREATE POLICY "Anyone authenticated can read settings"
  ON app_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage settings"
  ON app_settings FOR ALL USING (is_admin());

-- ============================================================
-- ENABLE REALTIME for accounts (state changes)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE rentals;
