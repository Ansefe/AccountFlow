<script setup lang="ts">
import { Search, Bell, Coins, ChevronDown } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@renderer/stores/auth.store'

const router = useRouter()
const auth = useAuthStore()

defineProps<{
  title: string
}>()
</script>

<template>
  <header class="flex items-center h-14 px-6 border-b border-border-default bg-bg-primary shrink-0">
    <!-- Page Title -->
    <h1 class="text-lg font-bold text-text-primary">{{ title }}</h1>

    <div class="flex-1" />

    <!-- Search -->
    <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border-default mr-4 w-56 cursor-pointer hover:border-border-hover transition-colors">
      <Search class="w-4 h-4 text-text-muted" />
      <span class="text-sm text-text-muted">Buscar...</span>
      <span class="ml-auto text-[10px] text-text-muted bg-bg-secondary px-1.5 py-0.5 rounded font-mono">(3K)</span>
    </div>

    <!-- Credits -->
    <div
      class="flex items-center gap-1.5 mr-4 cursor-pointer hover:opacity-80 transition-opacity"
      @click="router.push('/credits')"
    >
      <Coins class="w-4 h-4 text-warning" />
      <span class="text-base font-bold font-mono text-text-primary">{{ auth.totalCredits }}</span>
    </div>

    <!-- Notifications -->
    <button class="relative p-2 rounded-lg hover:bg-surface-hover transition-colors mr-2">
      <Bell class="w-4.5 h-4.5 text-text-secondary" />
      <div class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error"></div>
    </button>

    <!-- Avatar -->
    <div class="flex items-center gap-1.5 cursor-pointer">
      <div class="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold text-accent">
        {{ auth.displayName.charAt(0).toUpperCase() }}
      </div>
      <ChevronDown class="w-3.5 h-3.5 text-text-muted" />
    </div>
  </header>
</template>
