<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search, RefreshCw, Coins, Shield, Loader2, Trash2 } from 'lucide-vue-next'
import { useAdminStore } from '@renderer/stores/admin.store'
import type { Profile } from '@renderer/types/database'

const admin = useAdminStore()
const searchQuery = ref('')

// Credit adjustment
const adjustingUser = ref<Profile | null>(null)
const adjustAmount = ref(0)
const adjustType = ref<'subscription' | 'purchased'>('purchased')
const adjustReason = ref('')
const adjustLoading = ref(false)
const adjustError = ref('')

// Plan editing
const editingPlanUser = ref<Profile | null>(null)
const planType = ref('none')
const planDays = ref(30)
const planLoading = ref(false)
const deleteError = ref('')

async function handleDeleteUser(user: Profile): Promise<void> {
  deleteError.value = ''
  if (!confirm(`¿Eliminar al usuario "${user.display_name || user.id}" permanentemente? Esta acción no se puede deshacer.`)) return
  const { error } = await admin.deleteUser(user.id)
  if (error) {
    deleteError.value = error
    setTimeout(() => { deleteError.value = '' }, 5000)
  }
}

function openAdjust(user: Profile): void {
  adjustingUser.value = user
  adjustAmount.value = 0
  adjustReason.value = ''
  adjustError.value = ''
}

async function submitAdjust(): Promise<void> {
  if (!adjustingUser.value || adjustAmount.value === 0) return
  adjustLoading.value = true
  adjustError.value = ''
  const { error } = await admin.adjustCredits(adjustingUser.value.id, adjustAmount.value, adjustReason.value, adjustType.value)
  adjustLoading.value = false
  if (error) { adjustError.value = error; return }
  adjustingUser.value = null
}

function openPlanEdit(user: Profile): void {
  editingPlanUser.value = user
  planType.value = user.plan_type
  planDays.value = 30
}

async function submitPlan(): Promise<void> {
  if (!editingPlanUser.value) return
  planLoading.value = true
  const expiresAt = planType.value === 'none' ? null : new Date(Date.now() + planDays.value * 86400000).toISOString()
  await admin.updateUserPlan(editingPlanUser.value.id, planType.value, expiresAt)
  planLoading.value = false
  editingPlanUser.value = null
}

const filtered = () => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return admin.users
  return admin.users.filter(u =>
    (u.display_name || '').toLowerCase().includes(q) || u.id.includes(q)
  )
}

