import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth.store'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

async function bootstrap(): Promise<void> {
  // Initialize auth before the router performs its initial navigation/guards.
  const auth = useAuthStore(pinia)
  await auth.initialize()

  app.use(router)
  await router.isReady()
  app.mount('#app')
}

void bootstrap()
