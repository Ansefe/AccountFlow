// Supabase Edge Function: create-checkout
// Creates a Paddle transaction and returns checkout URL
// Deploy: supabase functions deploy create-checkout

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const PADDLE_API_KEY = Deno.env.get('PADDLE_API_KEY')!
const PADDLE_ENV = Deno.env.get('PADDLE_ENVIRONMENT') || 'sandbox'
const PADDLE_BASE_URL =
  PADDLE_ENV === 'live' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

// Paddle Price IDs — set as Supabase secrets after creating products in Paddle Dashboard
// Format: pri_01abc123def456
const PLAN_PRICE_MAP: Record<string, string | undefined> = {
  early_bird: Deno.env.get('PADDLE_PRICE_EARLY_BIRD'),
  basic: Deno.env.get('PADDLE_PRICE_BASIC'),
  unlimited: Deno.env.get('PADDLE_PRICE_UNLIMITED')
}

async function paddleRequest(endpoint: string, method: string, body?: unknown) {
  const res = await fetch(`${PADDLE_BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${PADDLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('Paddle API error:', JSON.stringify(data))
    throw new Error(data.error?.detail || `Paddle API error: ${res.status}`)
  }
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { type } = body // 'subscription' or 'credit_package'

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('paddle_customer_id, display_name, plan_type, paddle_subscription_id')
      .eq('id', user.id)
      .single()

    // Get or create Paddle customer
    let customerId = profile?.paddle_customer_id

    if (!customerId) {
      const customerData = await paddleRequest('/customers', 'POST', {
        email: user.email!,
        name: profile?.display_name || user.email!.split('@')[0],
        custom_data: { supabase_user_id: user.id }
      })
      customerId = customerData.data.id

      await supabase
        .from('profiles')
        .update({ paddle_customer_id: customerId })
        .eq('id', user.id)
    }

    // Build success/cancel URLs
    const resultUrl = `${supabaseUrl}/functions/v1/payment-result`

    if (type === 'subscription') {
      const { plan_type: planType } = body as { plan_type: string; type: string }
      const priceId = PLAN_PRICE_MAP[planType]

      if (!priceId) {
        return new Response(
          JSON.stringify({ error: `Precio no configurado para plan: ${planType}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // If user already has a Paddle subscription, cancel it first
      if (profile?.paddle_subscription_id) {
        try {
          await paddleRequest(
            `/subscriptions/${profile.paddle_subscription_id}/cancel`,
            'POST',
            { effective_from: 'immediately' }
          )
        } catch {
          // Subscription may already be cancelled
        }
      }

      // Create a transaction with the subscription price
      const txnData = await paddleRequest('/transactions', 'POST', {
        items: [{ price_id: priceId, quantity: 1 }],
        customer_id: customerId,
        custom_data: {
          supabase_user_id: user.id,
          checkout_type: 'subscription',
          plan_type: planType
        },
        checkout: {
          url: resultUrl
        }
      })

      const checkoutUrl = txnData.data.checkout?.url
      if (!checkoutUrl) {
        throw new Error('No checkout URL returned by Paddle')
      }

      return new Response(JSON.stringify({ url: checkoutUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (type === 'credit_package') {
      const { package_id: packageId } = body as { package_id: string; type: string }

      // Validate user has an active plan
      if (
        !profile?.plan_type ||
        profile.plan_type === 'none' ||
        profile.plan_type === 'unlimited'
      ) {
        return new Response(
          JSON.stringify({
            error: 'Necesitas un plan activo (no Unlimited) para comprar créditos'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Look up package
      const { data: pkg, error: pkgError } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('id', packageId)
        .eq('is_active', true)
        .single()

      if (pkgError || !pkg) {
        return new Response(JSON.stringify({ error: 'Paquete no encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (!pkg.paddle_price_id) {
        return new Response(
          JSON.stringify({ error: 'Paquete no tiene precio de Paddle configurado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const txnData = await paddleRequest('/transactions', 'POST', {
        items: [{ price_id: pkg.paddle_price_id, quantity: 1 }],
        customer_id: customerId,
        custom_data: {
          supabase_user_id: user.id,
          checkout_type: 'credit_package',
          package_id: packageId,
          package_name: pkg.name,
          credits: String(pkg.credits),
          amount_usd: String(pkg.price_usd)
        },
        checkout: {
          url: resultUrl
        }
      })

      const checkoutUrl = txnData.data.checkout?.url
      if (!checkoutUrl) {
        throw new Error('No checkout URL returned by Paddle')
      }

      return new Response(JSON.stringify({ url: checkoutUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Tipo de checkout no válido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('create-checkout error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
