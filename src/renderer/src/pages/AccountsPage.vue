<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Search, Filter, Lock, Shield } from 'lucide-vue-next'
import { useAccountsStore } from '@renderer/stores/accounts.store'
import RentalModal from '@renderer/components/RentalModal.vue'
import type { AccountPublic } from '@renderer/types/database'

const accountsStore = useAccountsStore()
const searchQuery = ref('')
const selectedAccount = ref<AccountPublic | null>(null)

const filteredAccounts = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return accountsStore.accounts
  return accountsStore.accounts.filter(a =>
    a.name.toLowerCase().includes(q) || a.riot_username.toLowerCase().includes(q)
  )
})

onMounted(() => {
  if (accountsStore.accounts.length === 0) {
    accountsStore.fetchAccounts()
  }
  accountsStore.subscribeToChanges()
})

const eloColors: Record<string, string> = {
  Iron: 'text-elo-iron',
  Bronze: 'text-elo-bronze',
  Silver: 'text-elo-silver',
  Gold: 'text-elo-gold',
  Platinum: 'text-elo-platinum',
  Emerald: 'text-elo-emerald',
  Diamond: 'text-elo-diamond',
  Master: 'text-elo-master',
  Grandmaster: 'text-elo-grandmaster',
  Challenger: 'text-elo-challenger',
}

const eloBgColors: Record<string, string> = {
  Iron: 'bg-elo-iron/15',
  Bronze: 'bg-elo-bronze/15',
  Silver: 'bg-elo-silver/15',
  Gold: 'bg-elo-gold/15',
  Platinum: 'bg-elo-platinum/15',
  Emerald: 'bg-elo-emerald/15',
  Diamond: 'bg-elo-diamond/15',
  Master: 'bg-elo-master/15',
  Grandmaster: 'bg-elo-grandmaster/15',
  Challenger: 'bg-elo-challenger/15',
}
</script>

<template>
  <div class="space-y-4">
    <!-- Filters Bar -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-default flex-1 max-w-sm">
        <Search class="w-4 h-4 text-text-muted" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por nombre..."
          class="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full"
        />
      </div>
      <button class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-default text-sm text-text-secondary hover:bg-surface-hover transition-colors">
        <Filter class="w-4 h-4" />
        Elo
      </button>
      <button class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-default text-sm text-text-secondary hover:bg-surface-hover transition-colors">
        <Filter class="w-4 h-4" />
        Server
      </button>
      <button class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-default text-sm text-text-secondary hover:bg-surface-hover transition-colors">
        <Filter class="w-4 h-4" />
        Estado
      </button>
    </div>

    <div class="text-xs text-text-muted">Mostrando {{ filteredAccounts.length }} cuentas</div>

    <!-- Table -->
    <div class="rounded-xl bg-surface border border-border-default overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border-default">
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Nombre</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Elo</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">LP</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Servidor</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Estado</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Disponible</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Ban</th>
            <th class="text-right text-xs font-semibold text-text-secondary px-4 py-3">Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredAccounts.length === 0">
            <td colspan="8" class="px-4 py-8 text-center text-sm text-text-muted">
              {{ accountsStore.loading ? 'Cargando cuentas...' : 'No se encontraron cuentas' }}
            </td>
          </tr>
          <tr
            v-for="account in filteredAccounts"
            :key="account.id"
            class="border-b border-border-default/50 hover:bg-surface-hover transition-colors"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                     :class="[eloBgColors[account.elo], eloColors[account.elo]]">
                  {{ account.name[0] }}
                </div>
                <span class="text-sm font-medium text-text-primary">{{ account.name }}</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    :class="[eloBgColors[account.elo], eloColors[account.elo]]">
                <Shield class="w-3 h-3" />
                {{ account.elo }} {{ account.elo_division || '' }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm font-mono text-text-secondary">{{ account.lp }}</td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-bg-primary text-text-secondary border border-border-default">
                {{ account.server }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span class="flex items-center gap-1.5 text-xs">
                <span class="w-1.5 h-1.5 rounded-full"
                      :class="account.status === 'active' ? 'bg-success' : account.status === 'semi_active' ? 'bg-warning' : 'bg-error'"></span>
                <span :class="account.status === 'active' ? 'text-success' : account.status === 'semi_active' ? 'text-warning' : 'text-error'">
                  {{ account.status === 'active' ? 'Activa' : account.status === 'semi_active' ? 'Semi' : 'Inactiva' }}
                </span>
              </span>
            </td>
            <td class="px-4 py-3">
              <span v-if="account.current_rental_id" class="flex items-center gap-1 text-xs text-text-muted">
                <Lock class="w-3 h-3" /> En uso
              </span>
              <span v-else class="text-xs text-success">Disponible</span>
            </td>
            <td class="px-4 py-3">
              <span v-if="account.is_banned" class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-error/15 text-error">
                Baneada
              </span>
              <span v-else class="text-xs text-text-muted">—</span>
            </td>
            <td class="px-4 py-3 text-right">
              <button
                :disabled="!!account.current_rental_id || account.is_banned"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                :class="account.current_rental_id || account.is_banned
                  ? 'bg-surface text-text-muted cursor-not-allowed'
                  : 'bg-accent hover:bg-accent-hover text-white'"
                @click="selectedAccount = account"
              >
                Alquilar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Rental Modal -->
  <RentalModal
    v-if="selectedAccount"
    :account="selectedAccount"
    @close="selectedAccount = null"
    @rented="selectedAccount = null"
  />
</template>
