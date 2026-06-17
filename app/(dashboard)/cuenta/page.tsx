export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MiCuenta from '@/components/cuenta/MiCuenta'

export default async function CuentaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan, cancelled, subscription_end_date')
    .eq('id', user.id)
    .maybeSingle()

  // Fallback individual por si alguna columna aún no existe en la BD
  let plan: 'free' | 'basic' | 'pro' = 'free'
  let cancelled = false
  let subscriptionEndDate: string | null = null

  if (profile) {
    plan = (profile.plan ?? 'free') as 'free' | 'basic' | 'pro'
    cancelled = profile.cancelled ?? false
    subscriptionEndDate = profile.subscription_end_date ?? null
  } else {
    // Si la query completa falla, intentar solo con 'plan'
    const { data: planOnly } = await supabase
      .from('user_profiles')
      .select('plan')
      .eq('id', user.id)
      .maybeSingle()
    if (planOnly) plan = (planOnly.plan ?? 'free') as 'free' | 'basic' | 'pro'
  }

  return (
    <MiCuenta
      email={user.email ?? ''}
      nombre={(user.user_metadata?.full_name as string) ?? ''}
      plan={plan}
      cancelled={cancelled}
      subscriptionEndDate={subscriptionEndDate}
    />
  )
}
