import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@renderer/lib/supabase'
import type { Account, Profile, ActivityLog } from '@renderer/types/database'

// Type for accounts returned from Edge Function (without encrypted_password)
type AdminAccount = Omit<Account, 'encrypted_password'> & {
  account_credentials?: { login_username: string }[] | null
}

export const useAdminStore = defineStore('admin', () => {
  const accounts = ref<AdminAccount[]>([])
  const users = ref<Profile[]>([])
  const activityLogs = ref<ActivityLog[]>([])
  const loading = ref(false)

  async function fetchAllAccounts(): Promise<void> {
    loading.value = true
    const { data, error } = await supabase
      .from('accounts')
      .select(
        'id, name, riot_username, riot_tag, server, elo, elo_division, lp, status, is_banned, ban_type, puuid, current_rental_id, last_stats_sync, notes, created_at, updated_at, account_credentials(login_username)'
      )
      .order('created_at', { ascending: false })

    if (error) {
      const { data: legacyData } = await supabase
        .from('accounts')
        .select('id, name, riot_username, riot_tag, server, elo, elo_division, lp, status, is_banned, ban_type, puuid, current_rental_id, last_stats_sync, notes, created_at, updated_at')
        .order('created_at', { ascending: false })
      accounts.value = (legacyData ?? []) as unknown as AdminAccount[]
    } else {
      accounts.value = (data ?? []) as unknown as AdminAccount[]
    }
    loading.value = false
  }

  async function createAccount(account: {
    name: string
    riot_username: string
    riot_tag: string
    login_username: string
    encrypted_password: string
    server: string
    elo: string
    elo_division: number | null
    lp: number
    status: string
    notes: string | null
  }): Promise<{ error: string | null }> {
    const { data, error } = await supabase.functions.invoke('manage-account', {
      method: 'POST',
      body: JSON.stringify({
        name: account.name,
        riot_username: account.riot_username,
        riot_tag: account.riot_tag,
        login_username: account.login_username,
        password: account.encrypted_password,
        server: account.server,
        elo: account.elo,
        elo_division: account.elo_division,
        lp: account.lp,
        status: account.status,
        notes: account.notes
      }),
      headers: { 'Content-Type': 'application/json' }
    })
    if (error) return { error: error.message }
    if (data?.error) return { error: data.error }
    await fetchAllAccounts()
    return { error: null }
  }

  async function updateAccount(id: string, updates: Partial<Account> & { encrypted_password?: string }): Promise<{ error: string | null }> {
    const anyUpdates = updates as Partial<Account> & { encrypted_password?: string; login_username?: string }
    const { data, error } = await supabase.functions.invoke('manage-account', {
      method: 'PUT',
      body: JSON.stringify({
        id,
        login_username: anyUpdates.login_username,
        password: anyUpdates.encrypted_password || undefined,
        name: anyUpdates.name,
        riot_username: anyUpdates.riot_username,
        riot_tag: anyUpdates.riot_tag,
        server: anyUpdates.server,
        elo: anyUpdates.elo,
        elo_division: anyUpdates.elo_division,
        lp: anyUpdates.lp,
        status: anyUpdates.status,
        notes: anyUpdates.notes
      }),
      headers: { 'Content-Type': 'application/json' }
    })
    if (error) return { error: error.message }
    if (data?.error) return { error: data.error }
    await fetchAllAccounts()
    return { error: null }
  }

  async function deleteAccount(id: string): Promise<{ error: string | null }> {
    const { data, error } = await supabase.functions.invoke('manage-account', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
      headers: { 'Content-Type': 'application/json' }
    })
    if (error) return { error: error.message }
    if (data?.error) return { error: data.error }
    accounts.value = accounts.value.filter(a => a.id !== id)
    return { error: null }
  }

  async function forceReleaseAccount(accountId: string, rentalId: string): Promise<{ error: string | null }> {
    const { error: rentalErr } = await supabase
      .from('rentals')
      .update({ status: 'force_released', ended_at: new Date().toISOString() })
      .eq('id', rentalId)
    if (rentalErr) return { error: rentalErr.message }

    const { error: accountErr } = await supabase
      .from('accounts')
      .update({ current_rental_id: null })
      .eq('id', accountId)
    if (accountErr) return { error: accountErr.message }

    await fetchAllAccounts()
    return { error: null }
  }

  async function resolvePuuids(): Promise<{ resolved: number; failed: number; total: number; error: string | null }> {
    const { data, error } = await supabase.functions.invoke('manage-account', {
      method: 'POST',
      body: JSON.stringify({ action: 'resolve-puuids' }),
      headers: { 'Content-Type': 'application/json' }
    })
    if (error) return { resolved: 0, failed: 0, total: 0, error: error.message }
    if (data?.error) return { resolved: 0, failed: 0, total: 0, error: data.error }
    await fetchAllAccounts()
    return { resolved: data.resolved ?? 0, failed: data.failed ?? 0, total: data.total ?? 0, error: null }
  }

  // Users management
  async function fetchAllUsers(): Promise<void> {
    loading.value = true
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    users.value = (data ?? []) as Profile[]
    loading.value = false
  }

  async function adjustCredits(userId: string, amount: number, reason: string, balanceType: 'subscription' | 'purchased'): Promise<{ error: string | null }> {
    const { error } = await supabase.rpc('admin_adjust_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_balance_type: balanceType,
      p_reason: reason || `Ajuste admin: ${amount > 0 ? '+' : ''}${amount} créditos`
    })
    if (error) return { error: error.message }
    await fetchAllUsers()
    return { error: null }
  }

  async function updateUserPlan(userId: string, planType: string, expiresAt: string | null): Promise<{ error: string | null }> {
    const { error } = await supabase.rpc('admin_update_user_plan', {
      p_user_id: userId,
      p_plan_type: planType,
      p_expires_at: expiresAt
    })
    if (error) return { error: error.message }
    await fetchAllUsers()
    return { error: null }
  }

  // Activity log
  async function fetchActivityLogs(limit = 50): Promise<void> {
    loading.value = true
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    activityLogs.value = (data ?? []) as ActivityLog[]
    loading.value = false
  }

  return {
    accounts,
    users,
    activityLogs,
    loading,
    fetchAllAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    forceReleaseAccount,
    resolvePuuids,
    fetchAllUsers,
    adjustCredits,
    updateUserPlan,
    fetchActivityLogs
  }
})
