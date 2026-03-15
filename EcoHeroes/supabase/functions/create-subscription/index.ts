import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get user from Supabase auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) throw new Error('No token provided')

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) throw new Error(`Invalid user token: ${userError?.message}`)

    const { priceId } = await req.json()
    if (!priceId) throw new Error('No priceId provided')

    // Validate priceId is one of our known prices
    const validPrices = [
      Deno.env.get('STRIPE_PRICE_MONTHLY'),
      Deno.env.get('STRIPE_PRICE_YEARLY'),
    ]
    if (!validPrices.includes(priceId)) throw new Error('Invalid price ID')

    // Get or create Stripe customer
    const { data: dbUser } = await supabase
      .from('users')
      .select('stripe_customer_id, username')
      .eq('id', user.id)
      .single()

    let customerId = dbUser?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: dbUser?.username || user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create Stripe Checkout session
    // Use origin from request, fall back to app URL for Expo/mobile clients
    const origin = req.headers.get('origin')
      || req.headers.get('referer')?.replace(/\/$/, '')
      || 'https://ecoheroesapp.vercel.app'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/?premium=success`,
      cancel_url: `${origin}/?premium=cancelled`,
      metadata: { supabase_user_id: user.id },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})