import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import MenuDetalle from '@/components/menus/MenuDetalle'
import type { Menu, Receta, SubReceta } from '@/types'

export default async function MenuDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Run all queries in parallel
  const [menuRes, menuItemsRes, recetasRes, subRecetasRes, profileRes] = await Promise.all([
    supabase.from('menus').select('*').eq('id', id).eq('user_id', user.id).single(),

    supabase.from('menu_recetas')
      .select(`
        id,
        receta:receta_id(id, nombre, porciones, costo_por_porcion, precio_venta),
        sub_receta:sub_receta_id(id, nombre, rendimiento, unidad_rendimiento, costo_total)
      `)
      .eq('menu_id', id)
      .order('orden'),

    supabase.from('recetas')
      .select('id, nombre, porciones, costo_por_porcion, precio_venta, costo_total, updated_at')
      .eq('user_id', user.id)
      .order('nombre'),

    supabase.from('sub_recetas')
      .select('id, nombre, rendimiento, unidad_rendimiento, costo_total')
      .eq('user_id', user.id)
      .order('nombre'),

    supabase.from('user_profiles')
      .select('iva_porcentaje, margen_minimo')
      .eq('id', user.id)
      .single(),
  ])

  if (!menuRes.data) notFound()

  // Log errors to help diagnose schema/RLS issues
  if (menuItemsRes.error) {
    console.error('[MenuDetallePage] menuItems error:', JSON.stringify(menuItemsRes.error))
  }
  if (recetasRes.error) {
    console.error('[MenuDetallePage] recetas error:', JSON.stringify(recetasRes.error))
  }

  // Fallback for menuItems if sub_receta_id column doesn't exist yet (schema_v6 not applied)
  let menuItems = menuItemsRes.data as any[] | null

  if (menuItemsRes.error && (menuItemsRes.error as any).code === 'PGRST200') {
    // schema_v6 not applied yet — fetch without sub_receta join
    const { data: fallback } = await supabase
      .from('menu_recetas')
      .select('id, receta:receta_id(id, nombre, porciones, costo_por_porcion, precio_venta)')
      .eq('menu_id', id)
      .order('orden')

    menuItems = (fallback ?? []).map((row: any) => ({ ...row, sub_receta: null }))
  }

  return (
    <MenuDetalle
      menu={menuRes.data as Menu}
      menuItems={menuItems ?? []}
      recetasDisponibles={(recetasRes.data as Receta[]) ?? []}
      subRecetasDisponibles={(subRecetasRes.data as SubReceta[]) ?? []}
      margenMinimoGlobal={profileRes.data?.margen_minimo ?? 65}
      iva={profileRes.data?.iva_porcentaje ?? 16}
    />
  )
}
