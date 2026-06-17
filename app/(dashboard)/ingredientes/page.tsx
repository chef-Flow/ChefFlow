export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import IngredientesList from '@/components/ingredientes/IngredientesList'
import type { Ingrediente } from '@/types'

export default async function IngredientesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: ingredientes }, { data: profile }] = await Promise.all([
    supabase.from('ingredientes').select('*').order('nombre'),
    supabase.from('user_profiles').select('plan').eq('id', user.id).single(),
  ])

  return (
    <IngredientesList
      initialIngredientes={(ingredientes as Ingrediente[]) ?? []}
      plan={(profile?.plan ?? 'free') as 'free' | 'basic' | 'pro'}
    />
  )
}
