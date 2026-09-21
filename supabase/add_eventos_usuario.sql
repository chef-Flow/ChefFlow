-- ── eventos_usuario: tracking básico de actividad para el panel de admin ──────
-- Se llena automáticamente vía triggers — ningún código de la app escribe aquí
-- directamente, así que no se modifica ninguna tabla, función ni lógica existente.

CREATE TABLE IF NOT EXISTS public.eventos_usuario (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_evento text NOT NULL CHECK (tipo_evento IN (
    'registro_completado', 'receta_creada', 'receta_costeada',
    'plan_actualizado_pago', 'login'
  )),
  fecha       timestamptz NOT NULL DEFAULT now(),
  metadata    jsonb
);

CREATE INDEX IF NOT EXISTS idx_eventos_usuario_usuario_id  ON public.eventos_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_eventos_usuario_tipo_evento ON public.eventos_usuario(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_usuario_fecha       ON public.eventos_usuario(fecha DESC);

ALTER TABLE public.eventos_usuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eventos_usuario_propio_select" ON public.eventos_usuario;
CREATE POLICY "eventos_usuario_propio_select" ON public.eventos_usuario
  FOR SELECT
  USING (usuario_id = auth.uid());

-- Sin políticas de INSERT/UPDATE/DELETE para usuarios normales — solo los
-- triggers de abajo (SECURITY DEFINER, corren como dueño de la función) escriben
-- en esta tabla.

-- ── Trigger 1: registro_completado ──────────────────────────────────────────────
-- Se dispara cuando se crea la fila de user_profiles (signUpWithTerminos ya hace
-- ese upsert hoy en app code; aquí solo se observa la tabla, no se toca la acción).
CREATE OR REPLACE FUNCTION public.trg_evento_registro_completado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.eventos_usuario (usuario_id, tipo_evento, metadata)
  VALUES (
    NEW.id, 'registro_completado',
    jsonb_build_object('email', (SELECT email FROM auth.users WHERE id = NEW.id))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_profiles_insert_evento ON public.user_profiles;
CREATE TRIGGER on_user_profiles_insert_evento
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_evento_registro_completado();

-- ── Trigger 2: receta_creada ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_evento_receta_creada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.eventos_usuario (usuario_id, tipo_evento, metadata)
  VALUES (NEW.user_id, 'receta_creada', jsonb_build_object('receta_id', NEW.id, 'nombre', NEW.nombre));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_recetas_insert_evento ON public.recetas;
CREATE TRIGGER on_recetas_insert_evento
  AFTER INSERT ON public.recetas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_evento_receta_creada();

-- ── Trigger 3: receta_costeada ───────────────────────────────────────────────────
-- Solo la primera vez que una receta pasa de costo_total 0/NULL a > 0 (no en
-- cada edición posterior — es un hito, no un contador de ediciones).
CREATE OR REPLACE FUNCTION public.trg_evento_receta_costeada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.costo_total IS NULL OR OLD.costo_total = 0)
     AND NEW.costo_total IS NOT NULL AND NEW.costo_total > 0 THEN
    INSERT INTO public.eventos_usuario (usuario_id, tipo_evento, metadata)
    VALUES (NEW.user_id, 'receta_costeada', jsonb_build_object('receta_id', NEW.id, 'costo_total', NEW.costo_total));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_recetas_update_evento_costeada ON public.recetas;
CREATE TRIGGER on_recetas_update_evento_costeada
  AFTER UPDATE ON public.recetas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_evento_receta_costeada();

-- ── Trigger 4: plan_actualizado_pago ─────────────────────────────────────────────
-- Solo upgrades reales vía Stripe: el webhook (app/api/stripe/webhook/route.ts)
-- siempre setea stripe_subscription_id junto con plan en el mismo UPDATE.
-- Las asignaciones manuales de plan (ej. vía script admin) no tocan esa columna,
-- así que no disparan este evento — así se distingue "pagado" de "regalado".
CREATE OR REPLACE FUNCTION public.trg_evento_plan_pago()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan IN ('basic', 'pro')
     AND OLD.plan IS DISTINCT FROM NEW.plan
     AND NEW.stripe_subscription_id IS NOT NULL
     AND OLD.stripe_subscription_id IS DISTINCT FROM NEW.stripe_subscription_id THEN
    INSERT INTO public.eventos_usuario (usuario_id, tipo_evento, metadata)
    VALUES (NEW.id, 'plan_actualizado_pago', jsonb_build_object(
      'plan_anterior', OLD.plan, 'plan_nuevo', NEW.plan,
      'stripe_subscription_id', NEW.stripe_subscription_id
    ));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_profiles_update_evento_plan ON public.user_profiles;
CREATE TRIGGER on_user_profiles_update_evento_plan
  AFTER UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_evento_plan_pago();

-- ── Trigger 5: login ──────────────────────────────────────────────────────────────
-- Sobre auth.users (tabla de sistema de Supabase Auth) — solo agrega un
-- observador nuevo sobre last_sign_in_at, no modifica esa tabla ni su lógica.
CREATE OR REPLACE FUNCTION public.trg_evento_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_sign_in_at IS NOT NULL
     AND OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at THEN
    INSERT INTO public.eventos_usuario (usuario_id, tipo_evento)
    VALUES (NEW.id, 'login');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_users_login_evento ON auth.users;
CREATE TRIGGER on_auth_users_login_evento
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_evento_login();
