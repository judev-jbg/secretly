/**
 * @fileoverview Tests de VaultView y SecretCard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// ─── Mocks ──────────────────────────────────────────────────────────────────

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  RouterLink: { template: '<a><slot/></a>', props: ['to'] },
}))

vi.mock('../services/api.js', () => ({
  secretsApi: { list: mockList },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

import VaultView from '../views/VaultView.vue'
import SecretCard from '../components/SecretCard.vue'
import { useSecretsStore } from '../stores/secrets.js'

/** @type {import('../stores/secrets.js').SecretMeta[]} */
const SAMPLE_SECRETS = [
  { id: '1', alias: 'GitHub Token', secret_type: 'token', created_at: '', updated_at: '' },
  { id: '2', alias: 'Prod DB', secret_type: 'database', created_at: '', updated_at: '' },
  { id: '3', alias: 'Admin Panel', secret_type: 'login', created_at: '', updated_at: '' },
]

function mountVault(overrides = {}) {
  return mount(VaultView, {
    global: {
      stubs: { RouterLink: { template: '<a><slot/></a>', props: ['to'] } },
      ...overrides,
    },
  })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('VaultView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    mockList.mockClear()
  })

  it('muestra skeletons mientras carga', async () => {
    // Simula estado de loading activo directo en el store antes de montar
    mockList.mockReturnValue(new Promise(() => {})) // nunca resuelve
    const secrets = useSecretsStore()
    secrets.loading = true
    const wrapper = mount(VaultView, {
      global: { stubs: { RouterLink: { template: '<a><slot/></a>', props: ['to'] }, SecretCard: true } },
    })
    expect(wrapper.findAll('.card-skeleton').length).toBeGreaterThan(0)
  })

  it('muestra las cards tras cargar exitosamente', async () => {
    mockList.mockResolvedValue({ data: SAMPLE_SECRETS })
    const wrapper = mountVault()
    await flushPromises()
    expect(wrapper.findAllComponents(SecretCard)).toHaveLength(3)
  })

  it('muestra el empty state cuando no hay secretos', async () => {
    mockList.mockResolvedValue({ data: [] })
    const wrapper = mountVault()
    await flushPromises()
    expect(wrapper.find('.state-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('Vault vacío')
  })

  it('muestra mensaje de error si falla la carga', async () => {
    mockList.mockRejectedValue(new Error('Network error'))
    const wrapper = mountVault()
    await flushPromises()
    expect(wrapper.find('.state-message.error').exists()).toBe(true)
  })

  it('aplica clase secrets-list por defecto', async () => {
    mockList.mockResolvedValue({ data: SAMPLE_SECRETS })
    const wrapper = mountVault()
    await flushPromises()
    expect(wrapper.find('.secrets-list').exists()).toBe(true)
  })

  it('cambia a grilla al hacer click en el toggle', async () => {
    mockList.mockResolvedValue({ data: SAMPLE_SECRETS })
    const wrapper = mountVault()
    await flushPromises()
    await wrapper.find('.toggle-btn:last-child').trigger('click')
    expect(wrapper.find('.secrets-grid').exists()).toBe(true)
  })

  it('persiste la preferencia de vista en localStorage', async () => {
    mockList.mockResolvedValue({ data: SAMPLE_SECRETS })
    const wrapper = mountVault()
    await flushPromises()
    await wrapper.find('.toggle-btn:last-child').trigger('click')
    expect(localStorage.getItem('vault_view')).toBe('grid')
  })

  it('lee la preferencia de vista desde localStorage al montar', async () => {
    localStorage.setItem('vault_view', 'grid')
    mockList.mockResolvedValue({ data: SAMPLE_SECRETS })
    const wrapper = mountVault()
    await flushPromises()
    expect(wrapper.find('.secrets-grid').exists()).toBe(true)
  })
})

describe('SecretCard', () => {
  it('renderiza alias y tipo', () => {
    const wrapper = mount(SecretCard, {
      props: { secret: SAMPLE_SECRETS[0], layout: 'list' },
    })
    expect(wrapper.text()).toContain('GitHub Token')
    expect(wrapper.text()).toContain('Token')
  })

  it('emite click al presionar Enter', async () => {
    const wrapper = mount(SecretCard, {
      props: { secret: SAMPLE_SECRETS[0], layout: 'list' },
    })
    await wrapper.trigger('keydown.enter')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('aplica clase --grid cuando layout es grid', () => {
    const wrapper = mount(SecretCard, {
      props: { secret: SAMPLE_SECRETS[1], layout: 'grid' },
    })
    expect(wrapper.classes()).toContain('secret-card--grid')
  })

  it('muestra el icono correcto para cada tipo', () => {
    const types = ['token', 'database', 'login', 'ssh', 'api_key']
    for (const type of types) {
      const wrapper = mount(SecretCard, {
        props: { secret: { id: '1', alias: 'test', secret_type: type }, layout: 'list' },
      })
      expect(wrapper.find('.card-icon svg').exists()).toBe(true)
    }
  })
})
