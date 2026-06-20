export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { aceptarInvitacionesPendientes } from '@/app/(dashboard)/colaboradores/actions'
import { aceptarRecetasCompartidasPendientes } from '@/app/(dashboard)/recetas/compartir-actions'
import CompartidoConmigo from '@/components/colaboradores/CompartidoConmigo'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function CompartidoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Auto-aceptar invitaciones pendientes de ambos sistemas
  await aceptarInvitacionesPendientes()
  await aceptarRecetasCompartidasPendientes().catch(() => {})

  const admin = getAdmin()

  // ── A. Items compartidos directamente (recetas + sub-recetas) ───────────────
  let allSharesData: any[] | null = null
  try {
    const r = await (admin as any)
      .from('recetas_compartidas')
      .select('id, receta_id, sub_receta_id, puede_ver_precios, puede_ver_proveedores, vista, created_at')
      .eq('receptor_user_id', user.id)
      .eq('estado', 'activo')
      .order('created_at', { ascending: false })
    allSharesData = r?.data ?? null
  } catch { /* tabla no existe aún */ }

  const recetaShares    = (allSharesData ?? []).filter((s: any) => s.receta_id)
  const subRecetaShares = (allSharesData ?? []).filter((s: any) => s.sub_receta_id)

  // Fetch receta data
  const recetaIds = recetaShares.map((s: any) => s.receta_id)
  const recetasDirectasData = recetaIds.length > 0
    ? (await admin
        .from('recetas')
        .select('id, nombre, porciones, costo_por_porcion, precio_venta, foto_url')
        .in('id', recetaIds)
      ).data ?? []
    : []

  const recetasDirectas = recetaShares.map((s: any) => {
    const receta = recetasDirectasData.find((r: any) => r.id === s.receta_id)
    if (!receta) return null
    return {
      shareId:             s.id,
      recetaId:            s.receta_id,
      puedeVerPrecios:     s.puede_ver_precios,
      puedeVerProveedores: s.puede_ver_proveedores,
      vista:               s.vista,
      receta: {
        id:               receta.id,
        nombre:           receta.nombre,
        porciones:        receta.porciones,
        costo_por_porcion: receta.costo_por_porcion,
        precio_venta:     receta.precio_venta,
        foto_url:         receta.foto_url,
      },
    }
  }).filter(Boolean)

  // Fetch sub-receta data
  const subRecetaIds = subRecetaShares.map((s: any) => s.sub_receta_id)
  const subRecetasData = subRecetaIds.length > 0
    ? (await admin
        .from('sub_recetas')
        .select('id, nombre, rendimiento, unidad_rendimiento, costo_total')
        .in('id', subRecetaIds)
      ).data ?? []
    : []

  const subRecetasDirectas = subRecetaShares.map((s: any) => {
    const sr = subRecetasData.find((r: any) => r.id === s.sub_receta_id)
    if (!sr) return null
    return {
      shareId:             s.id,
      subRecetaId:         s.sub_receta_id,
      puedeVerPrecios:     s.puede_ver_precios,
      puedeVerProveedores: s.puede_ver_proveedores,
      vista:               s.vista,
      subReceta: {
        id:                sr.id,
        nombre:            sr.nombre,
        rendimiento:       sr.rendimiento,
        unidad_rendimiento: sr.unidad_rendimiento,
        costo_total:       sr.costo_total,
      },
    }
  }).filter(Boolean)

  // ── B. Colaboraciones de menús (lógica existente) ───────────────────────────
  const { data: colabs } = await admin
    .from('colaboradores')
    .select('id, propietario_id')
    .eq('colaborador_user_id', user.id)
    .eq('estado', 'activo')

  const hasDirectShares = recetasDirectas.length > 0 || subRecetasDirectas.length > 0

  if (!colabs?.length && !hasDirectShares) {
    return <CompartidoConmigo comparticiones={[]} recetasDirectas={[]} subRecetasDirectas={[]} />
  }

  if (!colabs?.length) {
    return (
      <CompartidoConmigo
        comparticiones={[]}
        recetasDirectas={recetasDirectas as any}
        subRecetasDirectas={subRecetasDirectas as any}
      />
    )
  }

  const colabIds = colabs.map(c => c.id)
  const { data: permisosBD } = await admin
    .from('colaborador_menus')
    .select('id, colaborador_id, menu_id, puede_ver_recetas, puede_ver_precios, puede_ver_proveedores, puede_editar')
    .in('colaborador_id', colabIds)

  let permisos = permisosBD ?? []

  // Reparar colaboradores sin permisos
  const colabsSinPermisos = colabs.filter(c => !permisos.some(p => p.colaborador_id === c.id))
  for (const colab of colabsSinPermisos) {
    const { data: propietarioMenus } = await admin
      .from('menus').select('id').eq('user_id', colab.propietario_id)
    if (!propietarioMenus?.length) continue
    const { data: nuevos } = await admin
      .from('colaborador_menus')
      .upsert(
        propietarioMenus.map(m => ({
          colaborador_id: colab.id, menu_id: m.id,
          puede_ver_recetas: true, puede_ver_precios: false,
          puede_ver_proveedores: false, puede_editar: false,
        })),
        { onConflict: 'colaborador_id,menu_id' }
      )
      .select('id, colaborador_id, menu_id, puede_ver_recetas, puede_ver_precios, puede_ver_proveedores, puede_editar')
    if (nuevos?.length) permisos = [...permisos, ...nuevos]
  }

  const menuIds = Array.from(new Set(permisos.map(p => p.menu_id)))
  if (!menuIds.length) {
    return (
      <CompartidoConmigo
        comparticiones={[]}
        recetasDirectas={recetasDirectas as any}
        subRecetasDirectas={subRecetasDirectas as any}
      />
    )
  }

  const { data: menusData } = await admin
    .from('menus')
    .select(`
      id, nombre, color, orden,
      menu_recetas(
        id, orden,
        receta:receta_id(id, nombre, costo_por_porcion, precio_venta, foto_url, porciones)
      )
    `)
    .in('id', menuIds)
    .order('orden')

  const menus = menusData ?? []

  const comparticiones = colabs.map(colab => {
    const colabPermisos = permisos.filter(p => p.colaborador_id === colab.id)
    const permisosMapped = colabPermisos.map(cm => {
      const menu = menus.find((m: any) => m.id === cm.menu_id)
      if (!menu) return null
      const recetas = ((menu as any).menu_recetas ?? [])
        .map((mr: any) => mr.receta).filter(Boolean)
        .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))
      return {
        permisoId: cm.id, menuId: cm.menu_id,
        puedeVerRecetas: cm.puede_ver_recetas,
        puedeVerPrecios: cm.puede_ver_precios,
        puedeEditar: cm.puede_editar,
        menu: { id: menu.id, nombre: (menu as any).nombre, color: (menu as any).color, recetas },
      }
    }).filter(Boolean)
    return { colaboradorId: colab.id, permisos: permisosMapped }
  }).filter(c => c.permisos.length > 0)

  return (
    <CompartidoConmigo
      comparticiones={comparticiones as any}
      recetasDirectas={recetasDirectas as any}
      subRecetasDirectas={subRecetasDirectas as any}
    />
  )
}
