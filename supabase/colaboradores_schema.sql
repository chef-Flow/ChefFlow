-- ============================================================
-- ChefFlow: Colaboradores — Tablas + RLS
-- Ejecutar en el SQL Editor de Supabase (una sola vez)
-- ============================================================

-- ─── TABLAS ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.colaboradores (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  propietario_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  colaborador_user_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  email               TEXT        NOT NULL,
  estado              TEXT        DEFAULT 'pendiente' NOT NULL
                                  CHECK (estado IN ('pendiente', 'activo', 'revocado')),
  token               TEXT        UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(propietario_id, email)
);

CREATE TABLE IF NOT EXISTS public.colaborador_menus (
  id                    UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id        UUID    REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  menu_id               UUID    REFERENCES public.menus(id) ON DELETE CASCADE NOT NULL,
  puede_ver_recetas     BOOLEAN DEFAULT true  NOT NULL,
  puede_ver_precios     BOOLEAN DEFAULT false NOT NULL,
  puede_ver_proveedores BOOLEAN DEFAULT false NOT NULL,
  puede_editar          BOOLEAN DEFAULT false NOT NULL,
  UNIQUE(colaborador_id, menu_id)
);

-- ─── HABILITAR RLS ───────────────────────────────────────────────────────────

ALTER TABLE public.colaboradores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_menus ENABLE ROW LEVEL SECURITY;

-- ─── RLS: colaboradores ───────────────────────────────────────────────────────

-- El dueño administra sus propios registros
DROP POLICY IF EXISTS "owners_manage_colaboradores" ON public.colaboradores;
CREATE POLICY "owners_manage_colaboradores" ON public.colaboradores
  FOR ALL USING (propietario_id = auth.uid());

-- El colaborador puede leer su propia invitación (ya vinculada)
DROP POLICY IF EXISTS "colaboradores_read_own" ON public.colaboradores;
CREATE POLICY "colaboradores_read_own" ON public.colaboradores
  FOR SELECT USING (colaborador_user_id = auth.uid());

-- El colaborador puede aceptar su invitación pendiente (vincula su user_id)
DROP POLICY IF EXISTS "colaboradores_accept_pending" ON public.colaboradores;
CREATE POLICY "colaboradores_accept_pending" ON public.colaboradores
  FOR UPDATE
  USING (
    estado = 'pendiente'
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    colaborador_user_id = auth.uid()
    AND estado = 'activo'
  );

-- ─── RLS: colaborador_menus ───────────────────────────────────────────────────

-- El dueño administra los permisos de sus colaboradores
DROP POLICY IF EXISTS "owners_manage_colaborador_menus" ON public.colaborador_menus;
CREATE POLICY "owners_manage_colaborador_menus" ON public.colaborador_menus
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = colaborador_menus.colaborador_id
        AND c.propietario_id = auth.uid()
    )
  );

-- El colaborador puede leer sus propios permisos
DROP POLICY IF EXISTS "colaboradores_read_own_perms" ON public.colaborador_menus;
CREATE POLICY "colaboradores_read_own_perms" ON public.colaborador_menus
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = colaborador_menus.colaborador_id
        AND c.colaborador_user_id = auth.uid()
        AND c.estado = 'activo'
    )
  );

-- ─── RLS: menus (acceso de colaborador) ──────────────────────────────────────

DROP POLICY IF EXISTS "colaboradores_read_shared_menus" ON public.menus;
CREATE POLICY "colaboradores_read_shared_menus" ON public.menus
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      JOIN public.colaborador_menus cm
        ON cm.colaborador_id = c.id AND cm.menu_id = menus.id
      WHERE c.colaborador_user_id = auth.uid()
        AND c.estado = 'activo'
    )
  );

-- ─── RLS: menu_recetas (acceso de colaborador) ───────────────────────────────

DROP POLICY IF EXISTS "colaboradores_read_shared_menu_recetas" ON public.menu_recetas;
CREATE POLICY "colaboradores_read_shared_menu_recetas" ON public.menu_recetas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      JOIN public.colaborador_menus cm
        ON cm.colaborador_id = c.id AND cm.menu_id = menu_recetas.menu_id
      WHERE c.colaborador_user_id = auth.uid()
        AND c.estado = 'activo'
        AND cm.puede_ver_recetas = true
    )
  );

-- ─── RLS: recetas (acceso de colaborador) ────────────────────────────────────

-- Lectura si puede_ver_recetas
DROP POLICY IF EXISTS "colaboradores_read_shared_recetas" ON public.recetas;
CREATE POLICY "colaboradores_read_shared_recetas" ON public.recetas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      JOIN public.colaborador_menus cm ON cm.colaborador_id = c.id
      JOIN public.menu_recetas mr
        ON mr.receta_id = recetas.id AND mr.menu_id = cm.menu_id
      WHERE c.colaborador_user_id = auth.uid()
        AND c.estado = 'activo'
        AND cm.puede_ver_recetas = true
    )
  );

-- Edición si puede_editar (solo UPDATE, no INSERT/DELETE)
DROP POLICY IF EXISTS "colaboradores_update_shared_recetas" ON public.recetas;
CREATE POLICY "colaboradores_update_shared_recetas" ON public.recetas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      JOIN public.colaborador_menus cm ON cm.colaborador_id = c.id
      JOIN public.menu_recetas mr
        ON mr.receta_id = recetas.id AND mr.menu_id = cm.menu_id
      WHERE c.colaborador_user_id = auth.uid()
        AND c.estado = 'activo'
        AND cm.puede_editar = true
    )
  );

-- ─── RLS: ingredientes_receta (acceso de colaborador) ────────────────────────

DROP POLICY IF EXISTS "colaboradores_read_shared_ingredientes_receta" ON public.ingredientes_receta;
CREATE POLICY "colaboradores_read_shared_ingredientes_receta" ON public.ingredientes_receta
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      JOIN public.colaborador_menus cm ON cm.colaborador_id = c.id
      JOIN public.menu_recetas mr
        ON mr.receta_id = ingredientes_receta.receta_id AND mr.menu_id = cm.menu_id
      WHERE c.colaborador_user_id = auth.uid()
        AND c.estado = 'activo'
        AND cm.puede_ver_recetas = true
    )
  );

-- ─── ÍNDICES (performance de RLS) ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_colaboradores_user_id_activo
  ON public.colaboradores(colaborador_user_id) WHERE estado = 'activo';

CREATE INDEX IF NOT EXISTS idx_colaboradores_email_pendiente
  ON public.colaboradores(email) WHERE estado = 'pendiente';

CREATE INDEX IF NOT EXISTS idx_colaborador_menus_colaborador
  ON public.colaborador_menus(colaborador_id);

CREATE INDEX IF NOT EXISTS idx_colaborador_menus_menu
  ON public.colaborador_menus(menu_id);
