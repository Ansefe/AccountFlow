import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@renderer/lib/supabase'
import type { Account, Profile, ActivityLog } from '@renderer/types/database'

export const useAdminStore = defineStore('admin', () => {
  // Full accounts (with encrypted_password for admin)
  const accounts = ref<Account[]>([])
  const users = ref<Profile[]>([])
  const activityLogs = ref<ActivityLog[]>([])
  const loading = ref(false)

  async function fetchAllAccounts(): Promise<void> {
    loading.value = true
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false })
    accounts.value = (data ?? []) as Account[]
    loading.value = false
  }

  async function createAccount(account: {
    name: string
    riot_username: string
    riot_tag: string
    encrypted_password: string
    server: string
    elo: string
    elo_division: number | null
    lp: number
    status: string
    notes: string | null
  }): Promise<{ error: string | null }> {
    const { error } = await supabase.from('accounts').insert(account)
    if (error) return { error: error.message }
    await fetchAllAccounts()
    return { error: null }
  }

  async function updateAccount(id: string, updates: Partial<Account>): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
    if (error) return { error: error.message }
    await fetchAllAccounts()
    return { error: null }
  }

  async function deleteAccount(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
    if (error) return { error: error.message }
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
    const user = users.value.find(u => u.id === userId)
    if (!user) return { error: 'Usuario no encontrado' }

    const field = balanceType === 'subscription' ? 'subscription_credits' : 'purchased_credits'
    const currentValue = balanceType === 'subscription' ? user.subscription_credits : user.purchased_credits
    const newValue = currentValue + amount

    if (newValue < 0) return { error: 'El balance no puede ser negativo' }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ [field]: newValue })
      .eq('id', userId)
    if (updateErr) return { error: updateErr.message }

    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount,
      balance_type: balanceType,
      type: 'admin_adjustment',
      description: reason || `Ajuste admin: ${amount > 0 ? '+' : ''}${amount} créditos`
    })

    await supabase.from('activity_log').insert({
      user_id: userId,
      event_type: 'admin_action',
      metadata: { action: 'credit_adjustment', amount, balance_type: balanceType, reason }
    })

    await fetchAllUsers()
    return { error: null }
  }

  async function updateUserPlan(userId: string, planType: string, expiresAt: string | null): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('profiles')
      .update({ plan_type: planType, plan_expires_at: expiresAt })
      .eq('id', userId)
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
    fetchAllUsers,
    adjustCredits,
    updateUserPlan,
    fetchActivityLogs
  }
})
