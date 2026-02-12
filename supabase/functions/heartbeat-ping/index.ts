// Supabase Edge Function: heartbeat-ping
// Updates profiles.last_heartbeat_at for the authenticated user.
// Deploy: supabase functions deploy heartbeat-ping
//
// POST { rental_id?: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const token = authHeader.replace('Bearer ', '')

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) return jsonResponse({ error: 'Unauthorized' }, 401)

  const userId = userData.user.id

  let rentalId: string | null = null
  try {
    const body = await req.json().catch(() => ({}))
    rentalId = typeof body?.rental_id === 'string' ? body.rental_id : null
  } catch {
    rentalId = null
  }

  const now = new Date().toISOString()

  const { error: updErr } = await supabase
    .from('profiles')
    .update({ last_heartbeat_at: now })
    .eq('id', userId)

  if (updErr) return jsonResponse({ error: updErr.message }, 500)

  return jsonResponse({ ok: true, at: now })
})
