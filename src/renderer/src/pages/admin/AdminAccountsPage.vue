<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Plus, RefreshCw, Pencil, Trash2, Unlock, Search, Loader2, Zap, Upload, Download, X } from 'lucide-vue-next'
import { useAdminStore } from '@renderer/stores/admin.store'

const admin = useAdminStore()

const showAddForm = ref(false)
const editingId = ref<string | null>(null)
const searchQuery = ref('')
const saving = ref(false)
const errorMsg = ref('')
const resolvingPuuids = ref(false)
const puuidMsg = ref('')

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
const elos = ['Unranked', 'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger']
const noDivisionElos = new Set(['Unranked', 'Master', 'Grandmaster', 'Challenger'])

// Auto-clear division & LP when selecting an elo that doesn't use them
watch(() => form.value.elo, (elo) => {
  if (noDivisionElos.has(elo)) {
    form.value.elo_division = null
    form.value.lp = 0
  }
})

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

async function handleResolvePuuids(): Promise<void> {
  resolvingPuuids.value = true
  puuidMsg.value = ''
  const result = await admin.resolvePuuids()
  if (result.error) {
    puuidMsg.value = `Error: ${result.error}`
  } else if (result.total === 0) {
    puuidMsg.value = 'Todas las cuentas ya tienen PUUID.'
  } else {
    puuidMsg.value = `Resueltos: ${result.resolved}/${result.total}${result.failed ? ` (${result.failed} fallidos)` : ''}`
  }
  resolvingPuuids.value = false
  setTimeout(() => { puuidMsg.value = '' }, 6000)
}

const filtered = () => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return admin.accounts
  return admin.accounts.filter(a => a.name.toLowerCase().includes(q) || a.riot_username.toLowerCase().includes(q))
}

// ── CSV Bulk Upload ──
const showCsvUpload = ref(false)
const csvFile = ref<File | null>(null)
const csvParsedRows = ref<CsvRow[]>([])
const csvErrors = ref<string[]>([])
const csvUploading = ref(false)
const csvProgress = ref({ done: 0, total: 0 })
const csvResult = ref<{ created: number; failed: { row: number; error: string }[] } | null>(null)

interface CsvRow {
  name: string
  riot_username: string
  riot_tag: string
  login_username: string
  password: string
  server: string
  elo: string
  elo_division: number | null
  lp: number
  status: string
  notes: string | null
}

const CSV_TEMPLATE_HEADER = 'name,riot_username,riot_tag,login_username,password,server,elo,elo_division,lp,status,notes'
const CSV_TEMPLATE_EXAMPLE = 'MiCuenta,Player1,NA1,player1@email.com,MiPassword123,LAN,Gold,2,45,active,Cuenta principal'
const MAX_CSV_ROWS = 40
const showCsvReference = ref(false)

const csvColumnReference = [
  { col: 'name', required: true, desc: 'Nombre de la cuenta', values: 'Texto libre' },
  { col: 'riot_username', required: true, desc: 'Nombre de Riot (gameName)', values: 'Texto libre' },
  { col: 'riot_tag', required: true, desc: 'Tag de Riot (tagLine)', values: 'Ej: NA1, LAN, 0001' },
  { col: 'login_username', required: true, desc: 'Email o usuario de login', values: 'Texto libre' },
  { col: 'password', required: true, desc: 'Contraseña de la cuenta', values: 'Texto libre' },
  { col: 'server', required: false, desc: 'Servidor del juego', values: servers.join(', '), default: 'LAN' },
  { col: 'elo', required: false, desc: 'Rango / elo', values: elos.join(', '), default: 'Iron' },
  { col: 'elo_division', required: false, desc: 'División (1-4)', values: '1, 2, 3, 4 ó vacío (N/A para Master+/Unranked)', default: '4' },
  { col: 'lp', required: false, desc: 'Puntos de liga', values: 'Número (0-100+)', default: '0' },
  { col: 'status', required: false, desc: 'Estado de la cuenta', values: 'active, semi_active, inactive', default: 'active' },
  { col: 'notes', required: false, desc: 'Notas admin (opcional)', values: 'Texto libre', default: 'vacío' }
]

