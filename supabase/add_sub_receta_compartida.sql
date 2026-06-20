-- Migración: agregar soporte de sub-recetas a recetas_compartidas
-- Ejecutar solo si la tabla ya fue creada con el schema anterior.

ALTER TABLE public.recetas_compartidas
  ALTER COLUMN receta_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS sub_receta_id uuid
    REFERENCES public.sub_recetas(id) ON DELETE CASCADE;

ALTER TABLE public.recetas_compartidas
  ADD CONSTRAINT IF NOT EXISTS chk_receta_or_sub CHECK (
    (receta_id IS NOT NULL AND sub_receta_id IS NULL) OR
    (receta_id IS NULL AND sub_receta_id IS NOT NULL)
  );

-- Reemplazar el UNIQUE (receta_id, receptor_email) por índices parciales
ALTER TABLE public.recetas_compartidas
  DROP CONSTRAINT IF EXISTS recetas_compartidas_receta_id_receptor_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rc_receta_email
  ON public.recetas_compartidas (receta_id, receptor_email)
  WHERE receta_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rc_sub_receta_email
  ON public.recetas_compartidas (sub_receta_id, receptor_email)
  WHERE sub_receta_id IS NOT NULL;
