-- Agregar columnas de Stripe a user_profiles
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer
  ON public.user_profiles(stripe_customer_id);
