-- =============================================
-- ChefFlow Costeo — Adiciones v2
-- Ejecuta este script DESPUÉS del schema.sql inicial
-- =============================================

-- Tabla: perfiles de usuario (plan, configuración)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id              UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  plan            TEXT        NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro')),
  iva_porcentaje  NUMERIC(5,2)  DEFAULT 16  NOT NULL CHECK (iva_porcentaje >= 0 AND iva_porcentaje <= 100),
  margen_minimo   NUMERIC(5,2)  DEFAULT 65  NOT NULL CHECK (margen_minimo >= 0 AND margen_minimo <= 100),
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_ver_perfil"    ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "usuarios_insertar_perfil" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "usuarios_editar_perfil" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE TRIGGER trg_user_profiles_updated
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------
-- Agregar campo peso_merma a ingredientes_receta
-- (reemplaza el porcentaje_merma como entrada)
-- -----------------------------------------------
ALTER TABLE public.ingredientes_receta
  ADD COLUMN IF NOT EXISTS peso_merma NUMERIC(12, 4) DEFAULT 0 NOT NULL;

-- -----------------------------------------------
-- Agregar campo peso_merma a ingredientes_subreceta
-- -----------------------------------------------
ALTER TABLE public.ingredientes_subreceta
  ADD COLUMN IF NOT EXISTS peso_merma NUMERIC(12, 4) DEFAULT 0 NOT NULL;

-- =============================================
-- NOTA: La lógica de cálculo se maneja en el cliente:
--   cantidad_bruta    = cantidad_neta + peso_merma
--   porcentaje_merma  = (peso_merma / cantidad_bruta) × 100  (si cantidad_bruta > 0)
--   costo             = precio_unitario × cantidad_bruta
-- =============================================
