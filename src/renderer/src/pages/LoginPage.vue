<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Mail, Lock, Hexagon, MessageCircle, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '@renderer/stores/auth.store'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const errorMsg = ref('')
const isLoading = ref(false)

async function handleLogin(): Promise<void> {
  if (!email.value || !password.value) {
    errorMsg.value = 'Por favor completa todos los campos'
    return
  }
  isLoading.value = true
  errorMsg.value = ''
  const { error } = await auth.signInWithEmail(email.value, password.value)
  isLoading.value = false
  if (error) {
    errorMsg.value = error
    return
  }
  router.push('/')
}

async function handleDiscordLogin(): Promise<void> {
  isLoading.value = true
  errorMsg.value = ''
  const { error } = await auth.signInWithDiscord()
  isLoading.value = false
  if (error) {
    errorMsg.value = error
  }
}
</script>

<template>
  <div class="flex items-center justify-center h-full bg-bg-primary relative overflow-hidden">
    <!-- Background effect -->
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(108,92,231,0.08)_0%,_transparent_70%)]"></div>

    <!-- Subtle grid pattern -->
    <div class="absolute inset-0 opacity-[0.03]"
         style="background-image: linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px); background-size: 40px 40px;">
    </div>

    <!-- Login Card -->
    <div class="relative z-10 w-full max-w-md mx-4">
      <div class="rounded-2xl bg-surface/80 backdrop-blur-xl border border-border-default p-8
                  shadow-[0_0_60px_-12px_rgba(108,92,231,0.15)]">

        <!-- Logo -->
        <div class="flex flex-col items-center mb-8">
          <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/20 mb-3">
            <Hexagon class="w-7 h-7 text-accent" :stroke-width="1.8" />
          </div>
          <h1 class="text-2xl font-bold text-text-primary">AccountFlow</h1>
          <p class="text-sm text-text-secondary mt-1">Bienvenido de nuevo</p>
        </div>

        <!-- Error Message -->
        <div v-if="errorMsg" class="mb-4 p-3 rounded-lg bg-error/10 border border-error/30 text-sm text-error">
          {{ errorMsg }}
        </div>

        <!-- Form -->
        <form class="space-y-4" @submit.prevent="handleLogin">
          <!-- Email -->
          <div class="relative">
            <Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              v-model="email"
              type="email"
              placeholder="Correo electrónico"
              class="w-full h-11 pl-10 pr-4 rounded-lg bg-bg-primary border border-border-default
                     text-sm text-text-primary placeholder:text-text-muted
                     focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
                     transition-colors"
            />
          </div>

          <!-- Password -->
          <div class="relative">
            <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              v-model="password"
              type="password"
              placeholder="Contraseña"
              class="w-full h-11 pl-10 pr-4 rounded-lg bg-bg-primary border border-border-default
                     text-sm text-text-primary placeholder:text-text-muted
                     focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
                     transition-colors"
            />
          </div>

          <!-- Login Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full h-11 rounded-lg bg-accent hover:bg-accent-hover
                   text-sm font-semibold text-white
                   transition-all duration-150 hover:shadow-[0_0_20px_-4px_rgba(108,92,231,0.5)]
                   active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
            {{ isLoading ? 'Conectando...' : 'Iniciar Sesión' }}
          </button>
        </form>

        <!-- Divider -->
        <div class="flex items-center gap-3 my-5">
          <div class="flex-1 h-px bg-border-default"></div>
          <span class="text-xs text-text-muted">O iniciar con</span>
          <div class="flex-1 h-px bg-border-default"></div>
        </div>

        <!-- Discord Button -->
        <button
          class="w-full h-11 rounded-lg bg-transparent border border-border-default
                 hover:border-[#5865F2] hover:bg-[#5865F2]/10
                 text-sm font-semibold text-text-primary
                 flex items-center justify-center gap-2
                 transition-all duration-150"
          @click="handleDiscordLogin"
        >
          <MessageCircle class="w-4.5 h-4.5 text-[#5865F2]" />
          O iniciar con Discord
        </button>

        <!-- Register link -->
        <p class="text-center text-sm text-text-secondary mt-5">
          ¿No tienes cuenta?
          <a class="text-accent hover:text-accent-hover cursor-pointer font-medium transition-colors">Regístrate</a>
        </p>
      </div>
    </div>
  </div>
</template>
