-- Tabla para rastrear el progreso del onboarding de usuarios nuevos.
-- Una fila por usuario; se crea la primera vez que se consulta.

create table if not exists public.onboarding_checklist (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  completado boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.onboarding_checklist enable row level security;

create policy "Users manage own onboarding"
  on public.onboarding_checklist
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
