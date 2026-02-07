import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@renderer/lib/supabase'
import type { AccountPublic } from '@renderer/types/database'

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<AccountPublic[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const availableAccounts = computed(() =>
    accounts.value.filter(a => !a.current_rental_id && !a.is_banned && a.status === 'active')
  )

  const occupiedCount = computed(() =>
    accounts.value.filter(a => a.current_rental_id).length
  )

  async function fetchAccounts(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('accounts')
        .select('id, name, riot_username, riot_tag, server, elo, elo_division, lp, status, is_banned, ban_type, current_rental_id, last_stats_sync, created_at, updated_at')
        .order('elo', { ascending: false })

      if (err) {
        error.value = err.message
        return
      }
      accounts.value = (data ?? []) as AccountPublic[]
    } finally {
      loading.value = false
    }
  }

  function subscribeToChanges(): void {
    supabase
      .channel('accounts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, (payload) => {
        const updated = payload.new as AccountPublic
        const idx = accounts.value.findIndex(a => a.id === updated.id)
        if (payload.eventType === 'DELETE') {
          if (idx !== -1) accounts.value.splice(idx, 1)
        } else if (idx !== -1) {
          accounts.value[idx] = updated
        } else {
          accounts.value.push(updated)
        }
      })
      .subscribe()
  }

  return {
    accounts,
    loading,
    error,
    availableAccounts,
    occupiedCount,
    fetchAccounts,
    subscribeToChanges
  }
})
