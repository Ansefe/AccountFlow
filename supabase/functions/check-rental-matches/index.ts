// Supabase Edge Function: check-rental-matches
// Polls Riot Match-v5 API for each active rental, deducts matches,
// handles idle timeout (no matches in configurable period) with proportional refund,
// and completes rentals when all matches are consumed.
//
// Deploy: supabase functions deploy check-rental-matches --no-verify-jwt
// Auth:   service role key OR CRON_SECRET as Bearer.
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RIOT_API_KEY, CRON_SECRET

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const riotApiKey = Deno.env.get('RIOT_API_KEY') || ''
const cronSecret = Deno.env.get('CRON_SECRET')

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

// ── Riot API routing ──

/** Map account server to Riot regional route (for Match-v5) */
function getRegionalRoute(server: string): string {
  const map: Record<string, string> = {
    NA: 'americas', LAN: 'americas', LAS: 'americas', BR: 'americas', OCE: 'americas',
    EUW: 'europe', EUNE: 'europe', TR: 'europe', RU: 'europe',
    KR: 'asia', JP: 'asia',
    PH: 'sea', SG: 'sea', TW: 'sea', TH: 'sea', VN: 'sea'
  }
  return map[server] || 'americas'
}

interface MatchInfo {
  matchId: string
  gameMode: string
  champion: string
  win: boolean
  durationSecs: number
}

/** Fetch match IDs for a puuid since a given epoch (seconds). */
async function fetchMatchIds(
  puuid: string,
  region: string,
  startTimeEpochSec: number,
  count = 100
): Promise<string[]> {
  const url = `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?startTime=${startTimeEpochSec}&count=${count}`
  const res = await fetch(url, {
    headers: { 'X-Riot-Token': riotApiKey }
  })
  if (!res.ok) {
    console.error(`Riot matchIds error ${res.status}: ${await res.text()}`)
    return []
  }
  return (await res.json()) as string[]
}

/** Fetch match detail for enrichment (champion, win, duration, gameMode). */
async function fetchMatchDetail(matchId: string, region: string): Promise<MatchInfo | null> {
  const url = `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}`
  const res = await fetch(url, {
    headers: { 'X-Riot-Token': riotApiKey }
  })
  if (!res.ok) {
    console.error(`Riot matchDetail error ${res.status} for ${matchId}`)
    return null
  }
  const data = await res.json()
  // data.info.participants is an array; we need to find the participant by puuid
  // but we don't have puuid here — caller should pass it. For simplicity we return
  // generic info and let the caller enrich.
  return {
    matchId,
    gameMode: data?.info?.gameMode ?? 'UNKNOWN',
    champion: '', // will be set by caller with puuid
    win: false,
    durationSecs: data?.info?.gameDuration ?? 0
  }
}

