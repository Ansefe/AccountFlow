<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Download } from 'lucide-vue-next'
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
import NotificationToast from '../NotificationToast.vue'

const route = useRoute()

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/': 'Dashboard',
    '/accounts': 'Catálogo de Cuentas',
    '/rentals': 'Mis Alquileres',
    '/credits': 'Créditos',
    '/settings': 'Ajustes',
    '/admin': 'Admin Dashboard',
    '/admin/accounts': 'Gestión de Cuentas',
    '/admin/users': 'Gestión de Usuarios',
    '/admin/activity': 'Activity Log'
  }
  return titles[route.path] || 'AccountFlow'
})

const updateReady = ref(false)
const updateVersion = ref('')
let unsubUpdater: (() => void) | null = null

onMounted(() => {
  unsubUpdater = window.api?.updater?.onStatus((data) => {
    if (data.status === 'ready') {
      updateReady.value = true
      updateVersion.value = data.version
    }
  }) ?? null
})

onUnmounted(() => {
  unsubUpdater?.()
})

function installUpdate(): void {
  window.api?.updater?.install()
}
</script>

<template>
  <div class="flex h-full overflow-hidden">
    <Sidebar />
    <div class="flex flex-col flex-1 overflow-hidden">
      <Header :title="pageTitle" />

      <!-- Update banner -->
      <div
        v-if="updateReady"
        class="mx-6 mt-3 flex items-center justify-between rounded-lg bg-accent/10 border border-accent/30 px-4 py-2.5"
      >
        <div class="flex items-center gap-2 text-sm text-accent">
          <Download class="w-4 h-4" />
          <span>Nueva versión <strong>{{ updateVersion }}</strong> lista para instalar</span>
        </div>
        <button
          class="px-3 py-1 rounded-lg bg-accent hover:bg-accent-hover text-xs font-semibold text-white transition-colors"
          @click="installUpdate"
        >
          Reiniciar y actualizar
        </button>
      </div>

      <main class="flex-1 overflow-y-auto p-6">
        <slot />
      </main>
    </div>
  </div>
  <NotificationToast />
</template>
