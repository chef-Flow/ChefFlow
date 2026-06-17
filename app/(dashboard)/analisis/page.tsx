export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalisisDashboard from '@/components/analisis/AnalisisDashboard'
import type { Receta } from '@/types'

export default async function AnalisisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [recetasRes, profileRes, menusRes, plataformasRes] = await Promise.all([
    supabase.from('recetas')
      .select('id, nombre, porciones, costo_total, costo_por_porcion, precio_venta, foto_url, plataforma_delivery_id, created_at, updated_at, user_id')
      .eq('user_id', user.id)
      .order('nombre'),
    supabase.from('user_profiles')
      .select('iva_porcentaje, margen_minimo, comision_bancaria')
      .eq('id', user.id)
      .single(),
    supabase.from('menus')
      .select('id, nombre, color, menu_recetas(receta_id)')
      .eq('user_id', user.id)
      .order('orden'),
    supabase.from('plataformas_delivery')
      .select('id, nombre, comision_porcentaje, activa')
      .eq('user_id', user.id)
      .order('nombre'),
  ])

  const menus = (menusRes.data ?? []).map((m: any) => ({
    id: m.id,
    nombre: m.nombre,
    color: m.color,
    recetaIds: (m.menu_recetas as { receta_id: string | null }[])
      .map(mr => mr.receta_id)
      .filter(Boolean) as string[],
  }))

  return (
    <AnalisisDashboard
      recetas={(recetasRes.data as Receta[]) ?? []}
      iva={profileRes.data?.iva_porcentaje ?? 16}
      margenMinimo={profileRes.data?.margen_minimo ?? 65}
      comisionBancaria={profileRes.data?.comision_bancaria ?? 0}
      menus={menus}
      plataformas={(plataformasRes.data ?? []) as { id: string; nombre: string; comision_porcentaje: number; activa: boolean }[]}
    />
  )
}
