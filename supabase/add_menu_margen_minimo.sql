-- ============================================================
-- ChefFlow — Margen mínimo personalizado por menú
-- Ejecuta en Supabase → SQL Editor
-- Es idempotente: se puede correr múltiples veces sin error
-- ============================================================

-- NULL = usar el margen global de user_profiles
-- Valor explícito = sobreescribe el global para ese menú
ALTER TABLE public.menus
  ADD COLUMN IF NOT EXISTS margen_minimo NUMERIC(5,2) DEFAULT NULL;

-- Comentario descriptivo
COMMENT ON COLUMN public.menus.margen_minimo IS
  'Margen mínimo (%) para este menú. NULL = usar el valor global de user_profiles.margen_minimo';
