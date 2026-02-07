<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Users, Monitor, Clock, DollarSign } from 'lucide-vue-next'
import { useAdminStore } from '@renderer/stores/admin.store'

const admin = useAdminStore()

const freeAccounts = computed(() => admin.accounts.filter(a => !a.current_rental_id).length)
const occupiedAccounts = computed(() => admin.accounts.filter(a => !!a.current_rental_id).length)
const recentActivity = computed(() => admin.activityLogs.slice(0, 8))

onMounted(async () => {
  await Promise.all([
    admin.fetchAllAccounts(),
    admin.fetchAllUsers(),
    admin.fetchActivityLogs(50)
  ])
})
</script>

<template>
  <div class="space-y-6">
    <!-- Stats Row -->
    <div class="grid grid-cols-4 gap-4">
      <div class="rounded-xl bg-surface border border-border-default p-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Users class="w-5 h-5 text-accent" />
          </div>
          <div>
            <div class="text-2xl font-bold font-mono text-text-primary">{{ admin.users.length }}</div>
            <div class="text-xs text-text-secondary">Usuarios Registrados</div>
          </div>
        </div>
      </div>

      <div class="rounded-xl bg-surface border border-border-default p-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <Monitor class="w-5 h-5 text-success" />
          </div>
          <div>
            <div class="text-2xl font-bold font-mono text-text-primary">{{ freeAccounts }}/{{ admin.accounts.length }}</div>
            <div class="text-xs text-text-secondary">Cuentas Libres</div>
          </div>
        </div>
      </div>

      <div class="rounded-xl bg-surface border border-border-default p-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <Clock class="w-5 h-5 text-warning" />
          </div>
          <div>
            <div class="text-2xl font-bold font-mono text-text-primary">{{ occupiedAccounts }}</div>
            <div class="text-xs text-text-secondary">Alquileres Activos</div>
          </div>
        </div>
      </div>

      <div class="rounded-xl bg-surface border border-border-default p-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
            <DollarSign class="w-5 h-5 text-info" />
          </div>
          <div>
            <div class="text-2xl font-bold font-mono text-text-primary">—</div>
            <div class="text-xs text-text-secondary">Ingresos Mes</div>
          </div>
        </div>
        <div class="text-[11px] text-text-muted mt-2">Se conectará con Stripe</div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div>
      <h2 class="text-base font-semibold text-text-primary mb-3">Actividad Reciente (sistema)</h2>
      <div class="rounded-xl bg-surface border border-border-default overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border-default">
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Fecha</th>
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Evento</th>
              <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Detalles</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="recentActivity.length === 0">
              <td colspan="3" class="px-4 py-8 text-center text-sm text-text-muted">Sin actividad reciente</td>
            </tr>
            <tr v-for="log in recentActivity" :key="log.id" class="border-b border-border-default/50 hover:bg-surface-hover transition-colors">
              <td class="px-4 py-3 text-xs text-text-secondary font-mono">{{ new Date(log.created_at).toLocaleString() }}</td>
              <td class="px-4 py-3 text-xs text-text-primary">{{ log.event_type }}</td>
              <td class="px-4 py-3 text-xs text-text-muted truncate max-w-[300px]">{{ log.metadata ? JSON.stringify(log.metadata) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
