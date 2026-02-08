// Supabase Edge Function: customer-portal
// Returns a Paddle Customer Portal session URL for managing subscription
// Deploy: supabase functions deploy customer-portal

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    // Get Paddle customer ID and subscription ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('paddle_customer_id, paddle_subscription_id')
      .eq('id', user.id)
      .single()

    if (!profile?.paddle_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No tienes una cuenta de Paddle vinculada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create customer portal session via Paddle API
    const portalBody: Record<string, unknown> = {}

    // If user has a subscription, include it for deep links
    if (profile.paddle_subscription_id) {
      portalBody.subscription_ids = [profile.paddle_subscription_id]
    }

    const res = await fetch(
      `${PADDLE_BASE_URL}/customers/${profile.paddle_customer_id}/portal-sessions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PADDLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(portalBody)
      }
    )

    const data = await res.json()

    if (!res.ok) {
      console.error('Paddle portal error:', JSON.stringify(data))
      throw new Error(data.error?.detail || 'Error creating portal session')
    }

    const portalUrl = data.data.urls.general.overview

    return new Response(JSON.stringify({ url: portalUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('customer-portal error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
