'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function crearMenu(
  nombre: string,
  descripcion: string | null,
  color: string,
): Promise<{ ok: true; menuId: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sin sesión activa.' }

  const { data, error } = await supabase
    .from('menus')
    .insert({ user_id: user.id, nombre, descripcion, color })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: 'No se pudo crear el menú.' }

  // Invalida el layout para que el onboarding checklist se actualice
  revalidatePath('/', 'layout')
  return { ok: true, menuId: data.id }
}
