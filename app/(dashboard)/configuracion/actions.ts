'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PlataformaDelivery } from '@/types'

export async function saveProfileParams(
  iva_porcentaje: number,
  margen_minimo: number,
  comision_bancaria: number,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('user_profiles')
    .upsert({ id: user.id, iva_porcentaje, margen_minimo, comision_bancaria })
    .eq('id', user.id)

  if (error) {
    console.error('[saveProfileParams]', error.code, error.message)
    return { ok: false, error: error.message }
  }

  revalidatePath('/configuracion')
  return { ok: true }
}

export async function saveArrayField(
  field: 'unidades_personalizadas' | 'presentaciones_personalizadas',
  value: string[],
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return { ok: false, error: 'No autenticado' }
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update({ [field]: value })
    .eq('id', user.id)
    .select('id')

  if (error) {
    console.error(`[saveArrayField action] UPDATE error for ${field}:`, error)
    return { ok: false, error: error.message }
  }

  if (data && data.length > 0) {
    revalidatePath('/configuracion')
    return { ok: true }
  }

  // Fila no existe aún — insertar
  const { error: insertErr } = await supabase
    .from('user_profiles')
    .insert({ id: user.id, [field]: value })

  if (insertErr) {
    // Si ya existe (race condition), intentar update de nuevo
    if (insertErr.code === '23505') {
      const { error: retryErr } = await supabase
        .from('user_profiles')
        .update({ [field]: value })
        .eq('id', user.id)
      if (retryErr) {
        console.error(`[saveArrayField action] retry UPDATE error:`, retryErr)
        return { ok: false, error: retryErr.message }
      }
      revalidatePath('/configuracion')
      return { ok: true }
    }
    console.error(`[saveArrayField action] INSERT error for ${field}:`, insertErr)
    return { ok: false, error: insertErr.message }
  }

  revalidatePath('/configuracion')
  return { ok: true }
}

export async function insertPlataforma(
  nombre: string,
  comision_porcentaje: number,
): Promise<{ data: PlataformaDelivery | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { data: null, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('plataformas_delivery')
    .insert({ user_id: user.id, nombre, comision_porcentaje })
    .select()
    .single()

  if (error) {
    console.error('[insertPlataforma]', error)
    return { data: null, error: error.message }
  }
  revalidatePath('/configuracion')
  return { data: data as PlataformaDelivery }
}

export async function updatePlataforma(
  id: string,
  nombre: string,
  comision_porcentaje: number,
): Promise<{ data: PlataformaDelivery | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { data: null, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('plataformas_delivery')
    .update({ nombre, comision_porcentaje })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('[updatePlataforma]', error)
    return { data: null, error: error.message }
  }
  revalidatePath('/configuracion')
  return { data: data as PlataformaDelivery }
}

export async function togglePlataforma(
  id: string,
  activa: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('plataformas_delivery')
    .update({ activa })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[togglePlataforma]', error)
    return { ok: false, error: error.message }
  }
  revalidatePath('/configuracion')
  return { ok: true }
}

export async function deletePlataforma(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('plataformas_delivery')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[deletePlataforma]', error)
    return { ok: false, error: error.message }
  }
  revalidatePath('/configuracion')
  return { ok: true }
}
