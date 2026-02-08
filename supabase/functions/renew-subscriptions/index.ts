// Supabase Edge Function: renew-subscriptions
// Replaces pg_cron for Supabase Free tier
// Called daily by GitHub Actions cron workflow
// Handles manually-managed subscriptions (admin-granted plans without Paddle)
// Paddle-managed subscriptions are renewed via webhook on transaction.completed
// Deploy: supabase functions deploy renew-subscriptions --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Simple shared secret to authorize the cron call
const cronSecret = Deno.env.get('CRON_SECRET')

Deno.serve(async (req) => {
  // Verify authorization: accept service_role key or CRON_SECRET
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')

  const isAuthorized =
    token === supabaseServiceKey || (cronSecret && token === cronSecret)

  if (!isAuthorized) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call the renew_expired_subscriptions function defined in migration 002
    const { error } = await supabase.rpc('renew_expired_subscriptions')

    if (error) {
      console.error('renew_expired_subscriptions error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log('Subscription renewal completed successfully')

    return new Response(
      JSON.stringify({ success: true, timestamp: new Date().toISOString() }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('renew-subscriptions error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
