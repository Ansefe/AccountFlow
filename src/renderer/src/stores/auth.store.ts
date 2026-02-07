import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@renderer/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@renderer/types/database'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const profile = ref<Profile | null>(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => !!session.value)
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const totalCredits = computed(() => {
    if (!profile.value) return 0
    return profile.value.subscription_credits + profile.value.purchased_credits
  })
  const displayName = computed(() => profile.value?.display_name || user.value?.email || 'Usuario')

  async function initialize(): Promise<void> {
    loading.value = true
    try {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      user.value = data.session?.user ?? null

      if (user.value) {
        await fetchProfile()
      }

      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        session.value = newSession
        user.value = newSession?.user ?? null
        if (user.value) {
          await fetchProfile()
        } else {
          profile.value = null
        }
      })
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile(): Promise<void> {
    if (!user.value) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()

    if (data) {
      profile.value = data as Profile
    }
  }

  async function signInWithEmail(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signUpWithEmail(email: string, password: string, displayNameValue: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayNameValue }
      }
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signInWithDiscord(): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
    user.value = null
    session.value = null
    profile.value = null
  }

  return {
    user,
    session,
    profile,
    loading,
    isAuthenticated,
    isAdmin,
    totalCredits,
    displayName,
    initialize,
    fetchProfile,
    signInWithEmail,
    signUpWithEmail,
    signInWithDiscord,
    signOut
  }
})
