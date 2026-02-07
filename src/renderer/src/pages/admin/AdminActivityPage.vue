<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RefreshCw, Filter } from 'lucide-vue-next'
import { useAdminStore } from '@renderer/stores/admin.store'

const admin = useAdminStore()
const filterType = ref<string>('all')

const eventLabels: Record<string, string> = {
  login: 'Inicio sesión',
  logout: 'Cierre sesión',
  rental_start: 'Alquiler iniciado',
  rental_end: 'Alquiler finalizado',
  rental_force_release: 'Liberación forzada',
  payment_completed: 'Pago completado',
  plan_change: 'Cambio de plan',
  credit_purchase: 'Compra créditos',
  account_login_launched: 'Login lanzado',
  app_closed: 'App cerrada',
  heartbeat_timeout: 'Heartbeat timeout',
  admin_action: 'Acción admin'
}

const eventColors: Record<string, string> = {
  login: 'bg-success/15 text-success',
  logout: 'bg-bg-primary text-text-muted border border-border-default',
  rental_start: 'bg-accent/15 text-accent',
  rental_end: 'bg-info/15 text-info',
  rental_force_release: 'bg-error/15 text-error',
  payment_completed: 'bg-warning/15 text-warning',
  plan_change: 'bg-accent-secondary/15 text-accent-secondary',
  credit_purchase: 'bg-warning/15 text-warning',
  account_login_launched: 'bg-accent/15 text-accent',
  app_closed: 'bg-bg-primary text-text-muted border border-border-default',
  heartbeat_timeout: 'bg-error/15 text-error',
  admin_action: 'bg-accent/15 text-accent'
}

const eventTypes = Object.keys(eventLabels)

const filteredLogs = computed(() => {
  if (filterType.value === 'all') return admin.activityLogs
  return admin.activityLogs.filter(l => l.event_type === filterType.value)
})

function userName(userId: string | null): string {
  if (!userId) return 'Sistema'
  const user = admin.users.find(u => u.id === userId)
  return user?.display_name || userId.slice(0, 8) + '...'
}

onMounted(async () => {
  await Promise.all([admin.fetchActivityLogs(100), admin.fetchAllUsers()])
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-default">
          <Filter class="w-4 h-4 text-text-muted" />
          <select v-model="filterType" class="bg-transparent text-sm text-text-primary outline-none">
            <option value="all">Todos los eventos</option>
            <option v-for="t in eventTypes" :key="t" :value="t">{{ eventLabels[t] }}</option>
          </select>
        </div>
        <span class="text-xs text-text-muted">{{ filteredLogs.length }} eventos</span>
      </div>
      <button class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-default text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors" @click="admin.fetchActivityLogs(100)">
        <RefreshCw class="w-3.5 h-3.5" />
        Recargar
      </button>
    </div>

    <!-- Activity Table -->
    <div class="rounded-xl bg-surface border border-border-default overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border-default">
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Fecha</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Evento</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Usuario</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Detalles</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="admin.loading && admin.activityLogs.length === 0">
            <td colspan="4" class="px-4 py-8 text-center text-sm text-text-muted">Cargando...</td>
          </tr>
          <tr v-if="!admin.loading && filteredLogs.length === 0">
            <td colspan="4" class="px-4 py-8 text-center text-sm text-text-muted">Sin eventos registrados</td>
          </tr>
          <tr v-for="log in filteredLogs" :key="log.id" class="border-b border-border-default/50 hover:bg-surface-hover transition-colors">
            <td class="px-4 py-3 text-xs text-text-secondary font-mono whitespace-nowrap">
              {{ new Date(log.created_at).toLocaleString() }}
            </td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    :class="eventColors[log.event_type] || 'bg-bg-primary text-text-muted'">
                {{ eventLabels[log.event_type] || log.event_type }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm text-text-primary">{{ userName(log.user_id) }}</td>
            <td class="px-4 py-3 text-xs text-text-muted max-w-[300px] truncate">
              {{ log.metadata ? JSON.stringify(log.metadata) : '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
