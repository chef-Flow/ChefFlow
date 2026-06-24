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

async function urlToDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const b64 = Buffer.from(buf).toString('base64')
    const ct = res.headers.get('content-type') ?? 'image/jpeg'
    return `data:${ct};base64,${b64}`
  } catch {
    return null
  }
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

// ── Tipos para impresión ──────────────────────────────────────────────────────

export type IngredienteImpresion = {
  nombre: string
  unidad: string
  precio_unitario: number
  cantidad_neta: number
  peso_merma: number
  cantidad_bruta: number
  porcentaje_merma: number
  costo: number
  proveedor: string | null
}

export type DatosImpresion = {
  receta: {
    nombre: string
    porciones: number
    costo_total: number | null
    costo_por_porcion: number | null
    precio_venta: number | null
    notas: string | null
    foto_url?: string | null
    ingredientes: IngredienteImpresion[]
  }
  puedeVerPrecios: boolean
  puedeVerProveedores: boolean
}

/**
 * Carga los datos completos de una receta para impresión.
 * Verifica acceso del colaborador y aplica sus permisos de visibilidad.
 */
export async function getRecetaParaImpresion(
  recetaId: string,
): Promise<{ ok: boolean; error?: string; data?: DatosImpresion }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const admin = getAdmin()

  // Colaboraciones activas del usuario
  const { data: colabs } = await admin
    .from('colaboradores')
    .select('id')
    .eq('colaborador_user_id', user.id)
    .eq('estado', 'activo')

  if (!colabs?.length) return { ok: false, error: 'Sin acceso' }

  const colabIds = colabs.map(c => c.id)

  // Permisos de menús donde puede ver recetas
  const { data: acceso } = await admin
    .from('colaborador_menus')
    .select('menu_id, puede_ver_precios, puede_ver_proveedores')
    .in('colaborador_id', colabIds)
    .eq('puede_ver_recetas', true)

  if (!acceso?.length) return { ok: false, error: 'Sin permisos de recetas' }

  // Verificar que la receta pertenece a uno de esos menús
  const { data: menuRelations } = await admin
    .from('menu_recetas')
    .select('menu_id')
    .eq('receta_id', recetaId)
    .in('menu_id', acceso.map(a => a.menu_id))

  if (!menuRelations?.length) return { ok: false, error: 'Sin acceso a esta receta' }

  const permisosEfectivos = acceso.filter(a =>
    menuRelations.some(mr => mr.menu_id === a.menu_id)
  )
  const puedeVerPrecios     = permisosEfectivos.some(p => p.puede_ver_precios)
  const puedeVerProveedores = permisosEfectivos.some(p => p.puede_ver_proveedores)

  const [recetaRes, ingRes] = await Promise.all([
    admin
      .from('recetas')
      .select('nombre, porciones, costo_total, costo_por_porcion, precio_venta, notas, foto_url')
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

  const fotoDataUrl = await urlToDataUrl((recetaRes.data as any).foto_url ?? null)

  const ingredientes: IngredienteImpresion[] = (ingRes.data ?? []).map((row: any) => {
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
      receta: { ...recetaRes.data, ingredientes, foto_url: fotoDataUrl },
      puedeVerPrecios,
      puedeVerProveedores,
    },
  }
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
