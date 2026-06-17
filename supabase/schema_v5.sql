-- ChefFlow Costeo — Schema v5
-- Adds custom units and presentation types per user

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS unidades_personalizadas TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS presentaciones_personalizadas TEXT[] DEFAULT '{}';
