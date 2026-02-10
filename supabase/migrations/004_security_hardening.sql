-- ============================================================
-- Migration 004: Security Hardening
-- Run this in Supabase SQL Editor AFTER 001, 002, 003
-- ============================================================

-- ============================================================
-- 1. RESTRICT PROFILE UPDATES — users can only change display_name
-- ============================================================

-- Drop the overly permissive policy that lets users UPDATE any column
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create a function for users to update only their display_name
CREATE OR REPLACE FUNCTION update_own_display_name(p_display_name TEXT)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET display_name = p_display_name
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin can still update any profile (existing policy remains)
-- "Admin can update any profile" ON profiles FOR UPDATE USING (is_admin());

-- ============================================================
-- 2. ADMIN-ONLY FUNCTIONS FOR PROFILE MUTATIONS
-- ============================================================

-- Admin credit adjustment (replaces direct UPDATE from admin.store)
CREATE OR REPLACE FUNCTION admin_adjust_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_balance_type credit_balance_type,
  p_reason TEXT DEFAULT ''
)
RETURNS void AS $$
DECLARE
  current_val INTEGER;
  new_val INTEGER;
BEGIN
  -- Only admins can call this
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  IF p_balance_type = 'subscription' THEN
    SELECT subscription_credits INTO current_val FROM profiles WHERE id = p_user_id;
  ELSE
    SELECT purchased_credits INTO current_val FROM profiles WHERE id = p_user_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  new_val := current_val + p_amount;
  IF new_val < 0 THEN
    RAISE EXCEPTION 'Balance cannot be negative';
  END IF;

  IF p_balance_type = 'subscription' THEN
    UPDATE profiles SET subscription_credits = new_val WHERE id = p_user_id;
  ELSE
    UPDATE profiles SET purchased_credits = new_val WHERE id = p_user_id;
  END IF;

  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, balance_type, type, description)
  VALUES (
    p_user_id,
    p_amount,
    p_balance_type,
    'admin_adjustment',
    COALESCE(NULLIF(p_reason, ''), 'Admin adjustment: ' || CASE WHEN p_amount > 0 THEN '+' ELSE '' END || p_amount || ' credits')
  );

  -- Log activity
  INSERT INTO activity_log (user_id, event_type, metadata)
  VALUES (
    p_user_id,
    'admin_action',
    jsonb_build_object('action', 'credit_adjustment', 'amount', p_amount, 'balance_type', p_balance_type::text, 'reason', p_reason)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin plan change
CREATE OR REPLACE FUNCTION admin_update_user_plan(
  p_user_id UUID,
  p_plan_type plan_type,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  old_plan plan_type;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT plan_type INTO old_plan FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE profiles
  SET plan_type = p_plan_type,
      plan_expires_at = p_expires_at
  WHERE id = p_user_id;

  INSERT INTO activity_log (user_id, event_type, metadata)
  VALUES (
    p_user_id,
    'admin_action',
    jsonb_build_object('action', 'plan_change', 'from', old_plan::text, 'to', p_plan_type::text)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
