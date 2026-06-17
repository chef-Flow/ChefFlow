-- ============================================================
-- ChefFlow Costeo — Schema v6
-- Sub-recetas en menús: agrega sub_receta_id a menu_recetas
-- Ejecuta en Supabase → SQL Editor
-- ============================================================

-- 1. Agregar columna sub_receta_id (nullable)
ALTER TABLE public.menu_recetas
  ADD COLUMN IF NOT EXISTS sub_receta_id UUID
  REFERENCES public.sub_recetas(id) ON DELETE CASCADE;

-- 2. Constraint: exactamente uno de los dos debe estar presente
--    (solo aplica a filas nuevas; las existentes ya tienen receta_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_menu_receta_or_sub' AND conrelid = 'public.menu_recetas'::regclass
  ) THEN
    ALTER TABLE public.menu_recetas
      ADD CONSTRAINT chk_menu_receta_or_sub CHECK (
        (receta_id IS NOT NULL AND sub_receta_id IS NULL) OR
        (receta_id IS NULL     AND sub_receta_id IS NOT NULL)
      );
  END IF;
END $$;

-- 3. Índice único parcial para evitar duplicar la misma sub-receta en el mismo menú
CREATE UNIQUE INDEX IF NOT EXISTS menu_recetas_sub_receta_uniq
  ON public.menu_recetas(menu_id, sub_receta_id)
  WHERE sub_receta_id IS NOT NULL;

-- 4. Hacer receta_id nullable para que las filas de sub-receta sean válidas
ALTER TABLE public.menu_recetas
  ALTER COLUMN receta_id DROP NOT NULL;

-- 5. RLS: actualizar política de INSERT para permitir sub_receta_id
DROP POLICY IF EXISTS "mr_ins" ON public.menu_recetas;
CREATE POLICY "mr_ins" ON public.menu_recetas FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.menus WHERE id = menu_id AND user_id = auth.uid())
);
