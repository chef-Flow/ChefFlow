-- ============================================================
-- ChefFlow Costeo — Script SQL COMPLETO
-- Ejecuta todo esto en Supabase → SQL Editor
-- (Es seguro correrlo varias veces: usa IF NOT EXISTS / ON CONFLICT)
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 1. FUNCIÓN UTILITARIA (updated_at automático)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ════════════════════════════════════════════════════════════
-- 2. TABLAS BASE
-- ════════════════════════════════════════════════════════════

-- Ingredientes
CREATE TABLE IF NOT EXISTS public.ingredientes (
  id                    UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID           REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre                TEXT           NOT NULL,
  marca                 TEXT,
  unidad_presentacion   TEXT           NOT NULL,
  cantidad_presentacion NUMERIC(12,4)  NOT NULL CHECK (cantidad_presentacion > 0),
  unidad_medida         TEXT           NOT NULL,
  clasificacion         TEXT           NOT NULL,
  proveedor             TEXT,
  proveedor_id          UUID,
  precio_compra         NUMERIC(12,2)  NOT NULL CHECK (precio_compra >= 0),
  created_at            TIMESTAMPTZ    DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ    DEFAULT NOW() NOT NULL
);

-- Sub-recetas
CREATE TABLE IF NOT EXISTS public.sub_recetas (
  id                 UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID           REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre             TEXT           NOT NULL,
  rendimiento        NUMERIC(12,4)  NOT NULL CHECK (rendimiento > 0),
  unidad_rendimiento TEXT           NOT NULL,
  costo_total        NUMERIC(12,2)  DEFAULT 0 NOT NULL,
  created_at         TIMESTAMPTZ    DEFAULT NOW() NOT NULL,
  updated_at         TIMESTAMPTZ    DEFAULT NOW() NOT NULL
);

-- Ingredientes de sub-receta
CREATE TABLE IF NOT EXISTS public.ingredientes_subreceta (
  id                        UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_receta_id             UUID           REFERENCES public.sub_recetas(id)   ON DELETE CASCADE NOT NULL,
  ingrediente_id            UUID           REFERENCES public.ingredientes(id)  ON DELETE RESTRICT NOT NULL,
  cantidad_neta             NUMERIC(12,4)  NOT NULL CHECK (cantidad_neta > 0),
  peso_merma                NUMERIC(12,4)  DEFAULT 0 NOT NULL,
  porcentaje_merma          NUMERIC(5,2)   DEFAULT 0 NOT NULL CHECK (porcentaje_merma >= 0 AND porcentaje_merma < 100),
  cantidad_bruta            NUMERIC(12,4)  NOT NULL,
  costo                     NUMERIC(12,4)  DEFAULT 0 NOT NULL,
  precio_unitario_capturado NUMERIC(12,4),
  created_at                TIMESTAMPTZ    DEFAULT NOW() NOT NULL
);

-- Recetas
CREATE TABLE IF NOT EXISTS public.recetas (
  id                     UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID           REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre                 TEXT           NOT NULL,
  porciones              INTEGER        NOT NULL DEFAULT 1 CHECK (porciones > 0),
  costo_total            NUMERIC(12,2)  DEFAULT 0 NOT NULL,
  costo_por_porcion      NUMERIC(12,4)  DEFAULT 0 NOT NULL,
  precio_venta           NUMERIC(12,2),
  plataforma_delivery_id UUID,
  foto_url               TEXT,
  created_at             TIMESTAMPTZ    DEFAULT NOW() NOT NULL,
  updated_at             TIMESTAMPTZ    DEFAULT NOW() NOT NULL
);

-- Ingredientes de receta
CREATE TABLE IF NOT EXISTS public.ingredientes_receta (
  id                        UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  receta_id                 UUID           REFERENCES public.recetas(id)      ON DELETE CASCADE NOT NULL,
  ingrediente_id            UUID           REFERENCES public.ingredientes(id) ON DELETE RESTRICT,
  sub_receta_id             UUID           REFERENCES public.sub_recetas(id)  ON DELETE RESTRICT,
  cantidad_neta             NUMERIC(12,4)  NOT NULL CHECK (cantidad_neta > 0),
  peso_merma                NUMERIC(12,4)  DEFAULT 0 NOT NULL,
  porcentaje_merma          NUMERIC(5,2)   DEFAULT 0 NOT NULL CHECK (porcentaje_merma >= 0 AND porcentaje_merma < 100),
  cantidad_bruta            NUMERIC(12,4)  NOT NULL,
  costo                     NUMERIC(12,4)  DEFAULT 0 NOT NULL,
  precio_unitario_capturado NUMERIC(12,4),
  created_at                TIMESTAMPTZ    DEFAULT NOW() NOT NULL,
  CONSTRAINT chk_ingrediente_or_subreceta CHECK (
    (ingrediente_id IS NOT NULL AND sub_receta_id IS NULL) OR
    (ingrediente_id IS NULL     AND sub_receta_id IS NOT NULL)
  )
);


