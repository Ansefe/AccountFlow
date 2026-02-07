import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@renderer/stores/auth.store'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@renderer/pages/LoginPage.vue'),
      meta: { layout: 'auth' }
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@renderer/pages/DashboardPage.vue'),
      meta: { layout: 'app' }
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: () => import('@renderer/pages/AccountsPage.vue'),
      meta: { layout: 'app' }
    },
    {
      path: '/rentals',
      name: 'rentals',
      component: () => import('@renderer/pages/MyRentalsPage.vue'),
      meta: { layout: 'app' }
    },
    {
      path: '/credits',
      name: 'credits',
      component: () => import('@renderer/pages/CreditsPage.vue'),
      meta: { layout: 'app' }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@renderer/pages/SettingsPage.vue'),
      meta: { layout: 'app' }
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: () => import('@renderer/pages/admin/AdminDashboardPage.vue'),
      meta: { layout: 'app', requiresAdmin: true }
    },
    {
      path: '/admin/accounts',
      name: 'admin-accounts',
      component: () => import('@renderer/pages/admin/AdminAccountsPage.vue'),
      meta: { layout: 'app', requiresAdmin: true }
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('@renderer/pages/admin/AdminUsersPage.vue'),
      meta: { layout: 'app', requiresAdmin: true }
    },
    {
      path: '/admin/activity',
      name: 'admin-activity',
      component: () => import('@renderer/pages/admin/AdminActivityPage.vue'),
      meta: { layout: 'app', requiresAdmin: true }
    }
  ]
})

// Navigation guards
router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()

  // If going to login and already authenticated, redirect to dashboard
  if (to.meta.layout === 'auth' && auth.isAuthenticated) {
    return next({ path: '/' })
  }

  // If going to a protected route and not authenticated, redirect to login
  if (to.meta.layout === 'app' && !auth.isAuthenticated) {
    return next({ path: '/login' })
  }

  // If going to an admin route and not admin, redirect to dashboard
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return next({ path: '/' })
  }

  next()
})

export default router
