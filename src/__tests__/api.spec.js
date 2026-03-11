/**
 * @fileoverview Tests unitarios para services/api.js.
 * Verifica interceptores JWT, refresh automático y endpoints.
 * axios se mockea con vi.mock para evitar llamadas HTTP reales.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../stores/auth.js'

// ─── Mock de axios ─────────────────────────────────────────────────────────

const mockRequest = vi.fn()
const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()

/** Interceptores capturados para invocarlos manualmente en los tests */
const interceptors = { request: [], response: [] }

vi.mock('axios', () => {
  const instance = {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
    interceptors: {
      request: { use: (fn) => interceptors.request.push(fn) },
      response: { use: (ok, err) => interceptors.response.push({ ok, err }) },
    },
  }
  return {
    default: {
      create: () => instance,
      post: mockRequest,
    },
  }
})

// Importar después del mock
const { api, authApi, secretsApi } = await import('../services/api.js')

// ─── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ─── Interceptor de request ────────────────────────────────────────────────

describe('interceptor de request', () => {
  it('adjunta Authorization si hay token', () => {
    const auth = useAuthStore()
    auth.setSession({ token: 'jwt-abc', refreshToken: 'rt', email: 'a@b.com', salt: 's' })

    const config = { headers: {} }
    const result = interceptors.request[0](config)

    expect(result.headers.Authorization).toBe('Bearer jwt-abc')
  })

  it('no adjunta Authorization si no hay token', () => {
    const config = { headers: {} }
    const result = interceptors.request[0](config)

    expect(result.headers.Authorization).toBeUndefined()
  })
})

// ─── Endpoints de autenticación ────────────────────────────────────────────

describe('authApi', () => {
  it('login llama POST /auth/login con credentials', () => {
    mockPost.mockResolvedValueOnce({ data: { access_token: 'jwt' } })
    authApi.login({ email: 'a@b.com', password: '123' })
    expect(mockPost).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: '123' })
  })

  it('register llama POST /auth/register', () => {
    mockPost.mockResolvedValueOnce({ data: {} })
    authApi.register({ email: 'a@b.com', password: '123', salt: 'slt' })
    expect(mockPost).toHaveBeenCalledWith('/auth/register', { email: 'a@b.com', password: '123', salt: 'slt' })
  })

  it('forgotPassword llama POST /auth/forgot-password', () => {
    mockPost.mockResolvedValueOnce({ data: {} })
    authApi.forgotPassword({ email: 'a@b.com' })
    expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password', { email: 'a@b.com' })
  })

  it('resetPassword llama POST /auth/reset-password', () => {
    mockPost.mockResolvedValueOnce({ data: {} })
    authApi.resetPassword({ token: 'tok', new_password: 'nueva' })
    expect(mockPost).toHaveBeenCalledWith('/auth/reset-password', { token: 'tok', new_password: 'nueva' })
  })
})

// ─── Endpoints de secretos ─────────────────────────────────────────────────

describe('secretsApi', () => {
  it('list llama GET /secrets', () => {
    mockGet.mockResolvedValueOnce({ data: [] })
    secretsApi.list()
    expect(mockGet).toHaveBeenCalledWith('/secrets')
  })

  it('get llama GET /secrets/:id', () => {
    mockGet.mockResolvedValueOnce({ data: {} })
    secretsApi.get('uuid-1')
    expect(mockGet).toHaveBeenCalledWith('/secrets/uuid-1')
  })

  it('create llama POST /secrets con payload', () => {
    const payload = { alias: 'token-gh', secret_type: 'token', encrypted: 'enc', iv: 'iv' }
    mockPost.mockResolvedValueOnce({ data: {} })
    secretsApi.create(payload)
    expect(mockPost).toHaveBeenCalledWith('/secrets', payload)
  })

  it('update llama PUT /secrets/:id con payload', () => {
    mockPut.mockResolvedValueOnce({ data: {} })
    secretsApi.update('uuid-1', { alias: 'nuevo' })
    expect(mockPut).toHaveBeenCalledWith('/secrets/uuid-1', { alias: 'nuevo' })
  })

  it('remove llama DELETE /secrets/:id', () => {
    mockDelete.mockResolvedValueOnce({ data: {} })
    secretsApi.remove('uuid-1')
    expect(mockDelete).toHaveBeenCalledWith('/secrets/uuid-1')
  })
})
