import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number // ms, 0 = persistent
  createdAt: number
}

let _counter = 0

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<AppNotification[]>([])
  const maxVisible = 5

  const visible = computed(() => notifications.value.slice(0, maxVisible))

  function add(type: NotificationType, title: string, message?: string, duration = 5000): string {
    const id = `notif-${++_counter}-${Date.now()}`
    const notif: AppNotification = { id, type, title, message, duration, createdAt: Date.now() }
    notifications.value.unshift(notif)

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }

    // Cap total to prevent memory leaks
    if (notifications.value.length > 50) {
      notifications.value = notifications.value.slice(0, 50)
    }

    return id
  }

  function remove(id: string): void {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  // Convenience methods
  function info(title: string, message?: string, duration?: number): string {
    return add('info', title, message, duration)
  }

  function success(title: string, message?: string, duration?: number): string {
    return add('success', title, message, duration)
  }

  function warning(title: string, message?: string, duration?: number): string {
    return add('warning', title, message, duration)
  }

  function error(title: string, message?: string, duration?: number): string {
    return add('error', title, message, duration)
  }

  return {
    notifications,
    visible,
    add,
    remove,
    info,
    success,
    warning,
    error
  }
})
