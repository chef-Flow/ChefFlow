'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface IngredienteRecetaPayload {
  receta_id: string
  ingrediente_id: string | null
  sub_receta_id: string | null
  cantidad_neta: number
  peso_merma: number
  cantidad_bruta: number
  porcentaje_merma: number
  costo: number
  precio_unitario_capturado: number
}

export async function insertIngredienteReceta(
  payload: IngredienteRecetaPayload,
): Promise<{ id: string | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { id: null, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('ingredientes_receta')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    console.error('[insertIngredienteReceta]', error.code, error.message, error.details)
    return { id: null, error: `[${error.code}] ${error.message}${error.details ? ' — ' + error.details : ''}` }
  }

  revalidatePath(`/recetas/${payload.receta_id}`)
  return { id: data.id }
}

export async function updateIngredienteReceta(
  id: string,
  receta_id: string,
  payload: Omit<IngredienteRecetaPayload, 'receta_id' | 'ingrediente_id' | 'sub_receta_id'>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('ingredientes_receta')
    .update(payload)
    .eq('id', id)

  if (error) {
    console.error('[updateIngredienteReceta]', error.code, error.message, error.details)
    return { ok: false, error: `[${error.code}] ${error.message}${error.details ? ' — ' + error.details : ''}` }
  }

  revalidatePath(`/recetas/${receta_id}`)
  return { ok: true }
}

export async function deleteIngredienteReceta(
  id: string,
  receta_id: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('ingredientes_receta')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[deleteIngredienteReceta]', error.code, error.message)
    return { ok: false, error: `[${error.code}] ${error.message}` }
  }

  revalidatePath(`/recetas/${receta_id}`)
  return { ok: true }
}

export async function syncCostosReceta(
  receta_id: string,
  costo_total: number,
  costo_por_porcion: number,
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('recetas')
    .update({ costo_total, costo_por_porcion })
    .eq('id', receta_id)
  revalidatePath(`/recetas/${receta_id}`)
  revalidatePath('/recetas')
  revalidatePath('/analisis')
}

export async function saveNotas(
  receta_id: string,
  notas: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('recetas')
    .update({ notas: notas || null })
    .eq('id', receta_id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[saveNotas]', error.code, error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath(`/recetas/${receta_id}`)
  return { ok: true }
}

export async function saveFotoUrl(
  receta_id: string,
  foto_url: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('recetas')
    .update({ foto_url })
    .eq('id', receta_id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[saveFotoUrl]', error.code, error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath(`/recetas/${receta_id}`)
  return { ok: true }
}
