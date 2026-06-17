-- ============================================================
-- ChefFlow — TODAS las columnas que pueden faltar
-- EJECUTA ESTE ARCHIVO en Supabase → SQL Editor
-- Cada bloque DO es independiente: si uno falla los demás siguen
-- ============================================================


-- 1. ingredientes_receta.precio_unitario_capturado
DO $$ BEGIN
  ALTER TABLE public.ingredientes_receta
    ADD COLUMN precio_unitario_capturado NUMERIC(12,4);
  RAISE NOTICE 'OK: ingredientes_receta.precio_unitario_capturado agregada';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'SKIP: ingredientes_receta.precio_unitario_capturado ya existe';
END $$;


-- 2. ingredientes_subreceta.precio_unitario_capturado
DO $$ BEGIN
  ALTER TABLE public.ingredientes_subreceta
    ADD COLUMN precio_unitario_capturado NUMERIC(12,4);
  RAISE NOTICE 'OK: ingredientes_subreceta.precio_unitario_capturado agregada';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'SKIP: ingredientes_subreceta.precio_unitario_capturado ya existe';
END $$;


-- 3. menu_recetas.sub_receta_id
DO $$ BEGIN
  ALTER TABLE public.menu_recetas
    ADD COLUMN sub_receta_id UUID
    REFERENCES public.sub_recetas(id) ON DELETE CASCADE;
  RAISE NOTICE 'OK: menu_recetas.sub_receta_id agregada';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'SKIP: menu_recetas.sub_receta_id ya existe';
END $$;


-- 4. menus.margen_minimo
DO $$ BEGIN
  ALTER TABLE public.menus
    ADD COLUMN margen_minimo NUMERIC(5,2) DEFAULT NULL;
  RAISE NOTICE 'OK: menus.margen_minimo agregada';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'SKIP: menus.margen_minimo ya existe';
END $$;


-- 5. recetas.margen_seguridad
DO $$ BEGIN
  ALTER TABLE public.recetas
    ADD COLUMN margen_seguridad NUMERIC(5,2) NOT NULL DEFAULT 0;
  RAISE NOTICE 'OK: recetas.margen_seguridad agregada';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'SKIP: recetas.margen_seguridad ya existe';
END $$;


-- 6. sub_recetas.margen_seguridad
DO $$ BEGIN
  ALTER TABLE public.sub_recetas
    ADD COLUMN margen_seguridad NUMERIC(5,2) NOT NULL DEFAULT 0;
  RAISE NOTICE 'OK: sub_recetas.margen_seguridad agregada';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'SKIP: sub_recetas.margen_seguridad ya existe';
END $$;


-- ── Verificación ─────────────────────────────────────────────
-- Debe devolver 6 filas (una por cada columna de arriba)
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'ingredientes_receta'    AND column_name = 'precio_unitario_capturado') OR
    (table_name = 'ingredientes_subreceta' AND column_name = 'precio_unitario_capturado') OR
    (table_name = 'menu_recetas'           AND column_name = 'sub_receta_id')             OR
    (table_name = 'menus'                  AND column_name = 'margen_minimo')             OR
    (table_name = 'recetas'                AND column_name = 'margen_seguridad')          OR
    (table_name = 'sub_recetas'            AND column_name = 'margen_seguridad')
  )
ORDER BY table_name, column_name;
