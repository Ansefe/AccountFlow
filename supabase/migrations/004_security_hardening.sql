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
-- 1b. SPEND CREDITS — atomic deduction for rentals
-- ============================================================

-- Users can spend their own credits (subscription first, then purchased)
CREATE OR REPLACE FUNCTION spend_credits(p_amount INTEGER, p_description TEXT DEFAULT '')
RETURNS void AS $$
DECLARE
  sub_credits INTEGER;
  pur_credits INTEGER;
  from_sub INTEGER;
  from_pur INTEGER;
BEGIN
  SELECT subscription_credits, purchased_credits
  INTO sub_credits, pur_credits
  FROM profiles WHERE id = auth.uid() FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF (sub_credits + pur_credits) < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits (have %, need %)', sub_credits + pur_credits, p_amount;
  END IF;

  -- Prefer subscription credits first
  from_sub := LEAST(sub_credits, p_amount);
  from_pur := p_amount - from_sub;

  UPDATE profiles
  SET subscription_credits = sub_credits - from_sub,
      purchased_credits = pur_credits - from_pur
  WHERE id = auth.uid();

  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, balance_type, type, description)
  VALUES (
    auth.uid(),
    -p_amount,
    CASE WHEN from_sub > 0 THEN 'subscription'::credit_balance_type ELSE 'purchased'::credit_balance_type END,
    'rental_spend',
    COALESCE(NULLIF(p_description, ''), 'Rental spend: -' || p_amount || ' credits')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
