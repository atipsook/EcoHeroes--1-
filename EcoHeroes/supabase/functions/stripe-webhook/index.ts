import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    switch (event.type) {

      // ── Payment succeeded → activate premium ──────────────────────────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const subscriptionId = invoice.subscription as string

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const endDate = new Date(subscription.current_period_end * 1000).toISOString()

        await supabase
          .from('users')
          .update({
            is_premium: true,
            subscription_status: 'active',
            subscription_end_date: endDate,
          })
          .eq('stripe_customer_id', customerId)

        console.log('Premium activated for customer:', customerId)
        break
      }

      // ── Subscription updated (e.g. plan change) ───────────────────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const endDate = new Date(subscription.current_period_end * 1000).toISOString()
        const status = subscription.status

        await supabase
          .from('users')
          .update({
            is_premium: status === 'active',
            subscription_status: status,
            subscription_end_date: endDate,
          })
          .eq('stripe_customer_id', customerId)

        console.log('Subscription updated for customer:', customerId, 'status:', status)
        break
      }

      // ── Subscription cancelled → remove premium ───────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await supabase
          .from('users')
          .update({
            is_premium: false,
            subscription_status: 'canceled',
            subscription_end_date: null,
          })
          .eq('stripe_customer_id', customerId)

        console.log('Premium removed for customer:', customerId)
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }
  } catch (err: any) {
    console.error('Error processing webhook:', err.message)
    return new Response(`Processing error: ${err.message}`, { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})