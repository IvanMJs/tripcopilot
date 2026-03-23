-- Migration 011: Set specific users to premium plan
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

UPDATE user_profiles
SET plan = 'premium', updated_at = now()
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'ivanmeyer1991@gmail.com',
    'micaela.brarda@gmail.com'
  )
);
