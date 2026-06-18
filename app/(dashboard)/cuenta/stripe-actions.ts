'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export async function crearCheckoutSession(formData: FormData): Promise<never> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const planSolicitado = formData.get('plan') === 'basic' ? 'basic' : 'pro'
  const priceId = planSolicitado === 'basic'
    ? process.env.STRIPE_PRICE_ID_BASIC!
    : process.env.STRIPE_PRICE_ID_PRO!

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cuenta`,
    metadata: {
      supabase_user_id: user.id,
      plan: planSolicitado,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        plan: planSolicitado,
      },
    },
  })

  redirect(session.url!)
}

export async function cancelarSuscripcion(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('stripe_subscription_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_subscription_id) {
    return { ok: false, error: 'No se encontró la suscripción activa.' }
  }

  try {
    const subscription = await getStripe().subscriptions.update(
      profile.stripe_subscription_id,
      { cancel_at_period_end: true }
    ) as any

    const endDate = new Date((subscription.current_period_end as number) * 1000).toISOString()

    await supabase
      .from('user_profiles')
      .update({ cancelled: true, subscription_end_date: endDate })
      .eq('id', user.id)

    revalidatePath('/cuenta')
    return { ok: true }
  } catch (err: any) {
    console.error('[cancelarSuscripcion]', err.message)
    return { ok: false, error: err.message }
  }
}
