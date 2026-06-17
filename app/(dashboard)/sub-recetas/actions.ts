'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface IngredienteSubrecetaPayload {
  sub_receta_id: string
  ingrediente_id: string
  cantidad_neta: number
  peso_merma: number
  cantidad_bruta: number
  porcentaje_merma: number
  costo: number
}

export async function insertIngredienteSubreceta(
  payload: IngredienteSubrecetaPayload,
): Promise<{ id: string | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { id: null, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('ingredientes_subreceta')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    console.error('[insertIngredienteSubreceta]', error.code, error.message)
    return { id: null, error: error.message }
  }

  revalidatePath(`/sub-recetas/${payload.sub_receta_id}`)
  return { id: data.id }
}

export async function updateIngredienteSubreceta(
  id: string,
  sub_receta_id: string,
  payload: Omit<IngredienteSubrecetaPayload, 'sub_receta_id'>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('ingredientes_subreceta')
    .update(payload)
    .eq('id', id)

  if (error) {
    console.error('[updateIngredienteSubreceta]', error.code, error.message)
    return { ok: false, error: error.message }
  }

  revalidatePath(`/sub-recetas/${sub_receta_id}`)
  return { ok: true }
}

export async function deleteIngredienteSubreceta(
  id: string,
  sub_receta_id: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('ingredientes_subreceta')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[deleteIngredienteSubreceta]', error.code, error.message)
    return { ok: false, error: error.message }
  }

  revalidatePath(`/sub-recetas/${sub_receta_id}`)
  return { ok: true }
}

export async function syncCostoSubreceta(
  sub_receta_id: string,
  costo_total: number,
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('sub_recetas')
    .update({ costo_total })
    .eq('id', sub_receta_id)
  revalidatePath(`/sub-recetas/${sub_receta_id}`)
  revalidatePath('/sub-recetas')
  revalidatePath('/analisis')
}

export async function saveMargenSeguridadSubreceta(
  sub_receta_id: string,
  margen_seguridad: number,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('sub_recetas')
    .update({ margen_seguridad })
    .eq('id', sub_receta_id)
    .eq('user_id', user.id)   // RLS explícita: solo el dueño puede editar

  if (error) {
    console.error('[saveMargenSeguridadSubreceta]', error.code, error.message)
    return { ok: false, error: error.message }
  }

  revalidatePath(`/sub-recetas/${sub_receta_id}`)
  return { ok: true }
}
