<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Minus, Square, X, Hexagon } from 'lucide-vue-next'

const isMaximized = ref(false)

onMounted(async () => {
  isMaximized.value = await window.api.window.isMaximized()
  window.api.window.onMaximizedChange((maximized) => {
    isMaximized.value = maximized
  })
})

function minimize(): void {
  window.api.window.minimize()
}

function maximize(): void {
  window.api.window.maximize()
}

function close(): void {
  window.api.window.close()
}
</script>

<template>
  <div class="flex items-center h-8 bg-bg-secondary border-b border-border-default select-none"
       style="-webkit-app-region: drag;">
    <div class="flex items-center gap-1.5 px-3">
      <Hexagon class="w-4 h-4 text-accent" :stroke-width="2" />
      <span class="text-xs font-semibold text-text-secondary">AccountFlow</span>
    </div>

    <div class="flex-1" />

    <div class="flex items-center" style="-webkit-app-region: no-drag;">
      <button
        class="flex items-center justify-center w-11 h-8 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
        @click="minimize"
      >
        <Minus class="w-3.5 h-3.5" />
      </button>
      <button
        class="flex items-center justify-center w-11 h-8 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
        @click="maximize"
      >
        <Square class="w-3 h-3" />
      </button>
      <button
        class="flex items-center justify-center w-11 h-8 text-text-muted hover:text-text-primary hover:bg-error/20 transition-colors"
        @click="close"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
