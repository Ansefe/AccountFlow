<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Play, Unlock, Loader2, Square, AlertTriangle, Gamepad2 } from 'lucide-vue-next'
import { useAuthStore } from '@renderer/stores/auth.store'
import { useAccountsStore } from '@renderer/stores/accounts.store'
import { useRentalsStore } from '@renderer/stores/rentals.store'
import { supabase } from '@renderer/lib/supabase'

const auth = useAuthStore()
const accountsStore = useAccountsStore()
const rentalsStore = useRentalsStore()

const tab = ref<'active' | 'history'>('active')

// ── Auto-login state ──
const loginLoading = ref(false)
const loginError = ref('')
const loginSuccess = ref(false)
const loginProgress = ref('')
const killingClient = ref(false)
let offLoginProgress: (() => void) | null = null

function buildErrorCode(): string {
  return `AF-${Date.now().toString(36).toUpperCase()}`
}

function friendlyProgress(raw: string): string {
  const value = raw.toLowerCase()
  if (value.includes('iniciando flujo')) return 'Preparando inicio de sesión...'
  if (value.includes('credenciales')) return 'Verificando acceso de la cuenta...'
  if (value.includes('cerrando cliente riot previo')) return 'Cerrando sesión previa del cliente...'
  if (value.includes('riot client lanzado')) return 'Abriendo Riot Client...'
  if (value.includes('lockfile detectado')) return 'Conectando con Riot Client...'
  if (value.includes('api local disponible')) return 'Conexión establecida. Continuando...'
  if (value.includes('camino b')) return 'Completando inicio de sesión de forma segura...'
  if (value.includes('esperando autorización')) return 'Finalizando inicio de sesión...'
  return 'Procesando inicio de sesión...'
}

function friendlyLoginError(raw: string, code: string): string {
  const value = raw.toLowerCase()

  if (value.includes('focus_lost') || value.includes('focus lost') || value.includes('conmutación de tareas')) {
    return `Se interrumpió el inicio de sesión por cambio de ventana. Mantén abierta la ventana de Riot Client e inténtalo de nuevo. Código: ${code}`
  }

  if (value.includes('captcha_not_allowed') || value.includes('hcaptcha')) {
    return `Riot bloqueó temporalmente el inicio de sesión automático para esta cuenta. Intenta de nuevo en unos minutos. Código: ${code}`
  }

  if (value.includes('auth_failure')) {
    return `No se pudo completar el inicio de sesión automático en este intento. Vuelve a intentarlo. Código: ${code}`
  }

  if (value.includes('timeout')) {
    return `El inicio de sesión tardó demasiado. Verifica Riot Client y vuelve a intentarlo. Código: ${code}`
  }

  return `No se pudo completar el inicio de sesión automático. Intenta nuevamente. Código: ${code}`
}

async function reportLoginError(rawError: string, code: string): Promise<void> {
  if (!auth.user) return
  try {
    await supabase.from('activity_log').insert({
      user_id: auth.user.id,
      event_type: 'account_login_launched',
      metadata: {
        status: 'error',
        code,
        source: 'autologin',
        raw_error: rawError.slice(0, 3000)
      }
    })
  } catch {
    // No bloquea UX si falla telemetría interna
  }
}

const activeRental = computed(() => rentalsStore.activeRentals[0] ?? null)
const activeAccount = computed(() => {
  if (!activeRental.value) return null
  return accountsStore.accounts.find(a => a.id === activeRental.value!.account_id) ?? null
})

const matchProgress = computed(() => {
  if (!activeRental.value) return '0 / 0'
  return `${activeRental.value.matches_used} / ${activeRental.value.matches_total}`
})

const progressPercent = computed(() => {
  if (!activeRental.value) return 0
  const total = activeRental.value.matches_total ?? 1
  return Math.min(100, Math.max(0, (activeRental.value.matches_used / total) * 100))
})

