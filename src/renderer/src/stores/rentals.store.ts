import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { supabase } from '@renderer/lib/supabase'
import type { Rental, RentalMatch } from '@renderer/types/database'

export const useRentalsStore = defineStore('rentals', () => {
  const rentals = ref<Rental[]>([])
  const rentalMatches = ref<Map<string, RentalMatch[]>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)

  const heartbeatRunning = ref(false)
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  const activeRentals = computed(() =>
    rentals.value.filter(r => r.status === 'active')
  )

  const pastRentals = computed(() =>
    rentals.value.filter(r => r.status !== 'active')
  )

  // ── Heartbeat (observability only, does NOT release accounts) ──

  async function sendHeartbeat(): Promise<void> {
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        stopHeartbeat()
        return
      }

      const rentalId = activeRentals.value[0]?.id
      await supabase.functions.invoke('heartbeat-ping', {
        body: rentalId ? { rental_id: rentalId } : {}
      })
    } catch {
      // best-effort only
    }
  }

  function startHeartbeat(): void {
    if (heartbeatTimer) return
    heartbeatRunning.value = true
    void sendHeartbeat()
    heartbeatTimer = setInterval(() => {
      void sendHeartbeat()
    }, 60_000)
  }

  function stopHeartbeat(): void {
    heartbeatRunning.value = false
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function syncHeartbeat(): void {
    if (activeRentals.value.length > 0) startHeartbeat()
    else stopHeartbeat()
  }

  // ── Data fetching ──

  async function fetchMyRentals(userId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })

      if (err) {
        error.value = err.message
        return
      }
      rentals.value = (data ?? []) as Rental[]

      // Fetch matches for active rentals
      const activeIds = rentals.value
        .filter(r => r.status === 'active' && r.matches_total)
        .map(r => r.id)

      if (activeIds.length > 0) {
        await fetchRentalMatches(activeIds)
      }

      syncHeartbeat()
    } finally {
      loading.value = false
    }
  }

  async function fetchRentalMatches(rentalIds: string[]): Promise<void> {
    const { data } = await supabase
      .from('rental_matches')
      .select('*')
      .in('rental_id', rentalIds)
      .order('detected_at', { ascending: false })

    if (data) {
      const matchMap = new Map<string, RentalMatch[]>()
      for (const m of data as RentalMatch[]) {
        if (!matchMap.has(m.rental_id)) matchMap.set(m.rental_id, [])
        matchMap.get(m.rental_id)!.push(m)
      }
      rentalMatches.value = matchMap
    }
  }

  function getMatchesForRental(rentalId: string): RentalMatch[] {
    return rentalMatches.value.get(rentalId) ?? []
  }

  // ── Start a match-based rental ──

  async function startRental(
    userId: string,
    accountId: string,
    matchesTotal: number,
    creditsToSpend: number
  ): Promise<{ error: string | null; rental: Rental | null }> {
    const now = new Date()

    const { data, error: err } = await supabase
      .from('rentals')
      .insert({
        user_id: userId,
        account_id: accountId,
        credits_spent: creditsToSpend,
        matches_total: matchesTotal,
        matches_used: 0,
        started_at: now.toISOString(),
        status: 'active'
      })
      .select()
      .single()

    if (err) return { error: err.message, rental: null }

    const rental = data as Rental

    // Mark account as occupied
    await supabase
      .from('accounts')
      .update({ current_rental_id: rental.id })
      .eq('id', accountId)

    rentals.value.unshift(rental)
    syncHeartbeat()
    return { error: null, rental }
  }

  // ── End rental (manual release by user) ──

  async function endRental(rentalId: string, accountId: string): Promise<{ error: string | null }> {
    const { error: err } = await supabase
      .from('rentals')
      .update({
        status: 'cancelled',
        ended_at: new Date().toISOString()
      })
      .eq('id', rentalId)

    if (err) return { error: err.message }

    // Free the account
    await supabase
      .from('accounts')
      .update({ current_rental_id: null })
      .eq('id', accountId)

    const idx = rentals.value.findIndex(r => r.id === rentalId)
    if (idx !== -1) {
      rentals.value[idx] = { ...rentals.value[idx], status: 'cancelled', ended_at: new Date().toISOString() }
    }

    syncHeartbeat()

    return { error: null }
  }

  // ── Realtime subscriptions ──

  function subscribeToChanges(userId: string): void {
    // Listen to rental changes
    supabase
      .channel('my-rentals')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rentals',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const updated = payload.new as Rental
        const idx = rentals.value.findIndex(r => r.id === updated.id)
        if (idx !== -1) {
          rentals.value[idx] = updated
        } else if (payload.eventType === 'INSERT') {
          rentals.value.unshift(updated)
        }

        syncHeartbeat()
      })
      .subscribe()

    // Listen to rental_matches for live match updates
    supabase
      .channel('my-rental-matches')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rental_matches'
      }, (payload) => {
        const newMatch = payload.new as RentalMatch
        // Only add if it belongs to one of our rentals
        const belongsToUs = rentals.value.some(r => r.id === newMatch.rental_id)
        if (!belongsToUs) return

        const existing = rentalMatches.value.get(newMatch.rental_id) ?? []
        rentalMatches.value.set(newMatch.rental_id, [newMatch, ...existing])
        // Trigger reactivity
        rentalMatches.value = new Map(rentalMatches.value)
      })
      .subscribe()
  }

  watch(activeRentals, () => syncHeartbeat(), { deep: false })

  return {
    rentals,
    rentalMatches,
    loading,
    error,
    activeRentals,
    pastRentals,
    fetchMyRentals,
    fetchRentalMatches,
    getMatchesForRental,
    startRental,
    endRental,
    subscribeToChanges
  }
})
