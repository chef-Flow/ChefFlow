export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { aceptarInvitacionesPendientes } from '@/app/(dashboard)/colaboradores/actions'
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

  // Acepta invitaciones pendientes (si las hay) y crea permisos por defecto
  await aceptarInvitacionesPendientes()

  const admin = getAdmin()

  // ── 1. Buscar colaboraciones activas para este usuario ──────────────────────
  // Usamos admin para bypassear RLS (las políticas del schema solo permiten al propietario leer)
  const { data: colabs } = await admin
    .from('colaboradores')
    .select('id, propietario_id')
    .eq('colaborador_user_id', user.id)
    .eq('estado', 'activo')

  if (!colabs?.length) {
    return <CompartidoConmigo comparticiones={[]} />
  }

  // ── 2. Buscar permisos (query plana, sin nested select) ─────────────────────
  const colabIds = colabs.map(c => c.id)
  const { data: permisosBD } = await admin
    .from('colaborador_menus')
    .select('id, colaborador_id, menu_id, puede_ver_recetas, puede_ver_precios, puede_ver_proveedores, puede_editar')
    .in('colaborador_id', colabIds)

  let permisos = permisosBD ?? []

  // ── 3. Reparar: colaboradores activos sin permisos ──────────────────────────
  // Cubre el caso donde aceptaron antes de que existiera la auto-creación de permisos
  const colabsSinPermisos = colabs.filter(c => !permisos.some(p => p.colaborador_id === c.id))

  for (const colab of colabsSinPermisos) {
    const { data: propietarioMenus } = await admin
      .from('menus')
      .select('id')
      .eq('user_id', colab.propietario_id)

    if (!propietarioMenus?.length) continue

    const { data: nuevos } = await admin
      .from('colaborador_menus')
      .upsert(
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
      .select('id, colaborador_id, menu_id, puede_ver_recetas, puede_ver_precios, puede_ver_proveedores, puede_editar')

    if (nuevos?.length) {
      permisos = [...permisos, ...nuevos]
    }
  }

  // ── 4. Obtener los menús referenciados ──────────────────────────────────────
  const menuIds = Array.from(new Set(permisos.map(p => p.menu_id)))

  if (!menuIds.length) {
    return <CompartidoConmigo comparticiones={[]} />
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

  // ── 5. Construir comparticiones ─────────────────────────────────────────────
  const comparticiones = colabs.map(colab => {
    const colabPermisos = permisos.filter(p => p.colaborador_id === colab.id)

    const permisosMapped = colabPermisos.map(cm => {
      const menu = menus.find((m: any) => m.id === cm.menu_id)
      if (!menu) return null

      const recetas = ((menu as any).menu_recetas ?? [])
        .map((mr: any) => mr.receta)
        .filter(Boolean)
        .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))

      return {
        permisoId: cm.id,
        menuId: cm.menu_id,
        puedeVerRecetas: cm.puede_ver_recetas,
        puedeVerPrecios: cm.puede_ver_precios,
        puedeEditar: cm.puede_editar,
        menu: {
          id: menu.id,
          nombre: (menu as any).nombre,
          color: (menu as any).color,
          recetas,
        },
      }
    }).filter(Boolean)

    return { colaboradorId: colab.id, permisos: permisosMapped }
  }).filter(c => c.permisos.length > 0)

  return <CompartidoConmigo comparticiones={comparticiones as any} />
}
