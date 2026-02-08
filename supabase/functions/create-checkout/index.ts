// Supabase Edge Function: create-checkout
// Creates a Lemon Squeezy checkout and returns the checkout URL
// Deploy: supabase functions deploy create-checkout

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const LS_API_KEY = Deno.env.get('LEMONSQUEEZY_API_KEY')!
const LS_STORE_ID = Deno.env.get('LEMONSQUEEZY_STORE_ID')!

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

// Lemon Squeezy Variant IDs — set as Supabase secrets after creating products
const PLAN_VARIANT_MAP: Record<string, string | undefined> = {
  early_bird: Deno.env.get('LS_VARIANT_EARLY_BIRD'),
  basic: Deno.env.get('LS_VARIANT_BASIC'),
  unlimited: Deno.env.get('LS_VARIANT_UNLIMITED')
}

async function lsRequest(endpoint: string, method: string, body?: unknown) {
  const res = await fetch(`https://api.lemonsqueezy.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${LS_API_KEY}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json'
    },
    body: body ? JSON.stringify(body) : undefined
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('Lemon Squeezy API error:', JSON.stringify(data))
    throw new Error(data.errors?.[0]?.detail || `LS API error: ${res.status}`)
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

    const body = await req.json()
    const { type } = body // 'subscription' or 'credit_package'

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('ls_customer_id, display_name, plan_type, ls_subscription_id')
      .eq('id', user.id)
      .single()

    // Build success URL
    const resultUrl = `${supabaseUrl}/functions/v1/payment-result`

    if (type === 'subscription') {
      const { plan_type: planType } = body as { plan_type: string; type: string }
      const variantId = PLAN_VARIANT_MAP[planType]

      if (!variantId) {
        return new Response(
          JSON.stringify({ error: `Variant not configured for plan: ${planType}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // If user already has an active LS subscription, cancel it first
      if (profile?.ls_subscription_id) {
        try {
          await lsRequest(`/subscriptions/${profile.ls_subscription_id}`, 'PATCH', {
            data: {
              type: 'subscriptions',
              id: profile.ls_subscription_id,
              attributes: { cancelled: true }
            }
          })
        } catch {
          // Subscription may already be cancelled
        }
      }

      // Create a checkout via Lemon Squeezy API
      const checkoutData = await lsRequest('/checkouts', 'POST', {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: user.email,
              name: profile?.display_name || user.email!.split('@')[0],
              custom: {
                supabase_user_id: user.id,
                checkout_type: 'subscription',
                plan_type: planType
              }
            },
            product_options: {
              redirect_url: resultUrl
            }
          },
          relationships: {
            store: { data: { type: 'stores', id: LS_STORE_ID } },
            variant: { data: { type: 'variants', id: variantId } }
          }
        }
      })

      const checkoutUrl = checkoutData.data.attributes.url
      if (!checkoutUrl) {
        throw new Error('No checkout URL returned by Lemon Squeezy')
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
            error: 'You need an active plan (not Unlimited) to buy credits'
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
        return new Response(JSON.stringify({ error: 'Package not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (!pkg.ls_variant_id) {
        return new Response(
          JSON.stringify({ error: 'Package does not have a Lemon Squeezy variant configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const checkoutData = await lsRequest('/checkouts', 'POST', {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: user.email,
              name: profile?.display_name || user.email!.split('@')[0],
              custom: {
                supabase_user_id: user.id,
                checkout_type: 'credit_package',
                package_id: packageId,
                package_name: pkg.name,
                credits: String(pkg.credits),
                amount_usd: String(pkg.price_usd)
              }
            },
            product_options: {
              redirect_url: resultUrl
            }
          },
          relationships: {
            store: { data: { type: 'stores', id: LS_STORE_ID } },
            variant: { data: { type: 'variants', id: pkg.ls_variant_id } }
          }
        }
      })

      const checkoutUrl = checkoutData.data.attributes.url
      if (!checkoutUrl) {
        throw new Error('No checkout URL returned by Lemon Squeezy')
      }

      return new Response(JSON.stringify({ url: checkoutUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid checkout type' }), {
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
