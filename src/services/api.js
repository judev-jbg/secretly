/**
 * @fileoverview Cliente HTTP centralizado con axios.
 * Configura interceptores para adjuntar JWT en cada request
 * y manejar refresh automático cuando el token expira (401).
 */

import axios from 'axios'
import { useAuthStore } from '../stores/auth.js'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor — adjunta el JWT ──────────────────────────────────

api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

// ─── Response interceptor — refresco automático de token ──────────────────

/** Controla que solo haya un refresh en curso a la vez */
let refreshing = false
/** Cola de requests que llegaron mientras se refrescaba el token */
let queue = []

/**
 * Procesa la cola de requests pendientes tras un refresh.
 * @param {string|null} newToken - null si el refresh falló
 */
function flushQueue(newToken) {
  queue.forEach(({ resolve, reject, config }) => {
    if (newToken) {
      config.headers.Authorization = `Bearer ${newToken}`
      resolve(api(config))
    } else {
      reject(new Error('Session expired'))
    }
  })
  queue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    // Solo intentar refresh en 401 y si no es ya el endpoint de refresh/login
    const isAuthEndpoint = original.url?.includes('/auth/')
    if (status !== 401 || isAuthEndpoint || original._retried) {
      return Promise.reject(error)
    }

    // Si ya hay un refresh en curso, encolar este request
    if (refreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject, config: original })
      })
    }

    refreshing = true
    original._retried = true

    try {
      const auth = useAuthStore()
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refresh_token: auth.refreshToken,
      })

      auth.setToken(data.access_token)
      flushQueue(data.access_token)

      original.headers.Authorization = `Bearer ${data.access_token}`
      return api(original)
    } catch {
      flushQueue(null)

      // Destruir sesión y redirigir al login
      const auth = useAuthStore()
      const { useCryptoStore } = await import('../stores/crypto.js')
      const { useSecretsStore } = await import('../stores/secrets.js')

      auth.clear()
      useCryptoStore().clear()
      useSecretsStore().clear()
      window.location.href = '/'

      return Promise.reject(error)
    } finally {
      refreshing = false
    }
  },
)

// ─── Endpoints de autenticación ────────────────────────────────────────────

export const authApi = {
  /**
   * Autentica al usuario y retorna JWT + salt.
   * @param {{ email: string, password: string }} credentials
   */
  login: (credentials) => api.post('/auth/login', credentials),

  /**
   * Registra un nuevo usuario.
   * @param {{ email: string, password: string, salt: string }} payload
   */
  register: (payload) => api.post('/auth/register', payload),

  /**
   * Solicita email de recuperación de contraseña.
   * @param {{ email: string }} payload
   */
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),

  /**
   * Restablece la contraseña con el token del email.
   * @param {{ token: string, new_password: string }} payload
   */
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
}

// ─── Endpoints de secretos ─────────────────────────────────────────────────

export const secretsApi = {
  /**
   * Retorna la lista de secretos (alias + type, sin blobs).
   */
  list: () => api.get('/secrets'),

  /**
   * Retorna el blob cifrado de un secreto específico.
   * @param {string} id
   */
  get: (id) => api.get(`/secrets/${id}`),

  /**
   * Crea un nuevo secreto.
   * @param {{ alias: string, secret_type: string, encrypted: string, iv: string }} payload
   */
  create: (payload) => api.post('/secrets', payload),

  /**
   * Actualiza un secreto existente.
   * @param {string} id
   * @param {{ alias?: string, secret_type?: string, encrypted?: string, iv?: string }} payload
   */
  update: (id, payload) => api.put(`/secrets/${id}`, payload),

  /**
   * Elimina un secreto.
   * @param {string} id
   */
  remove: (id) => api.delete(`/secrets/${id}`),
}