/** Auto-login via Riot Client local API (credentials fetched in Main Process) */
async function handleLogin(): Promise<void> {
  if (!activeRental.value) return
  loginLoading.value = true
  loginError.value = ''
  loginSuccess.value = false
  loginProgress.value = 'Iniciando...'
  console.info('[AutoLogin] start')

  try {
    // Get current session token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      loginError.value = 'No hay sesión activa. Vuelve a iniciar sesión.'
      return
    }

    const riotClientPath =
      localStorage.getItem('riotClientPath') ||
      'C:\\Riot Games\\Riot Client\\RiotClientServices.exe'

    // Send to Main Process — credentials are fetched server-side, never in renderer
    const result = await window.api.riot.login({
      rentalId: activeRental.value.id,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      accessToken: session.access_token,
      riotClientPath
    })

    if (!result.success) {
      const rawError = result.error || 'Error al iniciar sesión en Riot Client'
      const code = buildErrorCode()
      loginError.value = friendlyLoginError(rawError, code)
      // Ayuda de debug: el banner puede ser largo; también lo dejamos en consola.
      console.error('[AutoLogin] error:')
      console.error(`[AutoLogin][${code}]`, rawError)
      await reportLoginError(rawError, code)
    } else {
      loginSuccess.value = true
      loginProgress.value = 'Completado'
      setTimeout(() => { loginSuccess.value = false }, 8000)
    }
  } catch (err: unknown) {
    loginError.value = err instanceof Error ? err.message : 'Error inesperado'
  } finally {
    if (!loginSuccess.value && !loginError.value) {
      loginProgress.value = 'Finalizado sin estado'
    }
    loginLoading.value = false
  }
}

/** Kill Riot Client processes */
async function handleKillClient(): Promise<void> {
  killingClient.value = true
  try {
    await window.api.riot.kill()
  } finally {
    killingClient.value = false
  }
}

async function handleRelease(): Promise<void> {
  if (!activeRental.value) return
  // Kill Riot Client when releasing the account
  await window.api.riot.kill()
  await rentalsStore.endRental(activeRental.value.id, activeRental.value.account_id)
  await accountsStore.fetchAccounts()
}

onMounted(async () => {
  offLoginProgress = window.api.riot.onLoginProgress((message: string) => {
    loginProgress.value = friendlyProgress(message)
    console.info('[AutoLogin][progress]', message)
  })

  await accountsStore.fetchAccounts()
  if (auth.user) await rentalsStore.fetchMyRentals(auth.user.id)
})

