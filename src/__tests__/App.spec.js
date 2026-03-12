/**
 * @fileoverview Tests del componente raíz App.vue.
 * Verifica que el monitor de actividad se inicia/detiene según el estado de auth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent } from 'vue'

const { mockStart, mockStop } = vi.hoisted(() => ({
  mockStart: vi.fn(),
  mockStop: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  RouterView: defineComponent({ template: '<div />' }),
}))

vi.mock('../composables/useActivityMonitor.js', () => ({
  useActivityMonitor: () => ({ start: mockStart, stop: mockStop }),
}))

// Mockear useBackendHealth para evitar polling en tests
vi.mock('../composables/useBackendHealth.js', () => ({
  useBackendHealth: () => ({ isOnline: { value: true } }),
}))

import App from '../App.vue'
import { useAuthStore } from '../stores/auth.js'

describe('App.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockStart.mockClear()
    mockStop.mockClear()
  })

  it('detiene el monitor cuando el usuario no está autenticado', async () => {
    mount(App)
    await flushPromises()
    expect(mockStop).toHaveBeenCalled()
    expect(mockStart).not.toHaveBeenCalled()
  })

  it('inicia el monitor cuando hay sesión activa (JWT)', async () => {
    const auth = useAuthStore()
    auth.setSession({ token: 'tok', refreshToken: 'ref', email: 'a@b.com', salt: 'salt' })

    mount(App)
    await flushPromises()
    expect(mockStart).toHaveBeenCalled()
  })

  it('no inicia el monitor sin token aunque haya otros datos', async () => {
    mount(App)
    await flushPromises()
    expect(mockStart).not.toHaveBeenCalled()
    expect(mockStop).toHaveBeenCalled()
  })
})
