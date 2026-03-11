/**
 * @fileoverview Store de criptografía.
 * Mantiene la encryption_key en RAM durante la sesión activa.
 * Es el único lugar donde vive la CryptoKey — nunca se serializa ni persiste.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCryptoStore = defineStore('crypto', () => {
  /** @type {import('vue').Ref<CryptoKey|null>} Clave AES-256-GCM derivada con Argon2id */
  const encryptionKey = ref(null)

  /** @returns {boolean} true si la clave está disponible en memoria */
  const hasKey = computed(() => encryptionKey.value !== null)

  /**
   * Almacena la encryption_key en memoria tras derivarla en el login.
   * @param {CryptoKey} key
   */
  function setKey(key) {
    encryptionKey.value = key
  }

  /**
   * Elimina la clave de memoria. Llamar siempre al destruir la sesión.
   */
  function clear() {
    encryptionKey.value = null
  }

  return {
    encryptionKey,
    hasKey,
    setKey,
    clear,
  }
})
