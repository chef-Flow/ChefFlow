import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function planFromPriceId(priceId: string): 'basic' | 'pro' | null {
  if (priceId === process.env.STRIPE_PRICE_ID_BASIC) return 'basic'
  if (priceId === process.env.STRIPE_PRICE_ID_PRO)   return 'pro'
  return null
}

// 3-tier user resolution:
// 1. supabase_user_id in Stripe metadata (real checkout sessions always have this)
// 2. stripe_customer_id stored in user_profiles (fast DB lookup for returning customers)
// 3. email lookup via auth.admin.listUsers (fallback for test events or missing metadata)
async function resolveUserId(
  metadataId: string | undefined | null,
  customerId: string | null | undefined,
  email: string | null | undefined,
): Promise<string | null> {
  if (metadataId) return metadataId

  if (customerId) {
    const { data } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    if (data?.id) {
      console.log(`[stripe/webhook] resolveUserId: found via stripe_customer_id=${customerId}`)
      return data.id
    }
  }

  if (email) {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (error) {
      console.error('[stripe/webhook] resolveUserId: listUsers error', error.message)
      return null
    }
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (user) {
      console.log(`[stripe/webhook] resolveUserId: found via email=${email}`)
      return user.id
    }
  }

  console.warn('[stripe/webhook] resolveUserId: could not resolve user', { metadataId, customerId, email })
  return null
}

async function setPlan(
  userId: string,
  plan: 'free' | 'basic' | 'pro',
  customerId?: string,
  subscriptionId?: string,
) {
  const update: Record<string, unknown> = { plan }
  if (customerId)     update.stripe_customer_id     = customerId
  if (subscriptionId) update.stripe_subscription_id = subscriptionId

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update(update)
    .eq('id', userId)

  if (error) {
    console.error('[stripe/webhook] setPlan error:', error.message)
  } else {
    revalidatePath('/cuenta')
    revalidatePath('/recetas')
    revalidatePath('/sub-recetas')
    revalidatePath('/colaboradores')
  }
}

export async function POST(request: Request) {
  const body      = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('[stripe/webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {

      // Pago completado en Stripe Checkout
      case 'checkout.session.completed': {
        const session    = event.data.object as Stripe.Checkout.Session
        const customerId = session.customer as string
        const email      = session.customer_details?.email ?? session.customer_email

        const userId = await resolveUserId(
          session.metadata?.supabase_user_id,
          customerId,
          email,
        )
        if (!userId) break

        const subscriptionId = session.subscription as string

        // Prefer metadata plan; fall back to price lookup
        let plan: 'basic' | 'pro' = session.metadata?.plan === 'basic' ? 'basic' : 'pro'
        if (!session.metadata?.plan && subscriptionId) {
          const sub    = await getStripe().subscriptions.retrieve(subscriptionId)
          const fromId = planFromPriceId(sub.items.data[0]?.price.id)
          if (fromId) plan = fromId
        }

        await setPlan(userId, plan, customerId, subscriptionId)
        console.log(`[stripe/webhook] checkout.session.completed: user=${userId} plan=${plan}`)
        break
      }

      // Plan cambiado, renovado, o reactivado
      case 'customer.subscription.updated': {
        const sub        = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string

        if (sub.status !== 'active') break

        const priceId = sub.items.data[0]?.price.id
        const plan    = planFromPriceId(priceId)
        if (!plan) {
          console.warn('[stripe/webhook] customer.subscription.updated: unknown priceId', priceId)
          break
        }

        const customer = await getStripe().customers.retrieve(customerId) as Stripe.Customer
        const userId   = await resolveUserId(
          sub.metadata?.supabase_user_id,
          customerId,
          customer.email,
        )
        if (!userId) break

        // Si el usuario reactivó (cancel_at_period_end volvió a false), limpiar cancelación
        const prevSub = event.data.previous_attributes as Partial<Stripe.Subscription>
        if (prevSub?.cancel_at_period_end === true && !sub.cancel_at_period_end) {
          await supabaseAdmin
            .from('user_profiles')
            .update({ cancelled: false, subscription_end_date: null })
            .eq('id', userId)
        }

        await setPlan(userId, plan, customerId, sub.id)
        console.log(`[stripe/webhook] customer.subscription.updated: user=${userId} plan=${plan}`)
        break
      }

      // Suscripción expirada (período terminó tras cancelación)
      case 'customer.subscription.deleted': {
        const sub        = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string

        const customer = await getStripe().customers.retrieve(customerId) as Stripe.Customer
        const userId   = await resolveUserId(
          sub.metadata?.supabase_user_id,
          customerId,
          customer.email,
        )
        if (!userId) break

        await supabaseAdmin
          .from('user_profiles')
          .update({
            plan: 'free',
            stripe_subscription_id: null,
            cancelled: false,
            subscription_end_date: null,
          })
          .eq('id', userId)

        revalidatePath('/cuenta')
        revalidatePath('/recetas')
        revalidatePath('/sub-recetas')
        revalidatePath('/colaboradores')
        console.log(`[stripe/webhook] customer.subscription.deleted: user=${userId} reverted to free`)
        break
      }

      // Pago fallido — loguear sin revocar acceso inmediatamente
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId   = (invoice as any).subscription as string | null
        if (subId) {
          const sub    = await getStripe().subscriptions.retrieve(subId)
          const userId = sub.metadata?.supabase_user_id
          if (userId) console.warn('[stripe/webhook] invoice.payment_failed for user:', userId)
        }
        break
      }
    }
  } catch (err: any) {
    console.error('[stripe/webhook] Handler error:', err.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
