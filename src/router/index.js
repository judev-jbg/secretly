/**
 * @fileoverview Configuración de rutas y navigation guards.
 * - Rutas públicas: /login, /forgot-password, /reset-password
 * - Rutas protegidas: /vault, /vault/new (requieren isAuthenticated + hasKey)
 */

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useCryptoStore } from '../stores/crypto.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/vault',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/ForgotPasswordView.vue'),
      meta: { public: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('../views/ResetPasswordView.vue'),
      meta: { public: true },
    },
    {
      path: '/vault',
      name: 'vault',
      component: () => import('../views/VaultView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/vault/new',
      name: 'vault-new',
      component: () => import('../views/NewSecretView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/vault',
    },
  ],
})

/**
 * Guard global: protege rutas que requieren autenticación.
 * Redirige a /login si no hay sesión activa o no hay clave en memoria.
 * Redirige a /vault si un usuario autenticado intenta acceder a una ruta pública.
 */
router.beforeEach((to) => {
  const auth = useAuthStore()
  const crypto = useCryptoStore()

  const isAuthenticated = auth.isAuthenticated && crypto.hasKey

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.public && isAuthenticated) {
    return { name: 'vault' }
  }
})

export default router
