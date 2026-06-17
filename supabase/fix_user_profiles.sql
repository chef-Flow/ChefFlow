-- ============================================================
-- ChefFlow — FIX: user_profiles (unidades + presentaciones)
-- Ejecuta en Supabase → SQL Editor
-- Idempotente: se puede correr múltiples veces sin error
-- ============================================================

-- ── 1. Agregar columnas si no existen ────────────────────────────────────────
--    (si viniste de schema_v1-v4 sin correr schema_v5 estas columnas faltan)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS unidades_personalizadas       TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS presentaciones_personalizadas TEXT[] DEFAULT '{}';

-- ── 2. Asegurar que filas existentes no tengan NULL en esos arrays ───────────
UPDATE public.user_profiles
  SET unidades_personalizadas = '{}'
  WHERE unidades_personalizadas IS NULL;

UPDATE public.user_profiles
  SET presentaciones_personalizadas = '{}'
  WHERE presentaciones_personalizadas IS NULL;

-- ── 3. Asegurar RLS habilitado ────────────────────────────────────────────────
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ── 4. Re-crear políticas (eliminar nombres posibles legacy + actuales) ───────
DROP POLICY IF EXISTS "up_sel"                  ON public.user_profiles;
DROP POLICY IF EXISTS "up_ins"                  ON public.user_profiles;
DROP POLICY IF EXISTS "up_upd"                  ON public.user_profiles;
DROP POLICY IF EXISTS "Enable read access"      ON public.user_profiles;
DROP POLICY IF EXISTS "Enable insert"           ON public.user_profiles;
DROP POLICY IF EXISTS "Enable update"           ON public.user_profiles;
DROP POLICY IF EXISTS "usuarios_ver_perfil"     ON public.user_profiles;
DROP POLICY IF EXISTS "usuarios_insertar_perfil" ON public.user_profiles;
DROP POLICY IF EXISTS "usuarios_editar_perfil"  ON public.user_profiles;

CREATE POLICY "up_sel" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- WITH CHECK explícito para que el INSERT del upsert también pase
CREATE POLICY "up_ins" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- WITH CHECK en UPDATE también: necesario para ON CONFLICT DO UPDATE con RLS
CREATE POLICY "up_upd" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── 5. Diagnóstico ────────────────────────────────────────────────────────────
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'user_profiles'
ORDER BY ordinal_position;

SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
