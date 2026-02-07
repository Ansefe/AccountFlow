<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Play, Unlock, Clock } from 'lucide-vue-next'
import { useAuthStore } from '@renderer/stores/auth.store'
import { useAccountsStore } from '@renderer/stores/accounts.store'
import { useRentalsStore } from '@renderer/stores/rentals.store'

const auth = useAuthStore()
const accountsStore = useAccountsStore()
const rentalsStore = useRentalsStore()

const tab = ref<'active' | 'history'>('active')

const activeRental = computed(() => rentalsStore.activeRentals[0] ?? null)
const activeAccount = computed(() => {
  if (!activeRental.value) return null
  return accountsStore.accounts.find(a => a.id === activeRental.value!.account_id) ?? null
})

const remainingTime = ref('--:--:--')
let timerInterval: ReturnType<typeof setInterval> | null = null

function updateTimer(): void {
  if (!activeRental.value) { remainingTime.value = '--:--:--'; return }
  const diff = Math.max(0, new Date(activeRental.value.expires_at).getTime() - Date.now())
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  remainingTime.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const progressPercent = computed(() => {
  if (!activeRental.value) return 0
  const start = new Date(activeRental.value.started_at).getTime()
  const end = new Date(activeRental.value.expires_at).getTime()
  return Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100))
})

async function handleRelease(): Promise<void> {
  if (!activeRental.value) return
  await rentalsStore.endRental(activeRental.value.id, activeRental.value.account_id)
  await accountsStore.fetchAccounts()
}

onMounted(async () => {
  await accountsStore.fetchAccounts()
  if (auth.user) await rentalsStore.fetchMyRentals(auth.user.id)
  timerInterval = setInterval(updateTimer, 1000)
  updateTimer()
})

onUnmounted(() => { if (timerInterval) clearInterval(timerInterval) })
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
          <Clock class="w-5 h-5 text-accent" />
        </div>

        <div class="text-center py-6">
          <div class="text-5xl font-bold font-mono text-text-primary tracking-wider">{{ remainingTime }}</div>
          <div class="text-sm text-text-secondary mt-1">restante</div>
        </div>

        <div class="w-full h-1.5 rounded-full bg-bg-primary mb-6">
          <div class="h-full rounded-full bg-accent transition-all" :style="{ width: progressPercent + '%' }"></div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button class="h-11 rounded-lg bg-accent hover:bg-accent-hover text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors">
            <Play class="w-4 h-4" />
            Iniciar Sesión
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
              <td class="px-4 py-3 text-sm text-text-secondary font-mono">{{ r.duration_minutes }}m</td>
              <td class="px-4 py-3 text-sm font-mono text-error">-{{ r.credits_spent }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      :class="r.status === 'expired' || r.status === 'cancelled' ? 'bg-success/15 text-success' : 'bg-error/15 text-error'">
                  {{ r.status === 'expired' || r.status === 'cancelled' ? 'Completado' : 'Forzado' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