function downloadCsvTemplate(): void {
  const lines = [
    '# PLANTILLA DE CARGA MASIVA DE CUENTAS - AccountFlow',
    '# ──────────────────────────────────────────────────',
    '# Columnas obligatorias: name, riot_username, riot_tag, login_username, password',
    '# Columnas opcionales: server, elo, elo_division, lp, status, notes',
    '#',
    `# server: ${servers.join(' | ')}  (default: LAN)`,
    `# elo: ${elos.join(' | ')}  (default: Iron)`,
    '# elo_division: 1 | 2 | 3 | 4  (dejar vacío para Unranked/Master/Grandmaster/Challenger)  (default: 4)',
    '# lp: número  (default: 0)',
    '# status: active | semi_active | inactive  (default: active)',
    '#',
    '# Máximo 40 cuentas por archivo. Las líneas que empiezan con # son ignoradas.',
    '# ──────────────────────────────────────────────────',
    CSV_TEMPLATE_HEADER,
    CSV_TEMPLATE_EXAMPLE,
    ''
  ]
  const content = lines.join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'plantilla_cuentas.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++ }
      else if (ch === '"') { inQuotes = false }
      else { current += ch }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ',') { result.push(current.trim()); current = '' }
      else { current += ch }
    }
  }
  result.push(current.trim())
  return result
}

function handleCsvFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  csvFile.value = file
  csvErrors.value = []
  csvParsedRows.value = []
  csvResult.value = null

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = (e.target?.result as string) || ''
    const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'))
    if (lines.length < 2) {
      csvErrors.value = ['El archivo no contiene filas de datos (solo encabezado o vacío).']
      return
    }

    // Skip header
    const dataLines = lines.slice(1)
    if (dataLines.length > MAX_CSV_ROWS) {
      csvErrors.value = [`Máximo ${MAX_CSV_ROWS} cuentas por archivo. Se encontraron ${dataLines.length}.`]
      return
    }

    const errors: string[] = []
    const rows: CsvRow[] = []
    const seenLogins = new Set<string>()
    const seenRiotIds = new Set<string>()

    // Check against existing accounts for duplicates
    const existingLogins = new Set(
      admin.accounts
        .map(a => (a as any).account_credentials?.[0]?.login_username?.toLowerCase())
        .filter(Boolean)
    )
    const existingRiotIds = new Set(
      admin.accounts.map(a => `${a.riot_username.toLowerCase()}#${a.riot_tag.toLowerCase()}`)
    )

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2 // 1-based, skip header
      const cols = parseCsvLine(dataLines[i])
      if (cols.length < 5) {
        errors.push(`Fila ${rowNum}: faltan columnas obligatorias (mínimo: name, riot_username, riot_tag, login_username, password)`)
        continue
      }

      const [name, riot_username, riot_tag, login_username, password, server, elo, elo_division, lp, status, notes] = cols

      if (!name || !riot_username || !riot_tag || !login_username || !password) {
        errors.push(`Fila ${rowNum}: name, riot_username, riot_tag, login_username y password son obligatorios`)
        continue
      }

      // Duplicate check within CSV
      const loginKey = login_username.toLowerCase()
      if (seenLogins.has(loginKey)) {
        errors.push(`Fila ${rowNum}: login_username "${login_username}" duplicado en el CSV`)
        continue
      }
      const riotIdKey = `${riot_username.toLowerCase()}#${riot_tag.toLowerCase()}`
      if (seenRiotIds.has(riotIdKey)) {
        errors.push(`Fila ${rowNum}: riot_username+riot_tag "${riot_username}#${riot_tag}" duplicado en el CSV`)
        continue
      }

      // Duplicate check against existing accounts
      if (existingLogins.has(loginKey)) {
        errors.push(`Fila ${rowNum}: login_username "${login_username}" ya existe en la base de datos`)
        continue
      }
      if (existingRiotIds.has(riotIdKey)) {
        errors.push(`Fila ${rowNum}: "${riot_username}#${riot_tag}" ya existe en la base de datos`)
        continue
      }

      // Validate server
      const validServer = servers.includes(server || 'LAN') ? (server || 'LAN') : 'LAN'
      // Validate elo
      const validElo = elos.includes(elo || 'Iron') ? (elo || 'Iron') : 'Iron'
      // Parse division
      const divVal = elo_division ? parseInt(elo_division) : null
      const validDiv = noDivisionElos.has(validElo) ? null : (divVal && divVal >= 1 && divVal <= 4 ? divVal : 4)
      // Parse LP
      const lpVal = lp ? parseInt(lp) : 0

      seenLogins.add(loginKey)
      seenRiotIds.add(riotIdKey)

      rows.push({
        name,
        riot_username,
        riot_tag,
        login_username,
        password,
        server: validServer,
        elo: validElo,
        elo_division: validDiv,
        lp: isNaN(lpVal) ? 0 : lpVal,
        status: ['active', 'semi_active', 'inactive'].includes(status || 'active') ? (status || 'active') : 'active',
        notes: notes || null
      })
    }

    csvErrors.value = errors
    csvParsedRows.value = rows
  }
  reader.readAsText(file)
}

