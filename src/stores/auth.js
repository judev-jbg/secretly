/**
 * @fileoverview Store de autenticación.
 * Gestiona JWT, email del usuario y estado de sesión.
 * No maneja la encryption_key — eso es responsabilidad de cryptoStore.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  /** @type {import('vue').Ref<string|null>} Token JWT de acceso */
  const token = ref(null)

  /** @type {import('vue').Ref<string|null>} Token JWT de refresco */
  const refreshToken = ref(null)

  /** @type {import('vue').Ref<string|null>} Email del usuario autenticado */
  const email = ref(null)

  /** @type {import('vue').Ref<string|null>} Salt del usuario (Base64), necesario para deriveKey */
  const salt = ref(null)

  /** @returns {boolean} true si hay sesión activa (token presente) */
  const isAuthenticated = computed(() => !!token.value)

  /**
   * Establece los datos de sesión tras un login exitoso.
   * @param {{ token: string, refreshToken: string, email: string, salt: string }} data
   */
  function setSession({ token: t, refreshToken: rt, email: e, salt: s }) {
    token.value = t
    refreshToken.value = rt
    email.value = e
    salt.value = s
  }

  /**
   * Actualiza solo el access token (tras un refresh exitoso).
   * @param {string} newToken
   */
  function setToken(newToken) {
    token.value = newToken
  }

  /**
   * Destruye la sesión completa: limpia token, email y salt de memoria.
   * No hace reload — el llamador decide si redirigir.
   */
  function clear() {
    token.value = null
    refreshToken.value = null
    email.value = null
    salt.value = null
  }

  return {
    token,
    refreshToken,
    email,
    salt,
    isAuthenticated,
    setSession,
    setToken,
    clear,
  }
})
