import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@renderer/lib/supabase'
import type { Rental, RentalMatch } from '@renderer/types/database'
import { useNotificationsStore } from './notifications.store'

export const useRentalsStore = defineStore('rentals', () => {
  const rentals = ref<Rental[]>([])
  const rentalMatches = ref<Map<string, RentalMatch[]>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeRentals = computed(() =>
    rentals.value.filter(r => r.status === 'active')
  )

  const pastRentals = computed(() =>
    rentals.value.filter(r => r.status !== 'active')
  )

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

    return { error: null }
  }

  // ── Realtime subscriptions ──

  function subscribeToChanges(userId: string): void {
    const notifications = useNotificationsStore()

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

        // Detect status transitions for notifications
        if (idx !== -1) {
          const prev = rentals.value[idx]
          if (prev.status === 'active' && updated.status === 'completed') {
            notifications.success(
              'Alquiler completado',
              `Usaste ${updated.matches_used}/${updated.matches_total} partidas. La cuenta fue liberada.`
            )
          } else if (prev.status === 'active' && updated.status === 'force_released') {
            notifications.warning(
              'Alquiler liberado por inactividad',
              'Se aplicó un reembolso proporcional por las partidas no usadas.'
            )
          } else if (prev.status === 'active' && updated.status === 'cancelled') {
            notifications.info('Alquiler cancelado', 'La cuenta fue liberada exitosamente.')
          }

        rentals.value[idx] = updated
      } else if (payload.eventType === 'INSERT') {
          rentals.value.unshift(updated)
        }
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
        const rental = rentals.value.find(r => r.id === newMatch.rental_id)
        if (!rental) return

        const existing = rentalMatches.value.get(newMatch.rental_id) ?? []
        rentalMatches.value.set(newMatch.rental_id, [newMatch, ...existing])
        // Trigger reactivity
        rentalMatches.value = new Map(rentalMatches.value)

        // Notify about the match
        const champion = newMatch.champion || 'Desconocido'
        const result = newMatch.win ? '✓ Victoria' : '✗ Derrota'
        const matchCount = existing.length + 1
        notifications.info(
          `Partida ${matchCount}/${rental.matches_total} detectada`,
          `${champion} — ${result} (${Math.floor((newMatch.duration_secs || 0) / 60)}min)`
        )
      })
      .subscribe()
  }

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
