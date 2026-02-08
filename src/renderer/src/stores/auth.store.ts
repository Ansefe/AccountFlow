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

  let authUnsubscribe: (() => void) | null = null

  const isAuthenticated = computed(() => !!session.value)
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const totalCredits = computed(() => {
    if (!profile.value) return 0
    return profile.value.subscription_credits + profile.value.purchased_credits
  })
  const displayName = computed(() => profile.value?.display_name || user.value?.email || 'Usuario')

  async function syncSession(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error

      session.value = data.session
      user.value = data.session?.user ?? null
      if (user.value) {
        void fetchProfile()
      } else {
        profile.value = null
      }
    } catch (err) {
      console.error('[auth] syncSession failed', err)
    }
  }

  async function initialize(): Promise<void> {
    loading.value = true
    try {
      await syncSession()

      if (!authUnsubscribe) {
        const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
          session.value = newSession
          user.value = newSession?.user ?? null
          if (user.value) {
            void fetchProfile()
          } else {
            profile.value = null
          }
        })
        authUnsubscribe = () => data.subscription.unsubscribe()
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile(): Promise<void> {
    if (!user.value) return
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .single()

      if (error) throw error
      if (data) profile.value = data as Profile
    } catch (err) {
      // No bloquear la app si el perfil falla (timeout / offline / etc.)
      console.error('[auth] fetchProfile failed', err)
    }
  }

  async function signInWithEmail(email: string, password: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      return { error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      // El fetch con AbortController suele terminar como AbortError (según runtime).
      if (/abort|aborted|aborterror/i.test(message)) {
        return { error: 'Tiempo de espera agotado. Revisa tu conexión e intenta nuevamente.' }
      }
      console.error('[auth] signInWithEmail failed', err)
      return { error: 'No fue posible iniciar sesión. Intenta nuevamente.' }
    }
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
    syncSession,
    fetchProfile,
    signInWithEmail,
    signUpWithEmail,
    signInWithDiscord,
    signOut
  }
})