-- ════════════════════════════════════════════════════════════
-- 3. PERFILES DE USUARIO
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id                            UUID          REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  plan                          TEXT          NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro')),
  iva_porcentaje                NUMERIC(5,2)  DEFAULT 16  NOT NULL CHECK (iva_porcentaje  >= 0 AND iva_porcentaje  <= 100),
  margen_minimo                 NUMERIC(5,2)  DEFAULT 65  NOT NULL CHECK (margen_minimo   >= 0 AND margen_minimo   <= 100),
  comision_bancaria             NUMERIC(5,2)  DEFAULT 0   NOT NULL CHECK (comision_bancaria >= 0 AND comision_bancaria <= 100),
  unidades_personalizadas       TEXT[]        DEFAULT '{}',
  presentaciones_personalizadas TEXT[]        DEFAULT '{}',
  created_at                    TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
  updated_at                    TIMESTAMPTZ   DEFAULT NOW() NOT NULL
);

-- Trigger: crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ════════════════════════════════════════════════════════════
-- 4. MÓDULOS V3 (Menús, Proveedores, Delivery, Colaboradores)
-- ════════════════════════════════════════════════════════════

-- Menús
CREATE TABLE IF NOT EXISTS public.menus (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre      TEXT        NOT NULL,
  descripcion TEXT,
  color       TEXT        DEFAULT '#f97316',
  orden       INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Menú ↔ Receta (muchos a muchos)
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

-- Plataformas de delivery
CREATE TABLE IF NOT EXISTS public.plataformas_delivery (
  id                  UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre              TEXT          NOT NULL,
  comision_porcentaje NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (comision_porcentaje >= 0 AND comision_porcentaje <= 100),
  activa              BOOLEAN       DEFAULT true NOT NULL,
  created_at          TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMPTZ   DEFAULT NOW() NOT NULL
);

-- Colaboradores
CREATE TABLE IF NOT EXISTS public.colaboradores (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  propietario_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  colaborador_user_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  email               TEXT        NOT NULL,
  estado              TEXT        DEFAULT 'pendiente' NOT NULL CHECK (estado IN ('pendiente','activo','revocado')),
  token               TEXT        UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(propietario_id, email)
);

-- Permisos colaborador ↔ menú
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


-- ════════════════════════════════════════════════════════════
-- 5. FOREIGN KEYS QUE DEPENDEN DEL ORDEN DE CREACIÓN
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.ingredientes
  ADD COLUMN IF NOT EXISTS proveedor_id UUID
  REFERENCES public.proveedores(id) ON DELETE SET NULL;

ALTER TABLE public.recetas
  ADD COLUMN IF NOT EXISTS plataforma_delivery_id UUID
  REFERENCES public.plataformas_delivery(id) ON DELETE SET NULL;


-- ════════════════════════════════════════════════════════════
-- 6. STORAGE — Bucket para fotos de recetas
-- ════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recetas-fotos', 'recetas-fotos', true,
  5242880,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;


-- ════════════════════════════════════════════════════════════
-- 7. ROW LEVEL SECURITY — habilitar en todas las tablas
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.ingredientes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_recetas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredientes_subreceta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredientes_receta    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_recetas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plataformas_delivery   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_menus      ENABLE ROW LEVEL SECURITY;


-- ════════════════════════════════════════════════════════════
-- 8. POLÍTICAS RLS — primero DROP, luego CREATE
-- ════════════════════════════════════════════════════════════

-- Storage
DROP POLICY IF EXISTS "recetas_fotos_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "recetas_fotos_user_insert"  ON storage.objects;
DROP POLICY IF EXISTS "recetas_fotos_user_update"  ON storage.objects;
DROP POLICY IF EXISTS "recetas_fotos_user_delete"  ON storage.objects;

-- ingredientes
DROP POLICY IF EXISTS "ing_sel" ON public.ingredientes;
DROP POLICY IF EXISTS "ing_ins" ON public.ingredientes;
DROP POLICY IF EXISTS "ing_upd" ON public.ingredientes;
DROP POLICY IF EXISTS "ing_del" ON public.ingredientes;

-- sub_recetas
DROP POLICY IF EXISTS "sr_sel" ON public.sub_recetas;
DROP POLICY IF EXISTS "sr_ins" ON public.sub_recetas;
DROP POLICY IF EXISTS "sr_upd" ON public.sub_recetas;
DROP POLICY IF EXISTS "sr_del" ON public.sub_recetas;

-- ingredientes_subreceta
DROP POLICY IF EXISTS "isr_sel" ON public.ingredientes_subreceta;
DROP POLICY IF EXISTS "isr_ins" ON public.ingredientes_subreceta;
DROP POLICY IF EXISTS "isr_upd" ON public.ingredientes_subreceta;
DROP POLICY IF EXISTS "isr_del" ON public.ingredientes_subreceta;

-- recetas
DROP POLICY IF EXISTS "rec_sel" ON public.recetas;
DROP POLICY IF EXISTS "rec_ins" ON public.recetas;
DROP POLICY IF EXISTS "rec_upd" ON public.recetas;
DROP POLICY IF EXISTS "rec_del" ON public.recetas;

-- ingredientes_receta
DROP POLICY IF EXISTS "ir_sel" ON public.ingredientes_receta;
DROP POLICY IF EXISTS "ir_ins" ON public.ingredientes_receta;
DROP POLICY IF EXISTS "ir_upd" ON public.ingredientes_receta;
DROP POLICY IF EXISTS "ir_del" ON public.ingredientes_receta;

-- user_profiles
DROP POLICY IF EXISTS "up_sel" ON public.user_profiles;
DROP POLICY IF EXISTS "up_ins" ON public.user_profiles;
DROP POLICY IF EXISTS "up_upd" ON public.user_profiles;

-- menus
DROP POLICY IF EXISTS "menus_sel" ON public.menus;
DROP POLICY IF EXISTS "menus_ins" ON public.menus;
DROP POLICY IF EXISTS "menus_upd" ON public.menus;
DROP POLICY IF EXISTS "menus_del" ON public.menus;

-- menu_recetas
DROP POLICY IF EXISTS "mr_sel" ON public.menu_recetas;
DROP POLICY IF EXISTS "mr_ins" ON public.menu_recetas;
DROP POLICY IF EXISTS "mr_del" ON public.menu_recetas;

-- proveedores
DROP POLICY IF EXISTS "prov_sel" ON public.proveedores;
DROP POLICY IF EXISTS "prov_ins" ON public.proveedores;
DROP POLICY IF EXISTS "prov_upd" ON public.proveedores;
DROP POLICY IF EXISTS "prov_del" ON public.proveedores;

-- plataformas_delivery
DROP POLICY IF EXISTS "plat_sel" ON public.plataformas_delivery;
DROP POLICY IF EXISTS "plat_ins" ON public.plataformas_delivery;
DROP POLICY IF EXISTS "plat_upd" ON public.plataformas_delivery;
DROP POLICY IF EXISTS "plat_del" ON public.plataformas_delivery;

-- colaboradores
DROP POLICY IF EXISTS "colab_sel" ON public.colaboradores;
DROP POLICY IF EXISTS "colab_ins" ON public.colaboradores;
DROP POLICY IF EXISTS "colab_upd" ON public.colaboradores;
DROP POLICY IF EXISTS "colab_del" ON public.colaboradores;

-- colaborador_menus
DROP POLICY IF EXISTS "cm_sel" ON public.colaborador_menus;
DROP POLICY IF EXISTS "cm_ins" ON public.colaborador_menus;
DROP POLICY IF EXISTS "cm_upd" ON public.colaborador_menus;
DROP POLICY IF EXISTS "cm_del" ON public.colaborador_menus;

-- Nombres legacy (scripts anteriores)
DROP POLICY IF EXISTS "usuarios_ver_ingredientes"     ON public.ingredientes;
DROP POLICY IF EXISTS "usuarios_crear_ingredientes"   ON public.ingredientes;
DROP POLICY IF EXISTS "usuarios_editar_ingredientes"  ON public.ingredientes;
DROP POLICY IF EXISTS "usuarios_borrar_ingredientes"  ON public.ingredientes;
DROP POLICY IF EXISTS "usuarios_ver_sub_recetas"      ON public.sub_recetas;
DROP POLICY IF EXISTS "usuarios_crear_sub_recetas"    ON public.sub_recetas;
DROP POLICY IF EXISTS "usuarios_editar_sub_recetas"   ON public.sub_recetas;
DROP POLICY IF EXISTS "usuarios_borrar_sub_recetas"   ON public.sub_recetas;
DROP POLICY IF EXISTS "usuarios_ver_ing_subreceta"    ON public.ingredientes_subreceta;
DROP POLICY IF EXISTS "usuarios_crear_ing_subreceta"  ON public.ingredientes_subreceta;
DROP POLICY IF EXISTS "usuarios_editar_ing_subreceta" ON public.ingredientes_subreceta;
DROP POLICY IF EXISTS "usuarios_borrar_ing_subreceta" ON public.ingredientes_subreceta;
DROP POLICY IF EXISTS "usuarios_ver_recetas"          ON public.recetas;
DROP POLICY IF EXISTS "usuarios_crear_recetas"        ON public.recetas;
DROP POLICY IF EXISTS "usuarios_editar_recetas"       ON public.recetas;
DROP POLICY IF EXISTS "usuarios_borrar_recetas"       ON public.recetas;
DROP POLICY IF EXISTS "usuarios_ver_ing_receta"       ON public.ingredientes_receta;
DROP POLICY IF EXISTS "usuarios_crear_ing_receta"     ON public.ingredientes_receta;
DROP POLICY IF EXISTS "usuarios_editar_ing_receta"    ON public.ingredientes_receta;
DROP POLICY IF EXISTS "usuarios_borrar_ing_receta"    ON public.ingredientes_receta;
DROP POLICY IF EXISTS "usuarios_ver_perfil"           ON public.user_profiles;
DROP POLICY IF EXISTS "usuarios_insertar_perfil"      ON public.user_profiles;
DROP POLICY IF EXISTS "usuarios_editar_perfil"        ON public.user_profiles;
DROP POLICY IF EXISTS "recetas_fotos_public_read"     ON storage.objects;
DROP POLICY IF EXISTS "recetas_fotos_user_insert"     ON storage.objects;
DROP POLICY IF EXISTS "recetas_fotos_user_update"     ON storage.objects;
DROP POLICY IF EXISTS "recetas_fotos_user_delete"     ON storage.objects;

-- ── CREATE policies ───────────────────────────────────────────

-- Storage: fotos de recetas
CREATE POLICY "recetas_fotos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'recetas-fotos');

CREATE POLICY "recetas_fotos_user_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'recetas-fotos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "recetas_fotos_user_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'recetas-fotos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "recetas_fotos_user_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'recetas-fotos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ingredientes
CREATE POLICY "ing_sel" ON public.ingredientes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ing_ins" ON public.ingredientes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ing_upd" ON public.ingredientes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ing_del" ON public.ingredientes FOR DELETE USING (auth.uid() = user_id);

-- sub_recetas
CREATE POLICY "sr_sel" ON public.sub_recetas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sr_ins" ON public.sub_recetas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sr_upd" ON public.sub_recetas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sr_del" ON public.sub_recetas FOR DELETE USING (auth.uid() = user_id);

-- ingredientes_subreceta
CREATE POLICY "isr_sel" ON public.ingredientes_subreceta FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sub_recetas WHERE id = sub_receta_id AND user_id = auth.uid()));
CREATE POLICY "isr_ins" ON public.ingredientes_subreceta FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.sub_recetas WHERE id = sub_receta_id AND user_id = auth.uid()));
CREATE POLICY "isr_upd" ON public.ingredientes_subreceta FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.sub_recetas WHERE id = sub_receta_id AND user_id = auth.uid()));
CREATE POLICY "isr_del" ON public.ingredientes_subreceta FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.sub_recetas WHERE id = sub_receta_id AND user_id = auth.uid()));

