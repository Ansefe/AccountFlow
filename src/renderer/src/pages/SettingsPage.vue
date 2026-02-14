<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loader2, Check, LogOut, Crown, Zap, Star, Sparkles, Timer, ExternalLink, CreditCard, RefreshCw, Download } from 'lucide-vue-next'
import { useAuthStore } from '@renderer/stores/auth.store'
import { supabase } from '@renderer/lib/supabase'
import { checkoutSubscription, openCustomerPortal } from '@renderer/lib/lemonsqueezy'
import type { PlanType } from '@renderer/types/database'

const router = useRouter()
const auth = useAuthStore()

const displayName = ref('')
const saving = ref(false)
const saved = ref(false)
const errorMsg = ref('')
const planMsg = ref('')
const planError = ref('')
const changingPlan = ref(false)
const riotClientPath = ref(
  localStorage.getItem('riotClientPath') || 'C:\\Riot Games\\Riot Client\\RiotClientServices.exe'
)

const checkingUpdate = ref(false)
const updateResult = ref<string | null>(null)

// Persist Riot Client path whenever it changes
watch(riotClientPath, (v) => localStorage.setItem('riotClientPath', v))

async function browseRiotClient(): Promise<void> {
  const result = await window.api.dialog.openFile({
    title: 'Seleccionar RiotClientServices.exe',
    filters: [{ name: 'Ejecutable', extensions: ['exe'] }]
  })
  if (!result.canceled && result.filePaths[0]) {
    riotClientPath.value = result.filePaths[0]
  }
}

interface PlanOption {
  type: PlanType
  label: string
  price: string
  originalPrice?: string
  credits: number | null
  description: string
  icon: typeof Crown
  badge?: string
  highlight?: boolean
}

const planOptions: PlanOption[] = [
  {
    type: 'none', label: 'Sin Plan', price: 'Gratis', credits: null,
    description: 'Sin créditos de suscripción. Puedes comprar créditos individuales.', icon: Star
  },
  {
    type: 'early_bird', label: 'Early Bird', price: '$6/mes', originalPrice: '$10/mes', credits: 1000,
    description: '1,000 créditos/mes de suscripción.', icon: Sparkles,
    badge: '40% OFF · Tiempo limitado', highlight: true
  },
  {
    type: 'basic', label: 'Basic', price: '$10/mes', credits: 1000,
    description: '1,000 créditos/mes de suscripción.', icon: Zap
  },
  {
    type: 'unlimited', label: 'Unlimited', price: '$30/mes', credits: null,
    description: 'Alquiler ilimitado, sin gasto de créditos. Una cuenta activa a la vez.', icon: Crown
  }
]

const currentPlan = computed(() => auth.profile?.plan_type || 'none')
const hasLsSubscription = computed(() => !!auth.profile?.ls_subscription_id)

const planLabel = computed(() => {
  const labels: Record<string, string> = {
    none: 'Sin plan',
    early_bird: 'Plan Early Bird',
    basic: 'Plan Basic',
    unlimited: 'Plan Unlimited'
  }
  return labels[currentPlan.value] || 'Sin plan'
})

onMounted(async () => {
  await auth.fetchProfile()
  displayName.value = auth.profile?.display_name || ''
  // Poll for profile changes (e.g., after Lemon Squeezy checkout in browser)
  profilePollInterval = window.setInterval(async () => {
    await auth.fetchProfile()
  }, 5000)
})

onUnmounted(() => {
  if (profilePollInterval) {
    clearInterval(profilePollInterval)
  }
})

let profilePollInterval: number | null = null

async function saveProfile(): Promise<void> {
  if (!auth.user) return
  saving.value = true
  saved.value = false
  errorMsg.value = ''

  const { error } = await supabase.rpc('update_own_display_name', {
    p_display_name: displayName.value.trim()
  })

  saving.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  await auth.fetchProfile()
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}

async function changePlan(newPlan: PlanType): Promise<void> {
  if (!auth.user || !auth.profile) return
  if (newPlan === currentPlan.value) return

  changingPlan.value = true
  planError.value = ''
  planMsg.value = ''

  try {
    if (newPlan === 'none') {
      // Cancellation: if LS subscription exists, open Customer Portal
      if (hasLsSubscription.value) {
        planMsg.value = 'Abriendo portal para cancelar tu suscripción...'
        await openCustomerPortal()
        planMsg.value = 'Se abrió el portal en tu navegador. Cancela tu suscripción ahí y vuelve a la app.'
      } else {
        // Manual plan (no LS) — use RPC directly
        const { data, error: rpcError } = await supabase.rpc('change_user_plan', {
          target_user_id: auth.user.id,
          new_plan: newPlan
        })
        if (rpcError) throw rpcError
        const result = data as Record<string, unknown>
        if (result.error) {
          planError.value = result.error as string
          return
        }
        await auth.fetchProfile()
        planMsg.value = 'Plan cancelado. Tus créditos comprados se conservan.'
      }
    } else {
      // Subscribing to a paid plan → Lemon Squeezy Checkout
      planMsg.value = 'Abriendo checkout en tu navegador...'
      await checkoutSubscription(newPlan)
      planMsg.value = 'Completa el pago en tu navegador. Tu plan se activará automáticamente al confirmar.'
    }

    setTimeout(() => { planMsg.value = '' }, 8000)
  } catch (err: unknown) {
    planError.value = err instanceof Error ? err.message : 'Error al procesar el cambio de plan'
  } finally {
    changingPlan.value = false
  }
}

