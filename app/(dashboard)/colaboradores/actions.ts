'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Acepta automáticamente invitaciones pendientes que coincidan con el email
 * del usuario autenticado. Se llama en el layout del dashboard.
 */
export async function aceptarInvitacionesPendientes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return

  await supabase
    .from('colaboradores')
    .update({ colaborador_user_id: user.id, estado: 'activo' })
    .eq('email', user.email)
    .eq('estado', 'pendiente')
}

/**
 * Actualiza el precio de venta de una receta desde la vista compartida.
 * Solo funciona si el usuario es colaborador con puede_editar = true.
 */
export async function actualizarPrecioCompartido(
  recetaId: string,
  precioVenta: number | null,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('recetas')
    .update({ precio_venta: precioVenta })
    .eq('id', recetaId)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/compartido')
  return { ok: true }
}
