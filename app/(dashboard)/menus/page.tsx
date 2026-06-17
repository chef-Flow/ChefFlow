export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MenusList from '@/components/menus/MenusList'
import type { MenuConRecetas } from '@/types'

export default async function MenusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = (profileData?.plan ?? 'free') as 'free' | 'basic' | 'pro'

  const { data, error } = await supabase
    .from('menus')
    .select(`
      *,
      menu_recetas(
        id,
        receta:receta_id(id, nombre),
        sub_receta:sub_receta_id(id, nombre)
      )
    `)
    .eq('user_id', user.id)
    .order('orden')
    .order('nombre')

  if (error) {
    console.error('[MenusPage] Error fetching menus:', JSON.stringify(error))
  }

  // Si la query falla por columna sub_receta_id inexistente (schema_v6 no aplicado),
  // caemos al query simple para no mostrar lista vacía
  if (error && (error as any).code === 'PGRST200') {
    const { data: fallback, error: fallbackErr } = await supabase
      .from('menus')
      .select('*, menu_recetas(id, receta:receta_id(id, nombre))')
      .eq('user_id', user.id)
      .order('orden')
      .order('nombre')

    if (fallbackErr) {
      console.error('[MenusPage] Fallback query also failed:', JSON.stringify(fallbackErr))
    }

    // Normalize: add sub_receta: null to each menu_receta row
    const normalized = (fallback ?? []).map((m: any) => ({
      ...m,
      menu_recetas: (m.menu_recetas ?? []).map((mr: any) => ({
        ...mr,
        sub_receta: null,
      })),
    }))

    return <MenusList initialMenus={normalized as MenuConRecetas[]} plan={plan} />
  }

  return (
    <MenusList initialMenus={(data as MenuConRecetas[]) ?? []} plan={plan} />
  )
}