async function handleManageSubscription(): Promise<void> {
  changingPlan.value = true
  planError.value = ''
  planMsg.value = ''

  try {
    planMsg.value = 'Abriendo portal de suscripción...'
    await openCustomerPortal()
    planMsg.value = 'Se abrió el portal en tu navegador. Gestiona tu suscripción ahí.'
    setTimeout(() => { planMsg.value = '' }, 8000)
  } catch (err: unknown) {
    planError.value = err instanceof Error ? err.message : 'Error al abrir el portal'
  } finally {
    changingPlan.value = false
  }
}

async function handleLogout(): Promise<void> {
  await auth.signOut()
  router.push('/login')
}

async function checkForUpdate(): Promise<void> {
  checkingUpdate.value = true
  updateResult.value = null
  try {
    const result = await window.api?.updater?.check()
    if (!result) {
      updateResult.value = 'Solo disponible en la app de escritorio.'
      return
    }
    if (result.updateAvailable) {
      updateResult.value = `¡Nueva versión ${result.version} encontrada! Se descargará automáticamente.`
    } else {
      updateResult.value = 'Ya tienes la última versión.'
    }
  } catch {
    updateResult.value = 'Error al buscar actualizaciones.'
  } finally {
    checkingUpdate.value = false
    setTimeout(() => { updateResult.value = null }, 5000)
  }
}
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <!-- Profile Section -->
    <div class="rounded-xl bg-surface border border-border-default p-6">
      <h2 class="text-base font-semibold text-text-primary mb-4">Perfil</h2>
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-xl font-bold text-accent">
            {{ (auth.profile?.display_name || 'U')[0].toUpperCase() }}
          </div>
          <div>
            <div class="text-sm font-medium text-text-primary">{{ auth.profile?.display_name || 'Sin nombre' }}</div>
            <div class="text-xs text-text-muted">{{ auth.user?.email || '—' }}</div>
            <div class="text-[11px] text-text-muted font-mono mt-0.5">ID: {{ auth.user?.id?.slice(0, 12) }}...</div>
          </div>
        </div>

        <div v-if="errorMsg" class="p-2 rounded-lg bg-error/10 border border-error/30 text-xs text-error">{{ errorMsg }}</div>

        <div>
          <label class="text-xs font-medium text-text-secondary block mb-1.5">Nombre de usuario</label>
          <div class="flex gap-2">
            <input
              v-model="displayName"
              type="text"
              class="flex-1 h-10 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
            />
            <button
              :disabled="saving || displayName.trim() === (auth.profile?.display_name || '')"
              class="px-4 h-10 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="saveProfile"
            >
              <Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin" />
              <Check v-else-if="saved" class="w-3.5 h-3.5" />
              {{ saved ? 'Guardado' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Plan Section -->
    <div class="rounded-xl bg-surface border border-border-default p-6">
      <h2 class="text-base font-semibold text-text-primary mb-4">Tu Plan</h2>

      <!-- Current plan summary -->
      <div class="flex items-center justify-between mb-5 pb-4 border-b border-border-default">
        <div>
          <div class="text-sm font-semibold text-text-primary">{{ planLabel }}</div>
          <div v-if="auth.profile?.plan_expires_at" class="flex items-center gap-1 text-xs text-text-muted mt-0.5">
            <Timer class="w-3 h-3" />
            Se renueva: {{ new Date(auth.profile.plan_expires_at).toLocaleDateString() }}
          </div>
          <div v-else class="text-xs text-text-muted mt-0.5">Sin plan activo</div>
        </div>
        <div class="text-right">
          <div v-if="auth.isUnlimited" class="text-sm font-bold text-accent">∞ Ilimitado</div>
          <div v-else>
            <div class="text-sm font-bold font-mono text-text-primary">{{ auth.totalCredits }} créditos</div>
            <div class="text-[11px] text-text-muted">Sub: {{ auth.profile?.subscription_credits ?? 0 }} | Comp: {{ auth.profile?.purchased_credits ?? 0 }}</div>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div v-if="planMsg" class="mb-4 p-2.5 rounded-lg bg-success/10 border border-success/30 text-xs text-success">{{ planMsg }}</div>
      <div v-if="planError" class="mb-4 p-2.5 rounded-lg bg-error/10 border border-error/30 text-xs text-error">{{ planError }}</div>

      <!-- Plan cards -->
      <div class="grid grid-cols-4 gap-3">
        <button
          v-for="plan in planOptions"
          :key="plan.type"
          :disabled="changingPlan || plan.type === currentPlan"
          class="relative rounded-xl border p-4 text-left transition-all disabled:cursor-not-allowed"
          :class="[
            plan.type === currentPlan
              ? 'bg-accent/10 border-accent/40'
              : 'bg-bg-primary border-border-default hover:border-accent/50 hover:bg-surface-hover disabled:opacity-50',
            plan.highlight && plan.type !== currentPlan ? 'ring-1 ring-warning/40' : ''
          ]"
          @click="changePlan(plan.type)"
        >
          <!-- Current badge -->
          <div v-if="plan.type === currentPlan" class="absolute top-2 right-2">
            <span class="text-[9px] font-bold uppercase bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">Actual</span>
          </div>

          <!-- Discount badge -->
          <div v-if="plan.badge && plan.type !== currentPlan" class="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span class="text-[9px] font-bold uppercase bg-warning text-bg-primary px-2 py-0.5 rounded-full">{{ plan.badge }}</span>
          </div>

          <component :is="plan.icon" class="w-5 h-5 mb-2" :class="plan.type === currentPlan ? 'text-accent' : plan.highlight ? 'text-warning' : 'text-text-muted'" />
          <div class="text-sm font-bold text-text-primary">{{ plan.label }}</div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="text-xs font-semibold" :class="plan.highlight ? 'text-warning' : 'text-accent'">{{ plan.price }}</span>
            <span v-if="plan.originalPrice" class="text-[10px] text-text-muted line-through">{{ plan.originalPrice }}</span>
          </div>
          <div class="text-[11px] text-text-muted mt-1.5 leading-tight">{{ plan.description }}</div>
        </button>
      </div>

      <div class="mt-3 space-y-1">
        <p class="text-[11px] text-text-muted">
          Los créditos de suscripción se recargan automáticamente cada mes.
          Los créditos comprados se conservan siempre independientemente del plan.
        </p>
        <p v-if="auth.isUnlimited" class="text-[11px] text-accent">
          Con Unlimited no necesitas créditos — alquilas cuentas sin límite de tiempo, una a la vez.
        </p>
      </div>

      <!-- Manage Subscription -->
      <div v-if="hasLsSubscription && currentPlan !== 'none'" class="mt-4 pt-4 border-t border-border-default">
        <button
          :disabled="changingPlan"
          class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface border border-border-default text-xs font-semibold text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors disabled:opacity-50"
          @click="handleManageSubscription"
        >
          <CreditCard class="w-3.5 h-3.5" />
          Gestionar suscripción
          <ExternalLink class="w-3 h-3 text-text-muted" />
        </button>
        <p class="text-[11px] text-text-muted mt-1.5">
          Cambiar método de pago, actualizar plan o cancelar suscripción.
        </p>
      </div>
    </div>

    <!-- Riot Client Path -->
    <div class="rounded-xl bg-surface border border-border-default p-6">
      <h2 class="text-base font-semibold text-text-primary mb-4">Riot Client</h2>
      <div>
        <label class="text-xs font-medium text-text-secondary block mb-1.5">Ruta del Riot Client</label>
        <div class="flex gap-2">
          <input
            v-model="riotClientPath"
            type="text"
            class="flex-1 h-10 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary font-mono focus:outline-none focus:border-accent transition-colors"
          />
          <button
            class="px-4 h-10 rounded-lg bg-surface border border-border-default text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors"
            @click="browseRiotClient"
          >
            Buscar
          </button>
        </div>
        <p class="text-[11px] text-text-muted mt-1.5">Ruta de RiotClientServices.exe. Se usa para el auto-login al alquilar una cuenta.</p>
      </div>
    </div>

    <!-- Updates -->
    <div class="rounded-xl bg-surface border border-border-default p-6">
      <h2 class="text-base font-semibold text-text-primary mb-4">Actualizaciones</h2>
      <p class="text-xs text-text-muted mb-3">La app busca actualizaciones automáticamente cada 30 minutos. También puedes buscar manualmente.</p>
      <div v-if="updateResult" class="mb-3 p-2.5 rounded-lg bg-accent/10 border border-accent/30 text-xs text-accent">
        {{ updateResult }}
      </div>
      <button
        :disabled="checkingUpdate"
        class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent/10 border border-accent/30 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        @click="checkForUpdate"
      >
        <RefreshCw v-if="checkingUpdate" class="w-3.5 h-3.5 animate-spin" />
        <Download v-else class="w-3.5 h-3.5" />
        {{ checkingUpdate ? 'Buscando...' : 'Buscar actualizaciones' }}
      </button>
    </div>

    <!-- Session -->
    <div class="rounded-xl bg-surface border border-error/20 p-6">
      <h2 class="text-base font-semibold text-text-primary mb-4">Sesión</h2>
      <button
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-error/10 border border-error/30 text-xs font-semibold text-error hover:bg-error/20 transition-colors"
        @click="handleLogout"
      >
        <LogOut class="w-3.5 h-3.5" />
        Cerrar sesión
      </button>
    </div>
  </div>
</template>
