-- ============================================================
-- Migration 002: early_bird plan + pg_cron monthly renewal
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql
-- ============================================================

-- 1. Add early_bird to plan_type enum
ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'early_bird';

-- 2. Update app_settings with new plan config
UPDATE app_settings
SET value = '{
  "early_bird": {"price_usd": 6, "credits": 1000, "visible": true},
  "basic": {"price_usd": 10, "credits": 1000, "visible": true},
  "unlimited": {"price_usd": 30, "credits": null, "visible": true}
}'::jsonb
WHERE key = 'plans';

-- 3. Enable pg_cron extension (available on all Supabase paid plans)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 4. Function: renew expired subscriptions
--    - basic & early_bird: reset subscription_credits to plan amount, extend 30 days
--    - unlimited: just extend 30 days (no credits needed)
CREATE OR REPLACE FUNCTION renew_expired_subscriptions()
RETURNS void AS $$
DECLARE
  r RECORD;
  plan_credits INTEGER;
BEGIN
  FOR r IN
    SELECT id, plan_type, plan_expires_at
    FROM profiles
    WHERE plan_type IN ('basic', 'early_bird', 'unlimited')
      AND plan_expires_at IS NOT NULL
      AND plan_expires_at <= now()
  LOOP
    IF r.plan_type = 'unlimited' THEN
      -- Unlimited: just extend the period, no credits to reset
      UPDATE profiles
      SET plan_expires_at = now() + INTERVAL '30 days'
      WHERE id = r.id;

    ELSE
      -- basic / early_bird: reset subscription credits and extend
      IF r.plan_type = 'basic' THEN
        plan_credits := 1000;
      ELSIF r.plan_type = 'early_bird' THEN
        plan_credits := 1000;
      ELSE
        plan_credits := 0;
      END IF;

      IF plan_credits > 0 THEN
        UPDATE profiles
        SET subscription_credits = plan_credits,
            plan_expires_at = now() + INTERVAL '30 days'
        WHERE id = r.id;

        INSERT INTO credit_transactions (user_id, amount, balance_type, type, description)
        VALUES (
          r.id,
          plan_credits,
          'subscription',
          'subscription_reset',
          'Recarga mensual plan ' || r.plan_type::text || ' — ' || plan_credits || ' créditos'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Schedule: run every day at 00:05 UTC
SELECT cron.schedule(
  'renew-subscriptions-daily',
  '5 0 * * *',
  'SELECT renew_expired_subscriptions()'
);

-- 6. SECURITY DEFINER function for user plan changes
--    Validates the plan change and handles credit grants.
--    Users call this instead of updating profiles directly for plan_type.
CREATE OR REPLACE FUNCTION change_user_plan(
  target_user_id UUID,
  new_plan plan_type
)
RETURNS JSONB AS $$
DECLARE
  current_profile RECORD;
  plan_credits INTEGER;
  result JSONB;
BEGIN
  -- Must be the user themselves or an admin
  IF target_user_id != auth.uid() AND NOT is_admin() THEN
    RETURN jsonb_build_object('error', 'No autorizado');
  END IF;

  SELECT * INTO current_profile FROM profiles WHERE id = target_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Perfil no encontrado');
  END IF;

  -- Prevent changing to the same plan
  IF current_profile.plan_type = new_plan THEN
    RETURN jsonb_build_object('error', 'Ya tienes este plan');
  END IF;

  -- Determine credits for the new plan
  CASE new_plan
    WHEN 'early_bird' THEN plan_credits := 1000;
    WHEN 'basic' THEN plan_credits := 1000;
    WHEN 'unlimited' THEN plan_credits := 0;
    WHEN 'none' THEN plan_credits := 0;
    ELSE plan_credits := 0;
  END CASE;

  -- Update the profile
  IF new_plan = 'none' THEN
    UPDATE profiles
    SET plan_type = 'none',
        plan_expires_at = NULL,
        subscription_credits = 0
    WHERE id = target_user_id;
  ELSIF new_plan = 'unlimited' THEN
    -- Unlimited: no new credits, keep whatever purchased credits they have
    UPDATE profiles
    SET plan_type = 'unlimited',
        plan_expires_at = now() + INTERVAL '30 days'
    WHERE id = target_user_id;
  ELSE
    -- basic / early_bird: add subscription credits
    UPDATE profiles
    SET plan_type = new_plan,
        plan_expires_at = now() + INTERVAL '30 days',
        subscription_credits = current_profile.subscription_credits + plan_credits
    WHERE id = target_user_id;

    -- Log the credit grant
    INSERT INTO credit_transactions (user_id, amount, balance_type, type, description)
    VALUES (
      target_user_id,
      plan_credits,
      'subscription',
      'subscription_grant',
      'Cambio a plan ' || new_plan::text || ' — +' || plan_credits || ' créditos de suscripción'
    );
  END IF;

  -- Log the plan change activity
  INSERT INTO activity_log (user_id, event_type, metadata)
  VALUES (
    target_user_id,
    'plan_change',
    jsonb_build_object('from', current_profile.plan_type::text, 'to', new_plan::text)
  );

  SELECT plan_type, plan_expires_at, subscription_credits, purchased_credits
  INTO current_profile
  FROM profiles WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'plan_type', current_profile.plan_type,
    'plan_expires_at', current_profile.plan_expires_at,
    'subscription_credits', current_profile.subscription_credits,
    'credits_granted', plan_credits
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
