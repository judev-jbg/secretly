/**
 * @fileoverview Tests unitarios para los stores de Pinia.
 * Cubre authStore, cryptoStore y secretsStore.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../stores/auth.js'
import { useCryptoStore } from '../stores/crypto.js'
import { useSecretsStore } from '../stores/secrets.js'

beforeEach(() => {
  setActivePinia(createPinia())
})

// ─── authStore ─────────────────────────────────────────────────────────────

describe('authStore', () => {
  it('estado inicial vacío y no autenticado', () => {
    const auth = useAuthStore()
    expect(auth.token).toBeNull()
    expect(auth.email).toBeNull()
    expect(auth.salt).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('setSession establece todos los campos', () => {
    const auth = useAuthStore()
    auth.setSession({ token: 'jwt123', refreshToken: 'rt456', email: 'a@b.com', salt: 'saltXYZ' })

    expect(auth.token).toBe('jwt123')
    expect(auth.refreshToken).toBe('rt456')
    expect(auth.email).toBe('a@b.com')
    expect(auth.salt).toBe('saltXYZ')
    expect(auth.isAuthenticated).toBe(true)
  })

  it('setToken actualiza solo el access token', () => {
    const auth = useAuthStore()
    auth.setSession({ token: 'old', refreshToken: 'rt', email: 'a@b.com', salt: 's' })
    auth.setToken('new-jwt')

    expect(auth.token).toBe('new-jwt')
    expect(auth.refreshToken).toBe('rt')
    expect(auth.email).toBe('a@b.com')
  })

  it('clear limpia todos los campos', () => {
    const auth = useAuthStore()
    auth.setSession({ token: 'jwt', refreshToken: 'rt', email: 'a@b.com', salt: 's' })
    auth.clear()

    expect(auth.token).toBeNull()
    expect(auth.refreshToken).toBeNull()
    expect(auth.email).toBeNull()
    expect(auth.salt).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })
})

// ─── cryptoStore ───────────────────────────────────────────────────────────

describe('cryptoStore', () => {
  it('estado inicial sin clave', () => {
    const crypto = useCryptoStore()
    expect(crypto.encryptionKey).toBeNull()
    expect(crypto.hasKey).toBe(false)
  })

  it('setKey almacena la clave y hasKey es true', () => {
    const crypto = useCryptoStore()
    const fakeKey = { type: 'secret', algorithm: { name: 'AES-GCM' } }
    crypto.setKey(fakeKey)

    expect(crypto.encryptionKey).toStrictEqual(fakeKey)
    expect(crypto.hasKey).toBe(true)
  })

  it('clear elimina la clave', () => {
    const crypto = useCryptoStore()
    crypto.setKey({ type: 'secret' })
    crypto.clear()

    expect(crypto.encryptionKey).toBeNull()
    expect(crypto.hasKey).toBe(false)
  })
})

// ─── secretsStore ──────────────────────────────────────────────────────────

describe('secretsStore', () => {
  const makeSecret = (n) => ({
    id: `id-${n}`,
    alias: `alias-${n}`,
    secret_type: 'token',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  })

  it('estado inicial vacío', () => {
    const secrets = useSecretsStore()
    expect(secrets.list).toEqual([])
    expect(secrets.loading).toBe(false)
  })

  it('setList reemplaza la lista completa', () => {
    const secrets = useSecretsStore()
    secrets.setList([makeSecret(1), makeSecret(2)])
    expect(secrets.list).toHaveLength(2)
  })

  it('add inserta al inicio', () => {
    const secrets = useSecretsStore()
    secrets.setList([makeSecret(1)])
    secrets.add(makeSecret(2))
    expect(secrets.list[0].id).toBe('id-2')
  })

  it('update modifica solo el secreto indicado', () => {
    const secrets = useSecretsStore()
    secrets.setList([makeSecret(1), makeSecret(2)])
    secrets.update('id-1', { alias: 'nuevo-alias' })

    expect(secrets.list.find((s) => s.id === 'id-1').alias).toBe('nuevo-alias')
    expect(secrets.list.find((s) => s.id === 'id-2').alias).toBe('alias-2')
  })

  it('update ignora ids inexistentes sin lanzar error', () => {
    const secrets = useSecretsStore()
    secrets.setList([makeSecret(1)])
    expect(() => secrets.update('no-existe', { alias: 'x' })).not.toThrow()
  })

  it('remove elimina el secreto correcto', () => {
    const secrets = useSecretsStore()
    secrets.setList([makeSecret(1), makeSecret(2)])
    secrets.remove('id-1')

    expect(secrets.list).toHaveLength(1)
    expect(secrets.list[0].id).toBe('id-2')
  })

  it('clear vacía la lista', () => {
    const secrets = useSecretsStore()
    secrets.setList([makeSecret(1), makeSecret(2)])
    secrets.loading = true
    secrets.clear()

    expect(secrets.list).toEqual([])
    expect(secrets.loading).toBe(false)
  })
})
