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

  revalidatePath('/', 'layout')
  return { ok: true, menuId: data.id }
}

export async function eliminarMenu(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('menus').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/', 'layout')
}
