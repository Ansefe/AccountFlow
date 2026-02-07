<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'

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
</script>

<template>
  <div class="flex h-full overflow-hidden">
    <Sidebar />
    <div class="flex flex-col flex-1 overflow-hidden">
      <Header :title="pageTitle" />
      <main class="flex-1 overflow-y-auto p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