-- recetas
CREATE POLICY "rec_sel" ON public.recetas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rec_ins" ON public.recetas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rec_upd" ON public.recetas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rec_del" ON public.recetas FOR DELETE USING (auth.uid() = user_id);

-- ingredientes_receta
CREATE POLICY "ir_sel" ON public.ingredientes_receta FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.recetas WHERE id = receta_id AND user_id = auth.uid()));
CREATE POLICY "ir_ins" ON public.ingredientes_receta FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.recetas WHERE id = receta_id AND user_id = auth.uid()));
CREATE POLICY "ir_upd" ON public.ingredientes_receta FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.recetas WHERE id = receta_id AND user_id = auth.uid()));
CREATE POLICY "ir_del" ON public.ingredientes_receta FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.recetas WHERE id = receta_id AND user_id = auth.uid()));

-- user_profiles
CREATE POLICY "up_sel" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "up_ins" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "up_upd" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- menus
CREATE POLICY "menus_sel" ON public.menus FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "menus_ins" ON public.menus FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "menus_upd" ON public.menus FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "menus_del" ON public.menus FOR DELETE USING (auth.uid() = user_id);

-- menu_recetas
CREATE POLICY "mr_sel" ON public.menu_recetas FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.menus WHERE id = menu_id AND user_id = auth.uid()));
CREATE POLICY "mr_ins" ON public.menu_recetas FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.menus WHERE id = menu_id AND user_id = auth.uid()));
CREATE POLICY "mr_del" ON public.menu_recetas FOR DELETE USING (
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

-- colaborador_menus
CREATE POLICY "cm_sel" ON public.colaborador_menus FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = colaborador_id AND c.propietario_id = auth.uid()));
CREATE POLICY "cm_ins" ON public.colaborador_menus FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = colaborador_id AND c.propietario_id = auth.uid()));
CREATE POLICY "cm_upd" ON public.colaborador_menus FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = colaborador_id AND c.propietario_id = auth.uid()));
CREATE POLICY "cm_del" ON public.colaborador_menus FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = colaborador_id AND c.propietario_id = auth.uid()));


