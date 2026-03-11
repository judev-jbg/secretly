/**
 * @fileoverview Tests unitarios para el router y sus navigation guards.
 *
 * El guard se extrae y se testea directamente para evitar problemas con el
 * router singleton (que no se puede resetear entre tests en vitest).
 * Los tests de integración E2E cubrirán la navegación real.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../stores/auth.js'
import { useCryptoStore } from '../stores/crypto.js'

// ─── Guard extraído para testing unitario ──────────────────────────────────

/**
 * Replica la lógica del beforeEach del router.
 * Retorna el objeto de redirección o undefined si la navegación puede continuar.
 * @param {{ meta: object }} to
 */
function guard(to) {
  const auth = useAuthStore()
  const crypto = useCryptoStore()
  const isAuthenticated = auth.isAuthenticated && crypto.hasKey

  if (to.meta.requiresAuth && !isAuthenticated) return { name: 'login' }
  if (to.meta.public && isAuthenticated) return { name: 'vault' }
  return undefined
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function loginUser() {
  useAuthStore().setSession({ token: 'jwt', refreshToken: 'rt', email: 'a@b.com', salt: 's' })
  useCryptoStore().setKey({ type: 'secret' })
}

function logoutUser() {
  useAuthStore().clear()
  useCryptoStore().clear()
}

beforeEach(() => {
  setActivePinia(createPinia())
})

// ─── Rutas públicas ────────────────────────────────────────────────────────

describe('guard — rutas públicas', () => {
  it('permite acceso a /login sin sesión', () => {
    logoutUser()
    expect(guard({ meta: { public: true } })).toBeUndefined()
  })

  it('redirige /login a vault si hay sesión activa', () => {
    loginUser()
    expect(guard({ meta: { public: true } })).toEqual({ name: 'vault' })
  })

  it('permite acceso a /forgot-password sin sesión', () => {
    logoutUser()
    expect(guard({ meta: { public: true } })).toBeUndefined()
  })
})

// ─── Rutas protegidas ──────────────────────────────────────────────────────

describe('guard — rutas protegidas', () => {
  it('redirige /vault a login sin sesión', () => {
    logoutUser()
    expect(guard({ meta: { requiresAuth: true } })).toEqual({ name: 'login' })
  })

  it('redirige /vault a login si hay JWT pero no hay clave en memoria', () => {
    useAuthStore().setSession({ token: 'jwt', refreshToken: 'rt', email: 'a@b.com', salt: 's' })
    useCryptoStore().clear()
    expect(guard({ meta: { requiresAuth: true } })).toEqual({ name: 'login' })
  })

  it('permite /vault con sesión completa', () => {
    loginUser()
    expect(guard({ meta: { requiresAuth: true } })).toBeUndefined()
  })

  it('permite /vault/new con sesión completa', () => {
    loginUser()
    expect(guard({ meta: { requiresAuth: true } })).toBeUndefined()
  })
})

// ─── Rutas sin meta ────────────────────────────────────────────────────────

describe('guard — rutas sin meta', () => {
  it('no interfiere con rutas sin meta (redirects estáticos)', () => {
    logoutUser()
    expect(guard({ meta: {} })).toBeUndefined()
  })
})

// ─── Definición de rutas ───────────────────────────────────────────────────

describe('definición de rutas', () => {
  it('contiene todas las rutas esperadas', async () => {
    const { default: router } = await import('../router/index.js')
    const names = router.getRoutes().map((r) => r.name).filter(Boolean)

    expect(names).toContain('login')
    expect(names).toContain('forgot-password')
    expect(names).toContain('reset-password')
    expect(names).toContain('vault')
    expect(names).toContain('vault-new')
  })

  it('las rutas del vault tienen meta requiresAuth', async () => {
    const { default: router } = await import('../router/index.js')
    const vaultRoutes = router.getRoutes().filter((r) => r.name === 'vault' || r.name === 'vault-new')
    vaultRoutes.forEach((r) => expect(r.meta.requiresAuth).toBe(true))
  })

  it('las rutas públicas tienen meta public', async () => {
    const { default: router } = await import('../router/index.js')
    const publicRoutes = router.getRoutes().filter((r) =>
      ['login', 'forgot-password', 'reset-password'].includes(r.name),
    )
    publicRoutes.forEach((r) => expect(r.meta.public).toBe(true))
  })
})
