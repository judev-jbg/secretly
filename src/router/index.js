/**
 * @fileoverview Configuración de rutas y navigation guards.
 * - Rutas públicas: /login, /register, /reset-password
 * - Rutas protegidas: /vault, /vault/new (requieren isAuthenticated)
 */

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

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
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
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
 * Redirige a /login si no hay sesión activa.
 * Redirige a /vault si un usuario autenticado intenta acceder a una ruta pública.
 */
router.beforeEach((to) => {
  const auth = useAuthStore()

  const isAuthenticated = auth.isAuthenticated

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.public && isAuthenticated) {
    return { name: 'vault' }
  }
})

export default router
