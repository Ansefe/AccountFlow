<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Coins, Shield, UserPlus, RefreshCw, History, Headphones, Play, Unlock } from 'lucide-vue-next'
import { useAuthStore } from '@renderer/stores/auth.store'
import { useAccountsStore } from '@renderer/stores/accounts.store'
import { useRentalsStore } from '@renderer/stores/rentals.store'

const router = useRouter()
const auth = useAuthStore()
const accountsStore = useAccountsStore()
const rentalsStore = useRentalsStore()

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

onMounted(async () => {
  await accountsStore.fetchAccounts()
  if (auth.user) {
    await rentalsStore.fetchMyRentals(auth.user.id)
    rentalsStore.subscribeToChanges(auth.user.id)
  }
  accountsStore.subscribeToChanges()
})

function openSupport(): void {
  window.open('https://discord.gg/', '_blank')
}

async function handleRelease(): Promise<void> {
  if (!activeRental.value || !activeAccount.value) return
  await window.api.riot.kill()
  await rentalsStore.endRental(activeRental.value.id, activeRental.value.account_id)
  await accountsStore.fetchAccounts()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Top Stats Row -->
    <div class="grid grid-cols-3 gap-4">
      <!-- Credits Card -->
      <div class="rounded-xl bg-surface border border-border-default p-5">
        <div class="text-xs text-text-secondary mb-1">Créditos Disponibles</div>
        <div class="flex items-center gap-2">
          <Coins class="w-5 h-5 text-warning" />
          <span class="text-3xl font-bold font-mono text-text-primary">{{ auth.totalCredits }}</span>
        </div>
        <div class="text-xs text-text-muted mt-1">~ ${{ (auth.totalCredits * 0.01).toFixed(2) }} USD</div>
      </div>

      <!-- Plan Card -->
      <div class="rounded-xl bg-surface border border-border-default p-5">
        <div class="text-xs text-text-secondary mb-1">Plan Actual</div>
        <div class="flex items-center gap-2">
          <Shield class="w-5 h-5 text-accent" />
          <span class="text-3xl font-bold text-text-primary">{{ auth.profile?.plan_type === 'basic' ? 'Basic' : auth.profile?.plan_type === 'unlimited' ? 'Unlimited' : 'Ninguno' }}</span>
        </div>
        <div v-if="auth.profile?.plan_expires_at" class="text-xs text-text-muted mt-1">Renueva: {{ new Date(auth.profile.plan_expires_at).toLocaleDateString() }}</div>
      </div>

      <!-- Active Rental Card -->
      <div class="rounded-xl bg-surface border p-5 relative overflow-hidden"
           :class="activeRental ? 'border-accent/30' : 'border-border-default'">
        <div v-if="activeRental" class="absolute inset-0 bg-accent/[0.03]"></div>
        <div class="relative">
          <!-- Has active rental -->
          <template v-if="activeRental && activeAccount">
            <div class="text-xs text-text-secondary mb-1">Alquiler Activo: {{ activeAccount.name }}</div>

            <div class="text-center my-3">
              <div class="text-4xl font-bold font-mono text-text-primary tracking-wider">{{ matchProgress }}</div>
              <div class="text-xs text-text-secondary mt-0.5">partidas jugadas</div>
            </div>

            <div class="w-full h-1 rounded-full bg-bg-primary mb-3">
              <div class="h-full rounded-full bg-accent transition-all" :style="{ width: progressPercent + '%' }"></div>
            </div>

            <div class="flex justify-between text-xs text-text-secondary mb-3">
              <span>Region: <span class="text-text-primary">{{ activeAccount.server }}</span></span>
            </div>
            <div class="flex justify-between text-xs text-text-secondary mb-4">
              <span>Elo: <span class="text-text-primary">{{ activeAccount.elo }} {{ activeAccount.elo_division ? activeAccount.elo_division : '' }}</span></span>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button
                class="h-9 rounded-lg bg-accent/50 text-xs font-semibold text-white/60 flex items-center justify-center gap-1.5 cursor-not-allowed"
                title="Auto-login próximamente"
                disabled
              >
                <Play class="w-3.5 h-3.5" />
                Iniciar
              </button>
              <button
                class="h-9 rounded-lg bg-error/20 hover:bg-error/30 text-xs font-semibold text-error flex items-center justify-center gap-1.5 transition-colors"
                @click="handleRelease"
              >
                <Unlock class="w-3.5 h-3.5" />
                Liberar
              </button>
            </div>
          </template>

          <!-- No active rental -->
          <template v-else>
            <div class="text-xs text-text-secondary mb-2">Alquiler Activo</div>
            <div class="text-center py-6">
              <div class="text-sm text-text-muted">Sin alquiler activo</div>
              <button
                class="mt-3 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white transition-colors"
                @click="router.push('/accounts')"
              >
                Explorar cuentas
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div>
      <h2 class="text-base font-semibold text-text-primary mb-3">Acciones Rápidas</h2>
      <div class="grid grid-cols-4 gap-3">
        <button class="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface border border-border-default hover:border-border-hover hover:bg-surface-hover transition-all group" @click="router.push('/accounts')">
          <div class="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
            <UserPlus class="w-5 h-5 text-accent" />
          </div>
          <span class="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">Alquilar Cuenta</span>
        </button>

        <button class="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface border border-border-default hover:border-border-hover hover:bg-surface-hover transition-all group" @click="router.push('/credits')">
          <div class="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
            <RefreshCw class="w-5 h-5 text-warning" />
          </div>
          <span class="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">Recargar</span>
        </button>

        <button class="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface border border-border-default hover:border-border-hover hover:bg-surface-hover transition-all group" @click="router.push('/rentals')">
          <div class="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center group-hover:bg-info/20 transition-colors">
            <History class="w-5 h-5 text-info" />
          </div>
          <span class="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">Historial</span>
        </button>

        <button class="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface border border-border-default hover:border-border-hover hover:bg-surface-hover transition-all group" @click="openSupport">
          <div class="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
            <Headphones class="w-5 h-5 text-success" />
          </div>
          <span class="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">Soporte</span>
        </button>
      </div>
    </div>

    <!-- Activity Table -->
    <div>
      <h2 class="text-base font-semibold text-text-primary mb-3">Actividad Reciente</h2>
      <div class="rounded-xl bg-surface border border-border-default overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border-default">
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Fecha</th>
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Cuenta</th>
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Partidas</th>
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="rentalsStore.rentals.length === 0">
              <td colspan="4" class="px-4 py-8 text-center text-sm text-text-muted">Sin actividad aún</td>
            </tr>
            <tr
              v-for="rental in rentalsStore.rentals.slice(0, 5)"
              :key="rental.id"
              class="border-b border-border-default/50 hover:bg-surface-hover transition-colors"
            >
              <td class="px-4 py-3 text-sm text-text-secondary font-mono">{{ new Date(rental.started_at).toLocaleString() }}</td>
              <td class="px-4 py-3 text-sm text-text-primary">
                {{ accountsStore.accounts.find(a => a.id === rental.account_id)?.name || 'Cuenta' }}
              </td>
              <td class="px-4 py-3 text-sm text-text-secondary font-mono">{{ rental.matches_used }}/{{ rental.matches_total }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                  :class="rental.status === 'active' ? 'bg-warning/15 text-warning' : rental.status === 'expired' || rental.status === 'cancelled' ? 'bg-success/15 text-success' : 'bg-error/15 text-error'"
                >
                  {{ rental.status === 'active' ? 'En curso' : rental.status === 'completed' || rental.status === 'expired' || rental.status === 'cancelled' ? 'Completado' : 'Forzado' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
