<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Coins, Loader2, ArrowUpRight, ArrowDownRight, RefreshCw, ExternalLink } from 'lucide-vue-next'
import { useAuthStore } from '@renderer/stores/auth.store'
import { supabase } from '@renderer/lib/supabase'
import { checkoutCreditPackage } from '@renderer/lib/lemonsqueezy'
import type { CreditTransaction, CreditPackage } from '@renderer/types/database'

const auth = useAuthStore()

const packages = ref<CreditPackage[]>([])
const transactions = ref<CreditTransaction[]>([])
const loadingPackages = ref(false)
const loadingTx = ref(false)
const buyingPackageId = ref<string | null>(null)

const daysUntilReset = computed(() => {
  if (!auth.profile?.plan_expires_at) return null
  const diff = new Date(auth.profile.plan_expires_at).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
})

const txTypeLabels: Record<string, string> = {
  subscription_grant: 'Suscripción mensual',
  subscription_reset: 'Reset suscripción',
  rental_spend: 'Alquiler',
  package_purchase: 'Compra paquete',
  admin_adjustment: 'Ajuste admin',
  refund: 'Reembolso'
}

async function fetchPackages(): Promise<void> {
  loadingPackages.value = true
  const { data } = await supabase
    .from('credit_packages')
    .select('*')
    .eq('is_active', true)
    .order('price_usd', { ascending: true })
  packages.value = (data ?? []) as CreditPackage[]
  loadingPackages.value = false
}

async function fetchTransactions(): Promise<void> {
  if (!auth.user) return
  loadingTx.value = true
  const { data } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(20)
  transactions.value = (data ?? []) as CreditTransaction[]
  loadingTx.value = false
}

const buyError = ref('')

async function handleBuyPackage(pkg: CreditPackage): Promise<void> {
  if (!auth.user || !auth.profile) return
  buyingPackageId.value = pkg.id
  buyError.value = ''

  try {
    if (!pkg.ls_variant_id) {
      buyError.value = 'Este paquete aún no tiene variante de Lemon Squeezy configurada. Contacta al admin.'
      return
    }

    await checkoutCreditPackage(pkg.id)
    // Checkout opens in browser, credits will be added via webhook
  } catch (err: unknown) {
    buyError.value = err instanceof Error ? err.message : 'Error al iniciar el pago'
  } finally {
    buyingPackageId.value = null
  }
}

let profilePollInterval: number | null = null

onMounted(async () => {
  await Promise.all([fetchPackages(), fetchTransactions()])
  // Poll for profile changes (e.g., after Lemon Squeezy payment in browser)
  profilePollInterval = window.setInterval(async () => {
    await auth.fetchProfile()
    await fetchTransactions()
  }, 5000)
})

