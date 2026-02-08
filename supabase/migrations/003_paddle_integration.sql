-- ============================================================
-- Migration 003: Paddle Billing Integration
-- Run this in Supabase SQL Editor AFTER 001 and 002
-- ============================================================

-- 1. Add Paddle subscription/customer IDs to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT;

-- 2. Add Paddle price ID to credit packages
ALTER TABLE credit_packages ADD COLUMN IF NOT EXISTS paddle_price_id TEXT;

-- 3. Update app_settings plans with Paddle price IDs
--    After creating products in Paddle Dashboard, fill in the price IDs here
--    Price IDs look like: pri_01abc123def456
UPDATE app_settings
SET value = '{
  "early_bird": {"price_usd": 6, "credits": 1000, "visible": true, "paddle_price_id": null},
  "basic": {"price_usd": 10, "credits": 1000, "visible": true, "paddle_price_id": null},
  "unlimited": {"price_usd": 30, "credits": null, "visible": true, "paddle_price_id": null}
}'::jsonb
WHERE key = 'plans';

-- ============================================================
-- SERVER-SIDE FUNCTIONS (called by Edge Functions via service_role)
-- These bypass RLS and handle Paddle-triggered mutations safely
-- ============================================================

-- 4. Activate a subscription after Paddle checkout completes
CREATE OR REPLACE FUNCTION activate_subscription(
  p_user_id UUID,
  p_plan_type plan_type,
  p_paddle_subscription_id TEXT,
  p_paddle_customer_id TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  plan_credits INTEGER;
  current_profile RECORD;
BEGIN
  SELECT * INTO current_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  CASE p_plan_type
    WHEN 'early_bird' THEN plan_credits := 1000;
    WHEN 'basic' THEN plan_credits := 1000;
    WHEN 'unlimited' THEN plan_credits := 0;
    ELSE plan_credits := 0;
  END CASE;

  -- Update profile with new plan
  UPDATE profiles
  SET plan_type = p_plan_type,
      plan_expires_at = now() + INTERVAL '30 days',
      subscription_credits = CASE
        WHEN p_plan_type = 'unlimited' THEN current_profile.subscription_credits
        ELSE plan_credits
      END,
      paddle_subscription_id = p_paddle_subscription_id,
      paddle_customer_id = COALESCE(p_paddle_customer_id, paddle_customer_id)
  WHERE id = p_user_id;

  -- Log credit grant (for non-unlimited plans)
  IF plan_credits > 0 THEN
    INSERT INTO credit_transactions (user_id, amount, balance_type, type, description)
    VALUES (
      p_user_id,
      plan_credits,
      'subscription',
      'subscription_grant',
      'Activación plan ' || p_plan_type::text || ' — +' || plan_credits || ' créditos'
    );
  END IF;

  -- Log plan change
  INSERT INTO activity_log (user_id, event_type, metadata)
  VALUES (
    p_user_id,
    'plan_change',
    jsonb_build_object(
      'from', current_profile.plan_type::text,
      'to', p_plan_type::text,
      'paddle_subscription_id', p_paddle_subscription_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Handle subscription renewal (transaction.completed webhook for recurring)
CREATE OR REPLACE FUNCTION handle_subscription_renewal(
  p_user_id UUID,
  p_plan_type plan_type
)
RETURNS void AS $$
DECLARE
  plan_credits INTEGER;
BEGIN
  CASE p_plan_type
    WHEN 'early_bird' THEN plan_credits := 1000;
    WHEN 'basic' THEN plan_credits := 1000;
    WHEN 'unlimited' THEN plan_credits := 0;
    ELSE plan_credits := 0;
  END CASE;

  IF p_plan_type = 'unlimited' THEN
    UPDATE profiles
    SET plan_expires_at = now() + INTERVAL '30 days'
    WHERE id = p_user_id;
  ELSIF plan_credits > 0 THEN
    UPDATE profiles
    SET subscription_credits = plan_credits,
        plan_expires_at = now() + INTERVAL '30 days'
    WHERE id = p_user_id;

    INSERT INTO credit_transactions (user_id, amount, balance_type, type, description)
    VALUES (
      p_user_id,
      plan_credits,
      'subscription',
      'subscription_reset',
      'Renovación mensual ' || p_plan_type::text || ' — ' || plan_credits || ' créditos'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Cancel subscription (subscription.canceled webhook)
CREATE OR REPLACE FUNCTION cancel_subscription(p_user_id UUID)
RETURNS void AS $$
DECLARE
  current_profile RECORD;
BEGIN
  SELECT * INTO current_profile FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE profiles
  SET plan_type = 'none',
      plan_expires_at = NULL,
      subscription_credits = 0,
      paddle_subscription_id = NULL
  WHERE id = p_user_id;

  INSERT INTO activity_log (user_id, event_type, metadata)
  VALUES (
    p_user_id,
    'plan_change',
    jsonb_build_object(
      'from', current_profile.plan_type::text,
      'to', 'none',
      'reason', 'paddle_cancellation'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Add purchased credits after Paddle payment
CREATE OR REPLACE FUNCTION add_purchased_credits(
  p_user_id UUID,
  p_credits INTEGER,
  p_package_name TEXT,
  p_amount_usd DECIMAL,
  p_paddle_transaction_id TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET purchased_credits = purchased_credits + p_credits
  WHERE id = p_user_id;

  INSERT INTO credit_transactions (user_id, amount, balance_type, type, description)
  VALUES (
    p_user_id,
    p_credits,
    'purchased',
    'package_purchase',
    'Compra paquete ' || p_package_name || ' — +' || p_credits || ' créditos'
  );

  INSERT INTO payments (user_id, provider, provider_payment_id, amount_usd, type, status, metadata)
  VALUES (
    p_user_id,
    'paddle',
    p_paddle_transaction_id,
    p_amount_usd,
    'credit_package',
    'completed',
    jsonb_build_object('package_name', p_package_name, 'credits', p_credits)
  );

  INSERT INTO activity_log (user_id, event_type, metadata)
  VALUES (
    p_user_id,
    'credit_purchase',
    jsonb_build_object('package_name', p_package_name, 'credits', p_credits, 'price_usd', p_amount_usd)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- NOTE: pg_cron is NOT available on Supabase Free tier.
-- The renew_expired_subscriptions() function from migration 002
-- will be called via an Edge Function + GitHub Actions cron
-- instead of pg_cron. Remove/comment the cron.schedule lines
-- from migration 002 if you haven't run them yet.
-- ============================================================
