/**
 * @fileoverview Tests del bottom sheet de detalle de secreto.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// ─── Mocks ──────────────────────────────────────────────────────────────────

const { mockGet, mockDecrypt, mockDeriveKey } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockDecrypt: vi.fn(),
  mockDeriveKey: vi.fn(),
}))

vi.mock('../services/api.js', () => ({
  secretsApi: { get: mockGet },
}))

vi.mock('../crypto/vault.js', () => ({
  decrypt: mockDecrypt,
  deriveKey: mockDeriveKey,
}))

vi.mock('../stores/auth.js', () => ({
  useAuthStore: () => ({ salt: 'test-salt' }),
}))

// ─── Setup ───────────────────────────────────────────────────────────────────

import SecretSheet from '../components/SecretSheet.vue'
import { useSecretsStore } from '../stores/secrets.js'

const MOCK_SECRET = { id: 'abc', alias: 'GitHub Token', secret_type: 'token', created_at: '', updated_at: '' }

/**
 * Monta el sheet con attachTo body para que los v-if dentro de Transitions funcionen.
 * El watch usa immediate:true, así que el estado se actualiza en el primer render.
 */
function mountSheet(secretId = null) {
  return mount(SecretSheet, {
    props: { secretId },
    attachTo: document.body,
  })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SecretSheet', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSecretsStore().setList([MOCK_SECRET])
    mockGet.mockClear()
    mockDecrypt.mockClear()
    mockDeriveKey.mockClear()
    document.body.innerHTML = ''
  })

  it('no renderiza el sheet cuando secretId es null', () => {
    mountSheet(null)
    expect(document.body.querySelector('.sheet')).toBeNull()
  })

  it('muestra spinner mientras carga el blob', async () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    mountSheet('abc')
    await flushPromises()
    expect(document.body.querySelector('.spinner')).not.toBeNull()
  })

  it('muestra el formulario de PIN tras cargar el blob', async () => {
    mockGet.mockResolvedValue({ data: { encrypted: 'enc', iv: 'iv' } })
    mountSheet('abc')
    await flushPromises()
    expect(document.body.querySelector('#pin-input')).not.toBeNull()
  })

  it('avanza a la fase de frase al enviar el PIN', async () => {
    mockGet.mockResolvedValue({ data: { encrypted: 'enc', iv: 'iv' } })
    const wrapper = mountSheet('abc')
    await flushPromises()

    wrapper.vm.pinInput = '1234'
    await wrapper.vm.submitPin()
    await flushPromises()

    expect(document.body.querySelector('#phrase-input')).not.toBeNull()
  })

  it('muestra los datos descifrados tras PIN y frase correctos', async () => {
    mockGet.mockResolvedValue({ data: { encrypted: 'enc', iv: 'iv' } })
    mockDeriveKey.mockResolvedValue({})
    mockDecrypt.mockResolvedValue({ token: 'ghp_test_token' })

    const wrapper = mountSheet('abc')
    await flushPromises()

    // Accedemos al vm para setear refs y llamar handlers directamente
    wrapper.vm.pinInput = '1234'
    await wrapper.vm.submitPin()
    await flushPromises()

    wrapper.vm.phraseInput = 'my phrase'
    await wrapper.vm.submitPhrase()
    await flushPromises()

    expect(mockDeriveKey).toHaveBeenCalled()
    expect(mockDecrypt).toHaveBeenCalled()
    expect(document.body.querySelector('.fields-list')).not.toBeNull()
    const plainInputs = document.body.querySelectorAll('.field-input--plain')
    expect(plainInputs[0].value).toBe('ghp_test_token')
  })

  it('vuelve a PIN con error tras credenciales incorrectas', async () => {
    mockGet.mockResolvedValue({ data: { encrypted: 'enc', iv: 'iv' } })
    mockDeriveKey.mockResolvedValue({})
    mockDecrypt.mockRejectedValue(new Error('decrypt failed'))

    const wrapper = mountSheet('abc')
    await flushPromises()

    wrapper.vm.pinInput = '1234'
    await wrapper.vm.submitPin()
    await flushPromises()

    wrapper.vm.phraseInput = 'wrong'
    await wrapper.vm.submitPhrase()
    await flushPromises()

    expect(document.body.querySelector('#pin-input')).not.toBeNull()
    expect(document.body.querySelector('.field-error')).not.toBeNull()
  })

  it('emite close al hacer click en el overlay', async () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    const wrapper = mountSheet('abc')
    await flushPromises()

    await wrapper.find('.sheet-overlay').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emite close al hacer click en el botón X del header', async () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    const wrapper = mountSheet('abc')
    await flushPromises()

    await wrapper.find('.sheet-close').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('muestra error de carga si la API falla', async () => {
    mockGet.mockRejectedValue(new Error('network'))
    mountSheet('abc')
    await flushPromises()

    expect(document.body.querySelector('.phase-error')).not.toBeNull()
  })

  it('muestra el timer de visibilidad al desbloquear', async () => {
    mockGet.mockResolvedValue({ data: { encrypted: 'enc', iv: 'iv' } })
    mockDeriveKey.mockResolvedValue({})
    mockDecrypt.mockResolvedValue({ token: 'tok' })

    const wrapper = mountSheet('abc')
    await flushPromises()

    wrapper.vm.pinInput = '1234'
    await wrapper.vm.submitPin()
    await flushPromises()

    wrapper.vm.phraseInput = 'phrase'
    await wrapper.vm.submitPhrase()
    await flushPromises()

    expect(document.body.querySelector('.visibility-timer')).not.toBeNull()
  })
})
