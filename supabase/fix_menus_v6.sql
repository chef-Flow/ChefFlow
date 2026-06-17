-- ============================================================
-- ChefFlow — FIX URGENTE: Menús + Sub-recetas en menús
-- Ejecuta en Supabase → SQL Editor
-- Es idempotente: se puede correr múltiples veces sin error
-- ============================================================

-- ── 1. Columna sub_receta_id en menu_recetas ─────────────────────────────────
ALTER TABLE public.menu_recetas
  ADD COLUMN IF NOT EXISTS sub_receta_id UUID
  REFERENCES public.sub_recetas(id) ON DELETE CASCADE;

-- ── 2. receta_id ahora es nullable (filas de sub-receta no llevan receta_id) ──
ALTER TABLE public.menu_recetas
  ALTER COLUMN receta_id DROP NOT NULL;

-- ── 3. Constraint XOR: exactamente uno de los dos debe estar presente ─────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_menu_receta_or_sub'
      AND conrelid = 'public.menu_recetas'::regclass
  ) THEN
    ALTER TABLE public.menu_recetas
      ADD CONSTRAINT chk_menu_receta_or_sub CHECK (
        (receta_id IS NOT NULL AND sub_receta_id IS NULL) OR
        (receta_id IS NULL     AND sub_receta_id IS NOT NULL)
      );
  END IF;
END $$;

-- ── 4. Índice único: no duplicar la misma sub-receta en el mismo menú ─────────
CREATE UNIQUE INDEX IF NOT EXISTS menu_recetas_sub_receta_uniq
  ON public.menu_recetas(menu_id, sub_receta_id)
  WHERE sub_receta_id IS NOT NULL;

-- ── 5. Asegurar RLS habilitado ────────────────────────────────────────────────
ALTER TABLE public.menus        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_recetas ENABLE ROW LEVEL SECURITY;

-- ── 6. Re-crear políticas RLS para menus ─────────────────────────────────────
-- Eliminar cualquier política existente (nombres actuales y legacy)
DROP POLICY IF EXISTS "menus_sel"                ON public.menus;
DROP POLICY IF EXISTS "menus_ins"                ON public.menus;
DROP POLICY IF EXISTS "menus_upd"                ON public.menus;
DROP POLICY IF EXISTS "menus_del"                ON public.menus;
DROP POLICY IF EXISTS "Enable read access"       ON public.menus;
DROP POLICY IF EXISTS "Enable insert"            ON public.menus;
DROP POLICY IF EXISTS "Enable update"            ON public.menus;
DROP POLICY IF EXISTS "Enable delete"            ON public.menus;
DROP POLICY IF EXISTS "usuarios_ver_menus"       ON public.menus;
DROP POLICY IF EXISTS "usuarios_crear_menus"     ON public.menus;
DROP POLICY IF EXISTS "usuarios_editar_menus"    ON public.menus;
DROP POLICY IF EXISTS "usuarios_borrar_menus"    ON public.menus;

CREATE POLICY "menus_sel" ON public.menus
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "menus_ins" ON public.menus
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "menus_upd" ON public.menus
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "menus_del" ON public.menus
  FOR DELETE USING (auth.uid() = user_id);

-- ── 7. Re-crear políticas RLS para menu_recetas ───────────────────────────────
DROP POLICY IF EXISTS "mr_sel"                        ON public.menu_recetas;
DROP POLICY IF EXISTS "mr_ins"                        ON public.menu_recetas;
DROP POLICY IF EXISTS "mr_upd"                        ON public.menu_recetas;
DROP POLICY IF EXISTS "mr_del"                        ON public.menu_recetas;
DROP POLICY IF EXISTS "Enable read access"            ON public.menu_recetas;
DROP POLICY IF EXISTS "Enable insert"                 ON public.menu_recetas;
DROP POLICY IF EXISTS "Enable delete"                 ON public.menu_recetas;
DROP POLICY IF EXISTS "usuarios_ver_menu_recetas"     ON public.menu_recetas;
DROP POLICY IF EXISTS "usuarios_crear_menu_recetas"   ON public.menu_recetas;
DROP POLICY IF EXISTS "usuarios_borrar_menu_recetas"  ON public.menu_recetas;

CREATE POLICY "mr_sel" ON public.menu_recetas
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.menus WHERE id = menu_id AND user_id = auth.uid())
  );

CREATE POLICY "mr_ins" ON public.menu_recetas
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.menus WHERE id = menu_id AND user_id = auth.uid())
  );

CREATE POLICY "mr_del" ON public.menu_recetas
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.menus WHERE id = menu_id AND user_id = auth.uid())
  );

-- ── 8. Diagnóstico: ver qué políticas quedaron activas ────────────────────────
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('menus', 'menu_recetas')
ORDER BY tablename, policyname;
