// Supabase Edge Function: customer-portal
// Returns a Lemon Squeezy Customer Portal URL for managing subscription
// Deploy: supabase functions deploy customer-portal

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const LS_API_KEY = Deno.env.get('LEMONSQUEEZY_API_KEY')!

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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get Lemon Squeezy customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('ls_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.ls_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No Lemon Squeezy account linked' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the customer object which contains the customer_portal URL
    const res = await fetch(
      `https://api.lemonsqueezy.com/v1/customers/${profile.ls_customer_id}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${LS_API_KEY}`,
          Accept: 'application/vnd.api+json'
        }
      }
    )

    const data = await res.json()

    if (!res.ok) {
      console.error('LS customer error:', JSON.stringify(data))
      throw new Error(data.errors?.[0]?.detail || 'Error fetching customer')
    }

    const portalUrl = data.data.attributes.urls?.customer_portal

    if (!portalUrl) {
      return new Response(
        JSON.stringify({ error: 'No customer portal available. Purchase a subscription first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