-- ════════════════════════════════════════════════════════════
-- 9. TRIGGERS updated_at
-- ════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_ingredientes_updated  ON public.ingredientes;
DROP TRIGGER IF EXISTS trg_sub_recetas_updated   ON public.sub_recetas;
DROP TRIGGER IF EXISTS trg_recetas_updated       ON public.recetas;
DROP TRIGGER IF EXISTS trg_user_profiles_updated ON public.user_profiles;
DROP TRIGGER IF EXISTS trg_menus_upd             ON public.menus;
DROP TRIGGER IF EXISTS trg_proveedores_upd       ON public.proveedores;
DROP TRIGGER IF EXISTS trg_plataformas_upd       ON public.plataformas_delivery;

CREATE TRIGGER trg_ingredientes_updated  BEFORE UPDATE ON public.ingredientes         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sub_recetas_updated   BEFORE UPDATE ON public.sub_recetas          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_recetas_updated       BEFORE UPDATE ON public.recetas              FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_user_profiles_updated BEFORE UPDATE ON public.user_profiles        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_menus_upd             BEFORE UPDATE ON public.menus                FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_proveedores_upd       BEFORE UPDATE ON public.proveedores          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_plataformas_upd       BEFORE UPDATE ON public.plataformas_delivery FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 10. ÍNDICES
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_ing_user        ON public.ingredientes(user_id);
CREATE INDEX IF NOT EXISTS idx_sr_user         ON public.sub_recetas(user_id);
CREATE INDEX IF NOT EXISTS idx_rec_user        ON public.recetas(user_id);
CREATE INDEX IF NOT EXISTS idx_menus_user      ON public.menus(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_rec_menu   ON public.menu_recetas(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_rec_receta ON public.menu_recetas(receta_id);
CREATE INDEX IF NOT EXISTS idx_prov_user       ON public.proveedores(user_id);
CREATE INDEX IF NOT EXISTS idx_plat_user       ON public.plataformas_delivery(user_id);
CREATE INDEX IF NOT EXISTS idx_colab_prop      ON public.colaboradores(propietario_id);


-- ════════════════════════════════════════════════════════════
-- 11. MIGRACIÓN: importar proveedores de ingredientes ya existentes
--     (No hace daño si la tabla ya está vacía o si ya se corrió antes)
-- ════════════════════════════════════════════════════════════

INSERT INTO public.proveedores (user_id, nombre)
SELECT DISTINCT i.user_id, i.proveedor
FROM public.ingredientes i
WHERE i.proveedor IS NOT NULL
  AND i.proveedor != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.proveedores p
    WHERE p.user_id = i.user_id
      AND LOWER(p.nombre) = LOWER(i.proveedor)
  );