onUnmounted(() => {
  if (offLoginProgress) {
    offLoginProgress()
    offLoginProgress = null
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Tabs -->
    <div class="flex gap-1 bg-surface rounded-lg p-1 w-fit border border-border-default">
      <button class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
              :class="tab === 'active' ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:text-text-primary'"
              @click="tab = 'active'">
        Activos ({{ rentalsStore.activeRentals.length }})
      </button>
      <button class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
              :class="tab === 'history' ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:text-text-primary'"
              @click="tab = 'history'">
        Historial ({{ rentalsStore.pastRentals.length }})
      </button>
    </div>

    <!-- Active Tab -->
    <template v-if="tab === 'active'">
      <div v-if="activeRental && activeAccount" class="rounded-xl bg-surface border border-accent/30 p-6 max-w-2xl">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-bold text-text-primary">{{ activeAccount.name }}</h3>
            <div class="flex items-center gap-2 mt-1">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent/15 text-accent">{{ activeAccount.elo }} {{ activeAccount.elo_division || '' }}</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-bg-primary text-text-secondary border border-border-default">{{ activeAccount.server }}</span>
            </div>
          </div>
          <Gamepad2 class="w-5 h-5 text-accent" />
        </div>

        <div class="text-center py-6">
          <div class="text-5xl font-bold font-mono text-text-primary tracking-wider">{{ matchProgress }}</div>
          <div class="text-sm text-text-secondary mt-1">partidas jugadas</div>
        </div>

        <div class="w-full h-1.5 rounded-full bg-bg-primary mb-6">
          <div class="h-full rounded-full bg-accent transition-all" :style="{ width: progressPercent + '%' }"></div>
        </div>

        <!-- Login status messages -->
        <div v-if="loginError" class="flex items-start gap-2 mb-4 px-3 py-2 rounded-lg bg-error/10 border border-error/20">
          <AlertTriangle class="w-4 h-4 text-error shrink-0" />
          <pre class="text-xs text-error whitespace-pre-wrap wrap-break-word min-w-0 max-h-40 overflow-auto">{{ loginError }}</pre>
        </div>
        <div v-else-if="loginLoading && loginProgress" class="mb-4 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
          <span class="text-xs text-accent">{{ loginProgress }}</span>
        </div>
        <div v-if="loginSuccess" class="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-success/10 border border-success/20">
          <Play class="w-4 h-4 text-success shrink-0" />
          <span class="text-xs text-success">Credenciales enviadas al Riot Client. ¡Listo para jugar!</span>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <button
            class="h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            :class="loginLoading
              ? 'bg-accent/30 text-white/50 cursor-wait'
              : 'bg-accent hover:bg-accent/90 text-white'"
            :disabled="loginLoading"
            @click="handleLogin"
          >
            <Loader2 v-if="loginLoading" class="w-4 h-4 animate-spin" />
            <Play v-else class="w-4 h-4" />
            {{ loginLoading ? 'Conectando...' : 'Iniciar Sesión' }}
          </button>
          <button
            class="h-11 rounded-lg bg-surface hover:bg-surface-hover border border-border-default text-sm font-semibold text-text-secondary flex items-center justify-center gap-2 transition-colors"
            :disabled="killingClient"
            @click="handleKillClient"
          >
            <Square class="w-3.5 h-3.5" />
            Cerrar Cliente
          </button>
          <button class="h-11 rounded-lg bg-error/15 hover:bg-error/25 border border-error/30 text-sm font-semibold text-error flex items-center justify-center gap-2 transition-colors" @click="handleRelease">
            <Unlock class="w-4 h-4" />
            Liberar Cuenta
          </button>
        </div>
      </div>
      <div v-else class="rounded-xl bg-surface border border-border-default p-12 text-center max-w-2xl">
        <div class="text-sm text-text-muted">No tienes alquileres activos</div>
      </div>
    </template>

    <!-- History Tab -->
    <template v-if="tab === 'history'">
      <div class="rounded-xl bg-surface border border-border-default overflow-hidden max-w-3xl">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border-default">
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Fecha</th>
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Cuenta</th>
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Duración</th>
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Créditos</th>
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="rentalsStore.pastRentals.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-sm text-text-muted">Sin historial</td>
            </tr>
            <tr v-for="r in rentalsStore.pastRentals" :key="r.id" class="border-b border-border-default/50 hover:bg-surface-hover transition-colors">
              <td class="px-4 py-3 text-xs text-text-secondary font-mono">{{ new Date(r.started_at).toLocaleString() }}</td>
              <td class="px-4 py-3 text-sm text-text-primary">{{ accountsStore.accounts.find(a => a.id === r.account_id)?.name || 'Cuenta' }}</td>
              <td class="px-4 py-3 text-sm text-text-secondary font-mono">{{ r.matches_used }}/{{ r.matches_total }} partidas</td>
              <td class="px-4 py-3 text-sm font-mono text-error">-{{ r.credits_spent }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      :class="r.status === 'completed' || r.status === 'expired' || r.status === 'cancelled' ? 'bg-success/15 text-success' : 'bg-error/15 text-error'">
                  {{ r.status === 'completed' ? 'Completado' : r.status === 'expired' || r.status === 'cancelled' ? 'Finalizado' : 'Forzado' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