onMounted(() => admin.fetchAllUsers())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-default w-64">
          <Search class="w-4 h-4 text-text-muted" />
          <input v-model="searchQuery" type="text" placeholder="Buscar usuario..." class="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full" />
        </div>
        <span class="text-xs text-text-muted">{{ admin.users.length }} usuarios</span>
      </div>
      <button class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-default text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors" @click="admin.fetchAllUsers()">
        <RefreshCw class="w-3.5 h-3.5" />
        Recargar
      </button>
    </div>

    <!-- Delete error banner -->
    <div v-if="deleteError" class="p-2.5 rounded-lg text-xs bg-error/10 border border-error/30 text-error">
      {{ deleteError }}
    </div>

    <!-- Users Table -->
    <div class="rounded-xl bg-surface border border-border-default overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border-default">
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Usuario</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Rol</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Plan</th>
            <th class="text-right text-xs font-semibold text-text-secondary px-4 py-3">Sub Cr.</th>
            <th class="text-right text-xs font-semibold text-text-secondary px-4 py-3">Comp Cr.</th>
            <th class="text-right text-xs font-semibold text-text-secondary px-4 py-3">Total</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Registro</th>
            <th class="text-right text-xs font-semibold text-text-secondary px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="admin.loading && admin.users.length === 0">
            <td colspan="8" class="px-4 py-8 text-center text-sm text-text-muted">Cargando...</td>
          </tr>
          <tr v-for="user in filtered()" :key="user.id" class="border-b border-border-default/50 hover:bg-surface-hover transition-colors">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-accent/30 flex items-center justify-center text-[11px] font-bold text-accent">
                  {{ (user.display_name || 'U')[0].toUpperCase() }}
                </div>
                <div>
                  <div class="text-sm font-medium text-text-primary">{{ user.display_name || 'Sin nombre' }}</div>
                  <div class="text-[11px] text-text-muted font-mono">{{ user.id.slice(0, 8) }}...</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    :class="user.role === 'admin' ? 'bg-accent/15 text-accent' : 'bg-bg-primary text-text-secondary border border-border-default'">
                {{ user.role }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span class="text-xs font-medium" :class="user.plan_type === 'unlimited' ? 'text-accent-secondary' : user.plan_type === 'basic' ? 'text-accent' : 'text-text-muted'">
                {{ user.plan_type === 'none' ? '—' : user.plan_type }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm font-mono text-text-secondary text-right">{{ user.subscription_credits }}</td>
            <td class="px-4 py-3 text-sm font-mono text-text-secondary text-right">{{ user.purchased_credits }}</td>
            <td class="px-4 py-3 text-sm font-mono font-bold text-text-primary text-right">{{ user.subscription_credits + user.purchased_credits }}</td>
            <td class="px-4 py-3 text-xs text-text-muted">{{ new Date(user.created_at).toLocaleDateString() }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <button class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-warning hover:bg-warning/10 transition-colors" @click="openAdjust(user)">
                  <Coins class="w-3 h-3" /> Créditos
                </button>
                <button class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-accent hover:bg-accent/10 transition-colors" @click="openPlanEdit(user)">
                  <Shield class="w-3 h-3" /> Plan
                </button>
                <button class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-error hover:bg-error/10 transition-colors" title="Eliminar usuario" @click="handleDeleteUser(user)">
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Credit Adjustment Modal -->
    <div v-if="adjustingUser" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="adjustingUser = null"></div>
      <div class="relative w-full max-w-md mx-4 rounded-2xl bg-surface border border-border-default p-6 space-y-4">
        <h3 class="text-base font-bold text-text-primary">Ajustar Créditos</h3>
        <p class="text-xs text-text-secondary">Usuario: <span class="text-text-primary font-medium">{{ adjustingUser.display_name }}</span></p>
        <div v-if="adjustError" class="p-2 rounded-lg bg-error/10 border border-error/30 text-xs text-error">{{ adjustError }}</div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[11px] font-medium text-text-secondary block mb-1">Monto (+/-)</label>
            <input v-model.number="adjustAmount" type="number" class="w-full h-9 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary font-mono focus:outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <label class="text-[11px] font-medium text-text-secondary block mb-1">Tipo</label>
            <select v-model="adjustType" class="w-full h-9 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary focus:outline-none focus:border-accent transition-colors">
              <option value="purchased">Comprados</option>
              <option value="subscription">Suscripción</option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-[11px] font-medium text-text-secondary block mb-1">Razón</label>
          <input v-model="adjustReason" placeholder="Motivo del ajuste..." class="w-full h-9 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors" />
        </div>
        <div class="flex gap-2 justify-end">
          <button class="px-4 py-2 rounded-lg bg-surface border border-border-default text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors" @click="adjustingUser = null">Cancelar</button>
          <button :disabled="adjustLoading || adjustAmount === 0" class="px-4 py-2 rounded-lg bg-warning hover:bg-warning/80 text-xs font-semibold text-bg-primary transition-colors flex items-center gap-1.5 disabled:opacity-50" @click="submitAdjust">
            <Loader2 v-if="adjustLoading" class="w-3.5 h-3.5 animate-spin" />
            {{ adjustAmount >= 0 ? '+' : '' }}{{ adjustAmount }} créditos
          </button>
        </div>
      </div>
    </div>

    <!-- Plan Edit Modal -->
    <div v-if="editingPlanUser" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="editingPlanUser = null"></div>
      <div class="relative w-full max-w-sm mx-4 rounded-2xl bg-surface border border-border-default p-6 space-y-4">
        <h3 class="text-base font-bold text-text-primary">Cambiar Plan</h3>
        <p class="text-xs text-text-secondary">Usuario: <span class="text-text-primary font-medium">{{ editingPlanUser.display_name }}</span></p>
        <div>
          <label class="text-[11px] font-medium text-text-secondary block mb-1">Plan</label>
          <select v-model="planType" class="w-full h-9 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary focus:outline-none focus:border-accent transition-colors">
            <option value="none">Ninguno</option>
            <option value="basic">Basic ($10/mes)</option>
            <option value="unlimited">Unlimited ($30/mes)</option>
          </select>
        </div>
        <div v-if="planType !== 'none'">
          <label class="text-[11px] font-medium text-text-secondary block mb-1">Duración (días)</label>
          <input v-model.number="planDays" type="number" class="w-full h-9 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary font-mono focus:outline-none focus:border-accent transition-colors" />
        </div>
        <div class="flex gap-2 justify-end">
          <button class="px-4 py-2 rounded-lg bg-surface border border-border-default text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors" @click="editingPlanUser = null">Cancelar</button>
          <button :disabled="planLoading" class="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white transition-colors flex items-center gap-1.5 disabled:opacity-50" @click="submitPlan">
            <Loader2 v-if="planLoading" class="w-3.5 h-3.5 animate-spin" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
