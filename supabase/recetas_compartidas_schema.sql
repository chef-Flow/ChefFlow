-- ── recetas_compartidas: compartición directa de recetas y sub-recetas ─────────
CREATE TABLE IF NOT EXISTS public.recetas_compartidas (
  id                    uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receta_id             uuid REFERENCES public.recetas(id) ON DELETE CASCADE,
  sub_receta_id         uuid REFERENCES public.sub_recetas(id) ON DELETE CASCADE,
  propietario_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receptor_email        text NOT NULL,
  receptor_user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  token                 uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  estado                text NOT NULL DEFAULT 'pendiente'
                          CHECK (estado IN ('pendiente', 'activo', 'revocado')),
  puede_ver_precios     boolean NOT NULL DEFAULT false,
  puede_ver_proveedores boolean NOT NULL DEFAULT false,
  vista                 boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_receta_or_sub CHECK (
    (receta_id IS NOT NULL AND sub_receta_id IS NULL) OR
    (receta_id IS NULL AND sub_receta_id IS NOT NULL)
  )
);

-- Índices únicos parciales (evitan duplicar el mismo share)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rc_receta_email
  ON public.recetas_compartidas (receta_id, receptor_email)
  WHERE receta_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rc_sub_receta_email
  ON public.recetas_compartidas (sub_receta_id, receptor_email)
  WHERE sub_receta_id IS NOT NULL;

-- ── contactos_compartir: directorio de contactos previos ──────────────────────
CREATE TABLE IF NOT EXISTS public.contactos_compartir (
  id             uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  propietario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text NOT NULL,
  nombre         text,
  last_shared_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (propietario_id, email)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.recetas_compartidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contactos_compartir  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rc_propietario_all" ON public.recetas_compartidas;
CREATE POLICY "rc_propietario_all" ON public.recetas_compartidas
  USING (propietario_id = auth.uid());

DROP POLICY IF EXISTS "rc_receptor_sel" ON public.recetas_compartidas;
CREATE POLICY "rc_receptor_sel" ON public.recetas_compartidas
  FOR SELECT
  USING (receptor_user_id = auth.uid() AND estado = 'activo');

DROP POLICY IF EXISTS "rc_receptor_upd_vista" ON public.recetas_compartidas;
CREATE POLICY "rc_receptor_upd_vista" ON public.recetas_compartidas
  FOR UPDATE
  USING  (receptor_user_id = auth.uid() AND estado = 'activo')
  WITH CHECK (receptor_user_id = auth.uid() AND estado = 'activo');

DROP POLICY IF EXISTS "cc_propietario_all" ON public.contactos_compartir;
CREATE POLICY "cc_propietario_all" ON public.contactos_compartir
  USING (propietario_id = auth.uid());
