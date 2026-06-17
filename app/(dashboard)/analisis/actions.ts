'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function actualizarPreciosMenu(
  updates: { id: string; precio_venta: number }[]
): Promise<{ ok: boolean; count: number; error?: string }> {
  if (updates.length === 0) return { ok: true, count: 0 }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, count: 0, error: 'No autenticado' }

  const results = await Promise.all(
    updates.map(({ id, precio_venta }) =>
      supabase
        .from('recetas')
        .update({ precio_venta })
        .eq('id', id)
        .eq('user_id', user.id)
    )
  )

  const failed = results.filter(r => r.error)
  if (failed.length > 0) {
    return { ok: false, count: 0, error: failed[0].error?.message ?? 'Error al actualizar' }
  }

  revalidatePath('/analisis')
  revalidatePath('/recetas')
  return { ok: true, count: updates.length }
}

export async function actualizarPrecioReceta(
  id: string,
  precio_venta: number | null,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('recetas')
    .update({ precio_venta })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/analisis')
  revalidatePath('/recetas')
  return { ok: true }
}

export async function actualizarPlataformaReceta(
  id: string,
  plataforma_delivery_id: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('recetas')
    .update({ plataforma_delivery_id })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/analisis')
  revalidatePath('/recetas')
  return { ok: true }
}
