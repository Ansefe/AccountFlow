<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TitleBar from './components/layout/TitleBar.vue'
import AppLayout from './components/layout/AppLayout.vue'

const route = useRoute()
const isAuthLayout = computed(() => route.meta.layout === 'auth')
</script>

<template>
  <TitleBar />
  <div class="flex-1 overflow-hidden">
    <!-- Auth layout (login/register) - no sidebar -->
    <template v-if="isAuthLayout">
      <router-view />
    </template>
    <!-- App layout (sidebar + header + content) -->
    <template v-else>
      <AppLayout>
        <router-view />
      </AppLayout>
    </template>
  </div>
</template>
