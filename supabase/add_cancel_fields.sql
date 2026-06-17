-- Migración: campos de cancelación de suscripción
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled             BOOLEAN DEFAULT false NOT NULL;
