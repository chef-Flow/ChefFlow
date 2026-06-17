-- =============================================
-- ChefFlow Costeo — Esquema de base de datos
-- Ejecuta este script en el SQL Editor de Supabase
-- =============================================

-- Tabla: ingredientes
CREATE TABLE IF NOT EXISTS public.ingredientes (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre                TEXT        NOT NULL,
  marca                 TEXT,
  unidad_presentacion   TEXT        NOT NULL,
  cantidad_presentacion NUMERIC(12, 4) NOT NULL CHECK (cantidad_presentacion > 0),
  unidad_medida         TEXT        NOT NULL,
  clasificacion         TEXT        NOT NULL,
  proveedor             TEXT,
  precio_compra         NUMERIC(12, 2) NOT NULL CHECK (precio_compra >= 0),
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla: sub_recetas
CREATE TABLE IF NOT EXISTS public.sub_recetas (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre               TEXT        NOT NULL,
  rendimiento          NUMERIC(12, 4) NOT NULL CHECK (rendimiento > 0),
  unidad_rendimiento   TEXT        NOT NULL,
  costo_total          NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla: ingredientes de sub-receta
CREATE TABLE IF NOT EXISTS public.ingredientes_subreceta (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_receta_id   UUID        REFERENCES public.sub_recetas(id) ON DELETE CASCADE NOT NULL,
  ingrediente_id  UUID        REFERENCES public.ingredientes(id) ON DELETE RESTRICT NOT NULL,
  cantidad_neta   NUMERIC(12, 4) NOT NULL CHECK (cantidad_neta > 0),
  porcentaje_merma NUMERIC(5, 2) DEFAULT 0 NOT NULL
                  CHECK (porcentaje_merma >= 0 AND porcentaje_merma < 100),
  cantidad_bruta  NUMERIC(12, 4) NOT NULL,
  costo           NUMERIC(12, 4) DEFAULT 0 NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla: recetas
CREATE TABLE IF NOT EXISTS public.recetas (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre           TEXT        NOT NULL,
  porciones        INTEGER     NOT NULL DEFAULT 1 CHECK (porciones > 0),
  costo_total      NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  costo_por_porcion NUMERIC(12, 4) DEFAULT 0 NOT NULL,
  precio_venta     NUMERIC(12, 2),
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla: ingredientes de receta
CREATE TABLE IF NOT EXISTS public.ingredientes_receta (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  receta_id       UUID        REFERENCES public.recetas(id) ON DELETE CASCADE NOT NULL,
  ingrediente_id  UUID        REFERENCES public.ingredientes(id) ON DELETE RESTRICT,
  sub_receta_id   UUID        REFERENCES public.sub_recetas(id) ON DELETE RESTRICT,
  cantidad_neta   NUMERIC(12, 4) NOT NULL CHECK (cantidad_neta > 0),
  porcentaje_merma NUMERIC(5, 2) DEFAULT 0 NOT NULL
                  CHECK (porcentaje_merma >= 0 AND porcentaje_merma < 100),
  cantidad_bruta  NUMERIC(12, 4) NOT NULL,
  costo           NUMERIC(12, 4) DEFAULT 0 NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Un ingrediente de receta es ya sea un ingrediente o una sub-receta, nunca ambos
  CONSTRAINT chk_ingrediente_or_subreceta CHECK (
    (ingrediente_id IS NOT NULL AND sub_receta_id IS NULL) OR
    (ingrediente_id IS NULL AND sub_receta_id IS NOT NULL)
  )
);

-- =============================================
-- Trigger: auto-actualizar updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ingredientes_updated
  BEFORE UPDATE ON public.ingredientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_sub_recetas_updated
  BEFORE UPDATE ON public.sub_recetas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_recetas_updated
  BEFORE UPDATE ON public.recetas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE public.ingredientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_recetas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredientes_subreceta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredientes_receta   ENABLE ROW LEVEL SECURITY;

-- Políticas: ingredientes
CREATE POLICY "usuarios_ver_ingredientes"    ON public.ingredientes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usuarios_crear_ingredientes"  ON public.ingredientes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usuarios_editar_ingredientes" ON public.ingredientes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "usuarios_borrar_ingredientes" ON public.ingredientes FOR DELETE USING (auth.uid() = user_id);

-- Políticas: sub_recetas
CREATE POLICY "usuarios_ver_sub_recetas"    ON public.sub_recetas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usuarios_crear_sub_recetas"  ON public.sub_recetas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usuarios_editar_sub_recetas" ON public.sub_recetas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "usuarios_borrar_sub_recetas" ON public.sub_recetas FOR DELETE USING (auth.uid() = user_id);

-- Políticas: ingredientes_subreceta (acceso via ownership de la sub_receta)
CREATE POLICY "usuarios_ver_ing_subreceta" ON public.ingredientes_subreceta
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sub_recetas WHERE id = sub_receta_id AND user_id = auth.uid())
  );
CREATE POLICY "usuarios_crear_ing_subreceta" ON public.ingredientes_subreceta
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.sub_recetas WHERE id = sub_receta_id AND user_id = auth.uid())
  );
CREATE POLICY "usuarios_editar_ing_subreceta" ON public.ingredientes_subreceta
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.sub_recetas WHERE id = sub_receta_id AND user_id = auth.uid())
  );
CREATE POLICY "usuarios_borrar_ing_subreceta" ON public.ingredientes_subreceta
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.sub_recetas WHERE id = sub_receta_id AND user_id = auth.uid())
  );

-- Políticas: recetas
CREATE POLICY "usuarios_ver_recetas"    ON public.recetas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usuarios_crear_recetas"  ON public.recetas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usuarios_editar_recetas" ON public.recetas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "usuarios_borrar_recetas" ON public.recetas FOR DELETE USING (auth.uid() = user_id);

-- Políticas: ingredientes_receta (acceso via ownership de la receta)
CREATE POLICY "usuarios_ver_ing_receta" ON public.ingredientes_receta
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.recetas WHERE id = receta_id AND user_id = auth.uid())
  );
CREATE POLICY "usuarios_crear_ing_receta" ON public.ingredientes_receta
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.recetas WHERE id = receta_id AND user_id = auth.uid())
  );
CREATE POLICY "usuarios_editar_ing_receta" ON public.ingredientes_receta
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.recetas WHERE id = receta_id AND user_id = auth.uid())
  );
CREATE POLICY "usuarios_borrar_ing_receta" ON public.ingredientes_receta
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.recetas WHERE id = receta_id AND user_id = auth.uid())
  );
