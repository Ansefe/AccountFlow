// Supabase Edge Function: ls-webhook
// Handles Lemon Squeezy webhook events
// Deploy: supabase functions deploy ls-webhook
//
// Configure in Lemon Squeezy Dashboard → Settings → Webhooks:
//   URL: https://<your-project>.supabase.co/functions/v1/ls-webhook
//   Events: subscription_created, subscription_updated, subscription_cancelled,
//           subscription_payment_success, order_created
//   Signing secret: same as LEMONSQUEEZY_WEBHOOK_SECRET

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { createHmac, timingSafeEqual } from 'https://deno.land/std@0.224.0/node/crypto.ts'
import { Buffer } from 'https://deno.land/std@0.224.0/node/buffer.ts'

const WEBHOOK_SECRET = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET')!
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function verifySignature(rawBody: string, signature: string): boolean {
  const hmac = createHmac('sha256', WEBHOOK_SECRET)
  const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8')
  const sig = Buffer.from(signature, 'utf8')
  if (digest.length !== sig.length) return false
  return timingSafeEqual(digest, sig)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const rawBody = await req.text()
    const signature = req.headers.get('X-Signature') || ''

    if (!verifySignature(rawBody, signature)) {
      console.error('Invalid webhook signature')
      return new Response('Invalid signature', { status: 401 })
    }

    const event = JSON.parse(rawBody)
    const eventName: string = event.meta?.event_name
    const customData = event.meta?.custom_data || {}
    const attrs = event.data?.attributes || {}

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`LS webhook: ${eventName}`, { customData, subscriptionId: event.data?.id })

    switch (eventName) {
      // ─── Subscription created (first payment) ───
      case 'subscription_created': {
        const userId = customData.supabase_user_id
        const planType = customData.plan_type
        if (!userId || !planType) {
          console.error('Missing custom_data in subscription_created')
          break
        }

        const subscriptionId = String(event.data.id)
        const customerId = String(attrs.customer_id)

        const { error } = await supabase.rpc('activate_subscription', {
          p_user_id: userId,
          p_plan_type: planType,
          p_ls_subscription_id: subscriptionId,
          p_ls_customer_id: customerId
        })

        if (error) console.error('activate_subscription error:', error)
        else console.log(`Subscription activated: user=${userId} plan=${planType}`)
        break
      }

      // ─── Subscription updated (plan change, pause, etc.) ───
      case 'subscription_updated': {
        const status = attrs.status // active, paused, cancelled, expired, etc.
        const subscriptionId = String(event.data.id)

        // Find the user by subscription ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, plan_type')
          .eq('ls_subscription_id', subscriptionId)
          .single()

        if (!profile) {
          console.warn('No profile found for subscription:', subscriptionId)
          break
        }

        // If subscription went to cancelled/expired, cancel in our system
        if (status === 'expired') {
          const { error } = await supabase.rpc('cancel_subscription', {
            p_user_id: profile.id
          })
          if (error) console.error('cancel_subscription error:', error)
          else console.log(`Subscription expired → cancelled: user=${profile.id}`)
        }
        break
      }

      // ─── Subscription cancelled ───
      case 'subscription_cancelled': {
        const subscriptionId = String(event.data.id)

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('ls_subscription_id', subscriptionId)
          .single()

        if (!profile) {
          console.warn('No profile found for cancelled subscription:', subscriptionId)
          break
        }

        const { error } = await supabase.rpc('cancel_subscription', {
          p_user_id: profile.id
        })
        if (error) console.error('cancel_subscription error:', error)
        else console.log(`Subscription cancelled: user=${profile.id}`)
        break
      }

      // ─── Subscription payment success (renewal) ───
      case 'subscription_payment_success': {
        const subscriptionId = String(attrs.subscription_id)

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, plan_type')
          .eq('ls_subscription_id', subscriptionId)
          .single()

        if (!profile) {
          console.warn('No profile found for renewal subscription:', subscriptionId)
          break
        }

        // Only handle renewals, not first payments (those are handled by subscription_created)
        if (attrs.billing_reason === 'renewal') {
          const { error } = await supabase.rpc('handle_subscription_renewal', {
            p_user_id: profile.id,
            p_plan_type: profile.plan_type
          })
          if (error) console.error('handle_subscription_renewal error:', error)
          else console.log(`Subscription renewed: user=${profile.id}`)
        }
        break
      }

      // ─── Order created (one-time purchase / credit package) ───
      case 'order_created': {
        const userId = customData.supabase_user_id
        const checkoutType = customData.checkout_type

        if (checkoutType !== 'credit_package' || !userId) {
          // Subscription orders are handled via subscription_created
          break
        }

        const credits = parseInt(customData.credits || '0', 10)
        const packageName = customData.package_name || 'Unknown'
        const amountUsd = parseFloat(customData.amount_usd || '0')
        const orderId = String(event.data.id)

        if (credits <= 0) {
          console.error('Invalid credits in order_created:', customData)
          break
        }

        const { error } = await supabase.rpc('add_purchased_credits', {
          p_user_id: userId,
          p_credits: credits,
          p_package_name: packageName,
          p_amount_usd: amountUsd,
          p_ls_order_id: orderId
        })

        if (error) console.error('add_purchased_credits error:', error)
        else console.log(`Credits added: user=${userId} credits=${credits}`)
        break
      }

      default:
        console.log(`Unhandled event: ${eventName}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('ls-webhook error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
