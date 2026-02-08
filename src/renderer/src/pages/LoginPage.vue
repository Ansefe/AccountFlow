<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Mail, Lock, Hexagon, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '@renderer/stores/auth.store'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const errorMsg = ref('')
const isLoading = ref(false)

const LOGIN_TIMEOUT_MS = 25_000

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      window.setTimeout(() => reject(new Error('timeout')), timeoutMs)
    })
  ])
}

async function handleLogin(): Promise<void> {
  if (!email.value || !password.value) {
    errorMsg.value = 'Por favor completa todos los campos'
    return
  }
  isLoading.value = true
  errorMsg.value = ''
  try {
    const { error } = await withTimeout(
      auth.signInWithEmail(email.value, password.value),
      LOGIN_TIMEOUT_MS
    )
    if (error) {
      errorMsg.value = error
      return
    }
    router.push('/')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/timeout/i.test(message)) {
      // A veces el token llega pero el UI se queda esperando por estado; re-sincroniza.
      await auth.syncSession()
      if (auth.isAuthenticated) {
        router.push('/')
        return
      }
      errorMsg.value = 'La solicitud está tardando demasiado. Intenta nuevamente.'
    } else {
      errorMsg.value = 'Ocurrió un error inesperado. Intenta nuevamente.'
    }
  } finally {
    isLoading.value = false
  }
}

async function handleDiscordLogin(): Promise<void> {
  isLoading.value = true
  errorMsg.value = ''
  try {
    const { error } = await withTimeout(auth.signInWithDiscord(), LOGIN_TIMEOUT_MS)
    if (error) errorMsg.value = error
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/timeout/i.test(message)) {
      errorMsg.value = 'La solicitud está tardando demasiado. Intenta nuevamente.'
    } else {
      errorMsg.value = 'Ocurrió un error inesperado. Intenta nuevamente.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center h-full bg-bg-primary relative overflow-hidden">
    <!-- Background radial gradient -->
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(108,92,231,0.08)_0%,_transparent_70%)]"></div>

    <!-- Subtle grid pattern -->
    <div class="absolute inset-0 opacity-[0.03]"
         style="background-image: linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px); background-size: 40px 40px;">
    </div>

    <!-- Decorative glow bottom-right -->
    <div class="absolute bottom-0 right-0 w-96 h-96 bg-[radial-gradient(circle,_rgba(108,92,231,0.06)_0%,_transparent_70%)]"></div>

    <!-- Decorative dots (stars) -->
    <div class="absolute bottom-16 right-20 w-2 h-2 rounded-full bg-accent/30 animate-pulse"></div>
    <div class="absolute bottom-32 right-12 w-1.5 h-1.5 rounded-full bg-accent-secondary/20 animate-pulse" style="animation-delay: 0.5s;"></div>
    <div class="absolute bottom-10 right-40 w-1 h-1 rounded-full bg-accent/20 animate-pulse" style="animation-delay: 1s;"></div>

    <!-- Login Card -->
    <div class="relative z-10 w-full max-w-[420px] mx-4">
      <!-- Card glow border effect -->
      <div class="absolute -inset-px rounded-2xl bg-gradient-to-b from-border-hover to-border-default opacity-60"></div>

      <div class="relative rounded-2xl bg-surface/90 backdrop-blur-xl border border-border-default p-8
                  shadow-[0_0_80px_-20px_rgba(108,92,231,0.15)]">

        <!-- Logo -->
        <div class="flex flex-col items-center mb-8">
          <div class="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/15 mb-4
                      shadow-[0_0_30px_-5px_rgba(108,92,231,0.3)]">
            <Hexagon class="w-8 h-8 text-accent" :stroke-width="1.8" />
          </div>
          <h1 class="text-2xl font-bold text-text-primary tracking-tight">AccountFlow</h1>
          <p class="text-sm text-text-secondary mt-1">Bienvenido de nuevo</p>
        </div>

        <!-- Error Message -->
        <div v-if="errorMsg" class="mb-4 p-3 rounded-lg bg-error/10 border border-error/30 text-sm text-error">
          {{ errorMsg }}
        </div>

        <!-- Form -->
        <form class="space-y-3.5" @submit.prevent="handleLogin">
          <!-- Email -->
          <div class="relative">
            <Mail class="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-muted pointer-events-none" />
            <input
              v-model="email"
              type="email"
              placeholder="Correo electrónico"
              class="w-full h-12 pl-11 pr-4 rounded-xl bg-bg-primary/80 border border-border-default
                     text-sm text-text-primary placeholder:text-text-muted
                     focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
                     transition-all duration-150"
            />
          </div>

          <!-- Password -->
          <div class="relative">
            <Lock class="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-muted pointer-events-none" />
            <input
              v-model="password"
              type="password"
              placeholder="Contraseña"
              class="w-full h-12 pl-11 pr-4 rounded-xl bg-bg-primary/80 border border-border-default
                     text-sm text-text-primary placeholder:text-text-muted
                     focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
                     transition-all duration-150"
            />
          </div>

          <!-- Login Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full h-12 rounded-xl bg-accent hover:bg-accent-hover
                   text-sm font-semibold text-white
                   transition-all duration-150 hover:shadow-[0_0_24px_-4px_rgba(108,92,231,0.5)]
                   active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2 mt-5"
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
          class="w-full h-12 rounded-xl bg-bg-primary/50 border border-border-default
                 hover:border-[#5865F2]/60 hover:bg-[#5865F2]/10
                 text-sm font-semibold text-text-primary
                 flex items-center justify-center gap-2.5
                 transition-all duration-150"
          @click="handleDiscordLogin"
        >
          <!-- Discord SVG icon -->
          <svg class="w-5 h-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
          </svg>
          O iniciar con Discord
        </button>

        <!-- Register link -->
        <p class="text-center text-sm text-text-secondary mt-5">
          ¿No tienes cuenta?
          <router-link to="/register" class="text-accent hover:text-accent-hover cursor-pointer font-medium transition-colors">Regístrate</router-link>
        </p>
      </div>
    </div>
  </div>
</template>
