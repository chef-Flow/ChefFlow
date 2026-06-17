export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RecetasList from '@/components/recetas/RecetasList'
import type { Receta, Menu } from '@/types'

export default async function RecetasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: recetas }, { data: profile }, { data: menus }] = await Promise.all([
    supabase.from('recetas').select('*').order('nombre'),
    supabase.from('user_profiles').select('iva_porcentaje, margen_minimo').eq('id', user.id).single(),
    supabase.from('menus').select('id, nombre, color').eq('user_id', user.id).order('orden'),
  ])

  return (
    <RecetasList
      initialRecetas={(recetas as Receta[]) ?? []}
      ivaDefault={profile?.iva_porcentaje ?? 16}
      margenMinimoDefault={profile?.margen_minimo ?? 65}
      menus={(menus as Pick<Menu, 'id' | 'nombre' | 'color'>[]) ?? []}
    />
  )
}
