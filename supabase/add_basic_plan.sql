-- Migración: agregar plan 'basic' al CHECK constraint de user_profiles
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_plan_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_plan_check CHECK (plan IN ('free', 'basic', 'pro'));
