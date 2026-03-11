/**
 * @fileoverview Tests de la vista de creación de secreto.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// ─── Mocks ──────────────────────────────────────────────────────────────────

const { mockCreate, mockEncrypt, mockGenerateIV, mockPush } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockEncrypt: vi.fn(),
  mockGenerateIV: vi.fn(),
  mockPush: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  RouterLink: { template: '<a><slot/></a>', props: ['to'] },
}))

vi.mock('../services/api.js', () => ({
  secretsApi: { create: mockCreate },
}))

vi.mock('../crypto/vault.js', () => ({
  encrypt: mockEncrypt,
  generateIV: mockGenerateIV,
}))

// ─── Setup ───────────────────────────────────────────────────────────────────

import NewSecretView from '../views/NewSecretView.vue'
import { useCryptoStore } from '../stores/crypto.js'
import { useSecretsStore } from '../stores/secrets.js'

function mountView() {
  return mount(NewSecretView, {
    global: { stubs: { RouterLink: { template: '<a><slot/></a>', props: ['to'] } } },
  })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('NewSecretView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockCreate.mockClear()
    mockEncrypt.mockClear()
    mockGenerateIV.mockClear()
    mockPush.mockClear()
  })

  it('renderiza el formulario con alias, selector de tipo y campos', () => {
    const wrapper = mountView()
    expect(wrapper.find('#alias').exists()).toBe(true)
    expect(wrapper.findAll('.type-btn').length).toBe(5)
    expect(wrapper.find('.fields-section').exists()).toBe(true)
  })

  it('muestra "Login" activo por defecto con 3 campos', () => {
    const wrapper = mountView()
    const active = wrapper.find('.type-btn.active')
    expect(active.text()).toBe('Login')
    expect(wrapper.findAll('.fields-section .field').length).toBe(3)
  })

  it('cambia los campos al seleccionar un tipo diferente', async () => {
    const wrapper = mountView()
    const tokenBtn = wrapper.findAll('.type-btn').find((b) => b.text() === 'Token')
    await tokenBtn.trigger('click')
    expect(wrapper.findAll('.fields-section .field').length).toBe(1)
  })

  it('muestra 5 campos para tipo Database', async () => {
    const wrapper = mountView()
    const dbBtn = wrapper.findAll('.type-btn').find((b) => b.text() === 'Database')
    await dbBtn.trigger('click')
    expect(wrapper.findAll('.fields-section .field').length).toBe(5)
  })

  it('muestra textarea para el campo private_key de SSH', async () => {
    const wrapper = mountView()
    const sshBtn = wrapper.findAll('.type-btn').find((b) => b.text() === 'SSH')
    await sshBtn.trigger('click')
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('el botón submit está desactivado sin alias', () => {
    const wrapper = mountView()
    expect(wrapper.find('.btn-primary').attributes('disabled')).toBeDefined()
  })

  it('el botón submit está desactivado con alias pero sin campos', async () => {
    const wrapper = mountView()
    await wrapper.find('#alias').setValue('My Secret')
    expect(wrapper.find('.btn-primary').attributes('disabled')).toBeDefined()
  })

  it('cifra y envía el secreto al submit', async () => {
    const cryptoStore = useCryptoStore()
    cryptoStore.setKey({})
    mockGenerateIV.mockReturnValue('mock-iv')
    mockEncrypt.mockResolvedValue('encrypted-blob')
    mockCreate.mockResolvedValue({
      data: { id: '1', alias: 'Test', secret_type: 'token', created_at: '', updated_at: '' },
    })

    const wrapper = mountView()

    // Seleccionar tipo Token
    const tokenBtn = wrapper.findAll('.type-btn').find((b) => b.text() === 'Token')
    await tokenBtn.trigger('click')

    // Completar alias y campo
    await wrapper.find('#alias').setValue('My Token')
    await wrapper.find('#field-token').setValue('ghp_abc123')

    // Submit
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockGenerateIV).toHaveBeenCalled()
    expect(mockEncrypt).toHaveBeenCalledWith(
      { token: 'ghp_abc123' },
      {},
      'mock-iv',
    )
    expect(mockCreate).toHaveBeenCalledWith({
      alias: 'My Token',
      secret_type: 'token',
      encrypted: 'encrypted-blob',
      iv: 'mock-iv',
    })
    expect(mockPush).toHaveBeenCalledWith('/vault')
  })

  it('agrega el secreto al store local tras crear', async () => {
    const cryptoStore = useCryptoStore()
    const secretsStore = useSecretsStore()
    cryptoStore.setKey({})
    mockGenerateIV.mockReturnValue('iv')
    mockEncrypt.mockResolvedValue('enc')
    const newSecret = { id: '2', alias: 'DB', secret_type: 'database', created_at: '', updated_at: '' }
    mockCreate.mockResolvedValue({ data: newSecret })

    const wrapper = mountView()
    await wrapper.find('#alias').setValue('DB')
    await wrapper.find('#field-url').setValue('https://app.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(secretsStore.list).toContainEqual(newSecret)
  })

  it('muestra error si la API falla', async () => {
    const cryptoStore = useCryptoStore()
    cryptoStore.setKey({})
    mockGenerateIV.mockReturnValue('iv')
    mockEncrypt.mockResolvedValue('enc')
    mockCreate.mockRejectedValue(new Error('API error'))

    const wrapper = mountView()
    await wrapper.find('#alias').setValue('Fail')
    await wrapper.find('#field-url').setValue('https://x.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.form-error').exists()).toBe(true)
    expect(mockPush).not.toHaveBeenCalled()
  })
})
