-- =============================================
-- ChefFlow Costeo — Schema v3
-- Ejecutar DESPUÉS de schema.sql + schema_additions.sql
-- =============================================

-- ─── TABLAS NUEVAS ────────────────────────────────────────────────────────────

-- Menús (carpetas de recetas)
CREATE TABLE IF NOT EXISTS public.menus (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre      TEXT          NOT NULL,
  descripcion TEXT,
  color       TEXT          DEFAULT '#f97316',
  orden       INTEGER       DEFAULT 0,
  created_at  TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ   DEFAULT NOW() NOT NULL
);

-- Relación muchos-a-muchos: menús ↔ recetas
CREATE TABLE IF NOT EXISTS public.menu_recetas (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id    UUID        REFERENCES public.menus(id)   ON DELETE CASCADE NOT NULL,
  receta_id  UUID        REFERENCES public.recetas(id) ON DELETE CASCADE NOT NULL,
  orden      INTEGER     DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(menu_id, receta_id)
);

-- Proveedores
CREATE TABLE IF NOT EXISTS public.proveedores (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre     TEXT        NOT NULL,
  contacto   TEXT,
  telefono   TEXT,
  email      TEXT,
  notas      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Plataformas de delivery por usuario
CREATE TABLE IF NOT EXISTS public.plataformas_delivery (
  id                  UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID           REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre              TEXT           NOT NULL,
  comision_porcentaje NUMERIC(5,2)   NOT NULL DEFAULT 0
                      CHECK (comision_porcentaje >= 0 AND comision_porcentaje <= 100),
  activa              BOOLEAN        DEFAULT true NOT NULL,
  created_at          TIMESTAMPTZ    DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMPTZ    DEFAULT NOW() NOT NULL
);

-- Colaboradores (invitados)
CREATE TABLE IF NOT EXISTS public.colaboradores (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  propietario_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  colaborador_user_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  email                TEXT        NOT NULL,
  estado               TEXT        DEFAULT 'pendiente' NOT NULL
                       CHECK (estado IN ('pendiente', 'activo', 'revocado')),
  token                TEXT        UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(propietario_id, email)
);

-- Permisos por menú por colaborador
CREATE TABLE IF NOT EXISTS public.colaborador_menus (
  id                    UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id        UUID    REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  menu_id               UUID    REFERENCES public.menus(id)         ON DELETE CASCADE NOT NULL,
  puede_ver_recetas     BOOLEAN DEFAULT true  NOT NULL,
  puede_ver_precios     BOOLEAN DEFAULT false NOT NULL,
  puede_ver_proveedores BOOLEAN DEFAULT false NOT NULL,
  puede_editar          BOOLEAN DEFAULT false NOT NULL,
  UNIQUE(colaborador_id, menu_id)
);

-- ─── MODIFICACIONES A TABLAS EXISTENTES ──────────────────────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS comision_bancaria NUMERIC(5,2) DEFAULT 0 NOT NULL
  CHECK (comision_bancaria >= 0 AND comision_bancaria <= 100);

ALTER TABLE public.recetas
  ADD COLUMN IF NOT EXISTS plataforma_delivery_id UUID
  REFERENCES public.plataformas_delivery(id) ON DELETE SET NULL;

ALTER TABLE public.ingredientes_receta
  ADD COLUMN IF NOT EXISTS precio_unitario_capturado NUMERIC(12,4);

ALTER TABLE public.ingredientes_subreceta
  ADD COLUMN IF NOT EXISTS precio_unitario_capturado NUMERIC(12,4);

ALTER TABLE public.ingredientes
  ADD COLUMN IF NOT EXISTS proveedor_id UUID
  REFERENCES public.proveedores(id) ON DELETE SET NULL;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.menus              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_recetas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plataformas_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_menus  ENABLE ROW LEVEL SECURITY;

-- menus
CREATE POLICY "menus_sel" ON public.menus FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "menus_ins" ON public.menus FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "menus_upd" ON public.menus FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "menus_del" ON public.menus FOR DELETE USING (auth.uid() = user_id);

-- menu_recetas (acceso via ownership del menú)
CREATE POLICY "menu_rec_sel" ON public.menu_recetas FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.menus WHERE id = menu_id AND user_id = auth.uid()));
CREATE POLICY "menu_rec_ins" ON public.menu_recetas FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.menus WHERE id = menu_id AND user_id = auth.uid()));
CREATE POLICY "menu_rec_del" ON public.menu_recetas FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.menus WHERE id = menu_id AND user_id = auth.uid()));

-- proveedores
CREATE POLICY "prov_sel" ON public.proveedores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "prov_ins" ON public.proveedores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prov_upd" ON public.proveedores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "prov_del" ON public.proveedores FOR DELETE USING (auth.uid() = user_id);

-- plataformas_delivery
CREATE POLICY "plat_sel" ON public.plataformas_delivery FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plat_ins" ON public.plataformas_delivery FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plat_upd" ON public.plataformas_delivery FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "plat_del" ON public.plataformas_delivery FOR DELETE USING (auth.uid() = user_id);

-- colaboradores
CREATE POLICY "colab_sel" ON public.colaboradores FOR SELECT USING (auth.uid() = propietario_id);
CREATE POLICY "colab_ins" ON public.colaboradores FOR INSERT WITH CHECK (auth.uid() = propietario_id);
CREATE POLICY "colab_upd" ON public.colaboradores FOR UPDATE USING (auth.uid() = propietario_id);
CREATE POLICY "colab_del" ON public.colaboradores FOR DELETE USING (auth.uid() = propietario_id);

-- colaborador_menus (acceso via propietario del colaborador)
CREATE POLICY "cm_sel" ON public.colaborador_menus FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = colaborador_id AND c.propietario_id = auth.uid()));
CREATE POLICY "cm_ins" ON public.colaborador_menus FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = colaborador_id AND c.propietario_id = auth.uid()));
CREATE POLICY "cm_upd" ON public.colaborador_menus FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = colaborador_id AND c.propietario_id = auth.uid()));
CREATE POLICY "cm_del" ON public.colaborador_menus FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = colaborador_id AND c.propietario_id = auth.uid()));

-- ─── TRIGGERS updated_at ──────────────────────────────────────────────────────

CREATE TRIGGER trg_menus_upd
  BEFORE UPDATE ON public.menus FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_proveedores_upd
  BEFORE UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_plataformas_upd
  BEFORE UPDATE ON public.plataformas_delivery FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── ÍNDICES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_menus_user      ON public.menus(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_rec_menu   ON public.menu_recetas(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_rec_receta ON public.menu_recetas(receta_id);
CREATE INDEX IF NOT EXISTS idx_prov_user       ON public.proveedores(user_id);
CREATE INDEX IF NOT EXISTS idx_plat_user       ON public.plataformas_delivery(user_id);
CREATE INDEX IF NOT EXISTS idx_colab_prop      ON public.colaboradores(propietario_id);