/** Fetch match detail and extract participant-specific data. */
async function fetchMatchDetailForPuuid(
  matchId: string,
  region: string,
  puuid: string
): Promise<MatchInfo | null> {
  const url = `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}`
  const res = await fetch(url, {
    headers: { 'X-Riot-Token': riotApiKey }
  })
  if (!res.ok) {
    console.error(`Riot matchDetail error ${res.status} for ${matchId}`)
    return null
  }
  const data = await res.json()
  const participants = data?.info?.participants as Array<Record<string, unknown>> | undefined
  const player = participants?.find((p) => p.puuid === puuid)

  return {
    matchId,
    gameMode: (data?.info?.gameMode as string) ?? 'UNKNOWN',
    champion: (player?.championName as string) ?? 'Unknown',
    win: (player?.win as boolean) ?? false,
    durationSecs: (data?.info?.gameDuration as number) ?? 0
  }
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  // Auth: accept service_role key or CRON_SECRET
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') || ''
  const isAuthorized = token === supabaseServiceKey || (cronSecret && token === cronSecret)
  if (!token || !isAuthorized) return jsonResponse({ error: 'Unauthorized' }, 401)

  if (!riotApiKey) return jsonResponse({ error: 'RIOT_API_KEY not configured' }, 500)

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // ── Load configurable idle timeout ──
  const { data: idleSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'idle_timeout_minutes')
    .single()

  const idleTimeoutMs = (typeof idleSetting?.value === 'number'
    ? idleSetting.value
    : typeof idleSetting?.value === 'string'
      ? Number.parseInt(idleSetting.value, 10)
      : 60) * 60 * 1000 // default 60 min → ms

  // ── Get all active match-based rentals ──
  const { data: rentals, error: rentalsErr } = await supabase
    .from('rentals')
    .select('id, user_id, account_id, credits_spent, matches_total, matches_used, last_match_at, started_at, status')
    .eq('status', 'active')

  if (rentalsErr) return jsonResponse({ error: rentalsErr.message }, 500)
  const active = (rentals ?? []) as Array<{
    id: string
    user_id: string
    account_id: string
    credits_spent: number
    matches_total: number
    matches_used: number
    last_match_at: string | null
    started_at: string
  }>

  if (!active.length) return jsonResponse({ ok: true, checked: 0, newMatches: 0, completed: 0, idleReleased: 0 })

  // ── Load accounts for puuid + server ──
  const accountIds = active.map((r) => r.account_id)
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, puuid, server')
    .in('id', accountIds)

  const accountMap = new Map<string, { puuid: string; server: string }>()
  for (const a of (accounts ?? []) as Array<{ id: string; puuid: string | null; server: string }>) {
    if (a.puuid) accountMap.set(a.id, { puuid: a.puuid, server: a.server })
  }

  // ── Load already-tracked match IDs per rental ──
  const rentalIds = active.map((r) => r.id)
  const { data: existingMatches } = await supabase
    .from('rental_matches')
    .select('rental_id, match_id')
    .in('rental_id', rentalIds)

  const trackedByRental = new Map<string, Set<string>>()
  for (const m of (existingMatches ?? []) as Array<{ rental_id: string; match_id: string }>) {
    if (!trackedByRental.has(m.rental_id)) trackedByRental.set(m.rental_id, new Set())
    trackedByRental.get(m.rental_id)!.add(m.match_id)
  }

  // ── Process each rental ──
  const now = Date.now()
  const endedAt = new Date().toISOString()
  let totalNewMatches = 0
  let totalCompleted = 0
  let totalIdleReleased = 0

  for (const rental of active) {
    const acc = accountMap.get(rental.account_id)
    if (!acc) continue // no puuid → skip

    const region = getRegionalRoute(acc.server)
    const startEpochSec = Math.floor(new Date(rental.started_at).getTime() / 1000)

    // Fetch match IDs from Riot API since rental started
    const matchIds = await fetchMatchIds(acc.puuid, region, startEpochSec)

    // Filter out already-tracked
    const tracked = trackedByRental.get(rental.id) ?? new Set()
    const newMatchIds = matchIds.filter((id) => !tracked.has(id))

    let matchesAdded = 0

    for (const matchId of newMatchIds) {
      // Fetch match detail for enrichment
      const detail = await fetchMatchDetailForPuuid(matchId, region, acc.puuid)
      if (!detail) continue

      // Insert into rental_matches (ignore conflict = already tracked)
      const { error: insertErr } = await supabase
        .from('rental_matches')
        .insert({
          rental_id: rental.id,
          match_id: matchId,
          game_mode: detail.gameMode,
          champion: detail.champion,
          win: detail.win,
          duration_secs: detail.durationSecs
        })

      if (!insertErr) matchesAdded++
    }

    if (matchesAdded > 0) {
      totalNewMatches += matchesAdded
      const newUsed = rental.matches_used + matchesAdded
      const matchNow = new Date().toISOString()

      // Update rental counters
      await supabase
        .from('rentals')
        .update({
          matches_used: newUsed,
          last_match_at: matchNow
        })
        .eq('id', rental.id)

      // Log each match detected
      await supabase.from('activity_log').insert({
        user_id: rental.user_id,
        event_type: 'match_detected',
        metadata: {
          rental_id: rental.id,
          account_id: rental.account_id,
          matches_added: matchesAdded,
          matches_used: newUsed,
          matches_total: rental.matches_total
        }
      })

      // ── Check if all matches consumed ──
      if (newUsed >= rental.matches_total) {
        await supabase
          .from('rentals')
          .update({ status: 'completed', ended_at: endedAt })
          .eq('id', rental.id)
          .eq('status', 'active')

        await supabase
          .from('accounts')
          .update({ current_rental_id: null })
          .eq('id', rental.account_id)
          .eq('current_rental_id', rental.id)

        await supabase.from('activity_log').insert({
          user_id: rental.user_id,
          event_type: 'rental_completed',
          metadata: {
            rental_id: rental.id,
            account_id: rental.account_id,
            matches_used: newUsed,
            matches_total: rental.matches_total
          }
        })

        totalCompleted++
        continue // done with this rental
      }
    }

    // ── Check idle timeout ──
    // Reference time: last_match_at if any match was played, otherwise started_at
    const refTime = rental.last_match_at
      ? new Date(rental.last_match_at).getTime()
      : new Date(rental.started_at).getTime()

    // Also account for matches we just detected above
    const effectiveRefTime = matchesAdded > 0 ? now : refTime

    if (matchesAdded === 0 && (now - effectiveRefTime) > idleTimeoutMs) {
      // Per-match cost × remaining matches
      const costPerMatch = rental.credits_spent / rental.matches_total
      const matchesRemaining = rental.matches_total - (rental.matches_used + matchesAdded)
      const creditsToRefund = Math.floor(costPerMatch * matchesRemaining)

      // Mark rental as force_released
      await supabase
        .from('rentals')
        .update({ status: 'force_released', ended_at: endedAt })
        .eq('id', rental.id)
        .eq('status', 'active')

      // Free the account
      await supabase
        .from('accounts')
        .update({ current_rental_id: null })
        .eq('id', rental.account_id)
        .eq('current_rental_id', rental.id)

      // Proportional credit refund: per-match cost × remaining matches
      if (creditsToRefund > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('purchased_credits')
          .eq('id', rental.user_id)
          .single()

        if (profile) {
          await supabase
            .from('profiles')
            .update({ purchased_credits: (profile as any).purchased_credits + creditsToRefund })
            .eq('id', rental.user_id)
        }

        // Log the refund transaction
        await supabase.from('credit_transactions').insert({
          user_id: rental.user_id,
          amount: creditsToRefund,
          balance_type: 'purchased',
          type: 'refund',
          reference_id: rental.id,
          description: `Reembolso proporcional: ${matchesRemaining}/${rental.matches_total} partidas no usadas (idle timeout)`
        })
      }

      // Log
      await supabase.from('activity_log').insert({
        user_id: rental.user_id,
        event_type: 'idle_timeout',
        metadata: {
          rental_id: rental.id,
          account_id: rental.account_id,
          matches_used: rental.matches_used,
          matches_total: rental.matches_total,
          credits_refunded: creditsToRefund,
          idle_timeout_ms: idleTimeoutMs
        }
      })

      totalIdleReleased++
    }
  }

  return jsonResponse({
    ok: true,
    checked: active.length,
    newMatches: totalNewMatches,
    completed: totalCompleted,
    idleReleased: totalIdleReleased
  })
})
