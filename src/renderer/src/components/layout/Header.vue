<script setup lang="ts">
import { ref } from 'vue'
import { Coins, ChevronDown, LogOut, Settings } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@renderer/stores/auth.store'

const router = useRouter()
const auth = useAuthStore()
const showUserMenu = ref(false)

defineProps<{
  title: string
}>()

async function handleLogout(): Promise<void> {
  showUserMenu.value = false
  await auth.signOut()
  router.push('/login')
}
</script>

<template>
  <header class="flex items-center h-14 px-6 border-b border-border-default bg-bg-primary shrink-0">
    <!-- Page Title -->
    <h1 class="text-lg font-bold text-text-primary">{{ title }}</h1>

    <div class="flex-1" />

    <!-- Credits -->
    <div
      class="flex items-center gap-1.5 mr-4 cursor-pointer hover:opacity-80 transition-opacity"
      @click="router.push('/credits')"
    >
      <Coins class="w-4 h-4 text-warning" />
      <span class="text-base font-bold font-mono text-text-primary">{{ auth.totalCredits }}</span>
    </div>

    <!-- Avatar + Dropdown -->
    <div class="relative">
      <button
        class="flex items-center gap-1.5 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-surface-hover transition-colors"
        @click="showUserMenu = !showUserMenu"
      >
        <div class="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold text-accent">
          {{ auth.displayName.charAt(0).toUpperCase() }}
        </div>
        <span class="text-sm font-medium text-text-primary hidden xl:inline">{{ auth.displayName }}</span>
        <ChevronDown class="w-3.5 h-3.5 text-text-muted" />
      </button>

      <!-- Dropdown -->
      <div
        v-if="showUserMenu"
        class="absolute right-0 top-full mt-1 w-48 rounded-xl bg-surface border border-border-default shadow-2xl py-1 z-50"
      >
        <div class="px-3 py-2 border-b border-border-default">
          <div class="text-sm font-medium text-text-primary truncate">{{ auth.displayName }}</div>
          <div class="text-[11px] text-text-muted truncate">{{ auth.user?.email }}</div>
        </div>
        <button
          class="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover transition-colors"
          @click="showUserMenu = false; router.push('/settings')"
        >
          <Settings class="w-3.5 h-3.5" />
          Ajustes
        </button>
        <button
          class="flex items-center gap-2 w-full px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors"
          @click="handleLogout"
        >
          <LogOut class="w-3.5 h-3.5" />
          Cerrar sesión
        </button>
      </div>

      <!-- Click-away overlay -->
      <div v-if="showUserMenu" class="fixed inset-0 z-40" @click="showUserMenu = false"></div>
    </div>
  </header>
</template>
