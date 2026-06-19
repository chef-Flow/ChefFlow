'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { ColaboradorMenu } from '@/types'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Acepta invitaciones pendientes cuyo email coincida con el usuario autenticado
 * y crea permisos por defecto en todos los menús del propietario.
 */
export async function aceptarInvitacionesPendientes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return

  const admin = getAdmin()

  // Buscar invitaciones pendientes para este email
  const { data: pendientes } = await admin
    .from('colaboradores')
    .select('id, propietario_id')
    .eq('email', user.email.toLowerCase().trim())
    .eq('estado', 'pendiente')

  if (!pendientes || pendientes.length === 0) return

  for (const colab of pendientes) {
    // Aceptar la invitación
    await admin
      .from('colaboradores')
      .update({ colaborador_user_id: user.id, estado: 'activo' })
      .eq('id', colab.id)

    // Crear permisos por defecto para todos los menús del propietario
    const { data: propietarioMenus } = await admin
      .from('menus')
      .select('id')
      .eq('user_id', colab.propietario_id)

    if (propietarioMenus && propietarioMenus.length > 0) {
      await admin.from('colaborador_menus').upsert(
        propietarioMenus.map(m => ({
          colaborador_id: colab.id,
          menu_id: m.id,
          puede_ver_recetas: true,
          puede_ver_precios: false,
          puede_ver_proveedores: false,
          puede_editar: false,
        })),
        { onConflict: 'colaborador_id,menu_id' }
      )
    }
  }
}

/**
 * Guarda los permisos de un colaborador para cada menú.
 * Verifica que el colaborador pertenezca al propietario autenticado.
 */
export async function guardarPermisosColaborador(
  colaboradorId: string,
  permisos: Array<{
    id: string
    menu_id: string
    puede_ver_recetas: boolean
    puede_ver_precios: boolean
    puede_ver_proveedores: boolean
    puede_editar: boolean
  }>
): Promise<{ ok: boolean; error?: string; permisos?: ColaboradorMenu[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  // Verificar que el colaborador pertenece al propietario actual
  const { data: colab } = await supabase
    .from('colaboradores')
    .select('id')
    .eq('id', colaboradorId)
    .eq('propietario_id', user.id)
    .single()
  if (!colab) return { ok: false, error: 'No autorizado' }

  for (const perm of permisos) {
    const payload = {
      colaborador_id: colaboradorId,
      menu_id: perm.menu_id,
      puede_ver_recetas: perm.puede_ver_recetas,
      puede_ver_precios: perm.puede_ver_precios,
      puede_ver_proveedores: perm.puede_ver_proveedores,
      puede_editar: perm.puede_editar,
    }

    const { error } = perm.id
      ? await supabase.from('colaborador_menus').update(payload).eq('id', perm.id)
      : await supabase.from('colaborador_menus').upsert(payload, { onConflict: 'colaborador_id,menu_id' })

    if (error) return { ok: false, error: error.message }
  }

  const { data: savedPerms, error: readError } = await supabase
    .from('colaborador_menus')
    .select('*')
    .eq('colaborador_id', colaboradorId)

  if (readError) return { ok: false, error: readError.message }

  revalidatePath('/compartido')
  revalidatePath('/colaboradores')
  return { ok: true, permisos: (savedPerms as ColaboradorMenu[]) ?? [] }
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
