<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loader2, Check, LogOut } from 'lucide-vue-next'
import { useAuthStore } from '@renderer/stores/auth.store'
import { supabase } from '@renderer/lib/supabase'

const router = useRouter()
const auth = useAuthStore()

const displayName = ref('')
const saving = ref(false)
const saved = ref(false)
const errorMsg = ref('')
const riotClientPath = ref('C:\\Riot Games\\Riot Client\\RiotClientServices.exe')

onMounted(() => {
  displayName.value = auth.profile?.display_name || ''
})

async function saveProfile(): Promise<void> {
  if (!auth.user) return
  saving.value = true
  saved.value = false
  errorMsg.value = ''

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.value.trim() })
    .eq('id', auth.user.id)

  saving.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  await auth.fetchProfile()
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}

async function handleLogout(): Promise<void> {
  await auth.signOut()
  router.push('/login')
}

const planLabels: Record<string, string> = {
  none: 'Ninguno',
  basic: 'Basic — $10/mes',
  unlimited: 'Unlimited — $30/mes'
}
</script>

<template>
  <div class="space-y-6 max-w-2xl">
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
      <h2 class="text-base font-semibold text-text-primary mb-4">Plan</h2>
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-medium text-text-primary">
            Plan {{ planLabels[auth.profile?.plan_type || 'none'] }}
          </div>
          <div v-if="auth.profile?.plan_expires_at" class="text-xs text-text-muted mt-0.5">
            Expira: {{ new Date(auth.profile.plan_expires_at).toLocaleDateString() }}
          </div>
          <div v-else class="text-xs text-text-muted mt-0.5">Sin plan activo</div>
        </div>
        <div class="flex items-center gap-2">
          <div class="text-right">
            <div class="text-xs text-text-secondary font-mono">{{ auth.totalCredits }} créditos</div>
            <div class="text-[11px] text-text-muted">Sub: {{ auth.profile?.subscription_credits ?? 0 }} | Comp: {{ auth.profile?.purchased_credits ?? 0 }}</div>
          </div>
        </div>
      </div>
      <p class="text-[11px] text-text-muted mt-3">Contacta al admin para cambios de plan.</p>
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
          <button class="px-4 h-10 rounded-lg bg-surface border border-border-default text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors">
            Buscar
          </button>
        </div>
        <p class="text-[11px] text-text-muted mt-1.5">Se detecta automáticamente. Modifica solo si tienes problemas. (Auto-login próximamente)</p>
      </div>
    </div>

    <!-- Danger Zone -->
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