async function handleCsvUpload(): Promise<void> {
  if (csvParsedRows.value.length === 0) return
  csvUploading.value = true
  csvProgress.value = { done: 0, total: csvParsedRows.value.length }
  csvResult.value = null

  const result = await admin.bulkCreateAccounts(
    csvParsedRows.value,
    (done, total) => { csvProgress.value = { done, total } }
  )

  csvResult.value = result
  csvUploading.value = false
}

function resetCsvUpload(): void {
  showCsvUpload.value = false
  csvFile.value = null
  csvParsedRows.value = []
  csvErrors.value = []
  csvResult.value = null
  csvUploading.value = false
  csvProgress.value = { done: 0, total: 0 }
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
        <button
          :disabled="resolvingPuuids"
          class="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30 text-xs font-medium text-warning hover:bg-warning/20 transition-colors disabled:opacity-50"
          @click="handleResolvePuuids"
        >
          <Loader2 v-if="resolvingPuuids" class="w-3.5 h-3.5 animate-spin" />
          <Zap v-else class="w-3.5 h-3.5" />
          Resolver PUUIDs
        </button>
        <button class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-default text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors" @click="admin.fetchAllAccounts()">
          <RefreshCw class="w-3.5 h-3.5" />
          Recargar
        </button>
        <button class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-accent/30 text-xs font-medium text-accent hover:bg-accent/10 transition-colors" @click="showCsvUpload = true">
          <Upload class="w-3.5 h-3.5" />
          Carga CSV
        </button>
        <button class="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white transition-colors" @click="showAddForm = true">
          <Plus class="w-3.5 h-3.5" />
          Agregar Cuenta
        </button>
      </div>
    </div>

    <!-- PUUID resolve feedback -->
    <div v-if="puuidMsg" class="p-2.5 rounded-lg text-xs" :class="puuidMsg.startsWith('Error') ? 'bg-error/10 border border-error/30 text-error' : 'bg-success/10 border border-success/30 text-success'">
      {{ puuidMsg }}
    </div>

    <!-- CSV Bulk Upload Panel -->
    <div v-if="showCsvUpload" class="rounded-xl bg-surface border border-accent/30 p-5 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-text-primary">Carga Masiva CSV</h3>
        <button class="p-1 rounded-md hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors" @click="resetCsvUpload">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="flex items-center gap-3">
        <button class="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-primary border border-border-default text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors" @click="downloadCsvTemplate">
          <Download class="w-3.5 h-3.5" />
          Descargar Plantilla CSV
        </button>
        <button class="text-[11px] font-medium text-accent hover:underline" @click="showCsvReference = !showCsvReference">
          {{ showCsvReference ? 'Ocultar referencia' : 'Ver valores válidos' }}
        </button>
        <span class="text-[11px] text-text-muted">Máx. {{ MAX_CSV_ROWS }} cuentas por archivo</span>
      </div>

      <!-- Column reference guide -->
      <div v-if="showCsvReference" class="rounded-lg border border-border-default max-h-64 overflow-auto">
        <table class="w-full text-[11px]">
          <thead>
            <tr class="bg-bg-primary border-b border-border-default sticky top-0">
              <th class="px-2.5 py-1.5 text-left font-semibold text-text-secondary">Columna</th>
              <th class="px-2.5 py-1.5 text-left font-semibold text-text-secondary">Req.</th>
              <th class="px-2.5 py-1.5 text-left font-semibold text-text-secondary">Descripción</th>
              <th class="px-2.5 py-1.5 text-left font-semibold text-text-secondary">Valores válidos</th>
              <th class="px-2.5 py-1.5 text-left font-semibold text-text-secondary">Default</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in csvColumnReference" :key="c.col" class="border-b border-border-default/50">
              <td class="px-2.5 py-1 font-mono text-accent">{{ c.col }}</td>
              <td class="px-2.5 py-1" :class="c.required ? 'text-error font-semibold' : 'text-text-muted'">{{ c.required ? 'Sí' : 'No' }}</td>
              <td class="px-2.5 py-1 text-text-primary">{{ c.desc }}</td>
              <td class="px-2.5 py-1 text-text-secondary font-mono">{{ c.values }}</td>
              <td class="px-2.5 py-1 text-text-muted">{{ c.default || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <label class="text-[11px] font-medium text-text-secondary block mb-1">Archivo CSV</label>
        <input type="file" accept=".csv" class="w-full text-sm text-text-primary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-border-default file:bg-bg-primary file:text-xs file:font-medium file:text-text-secondary file:cursor-pointer hover:file:bg-surface-hover" @change="handleCsvFileChange" />
      </div>

      <!-- Validation errors -->
      <div v-if="csvErrors.length > 0" class="p-3 rounded-lg bg-error/10 border border-error/30 space-y-1 max-h-40 overflow-auto">
        <div class="text-xs font-semibold text-error">Errores de validación ({{ csvErrors.length }}):</div>
        <div v-for="(err, i) in csvErrors" :key="i" class="text-[11px] text-error">• {{ err }}</div>
      </div>

      <!-- Parsed preview -->
      <div v-if="csvParsedRows.length > 0 && !csvResult" class="space-y-3">
        <div class="text-xs text-text-secondary">
          <span class="font-semibold text-success">{{ csvParsedRows.length }}</span> cuentas listas para importar
          <span v-if="csvErrors.length" class="text-warning ml-2">({{ csvErrors.length }} filas con errores serán omitidas)</span>
        </div>

        <div class="rounded-lg border border-border-default max-h-48 overflow-auto">
          <table class="w-full text-[11px]">
            <thead>
              <tr class="bg-bg-primary border-b border-border-default">
                <th class="px-2 py-1.5 text-left font-semibold text-text-secondary">#</th>
                <th class="px-2 py-1.5 text-left font-semibold text-text-secondary">Nombre</th>
                <th class="px-2 py-1.5 text-left font-semibold text-text-secondary">Riot ID</th>
                <th class="px-2 py-1.5 text-left font-semibold text-text-secondary">Login</th>
                <th class="px-2 py-1.5 text-left font-semibold text-text-secondary">Server</th>
                <th class="px-2 py-1.5 text-left font-semibold text-text-secondary">Elo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in csvParsedRows" :key="i" class="border-b border-border-default/50">
                <td class="px-2 py-1 text-text-muted">{{ i + 1 }}</td>
                <td class="px-2 py-1 text-text-primary">{{ row.name }}</td>
                <td class="px-2 py-1 text-text-secondary font-mono">{{ row.riot_username }}#{{ row.riot_tag }}</td>
                <td class="px-2 py-1 text-text-secondary">{{ row.login_username }}</td>
                <td class="px-2 py-1 text-text-secondary">{{ row.server }}</td>
                <td class="px-2 py-1 text-text-secondary">{{ row.elo }} {{ row.elo_division || '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Upload button + progress -->
        <div class="flex items-center gap-3">
          <button
            :disabled="csvUploading"
            class="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white transition-colors disabled:opacity-50"
            @click="handleCsvUpload"
          >
            <Loader2 v-if="csvUploading" class="w-3.5 h-3.5 animate-spin" />
            <Upload v-else class="w-3.5 h-3.5" />
            {{ csvUploading ? `Importando ${csvProgress.done}/${csvProgress.total}...` : `Importar ${csvParsedRows.length} cuentas` }}
          </button>
          <div v-if="csvUploading" class="flex-1 h-1.5 rounded-full bg-bg-primary">
            <div class="h-full rounded-full bg-accent transition-all" :style="{ width: (csvProgress.total ? (csvProgress.done / csvProgress.total) * 100 : 0) + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- Upload results -->
      <div v-if="csvResult" class="space-y-2">
        <div class="p-3 rounded-lg bg-success/10 border border-success/30 text-xs text-success">
          ✓ {{ csvResult.created }} cuentas creadas exitosamente
        </div>
        <div v-if="csvResult.failed.length > 0" class="p-3 rounded-lg bg-error/10 border border-error/30 space-y-1 max-h-32 overflow-auto">
          <div class="text-xs font-semibold text-error">{{ csvResult.failed.length }} fallidas:</div>
          <div v-for="f in csvResult.failed" :key="f.row" class="text-[11px] text-error">• Fila {{ f.row }}: {{ f.error }}</div>
        </div>
        <button class="px-3 py-1.5 rounded-lg bg-surface border border-border-default text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors" @click="resetCsvUpload">
          Cerrar
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
