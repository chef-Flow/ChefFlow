-- =============================================
-- ChefFlow Costeo — Schema v4
-- Ejecutar DESPUÉS de schema_v3.sql
-- =============================================

-- ─── 1. Columna foto_url en recetas ──────────────────────────────────────────
ALTER TABLE public.recetas
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- ─── 2. Bucket de Storage para fotos de recetas ──────────────────────────────
-- (Ejecutar en el SQL Editor de Supabase)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recetas-fotos',
  'recetas-fotos',
  true,
  5242880,          -- 5 MB máximo por foto
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ─── 3. RLS para el bucket ───────────────────────────────────────────────────

-- Lectura pública (las fotos son accesibles sin auth para mostrarlas)
CREATE POLICY "recetas_fotos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recetas-fotos');

-- Solo el dueño puede subir (carpeta = user_id)
CREATE POLICY "recetas_fotos_user_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recetas-fotos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Solo el dueño puede actualizar (reemplazar foto)
CREATE POLICY "recetas_fotos_user_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'recetas-fotos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Solo el dueño puede eliminar
CREATE POLICY "recetas_fotos_user_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recetas-fotos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
