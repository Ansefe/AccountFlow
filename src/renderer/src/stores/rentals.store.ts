import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@renderer/lib/supabase'
import type { Rental } from '@renderer/types/database'

export const useRentalsStore = defineStore('rentals', () => {
  const rentals = ref<Rental[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeRentals = computed(() =>
    rentals.value.filter(r => r.status === 'active')
  )

  const pastRentals = computed(() =>
    rentals.value.filter(r => r.status !== 'active')
  )

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
    } finally {
      loading.value = false
    }
  }

  async function startRental(
    userId: string,
    accountId: string,
    durationMinutes: number,
    creditsToSpend: number
  ): Promise<{ error: string | null; rental: Rental | null }> {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000)

    const { data, error: err } = await supabase
      .from('rentals')
      .insert({
        user_id: userId,
        account_id: accountId,
        credits_spent: creditsToSpend,
        duration_minutes: durationMinutes,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
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

  function subscribeToChanges(userId: string): void {
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
      })
      .subscribe()
  }

  return {
    rentals,
    loading,
    error,
    activeRentals,
    pastRentals,
    fetchMyRentals,
    startRental,
    endRental,
    subscribeToChanges
  }
})
