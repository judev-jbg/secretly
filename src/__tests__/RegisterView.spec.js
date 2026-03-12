/**
 * @fileoverview Tests de la vista de registro.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// ─── Mocks ──────────────────────────────────────────────────────────────────

const { mockRegister, mockGenerateSalt, mockDeriveKey, mockPush } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
  mockGenerateSalt: vi.fn(),
  mockDeriveKey: vi.fn(),
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
  deriveKey: mockDeriveKey,
}))

// ─── Setup ───────────────────────────────────────────────────────────────────

import RegisterView from '../views/RegisterView.vue'
import { useAuthStore } from '../stores/auth.js'
import { useCryptoStore } from '../stores/crypto.js'

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
    mockDeriveKey.mockClear()
    mockPush.mockClear()
  })

  it('renderiza el formulario de cuenta con email, password y confirmación', () => {
    const wrapper = mountView()
    expect(wrapper.find('#reg-email').exists()).toBe(true)
    expect(wrapper.find('#reg-password').exists()).toBe(true)
    expect(wrapper.find('#reg-confirm').exists()).toBe(true)
  })

  it('muestra "crea tu cuenta" como subtítulo en paso 1', () => {
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

  it('registra al usuario y avanza al paso de PIN', async () => {
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
    expect(wrapper.find('.register-subtitle').text()).toBe('configura tu vault')
    expect(wrapper.find('#reg-pin').exists()).toBe(true)
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

  it('deriva la clave y redirige al vault en paso 2', async () => {
    const mockCryptoKey = { type: 'secret' }
    mockGenerateSalt.mockReturnValue('mock-salt')
    mockRegister.mockResolvedValue({
      data: { access_token: 'jwt', refresh_token: 'refresh' },
    })
    mockDeriveKey.mockResolvedValue(mockCryptoKey)

    const wrapper = mountView()

    // Paso 1
    await wrapper.find('#reg-email').setValue('new@email.com')
    await wrapper.find('#reg-password').setValue('password123')
    await wrapper.find('#reg-confirm').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    // Paso 2
    await wrapper.find('#reg-pin').setValue('1234')
    await wrapper.find('#reg-phrase').setValue('my secret phrase')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockDeriveKey).toHaveBeenCalledWith('1234', 'my secret phrase', 'mock-salt')

    const authStore = useAuthStore()
    expect(authStore.email).toBe('new@email.com')

    const cryptoStore = useCryptoStore()
    expect(cryptoStore.hasKey).toBe(true)

    expect(mockPush).toHaveBeenCalledWith('/vault')
  })

  it('muestra error si PIN y frase están vacíos al submit de paso 2', async () => {
    mockGenerateSalt.mockReturnValue('salt')
    mockRegister.mockResolvedValue({
      data: { access_token: 'jwt', refresh_token: 'refresh' },
    })

    const wrapper = mountView()

    // Paso 1
    await wrapper.find('#reg-email').setValue('x@y.com')
    await wrapper.find('#reg-password').setValue('password123')
    await wrapper.find('#reg-confirm').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    // Paso 2 sin datos
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.form-error').text()).toBe('Ingresa tu PIN y frase de seguridad.')
  })

  it('el botón "Volver" regresa al paso de cuenta', async () => {
    mockGenerateSalt.mockReturnValue('salt')
    mockRegister.mockResolvedValue({
      data: { access_token: 'jwt', refresh_token: 'refresh' },
    })

    const wrapper = mountView()

    // Paso 1
    await wrapper.find('#reg-email').setValue('x@y.com')
    await wrapper.find('#reg-password').setValue('password123')
    await wrapper.find('#reg-confirm').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    // Click "Volver"
    await wrapper.find('.btn-ghost').trigger('click')
    await flushPromises()

    expect(wrapper.find('#reg-email').exists()).toBe(true)
    expect(wrapper.find('.register-subtitle').text()).toBe('crea tu cuenta')
  })
})
