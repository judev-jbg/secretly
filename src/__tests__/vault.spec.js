/**
 * @fileoverview Tests unitarios para el módulo crypto/vault.js.
 * Verifica derivación de claves, cifrado y descifrado.
 * argon2-browser se mockea porque requiere WASM con fetch (no disponible en Node).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de hash-wasm antes de importar vault.js
vi.mock('hash-wasm', () => {
  /**
   * Simula argon2id() retornando un hash derivado via HKDF para los tests.
   * No reemplaza la seguridad real — solo permite que los tests corran en Node.
   */
  const argon2id = async ({ password, salt }) => {
    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'HKDF', false, ['deriveBits'])
    const hashBits = await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: new Uint8Array() },
      keyMaterial,
      256,
    )
    return Array.from(new Uint8Array(hashBits))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  return { argon2id }
})

import { generateSalt, generateIV, deriveKey, encrypt, decrypt } from '../crypto/vault.js'

describe('vault.js — utilidades', () => {
  it('generateSalt retorna una cadena Base64 de ~44 chars', () => {
    const salt = generateSalt()
    expect(typeof salt).toBe('string')
    expect(salt.length).toBeGreaterThanOrEqual(40)
  })

  it('generateSalt produce valores únicos', () => {
    expect(generateSalt()).not.toBe(generateSalt())
  })

  it('generateIV retorna una cadena Base64 de 16 chars', () => {
    const iv = generateIV()
    expect(typeof iv).toBe('string')
    expect(iv.length).toBe(16)
  })

  it('generateIV produce valores únicos', () => {
    expect(generateIV()).not.toBe(generateIV())
  })
})

describe('vault.js — deriveKey', () => {
  it('retorna un CryptoKey válido', async () => {
    const salt = generateSalt()
    const key = await deriveKey('1234', 'mi frase', salt)
    expect(key).toBeInstanceOf(CryptoKey)
    expect(key.type).toBe('secret')
    expect(key.algorithm.name).toBe('AES-GCM')
  })

  it('mismos inputs producen claves funcionalmente equivalentes', async () => {
    const salt = generateSalt()
    const key1 = await deriveKey('1234', 'frase', salt)
    const key2 = await deriveKey('1234', 'frase', salt)

    const iv = generateIV()
    const data = { token: 'test' }

    const encrypted = await encrypt(data, key1, iv)
    const decrypted = await decrypt(encrypted, iv, key2)

    expect(decrypted).toEqual(data)
  })

  it('distintos PINs producen claves incompatibles', async () => {
    const salt = generateSalt()
    const key1 = await deriveKey('1111', 'frase', salt)
    const key2 = await deriveKey('9999', 'frase', salt)

    const iv = generateIV()
    const encrypted = await encrypt({ secret: 'data' }, key1, iv)

    await expect(decrypt(encrypted, iv, key2)).rejects.toThrow()
  })
})

describe('vault.js — encrypt / decrypt', () => {
  it('cifra y descifra correctamente cada tipo de secreto', async () => {
    const salt = generateSalt()
    const key = await deriveKey('0000', 'frase test', salt)

    const fixtures = [
      { token: 'ghp_xxxx...' },
      { host: 'localhost', port: '5432', database: 'mydb', username: 'admin', password: 's3cr3t' },
      { url: 'https://example.com', username: 'user@mail.com', password: 'pass' },
      { host: '192.168.1.1', username: 'root', private_key: '-----BEGIN RSA...' },
      { api_key: 'sk-...', api_secret: 'secret123' },
    ]

    for (const blob of fixtures) {
      const iv = generateIV()
      const encrypted = await encrypt(blob, key, iv)
      const decrypted = await decrypt(encrypted, iv, key)
      expect(decrypted).toEqual(blob)
    }
  })

  it('el texto cifrado es distinto al original', async () => {
    const salt = generateSalt()
    const key = await deriveKey('1234', 'frase', salt)
    const iv = generateIV()
    const data = { token: 'visible' }

    const encrypted = await encrypt(data, key, iv)
    expect(encrypted).not.toContain('visible')
  })

  it('mismo plaintext con IVs distintos produce ciphertexts distintos', async () => {
    const salt = generateSalt()
    const key = await deriveKey('1234', 'frase', salt)
    const data = { token: 'abc' }

    const enc1 = await encrypt(data, key, generateIV())
    const enc2 = await encrypt(data, key, generateIV())

    expect(enc1).not.toBe(enc2)
  })

  it('descifrar con IV incorrecto lanza error', async () => {
    const salt = generateSalt()
    const key = await deriveKey('1234', 'frase', salt)
    const iv = generateIV()
    const encrypted = await encrypt({ x: 1 }, key, iv)

    await expect(decrypt(encrypted, generateIV(), key)).rejects.toThrow()
  })
})
