/**
 * @fileoverview Módulo puro de criptografía para el vault.
 * Maneja derivación de claves con Argon2id y cifrado/descifrado con AES-256-GCM via WebCrypto.
 * No tiene dependencias de Vue ni del estado de la aplicación.
 */

import { argon2id } from 'hash-wasm'

/**
 * Parámetros de Argon2id para derivación de clave.
 * Balanceados para uso en navegador (no demasiado lentos en móvil).
 */
const ARGON2_PARAMS = {
  iterations: 3,
  memorySize: 64 * 1024, // 64 MB
  parallelism: 1,
  hashLength: 32,
}

/**
 * Genera un salt criptográficamente seguro en formato Base64.
 * @returns {string} Salt en Base64 (32 bytes → 44 chars)
 */
export function generateSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return uint8ArrayToBase64(bytes)
}

/**
 * Genera un IV criptográficamente seguro para AES-GCM.
 * @returns {string} IV en Base64 (12 bytes → 16 chars)
 */
export function generateIV() {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return uint8ArrayToBase64(bytes)
}

/**
 * Deriva la encryption_key a partir del PIN, frase y salt del usuario.
 * Usa Argon2id para que el proceso sea costoso y resistente a brute force.
 *
 * @param {string} pin - PIN numérico del usuario
 * @param {string} phrase - Frase de seguridad del usuario
 * @param {string} saltBase64 - Salt almacenado en el servidor (Base64)
 * @returns {Promise<CryptoKey>} Clave AES-256-GCM lista para usar con WebCrypto
 */
export async function deriveKey(pin, phrase, saltBase64) {
  const password = `${pin}:${phrase}`
  const salt = base64ToUint8Array(saltBase64)

  const hashHex = await argon2id({
    password,
    salt,
    ...ARGON2_PARAMS,
    outputType: 'hex',
  })

  const hashBytes = new Uint8Array(hashHex.match(/.{2}/g).map((b) => parseInt(b, 16)))

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    hashBytes,
    { name: 'AES-GCM' },
    false, // no exportable
    ['encrypt', 'decrypt'],
  )

  return cryptoKey
}

/**
 * Cifra un objeto JSON con AES-256-GCM.
 *
 * @param {object} data - Datos a cifrar (blob del secreto)
 * @param {CryptoKey} encryptionKey - Clave derivada con deriveKey()
 * @param {string} ivBase64 - IV en Base64 generado con generateIV()
 * @returns {Promise<string>} Texto cifrado en Base64
 */
export async function encrypt(data, encryptionKey, ivBase64) {
  const iv = base64ToUint8Array(ivBase64)
  const plaintext = new TextEncoder().encode(JSON.stringify(data))

  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, encryptionKey, plaintext)

  return uint8ArrayToBase64(new Uint8Array(cipherBuffer))
}

/**
 * Descifra un blob AES-256-GCM y retorna el objeto JSON original.
 *
 * @param {string} encryptedBase64 - Texto cifrado en Base64
 * @param {string} ivBase64 - IV en Base64 usado durante el cifrado
 * @param {CryptoKey} encryptionKey - Clave derivada con deriveKey()
 * @returns {Promise<object>} Datos descifrados como objeto JS
 * @throws {Error} Si la clave o IV son incorrectos (autenticación GCM falla)
 */
export async function decrypt(encryptedBase64, ivBase64, encryptionKey) {
  const iv = base64ToUint8Array(ivBase64)
  const cipherBytes = base64ToUint8Array(encryptedBase64)

  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, encryptionKey, cipherBytes)

  return JSON.parse(new TextDecoder().decode(plainBuffer))
}

// ─── Utilidades internas ───────────────────────────────────────────────────

/**
 * Convierte un Uint8Array a cadena Base64.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function uint8ArrayToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

/**
 * Convierte una cadena Base64 a Uint8Array.
 * @param {string} base64
 * @returns {Uint8Array}
 */
function base64ToUint8Array(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
