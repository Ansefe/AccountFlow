import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth.store'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Initialize auth before first navigation
const auth = useAuthStore()
auth.initialize().then(() => {
  app.mount('#app')
})
