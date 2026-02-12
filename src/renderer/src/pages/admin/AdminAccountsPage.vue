<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, RefreshCw, Pencil, Trash2, Unlock, Search, Loader2 } from 'lucide-vue-next'
import { useAdminStore } from '@renderer/stores/admin.store'

const admin = useAdminStore()

const showAddForm = ref(false)
const editingId = ref<string | null>(null)
const searchQuery = ref('')
const saving = ref(false)
const errorMsg = ref('')

// Form state
const form = ref({
  name: '',
  riot_username: '',
  riot_tag: '',
  login_username: '',
  encrypted_password: '',
  server: 'LAN',
  elo: 'Iron',
  elo_division: 4 as number | null,
  lp: 0,
  status: 'active',
  notes: ''
})

const servers = ['NA', 'EUW', 'EUNE', 'LAN', 'LAS', 'BR', 'KR', 'JP', 'OCE', 'TR', 'RU']
const elos = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger']

function resetForm(): void {
  form.value = { name: '', riot_username: '', riot_tag: '', login_username: '', encrypted_password: '', server: 'LAN', elo: 'Iron', elo_division: 4, lp: 0, status: 'active', notes: '' }
  editingId.value = null
  showAddForm.value = false
  errorMsg.value = ''
}

function startEdit(account: (typeof admin.accounts)[0]): void {
  editingId.value = account.id
  form.value = {
    name: account.name,
    riot_username: account.riot_username,
    riot_tag: account.riot_tag,
    login_username: (account as any).account_credentials?.[0]?.login_username || '',
    encrypted_password: '',
    server: account.server,
    elo: account.elo,
    elo_division: account.elo_division,
    lp: account.lp,
    status: account.status,
    notes: account.notes || ''
  }
  showAddForm.value = true
}

async function handleSave(): Promise<void> {
  saving.value = true
  errorMsg.value = ''

  if (!form.value.name || !form.value.riot_username || !form.value.riot_tag) {
    errorMsg.value = 'Nombre, Riot Username y Tag son obligatorios'
    saving.value = false
    return
  }

  if (!form.value.login_username) {
    errorMsg.value = 'El usuario/email de inicio de sesión (login) es obligatorio'
    saving.value = false
    return
  }

  if (editingId.value) {
    const updates: Record<string, unknown> = { ...form.value }
    if (!updates.encrypted_password) delete updates.encrypted_password
    if (!updates.notes) updates.notes = null
    const { error } = await admin.updateAccount(editingId.value, updates as never)
    if (error) { errorMsg.value = error; saving.value = false; return }
  } else {
    if (!form.value.encrypted_password) {
      errorMsg.value = 'La contraseña es obligatoria al crear una cuenta'
      saving.value = false
      return
    }
    const { error } = await admin.createAccount({
      ...form.value,
      notes: form.value.notes || null
    })
    if (error) { errorMsg.value = error; saving.value = false; return }
  }

  saving.value = false
  resetForm()
}

async function handleDelete(id: string): Promise<void> {
  if (!confirm('¿Eliminar esta cuenta permanentemente?')) return
  await admin.deleteAccount(id)
}

async function handleForceRelease(accountId: string, rentalId: string): Promise<void> {
  if (!confirm('¿Forzar liberación de esta cuenta?')) return
  await admin.forceReleaseAccount(accountId, rentalId)
}

const filtered = () => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return admin.accounts
  return admin.accounts.filter(a => a.name.toLowerCase().includes(q) || a.riot_username.toLowerCase().includes(q))
}

