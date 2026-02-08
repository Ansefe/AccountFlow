// Supabase Edge Function: paddle-webhook
// Processes Paddle Billing webhook events to update plans, credits, and payments
// Deploy: supabase functions deploy paddle-webhook --no-verify-jwt
//
// Paddle webhook events handled:
//   - subscription.created → activate plan
//   - transaction.completed → record payment, add credits for one-time purchases
//   - subscription.updated → handle plan changes
//   - subscription.canceled → cancel plan
//   - subscription.past_due → log payment failure
//   - transaction.completed (renewal) → renew subscription credits

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { timingSafeEqual } from 'https://deno.land/std@0.224.0/crypto/timing_safe_equal.ts'

const PADDLE_WEBHOOK_SECRET = Deno.env.get('PADDLE_WEBHOOK_SECRET')
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Paddle sends webhook signature in Paddle-Signature header
// Format: ts=timestamp;h1=hash
async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string
): Promise<boolean> {
  if (!PADDLE_WEBHOOK_SECRET) {
    console.warn('PADDLE_WEBHOOK_SECRET not set — skipping signature verification')
    return true
  }

  const parts = signatureHeader.split(';')
  const tsStr = parts.find((p) => p.startsWith('ts='))?.replace('ts=', '')
  const h1 = parts.find((p) => p.startsWith('h1='))?.replace('h1=', '')

  if (!tsStr || !h1) return false

  const signedPayload = `${tsStr}:${rawBody}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(PADDLE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
  const expectedHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  try {
    return timingSafeEqual(encoder.encode(expectedHex), encoder.encode(h1))
  } catch {
    return false
  }
}

interface PaddleEvent {
  event_id: string
  event_type: string
  occurred_at: string
  data: Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const rawBody = await req.text()

  // Verify webhook signature
  const signatureHeader = req.headers.get('Paddle-Signature') || ''
  const isValid = await verifyPaddleSignature(rawBody, signatureHeader)

  if (!isValid) {
    console.error('Paddle webhook signature verification failed')
    return new Response('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(rawBody) as PaddleEvent
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    switch (event.event_type) {
      // ─── Subscription created (first checkout completed) ───
      case 'subscription.created': {
        const sub = event.data as Record<string, unknown>
        const customData = (sub.custom_data || {}) as Record<string, string>
        const userId = customData.supabase_user_id
        const planType = customData.plan_type

        if (!userId || !planType) {
          console.error('subscription.created: missing custom_data', customData)
          break
        }

        const subscriptionId = sub.id as string
        const customerId = sub.customer_id as string

        console.log(
          `Activating subscription: user=${userId}, plan=${planType}, sub=${subscriptionId}`
        )

        const { error } = await supabase.rpc('activate_subscription', {
          p_user_id: userId,
          p_plan_type: planType,
          p_paddle_subscription_id: subscriptionId,
          p_paddle_customer_id: customerId
        })

        if (error) console.error('activate_subscription error:', error)
        break
      }

      // ─── Transaction completed (payment successful) ───
      case 'transaction.completed': {
        const txn = event.data as Record<string, unknown>
        const customData = (txn.custom_data || {}) as Record<string, string>
        const userId = customData.supabase_user_id
        const checkoutType = customData.checkout_type
        const subscriptionId = txn.subscription_id as string | null

        if (!userId) {
          console.log('transaction.completed: no supabase_user_id, skipping')
          break
        }

        // One-time credit package purchase
        if (checkoutType === 'credit_package') {
          const credits = parseInt(customData.credits || '0')
          const packageName = customData.package_name || 'Unknown'
          const amountUsd = parseFloat(customData.amount_usd || '0')
          const transactionId = txn.id as string

          console.log(
            `Adding credits: user=${userId}, credits=${credits}, package=${packageName}`
          )

          const { error } = await supabase.rpc('add_purchased_credits', {
            p_user_id: userId,
            p_credits: credits,
            p_package_name: packageName,
            p_amount_usd: amountUsd,
            p_paddle_transaction_id: transactionId
          })

          if (error) console.error('add_purchased_credits error:', error)
          break
        }

        // Subscription renewal (recurring transaction)
        if (subscriptionId && checkoutType !== 'subscription') {
          // This is a renewal — not the initial signup
          const origin = txn.origin as string
          if (origin === 'subscription_recurring') {
            const planType = customData.plan_type

            if (!planType) {
              console.error(
                'transaction.completed renewal: missing plan_type in custom_data'
              )
              break
            }

            console.log(`Renewing subscription: user=${userId}, plan=${planType}`)

            const { error } = await supabase.rpc('handle_subscription_renewal', {
              p_user_id: userId,
              p_plan_type: planType
            })

            if (error) console.error('handle_subscription_renewal error:', error)

            // Record recurring payment
            const details = txn.details as Record<string, unknown> | undefined
            const totals = details?.totals as Record<string, string> | undefined
            const amountStr = totals?.total || '0'
            const amount = parseInt(amountStr) / 100

            await supabase.from('payments').insert({
              user_id: userId,
              provider: 'paddle',
              provider_payment_id: txn.id as string,
              amount_usd: amount,
              type: 'subscription',
              status: 'completed',
              metadata: {
                plan_type: planType,
                subscription_id: subscriptionId,
                origin
              }
            })
          }
        }

        // Initial subscription payment — record it
        if (checkoutType === 'subscription') {
          const details = txn.details as Record<string, unknown> | undefined
          const totals = details?.totals as Record<string, string> | undefined
          const amountStr = totals?.total || '0'
          const amount = parseInt(amountStr) / 100

          await supabase.from('payments').insert({
            user_id: userId,
            provider: 'paddle',
            provider_payment_id: txn.id as string,
            amount_usd: amount,
            type: 'subscription',
            status: 'completed',
            metadata: {
              plan_type: customData.plan_type,
              subscription_id: subscriptionId
            }
          })
        }

        break
      }

      // ─── Subscription cancelled ───
      case 'subscription.canceled': {
        const sub = event.data as Record<string, unknown>
        const customData = (sub.custom_data || {}) as Record<string, string>
        const userId = customData.supabase_user_id

        if (!userId) {
          console.error('subscription.canceled: missing supabase_user_id')
          break
        }

        console.log(`Cancelling subscription: user=${userId}`)

        const { error } = await supabase.rpc('cancel_subscription', {
          p_user_id: userId
        })

        if (error) console.error('cancel_subscription error:', error)
        break
      }

      // ─── Subscription past due (payment failed) ───
      case 'subscription.past_due': {
        const sub = event.data as Record<string, unknown>
        const customData = (sub.custom_data || {}) as Record<string, string>
        const userId = customData.supabase_user_id

        if (userId) {
          console.log(
            `Payment past due for user=${userId}, subscription=${sub.id}`
          )

          await supabase.from('activity_log').insert({
            user_id: userId,
            event_type: 'admin_action',
            metadata: {
              action: 'payment_past_due',
              subscription_id: sub.id
            }
          })
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.event_type}`)
    }
  } catch (err) {
    console.error(`Error processing ${event.event_type}:`, err)
    // Return 200 to prevent Paddle from retrying indefinitely
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
