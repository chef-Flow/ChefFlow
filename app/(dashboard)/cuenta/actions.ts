'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { emailSchema, passwordSchema, nombreSchema } from '@/lib/validations'

export async function actualizarNombre(
  nombre: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = nombreSchema.safeParse(nombre)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    data: { full_name: parsed.data },
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/cuenta')
  return { ok: true }
}

export async function actualizarEmail(
  nuevoEmail: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = emailSchema.safeParse(nuevoEmail.trim())
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ email: parsed.data })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function actualizarContrasena(
  nuevaContrasena: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = passwordSchema.safeParse(nuevaContrasena)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