onMounted(() => admin.fetchAllAccounts())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-default w-64">
          <Search class="w-4 h-4 text-text-muted" />
          <input v-model="searchQuery" type="text" placeholder="Buscar cuenta..." class="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full" />
        </div>
        <span class="text-xs text-text-muted">{{ admin.accounts.length }} cuentas</span>
      </div>
      <div class="flex gap-2">
        <button class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-default text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors" @click="admin.fetchAllAccounts()">
          <RefreshCw class="w-3.5 h-3.5" />
          Recargar
        </button>
        <button class="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white transition-colors" @click="showAddForm = true">
          <Plus class="w-3.5 h-3.5" />
          Agregar Cuenta
        </button>
      </div>
    </div>

    <!-- Add/Edit Form -->
    <div v-if="showAddForm" class="rounded-xl bg-surface border border-accent/30 p-5 space-y-4">
      <h3 class="text-sm font-bold text-text-primary">{{ editingId ? 'Editar Cuenta' : 'Nueva Cuenta' }}</h3>
      <div v-if="errorMsg" class="p-2 rounded-lg bg-error/10 border border-error/30 text-xs text-error">{{ errorMsg }}</div>
      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="text-[11px] font-medium text-text-secondary block mb-1">Nombre*</label>
          <input v-model="form.name" class="w-full h-9 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary focus:outline-none focus:border-accent transition-colors" />
        </div>
        <div>
          <label class="text-[11px] font-medium text-text-secondary block mb-1">Riot Username*</label>
          <input v-model="form.riot_username" class="w-full h-9 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary focus:outline-none focus:border-accent transition-colors" />
        </div>
        <div>
          <label class="text-[11px] font-medium text-text-secondary block mb-1">Tag*</label>
          <input v-model="form.riot_tag" placeholder="NA1" class="w-full h-9 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary focus:outline-none focus:border-accent transition-colors" />
        </div>
        <div>
          <label class="text-[11px] font-medium text-text-secondary block mb-1">Login (email/usuario)*</label>
          <input v-model="form.login_username" class="w-full h-9 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary focus:outline-none focus:border-accent transition-colors" />
        </div>
        <div>
          <label class="text-[11px] font-medium text-text-secondary block mb-1">Contraseña{{ editingId ? ' (dejar vacío para no cambiar)' : '*' }}</label>
          <input v-model="form.encrypted_password" type="password" class="w-full h-9 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary focus:outline-none focus:border-accent transition-colors" />
        </div>
        <div>
          <label class="text-[11px] font-medium text-text-secondary block mb-1">Servidor</label>
          <select v-model="form.server" class="w-full h-9 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary focus:outline-none focus:border-accent transition-colors">
            <option v-for="s in servers" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div>
          <label class="text-[11px] font-medium text-text-secondary block mb-1">Elo</label>
          <select v-model="form.elo" class="w-full h-9 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary focus:outline-none focus:border-accent transition-colors">
            <option v-for="e in elos" :key="e" :value="e">{{ e }}</option>
          </select>
        </div>
        <div>
          <label class="text-[11px] font-medium text-text-secondary block mb-1">División</label>
          <select v-model="form.elo_division" class="w-full h-9 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary focus:outline-none focus:border-accent transition-colors">
            <option :value="null">N/A</option>
            <option v-for="d in [1,2,3,4]" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div>
          <label class="text-[11px] font-medium text-text-secondary block mb-1">LP</label>
          <input v-model.number="form.lp" type="number" class="w-full h-9 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary font-mono focus:outline-none focus:border-accent transition-colors" />
        </div>
        <div>
          <label class="text-[11px] font-medium text-text-secondary block mb-1">Estado</label>
          <select v-model="form.status" class="w-full h-9 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary focus:outline-none focus:border-accent transition-colors">
            <option value="active">Activa</option>
            <option value="semi_active">Semi-activa</option>
            <option value="inactive">Inactiva</option>
          </select>
        </div>
      </div>
      <div>
        <label class="text-[11px] font-medium text-text-secondary block mb-1">Notas (admin)</label>
        <input v-model="form.notes" class="w-full h-9 px-3 rounded-lg bg-bg-primary border border-border-default text-sm text-text-primary focus:outline-none focus:border-accent transition-colors" />
      </div>
      <div class="flex gap-2 justify-end">
        <button class="px-4 py-2 rounded-lg bg-surface border border-border-default text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors" @click="resetForm">Cancelar</button>
        <button :disabled="saving" class="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white transition-colors flex items-center gap-1.5 disabled:opacity-50" @click="handleSave">
          <Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin" />
          {{ editingId ? 'Guardar' : 'Crear Cuenta' }}
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-xl bg-surface border border-border-default overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border-default">
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Nombre</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Riot ID</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Elo</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Server</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Estado</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Ocupada</th>
            <th class="text-left text-xs font-semibold text-text-secondary px-4 py-3">Notas</th>
            <th class="text-right text-xs font-semibold text-text-secondary px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="admin.loading && admin.accounts.length === 0">
            <td colspan="8" class="px-4 py-8 text-center text-sm text-text-muted">Cargando...</td>
          </tr>
          <tr v-for="acc in filtered()" :key="acc.id" class="border-b border-border-default/50 hover:bg-surface-hover transition-colors">
            <td class="px-4 py-3 text-sm font-medium text-text-primary">{{ acc.name }}</td>
            <td class="px-4 py-3 text-xs text-text-secondary font-mono">{{ acc.riot_username }}#{{ acc.riot_tag }}</td>
            <td class="px-4 py-3 text-xs text-text-primary">{{ acc.elo }} {{ acc.elo_division || '' }} <span class="text-text-muted font-mono">{{ acc.lp }}LP</span></td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-bg-primary text-text-secondary border border-border-default">{{ acc.server }}</span>
            </td>
            <td class="px-4 py-3">
              <span class="flex items-center gap-1 text-xs">
                <span class="w-1.5 h-1.5 rounded-full" :class="acc.status === 'active' ? 'bg-success' : acc.status === 'semi_active' ? 'bg-warning' : 'bg-error'"></span>
                {{ acc.status === 'active' ? 'Activa' : acc.status === 'semi_active' ? 'Semi' : 'Inactiva' }}
              </span>
            </td>
            <td class="px-4 py-3 text-xs" :class="acc.current_rental_id ? 'text-warning' : 'text-success'">
              {{ acc.current_rental_id ? 'En uso' : 'Libre' }}
            </td>
            <td class="px-4 py-3 text-xs text-text-muted max-w-30 truncate">{{ acc.notes || '—' }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <button v-if="acc.current_rental_id" class="p-1.5 rounded-md hover:bg-warning/10 text-warning transition-colors" title="Forzar liberación" @click="handleForceRelease(acc.id, acc.current_rental_id!)">
                  <Unlock class="w-3.5 h-3.5" />
                </button>
                <button class="p-1.5 rounded-md hover:bg-accent/10 text-text-muted hover:text-accent transition-colors" title="Editar" @click="startEdit(acc)">
                  <Pencil class="w-3.5 h-3.5" />
                </button>
                <button class="p-1.5 rounded-md hover:bg-error/10 text-text-muted hover:text-error transition-colors" title="Eliminar" @click="handleDelete(acc.id)">
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
