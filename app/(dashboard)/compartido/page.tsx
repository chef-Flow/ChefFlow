export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { aceptarInvitacionesPendientes } from '@/app/(dashboard)/colaboradores/actions'
import CompartidoConmigo from '@/components/colaboradores/CompartidoConmigo'

export default async function CompartidoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await aceptarInvitacionesPendientes()

  const { data: colabs } = await supabase
    .from('colaboradores')
    .select('id, propietario_id, colaborador_menus(id, menu_id, puede_ver_recetas, puede_ver_precios, puede_editar)')
    .eq('colaborador_user_id', user.id)
    .eq('estado', 'activo')

  const menuIds = (colabs ?? []).flatMap(
    c => (c.colaborador_menus as any[]).map((cm: any) => cm.menu_id)
  )

  const menusData = menuIds.length > 0
    ? (await supabase
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
      ).data ?? []
    : []

  const comparticiones = (colabs ?? []).map(c => ({
    colaboradorId: c.id,
    permisos: (c.colaborador_menus as any[]).map((cm: any) => {
      const menu = menusData.find((m: any) => m.id === cm.menu_id)
      if (!menu) return null
      const recetas = ((menu as any).menu_recetas ?? [])
        .map((mr: any) => mr.receta)
        .filter(Boolean)
        .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))
      return {
        permisoId: cm.id,
        menuId:    cm.menu_id,
        puedeVerRecetas: cm.puede_ver_recetas,
        puedeVerPrecios: cm.puede_ver_precios,
        puedeEditar:     cm.puede_editar,
        menu: {
          id:     menu.id,
          nombre: (menu as any).nombre,
          color:  (menu as any).color,
          recetas,
        },
      }
    }).filter(Boolean),
  })).filter(c => c.permisos.length > 0)

  return <CompartidoConmigo comparticiones={comparticiones as any} />
}
