/**
 * @fileoverview Tests de la vista de registro.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// ─── Mocks ──────────────────────────────────────────────────────────────────

const { mockRegister, mockGenerateSalt, mockPush } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
  mockGenerateSalt: vi.fn(),
  mockPush: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  RouterLink: { template: '<a><slot/></a>', props: ['to'] },
}))

vi.mock('../services/api.js', () => ({
  authApi: { register: mockRegister },
}))

vi.mock('../crypto/vault.js', () => ({
  generateSalt: mockGenerateSalt,
}))

// ─── Setup ───────────────────────────────────────────────────────────────────

import RegisterView from '../views/RegisterView.vue'
import { useAuthStore } from '../stores/auth.js'

function mountView() {
  return mount(RegisterView, {
    global: { stubs: { RouterLink: { template: '<a><slot/></a>', props: ['to'] } } },
  })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RegisterView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockRegister.mockClear()
    mockGenerateSalt.mockClear()
    mockPush.mockClear()
  })

  it('renderiza el formulario de cuenta con email, password y confirmación', () => {
    const wrapper = mountView()
    expect(wrapper.find('#reg-email').exists()).toBe(true)
    expect(wrapper.find('#reg-password').exists()).toBe(true)
    expect(wrapper.find('#reg-confirm').exists()).toBe(true)
  })

  it('muestra "crea tu cuenta" como subtítulo', () => {
    const wrapper = mountView()
    expect(wrapper.find('.register-subtitle').text()).toBe('crea tu cuenta')
  })

  it('el botón submit está desactivado sin datos', () => {
    const wrapper = mountView()
    expect(wrapper.find('.btn-primary').attributes('disabled')).toBeDefined()
  })

  it('el botón submit está desactivado si las contraseñas no coinciden', async () => {
    const wrapper = mountView()
    await wrapper.find('#reg-email').setValue('test@email.com')
    await wrapper.find('#reg-password').setValue('password123')
    await wrapper.find('#reg-confirm').setValue('different')
    expect(wrapper.find('.btn-primary').attributes('disabled')).toBeDefined()
  })

  it('el botón submit está desactivado si la contraseña tiene menos de 8 caracteres', async () => {
    const wrapper = mountView()
    await wrapper.find('#reg-email').setValue('test@email.com')
    await wrapper.find('#reg-password').setValue('short')
    await wrapper.find('#reg-confirm').setValue('short')
    expect(wrapper.find('.btn-primary').attributes('disabled')).toBeDefined()
  })

  it('muestra hint de error cuando las contraseñas no coinciden', async () => {
    const wrapper = mountView()
    await wrapper.find('#reg-password').setValue('password123')
    await wrapper.find('#reg-confirm').setValue('different')
    expect(wrapper.find('.field-hint--error').exists()).toBe(true)
  })

  it('registra al usuario, guarda sesión y redirige al vault', async () => {
    mockGenerateSalt.mockReturnValue('mock-salt')
    mockRegister.mockResolvedValue({
      data: { access_token: 'jwt-token', refresh_token: 'refresh-token' },
    })

    const wrapper = mountView()
    await wrapper.find('#reg-email').setValue('test@email.com')
    await wrapper.find('#reg-password').setValue('password123')
    await wrapper.find('#reg-confirm').setValue('password123')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockGenerateSalt).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalledWith({
      email: 'test@email.com',
      password: 'password123',
      salt: 'mock-salt',
    })

    const authStore = useAuthStore()
    expect(authStore.email).toBe('test@email.com')
    expect(authStore.salt).toBe('mock-salt')

    expect(mockPush).toHaveBeenCalledWith('/vault')
  })

  it('muestra error si el email ya está registrado (409)', async () => {
    mockGenerateSalt.mockReturnValue('salt')
    mockRegister.mockRejectedValue({ response: { status: 409 } })

    const wrapper = mountView()
    await wrapper.find('#reg-email').setValue('existing@email.com')
    await wrapper.find('#reg-password').setValue('password123')
    await wrapper.find('#reg-confirm').setValue('password123')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.form-error').text()).toBe('Este email ya está registrado.')
  })

  it('muestra error genérico si la API falla con otro status', async () => {
    mockGenerateSalt.mockReturnValue('salt')
    mockRegister.mockRejectedValue({ response: { status: 500 } })

    const wrapper = mountView()
    await wrapper.find('#reg-email').setValue('test@email.com')
    await wrapper.find('#reg-password').setValue('password123')
    await wrapper.find('#reg-confirm').setValue('password123')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.form-error').text()).toBe('Error al crear la cuenta. Intenta de nuevo.')
  })

  it('muestra error de conexión si no hay respuesta del servidor', async () => {
    mockGenerateSalt.mockReturnValue('salt')
    mockRegister.mockRejectedValue({ response: undefined })

    const wrapper = mountView()
    await wrapper.find('#reg-email').setValue('test@email.com')
    await wrapper.find('#reg-password').setValue('password123')
    await wrapper.find('#reg-confirm').setValue('password123')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.form-error').text()).toBe('No se puede conectar al servidor. Verifica tu conexión.')
  })
})
