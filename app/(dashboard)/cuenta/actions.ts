'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function actualizarNombre(
  nombre: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    data: { full_name: nombre.trim() },
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/cuenta')
  return { ok: true }
}

export async function actualizarEmail(
  nuevoEmail: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ email: nuevoEmail.trim() })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function actualizarContrasena(
  nuevaContrasena: string,
): Promise<{ ok: boolean; error?: string }> {
  if (nuevaContrasena.length < 6)
    return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: nuevaContrasena })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
