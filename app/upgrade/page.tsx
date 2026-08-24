import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import { crearCheckoutSession } from '@/app/(dashboard)/cuenta/stripe-actions'

export const dynamic = 'force-dynamic'

const PLAN_RANK = { free: 0, basic: 1, pro: 2 } as const

// Punto de entrada tras registro/login desde un botón "Empezar" de un plan
// pagado en la landing: crea la sesión de checkout de Stripe de una vez,
// sin que el usuario tenga que volver a elegir el plan manualmente.
export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const { plan } = await searchParams

  if (plan !== 'basic' && plan !== 'pro') {
    redirect('/analisis')
  }

  const { data: { user } } = await getUser()
  if (!user) redirect(`/login?plan=${plan}`)

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('id', user.id)
    .maybeSingle()

  const currentPlan = (profile?.plan ?? 'free') as keyof typeof PLAN_RANK

  // Ya tiene este plan o uno mejor — evita crear una suscripción duplicada.
  if (PLAN_RANK[currentPlan] >= PLAN_RANK[plan]) {
    redirect('/analisis')
  }

  const formData = new FormData()
  formData.set('plan', plan)
  await crearCheckoutSession(formData)
}
