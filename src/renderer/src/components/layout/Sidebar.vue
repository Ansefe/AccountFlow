<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard,
  Monitor,
  Clock,
  Coins,
  Settings,
  BarChart3,
  Database,
  Users,
  ScrollText,
  Hexagon,
  ChevronDown,
  LogOut
} from 'lucide-vue-next'
import { useAuthStore } from '@renderer/stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const isAdmin = computed(() => auth.isAdmin)

interface NavItem {
  name: string
  label: string
  icon: typeof LayoutDashboard
  path: string
}

const mainNav: NavItem[] = [
  { name: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'accounts', label: 'Cuentas', icon: Monitor, path: '/accounts' },
  { name: 'rentals', label: 'Mis Alquileres', icon: Clock, path: '/rentals' },
  { name: 'credits', label: 'Créditos', icon: Coins, path: '/credits' }
]

const configNav: NavItem[] = [
  { name: 'settings', label: 'Ajustes', icon: Settings, path: '/settings' }
]

const adminNav: NavItem[] = [
  { name: 'admin-dashboard', label: 'Dashboard Admin', icon: BarChart3, path: '/admin' },
  { name: 'admin-accounts', label: 'Gestión Cuentas', icon: Database, path: '/admin/accounts' },
  { name: 'admin-users', label: 'Gestión Usuarios', icon: Users, path: '/admin/users' },
  { name: 'admin-activity', label: 'Activity Log', icon: ScrollText, path: '/admin/activity' }
]

const showUserMenu = ref(false)

function isActive(path: string): boolean {
  if (path === '/' || path === '/admin') return route.path === path
  return route.path.startsWith(path)
}

async function handleLogout(): Promise<void> {
  showUserMenu.value = false
  await auth.signOut()
  router.push('/login')
}

function navigate(path: string): void {
  router.push(path)
}
</script>

<template>
  <aside class="flex flex-col w-60 bg-bg-secondary border-r border-border-default h-full">
    <!-- Logo -->
    <div class="flex items-center gap-2 px-5 py-4">
      <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/20">
        <Hexagon class="w-5 h-5 text-accent" :stroke-width="2" />
      </div>
      <span class="text-base font-bold text-text-primary">AccountFlow</span>
      <span class="text-[10px] text-text-muted font-medium ml-0.5">H4</span>
    </div>

    <!-- Main Navigation -->
    <nav class="flex-1 px-3 space-y-0.5">
      <button
        v-for="item in mainNav"
        :key="item.name"
        class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        :class="isActive(item.path)
          ? 'bg-accent/15 text-accent border-l-[3px] border-accent pl-[9px]'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'"
        @click="navigate(item.path)"
      >
        <component :is="item.icon" class="w-[18px] h-[18px]" :stroke-width="1.8" />
        {{ item.label }}
      </button>

      <!-- Config section -->
      <div class="pt-4">
        <span class="px-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Config</span>
        <div class="mt-1.5 space-y-0.5">
          <button
            v-for="item in configNav"
            :key="item.name"
            class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="isActive(item.path)
              ? 'bg-accent/15 text-accent border-l-[3px] border-accent pl-[9px]'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'"
            @click="navigate(item.path)"
          >
            <component :is="item.icon" class="w-[18px] h-[18px]" :stroke-width="1.8" />
            {{ item.label }}
          </button>
        </div>
      </div>

      <!-- Admin section -->
      <div v-if="isAdmin" class="pt-4">
        <span class="px-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Admin</span>
        <div class="mt-1.5 space-y-0.5">
          <button
            v-for="item in adminNav"
            :key="item.name"
            class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="isActive(item.path)
              ? 'bg-accent/15 text-accent border-l-[3px] border-accent pl-[9px]'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'"
            @click="navigate(item.path)"
          >
            <component :is="item.icon" class="w-[18px] h-[18px]" :stroke-width="1.8" />
            {{ item.label }}
          </button>
        </div>
      </div>
    </nav>

    <!-- Plan Badge -->
    <div class="mx-3 mb-2">
      <div class="rounded-xl bg-surface border border-border-default px-4 py-3"
           :class="auth.profile?.plan_type === 'unlimited' ? 'border-accent-secondary/30 bg-gradient-to-br from-surface to-accent-secondary/5' : ''">
        <div class="text-sm font-bold text-text-primary">Plan {{ auth.profile?.plan_type === 'basic' ? 'Basic' : auth.profile?.plan_type === 'unlimited' ? 'Unlimited' : 'Ninguno' }}</div>
        <div class="text-xs text-text-secondary">{{ auth.totalCredits }} Créditos</div>
      </div>
    </div>

    <!-- User -->
    <div class="mx-3 mb-3 relative">
      <button
        class="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors"
        @click="showUserMenu = !showUserMenu"
      >
        <div class="w-7 h-7 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold text-accent">
          {{ auth.displayName.charAt(0).toUpperCase() }}
        </div>
        <span class="text-sm font-medium text-text-primary truncate">{{ auth.displayName }}</span>
        <ChevronDown class="w-3.5 h-3.5 text-text-muted ml-auto shrink-0 transition-transform" :class="showUserMenu ? 'rotate-180' : ''" />
      </button>

      <!-- User dropdown menu -->
      <div v-if="showUserMenu" class="absolute bottom-full left-0 right-0 mb-1 rounded-xl bg-surface border border-border-default shadow-2xl py-1 z-50">
        <div class="px-3 py-2 border-b border-border-default">
          <div class="text-xs text-text-muted truncate">{{ auth.user?.email }}</div>
        </div>
        <button
          class="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover transition-colors"
          @click="showUserMenu = false; navigate('/settings')"
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

      <!-- Click-away -->
      <div v-if="showUserMenu" class="fixed inset-0 z-40" @click="showUserMenu = false"></div>
    </div>
  </aside>
</template>
