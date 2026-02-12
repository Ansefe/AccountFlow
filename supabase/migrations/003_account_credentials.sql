-- AccountFlow: Separate sensitive login username + password from public Riot ID
-- Creates a 1:1 table tied to accounts(id)

CREATE TABLE IF NOT EXISTS account_credentials (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  login_username TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE account_credentials ENABLE ROW LEVEL SECURITY;

-- Keep updated_at in sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_account_credentials_updated_at'
  ) THEN
    CREATE TRIGGER set_account_credentials_updated_at
      BEFORE UPDATE ON account_credentials
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- RLS policies: admins only (service_role bypasses RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'account_credentials'
      AND policyname = 'Admin can view account credentials'
  ) THEN
    CREATE POLICY "Admin can view account credentials"
      ON account_credentials FOR SELECT USING (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'account_credentials'
      AND policyname = 'Admin can insert account credentials'
  ) THEN
    CREATE POLICY "Admin can insert account credentials"
      ON account_credentials FOR INSERT WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'account_credentials'
      AND policyname = 'Admin can update account credentials'
  ) THEN
    CREATE POLICY "Admin can update account credentials"
      ON account_credentials FOR UPDATE USING (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'account_credentials'
      AND policyname = 'Admin can delete account credentials'
  ) THEN
    CREATE POLICY "Admin can delete account credentials"
      ON account_credentials FOR DELETE USING (is_admin());
  END IF;
END $$;
