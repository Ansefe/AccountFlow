<script setup lang="ts">
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-vue-next'
import { useNotificationsStore } from '@renderer/stores/notifications.store'
import type { NotificationType } from '@renderer/stores/notifications.store'

const notifications = useNotificationsStore()

const iconMap: Record<NotificationType, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle
}

const colorMap: Record<NotificationType, string> = {
  info: 'border-accent/40 bg-accent/10',
  success: 'border-success/40 bg-success/10',
  warning: 'border-warning/40 bg-warning/10',
  error: 'border-error/40 bg-error/10'
}

const iconColorMap: Record<NotificationType, string> = {
  info: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error'
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-12 right-4 z-9999 flex flex-col gap-2 w-80 pointer-events-none">
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
      >
        <div
          v-for="notif in notifications.visible"
          :key="notif.id"
          class="pointer-events-auto rounded-lg border backdrop-blur-sm bg-surface shadow-lg px-4 py-3 flex items-start gap-3"
          :class="colorMap[notif.type]"
        >
          <component
            :is="iconMap[notif.type]"
            class="w-4 h-4 mt-0.5 shrink-0"
            :class="iconColorMap[notif.type]"
          />
          <div class="flex-1 min-w-0">
            <div class="text-xs font-semibold text-text-primary">{{ notif.title }}</div>
            <div v-if="notif.message" class="text-[11px] text-text-muted mt-0.5 leading-tight">
              {{ notif.message }}
            </div>
          </div>
          <button
            class="text-text-muted hover:text-text-primary transition-colors shrink-0"
            @click="notifications.remove(notif.id)"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
