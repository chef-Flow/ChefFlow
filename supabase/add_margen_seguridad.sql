-- ============================================================
-- ChefFlow — Margen de seguridad por receta y sub-receta
-- Ejecuta en Supabase → SQL Editor
-- Es idempotente: se puede correr múltiples veces sin error
-- ============================================================

-- Recetas: margen de seguridad para ajustar el costo al calcular el precio sugerido
ALTER TABLE public.recetas
  ADD COLUMN IF NOT EXISTS margen_seguridad NUMERIC(5,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.recetas.margen_seguridad IS
  'Margen de seguridad (%) aplicado al costo para calcular el precio sugerido. '
  'costo_ajustado = costo_real × (1 + margen_seguridad / 100)';

-- Sub-recetas: margen de seguridad para mostrar el costo ajustado
ALTER TABLE public.sub_recetas
  ADD COLUMN IF NOT EXISTS margen_seguridad NUMERIC(5,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.sub_recetas.margen_seguridad IS
  'Margen de seguridad (%) aplicado al costo total de la sub-receta.';
