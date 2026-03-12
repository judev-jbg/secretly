/**
 * @fileoverview Tests de la vista de creación de secreto.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// ─── Mocks ──────────────────────────────────────────────────────────────────

const { mockCreate, mockEncrypt, mockGenerateIV, mockDeriveKey, mockPush } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockEncrypt: vi.fn(),
  mockGenerateIV: vi.fn(),
  mockDeriveKey: vi.fn(),
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
  deriveKey: mockDeriveKey,
}))

// ─── Setup ───────────────────────────────────────────────────────────────────

import NewSecretView from '../views/NewSecretView.vue'
import { useAuthStore } from '../stores/auth.js'
import { useSecretsStore } from '../stores/secrets.js'

function mountView() {
  return mount(NewSecretView, {
    global: { stubs: { RouterLink: { template: '<a><slot/></a>', props: ['to'] } } },
  })
}

/** Helper: rellena y envía el formulario hasta abrir el modal de PIN */
async function fillAndSubmit(wrapper, { alias = 'My Token', type = 'Token', fieldId = '#field-token', fieldValue = 'ghp_abc' } = {}) {
  const typeBtn = wrapper.findAll('.type-btn').find((b) => b.text() === type)
  await typeBtn.trigger('click')
  await wrapper.find('#alias').setValue(alias)
  await wrapper.find(fieldId).setValue(fieldValue)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('NewSecretView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockCreate.mockClear()
    mockEncrypt.mockClear()
    mockGenerateIV.mockClear()
    mockDeriveKey.mockClear()
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

  it('abre el modal de PIN al hacer submit con datos válidos', async () => {
    const wrapper = mountView()
    await fillAndSubmit(wrapper)
    expect(wrapper.find('.modal-card').exists()).toBe(true)
    expect(wrapper.find('#new-pin-input').exists()).toBe(true)
  })

  it('cifra y envía el secreto tras confirmar PIN+frase', async () => {
    const authStore = useAuthStore()
    authStore.setSession({ token: 'tok', refreshToken: 'ref', email: 'a@b.com', salt: 'salt123' })

    mockGenerateIV.mockReturnValue('mock-iv')
    mockDeriveKey.mockResolvedValue({ type: 'secret' })
    mockEncrypt.mockResolvedValue('encrypted-blob')
    mockCreate.mockResolvedValue({
      data: { id: '1', alias: 'My Token', secret_type: 'token', created_at: '', updated_at: '' },
    })

    const wrapper = mountView()
    await fillAndSubmit(wrapper)

    await wrapper.find('#new-pin-input').setValue('1234')
    await wrapper.find('#new-phrase-input').setValue('my phrase')
    await wrapper.find('.modal-form').trigger('submit')
    await flushPromises()

    expect(mockDeriveKey).toHaveBeenCalledWith('1234', 'my phrase', 'salt123')
    expect(mockGenerateIV).toHaveBeenCalled()
    expect(mockEncrypt).toHaveBeenCalledWith({ token: 'ghp_abc' }, { type: 'secret' }, 'mock-iv')
    expect(mockCreate).toHaveBeenCalledWith({
      alias: 'My Token',
      secret_type: 'token',
      encrypted: 'encrypted-blob',
      iv: 'mock-iv',
    })
    expect(mockPush).toHaveBeenCalledWith('/vault')
  })

  it('agrega el secreto al store local tras crear', async () => {
    const authStore = useAuthStore()
    authStore.setSession({ token: 'tok', refreshToken: 'ref', email: 'a@b.com', salt: 'salt123' })
    const secretsStore = useSecretsStore()

    mockGenerateIV.mockReturnValue('iv')
    mockDeriveKey.mockResolvedValue({})
    mockEncrypt.mockResolvedValue('enc')
    const newSecret = { id: '2', alias: 'DB', secret_type: 'database', created_at: '', updated_at: '' }
    mockCreate.mockResolvedValue({ data: newSecret })

    const wrapper = mountView()
    await fillAndSubmit(wrapper)

    await wrapper.find('#new-pin-input').setValue('1234')
    await wrapper.find('#new-phrase-input').setValue('phrase')
    await wrapper.find('.modal-form').trigger('submit')
    await flushPromises()

    expect(secretsStore.list).toContainEqual(newSecret)
  })

  it('muestra error en el modal si la API falla', async () => {
    const authStore = useAuthStore()
    authStore.setSession({ token: 'tok', refreshToken: 'ref', email: 'a@b.com', salt: 'salt123' })

    mockGenerateIV.mockReturnValue('iv')
    mockDeriveKey.mockResolvedValue({})
    mockEncrypt.mockResolvedValue('enc')
    mockCreate.mockRejectedValue({ response: { status: 500 } })

    const wrapper = mountView()
    await fillAndSubmit(wrapper)

    await wrapper.find('#new-pin-input').setValue('1234')
    await wrapper.find('#new-phrase-input').setValue('phrase')
    await wrapper.find('.modal-form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.modal-card .form-error').exists()).toBe(true)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('cierra el modal al cancelar', async () => {
    const wrapper = mountView()
    await fillAndSubmit(wrapper)
    expect(wrapper.find('.modal-card').exists()).toBe(true)

    await wrapper.find('.modal-actions .btn-ghost').trigger('click')
    await flushPromises()

    expect(wrapper.find('.modal-card').exists()).toBe(false)
  })
})
