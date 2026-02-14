// Supabase Edge Function: heartbeat-sweep
// OBSERVABILITY ONLY — reports which users have stale heartbeats.
// Does NOT release rentals. Rental lifecycle is managed by check-rental-matches.
// Deploy: supabase functions deploy heartbeat-sweep
//
// Auth: service role key as Bearer.

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
  const token = authHeader?.replace('Bearer ', '') || ''
  if (!token || token !== supabaseServiceKey) return jsonResponse({ error: 'Unauthorized' }, 401)

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const staleMs = Number.parseInt(Deno.env.get('HEARTBEAT_STALE_MS') || '180000', 10)
  const cutoff = Date.now() - (Number.isFinite(staleMs) ? staleMs : 180000)

  // Get users with active rentals
  const { data: rentals, error: rentalsErr } = await supabase
    .from('rentals')
    .select('id, user_id, account_id')
    .eq('status', 'active')

  if (rentalsErr) return jsonResponse({ error: rentalsErr.message }, 500)
  const active = (rentals ?? []) as Array<{ id: string; user_id: string; account_id: string }>
  if (!active.length) return jsonResponse({ ok: true, staleUsers: 0, totalActive: 0 })

  const userIds = Array.from(new Set(active.map((r) => r.user_id)))
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, last_heartbeat_at')
    .in('id', userIds)

  if (profErr) return jsonResponse({ error: profErr.message }, 500)

  const staleUsers = (profiles ?? [])
    .filter((p) => {
      const raw = (p as any).last_heartbeat_at as string | null
      if (!raw) return true
      const t = new Date(raw).getTime()
      return !Number.isFinite(t) || t <= cutoff
    })
    .map((p) => (p as any).id as string)

  // Log stale heartbeats for admin observability (no action taken)
  for (const userId of staleUsers) {
    const userRentals = active.filter((r) => r.user_id === userId)
    for (const rental of userRentals) {
      await supabase.from('activity_log').insert({
        user_id: userId,
        event_type: 'heartbeat_timeout',
        metadata: {
          rental_id: rental.id,
          account_id: rental.account_id,
          note: 'Observability only — no action taken. Match tracking handles rental lifecycle.'
        }
      })
    }
  }

  return jsonResponse({ ok: true, staleUsers: staleUsers.length, totalActive: active.length })
})