onUnmounted(() => {
  if (profilePollInterval) {
    clearInterval(profilePollInterval)
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Balance Card -->
    <div class="rounded-xl bg-surface border border-border-default p-8 text-center max-w-md mx-auto">
      <Coins class="w-8 h-8 text-warning mx-auto mb-2" />
      <div class="text-4xl font-bold font-mono text-text-primary">{{ auth.totalCredits }}</div>
      <div class="text-sm text-text-secondary mt-1">créditos disponibles</div>
      <div class="flex justify-center gap-4 mt-3 text-xs text-text-muted">
        <span>Suscripción: <span class="text-text-secondary font-mono">{{ auth.profile?.subscription_credits ?? 0 }}</span></span>
        <span>|</span>
        <span>Comprados: <span class="text-text-secondary font-mono">{{ auth.profile?.purchased_credits ?? 0 }}</span></span>
      </div>
      <div v-if="daysUntilReset !== null" class="text-xs text-text-muted mt-2">
        Se recarga en: {{ daysUntilReset }} días
      </div>
    </div>

    <!-- Credit Packages -->
    <div>
      <h2 class="text-base font-semibold text-text-primary mb-3">Comprar Créditos Extra</h2>

      <!-- Unlimited users don't need to buy credits -->
      <div v-if="auth.isUnlimited" class="rounded-xl bg-accent/5 border border-accent/20 p-6 text-center max-w-2xl">
        <div class="text-sm font-semibold text-text-primary">No necesitas comprar créditos</div>
        <div class="text-xs text-text-secondary mt-1">
          Con tu plan Unlimited puedes alquilar cuentas sin límite y sin gastar créditos.
        </div>
      </div>

      <!-- Users without a plan cannot buy credits -->
      <div v-else-if="!auth.profile?.plan_type || auth.profile.plan_type === 'none'" class="rounded-xl bg-warning/5 border border-warning/20 p-6 text-center max-w-2xl">
        <div class="text-sm font-semibold text-text-primary">Necesitas un plan activo</div>
        <div class="text-xs text-text-secondary mt-1">
          Para comprar créditos extra primero debes tener un plan de suscripción activo.
        </div>
        <button
          class="mt-3 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white transition-colors"
          @click="$router.push('/settings')"
        >
          Ver planes
        </button>
      </div>

      <template v-else>
        <div v-if="loadingPackages" class="text-sm text-text-muted">Cargando paquetes...</div>
        <div v-else class="grid grid-cols-3 gap-4 max-w-2xl">
          <div
            v-for="(pkg, idx) in packages"
            :key="pkg.id"
            class="rounded-xl bg-surface border p-5 hover:bg-surface-hover transition-all cursor-pointer relative"
            :class="idx === 1 ? 'border-accent-secondary/30 hover:border-accent-secondary/50' : 'border-border-default hover:border-border-hover'"
          >
            <span v-if="idx === 1" class="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-secondary text-bg-primary">Más vendido</span>
            <div class="text-sm font-semibold text-text-primary">{{ pkg.name }}</div>
            <div class="text-2xl font-bold font-mono text-text-primary mt-2">{{ pkg.credits.toLocaleString() }}</div>
            <div class="text-xs text-text-muted">créditos</div>
            <div class="text-lg font-bold text-accent mt-3">${{ Number(pkg.price_usd).toFixed(0) }}</div>
            <button
              :disabled="buyingPackageId === pkg.id"
              class="w-full mt-3 h-9 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              @click="handleBuyPackage(pkg)"
            >
              <Loader2 v-if="buyingPackageId === pkg.id" class="w-3.5 h-3.5 animate-spin" />
              <ExternalLink v-else class="w-3 h-3" />
              {{ buyingPackageId === pkg.id ? 'Abriendo...' : 'Comprar' }}
            </button>
          </div>
        </div>
        <div v-if="buyError" class="mt-3 p-2.5 rounded-lg bg-error/10 border border-error/30 text-xs text-error max-w-2xl">{{ buyError }}</div>
        <p class="text-[11px] text-text-muted mt-3 max-w-2xl">
          Se abrirá el checkout en tu navegador para completar el pago. Los créditos se agregan automáticamente.
        </p>
      </template>
    </div>

    <!-- Transaction History -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-base font-semibold text-text-primary">Historial de Transacciones</h2>
        <button class="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors" @click="fetchTransactions">
          <RefreshCw class="w-3.5 h-3.5" />
          Recargar
        </button>
      </div>
      <div class="rounded-xl bg-surface border border-border-default overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border-default">
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Fecha</th>
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Tipo</th>
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Descripción</th>
              <th class="text-right text-xs font-semibold text-text-secondary px-4 py-3">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loadingTx">
              <td colspan="4" class="px-4 py-8 text-center text-sm text-text-muted">Cargando...</td>
            </tr>
            <tr v-else-if="transactions.length === 0">
              <td colspan="4" class="px-4 py-8 text-center text-sm text-text-muted">Sin transacciones aún</td>
            </tr>
            <tr
              v-for="tx in transactions"
              :key="tx.id"
              class="border-b border-border-default/50 hover:bg-surface-hover transition-colors"
            >
              <td class="px-4 py-3 text-xs text-text-secondary font-mono whitespace-nowrap">{{ new Date(tx.created_at).toLocaleString() }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1 text-xs font-medium">
                  <ArrowUpRight v-if="tx.amount > 0" class="w-3 h-3 text-success" />
                  <ArrowDownRight v-else class="w-3 h-3 text-error" />
                  {{ txTypeLabels[tx.type] || tx.type }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-text-muted truncate max-w-[200px]">{{ tx.description || '—' }}</td>
              <td class="px-4 py-3 text-sm font-mono text-right" :class="tx.amount > 0 ? 'text-success' : 'text-error'">
                {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
