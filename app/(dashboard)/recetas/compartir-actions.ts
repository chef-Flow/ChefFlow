'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getResend, buildRecetaCompartidaEmail } from '@/lib/resend'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function compartirReceta(
  recetaId: string,
  email: string,
  permisos: { puedeVerPrecios: boolean; puedeVerProveedores: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const emailLower = email.trim().toLowerCase()
  if (emailLower === user.email?.toLowerCase()) {
    return { ok: false, error: 'No puedes compartir una receta contigo mismo' }
  }

  // Verificar que el usuario es propietario de la receta
  const { data: receta } = await supabase
    .from('recetas')
    .select('id, nombre')
    .eq('id', recetaId)
    .eq('user_id', user.id)
    .single()

  if (!receta) return { ok: false, error: 'Receta no encontrada' }

  const admin = getAdmin()

  // Crear o actualizar el registro de compartición
  const { data: share, error: shareError } = await admin
    .from('recetas_compartidas')
    .upsert(
      {
        receta_id:            recetaId,
        propietario_id:       user.id,
        receptor_email:       emailLower,
        estado:               'pendiente',
        puede_ver_precios:    permisos.puedeVerPrecios,
        puede_ver_proveedores: permisos.puedeVerProveedores,
        vista:                false,
      },
      { onConflict: 'receta_id,receptor_email' },
    )
    .select('token')
    .single()

  if (shareError) return { ok: false, error: shareError.message }

  // Guardar contacto para uso futuro
  await admin
    .from('contactos_compartir')
    .upsert(
      { propietario_id: user.id, email: emailLower, last_shared_at: new Date().toISOString() },
      { onConflict: 'propietario_id,email' },
    )

  // Enviar correo
  const ownerName =
    (user.user_metadata?.full_name as string | undefined) || user.email || 'El propietario'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  try {
    const html = buildRecetaCompartidaEmail({
      ownerName,
      recetaNombre: receta.nombre,
      appUrl,
      token: share.token,
    })
    await getResend().emails.send({
      from: 'ChefFlow <onboarding@resend.dev>',
      to: emailLower,
      subject: `${ownerName} te compartió una receta en ChefFlow`,
      html,
    })
  } catch (err: any) {
    console.error('[compartirReceta] Resend error:', err.message)
    // La compartición se creó — avisamos pero no revertimos
    return { ok: true, error: `Compartido, pero el correo no se pudo enviar: ${err.message}` }
  }

  revalidatePath(`/recetas/${recetaId}`)
  return { ok: true }
}

export async function revocarRecetaCompartida(
  shareId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('recetas_compartidas')
    .update({ estado: 'revocado' })
    .eq('id', shareId)
    .eq('propietario_id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/compartido')
  return { ok: true }
}

export async function marcarRecetaVista(shareId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('recetas_compartidas')
    .update({ vista: true })
    .eq('id', shareId)
    .eq('vista', false)
}

export async function aceptarRecetasCompartidasPendientes(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return

  const admin = getAdmin()
  const emailLower = user.email.toLowerCase().trim()

  const { data: pendientes } = await admin
    .from('recetas_compartidas')
    .select('id')
    .eq('receptor_email', emailLower)
    .eq('estado', 'pendiente')

  if (!pendientes?.length) return

  await admin
    .from('recetas_compartidas')
    .update({ receptor_user_id: user.id, estado: 'activo' })
    .eq('receptor_email', emailLower)
    .eq('estado', 'pendiente')
}

export async function getContactosCompartir(): Promise<
  Array<{ email: string; nombre: string | null }>
> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('contactos_compartir')
    .select('email, nombre')
    .order('last_shared_at', { ascending: false })
    .limit(20)
  return data ?? []
}

export async function getRecetaDirectaParaImpresion(
  recetaId: string,
): Promise<{ ok: boolean; error?: string; data?: any }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const admin = getAdmin()

  let share: { puede_ver_precios: boolean; puede_ver_proveedores: boolean } | null = null
  try {
    const r = await (admin as any)
      .from('recetas_compartidas')
      .select('puede_ver_precios, puede_ver_proveedores')
      .eq('receta_id', recetaId)
      .eq('receptor_user_id', user.id)
      .eq('estado', 'activo')
      .single()
    share = r?.data ?? null
  } catch { /* tabla no existe aún */ }

  if (!share) return { ok: false, error: 'Sin acceso a esta receta' }

  const [recetaRes, ingRes] = await Promise.all([
    admin
      .from('recetas')
      .select('nombre, porciones, costo_total, costo_por_porcion, precio_venta, notas')
      .eq('id', recetaId)
      .single(),
    admin
      .from('ingredientes_receta')
      .select(`
        cantidad_neta, peso_merma, cantidad_bruta, porcentaje_merma, costo,
        ingrediente:ingrediente_id(nombre, precio_compra, cantidad_presentacion, unidad_medida, proveedor),
        sub_receta:sub_receta_id(nombre, costo_total, rendimiento, unidad_rendimiento)
      `)
      .eq('receta_id', recetaId),
  ])

  if (!recetaRes.data) return { ok: false, error: 'Receta no encontrada' }

  const ingredientes = (ingRes.data ?? []).map((row: any) => {
    const isIng = !!row.ingrediente
    return {
      nombre:           isIng ? row.ingrediente.nombre : (row.sub_receta?.nombre ?? ''),
      unidad:           isIng ? row.ingrediente.unidad_medida : (row.sub_receta?.unidad_rendimiento ?? ''),
      precio_unitario:  isIng
        ? (row.ingrediente.precio_compra ?? 0) / (row.ingrediente.cantidad_presentacion ?? 1)
        : (row.sub_receta?.rendimiento ?? 0) > 0
          ? (row.sub_receta.costo_total ?? 0) / row.sub_receta.rendimiento
          : 0,
      cantidad_neta:    Number(row.cantidad_neta),
      peso_merma:       Number(row.peso_merma ?? 0),
      cantidad_bruta:   Number(row.cantidad_bruta),
      porcentaje_merma: Number(row.porcentaje_merma),
      costo:            Number(row.costo),
      proveedor:        isIng ? (row.ingrediente?.proveedor ?? null) : null,
    }
  })

  return {
    ok: true,
    data: {
      receta: { ...recetaRes.data, ingredientes },
      puedeVerPrecios:     share.puede_ver_precios,
      puedeVerProveedores: share.puede_ver_proveedores,
    },
  }
}

export async function getSharesDeReceta(recetaId: string): Promise<
  Array<{
    id: string
    receptor_email: string
    estado: string
    puede_ver_precios: boolean
    puede_ver_proveedores: boolean
    created_at: string
  }>
> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('recetas_compartidas')
    .select('id, receptor_email, estado, puede_ver_precios, puede_ver_proveedores, created_at')
    .eq('receta_id', recetaId)
    .neq('estado', 'revocado')
    .order('created_at', { ascending: false })
  return data ?? []
}
