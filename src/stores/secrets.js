/**
 * @fileoverview Store de secretos.
 * Gestiona la lista de secretos del vault (alias, type, metadata).
 * Los blobs cifrados solo se cargan bajo demanda y nunca se almacenan aquí.
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * @typedef {Object} SecretMeta
 * @property {string} id
 * @property {string} alias
 * @property {string} secret_type - "token" | "database" | "login" | "ssh" | "api_key"
 * @property {string} created_at
 * @property {string} updated_at
 */

export const useSecretsStore = defineStore('secrets', () => {
  /** @type {import('vue').Ref<SecretMeta[]>} Lista de secretos (sin blobs cifrados) */
  const list = ref([])

  /** @type {import('vue').Ref<boolean>} true mientras se carga la lista */
  const loading = ref(false)

  /**
   * Reemplaza la lista completa de secretos.
   * @param {SecretMeta[]} secrets
   */
  function setList(secrets) {
    list.value = secrets
  }

  /**
   * Agrega un secreto a la lista local tras una creación exitosa.
   * @param {SecretMeta} secret
   */
  function add(secret) {
    list.value.unshift(secret)
  }

  /**
   * Actualiza el alias o type de un secreto existente en la lista local.
   * @param {string} id
   * @param {Partial<SecretMeta>} changes
   */
  function update(id, changes) {
    const idx = list.value.findIndex((s) => s.id === id)
    if (idx !== -1) {
      list.value[idx] = { ...list.value[idx], ...changes }
    }
  }

  /**
   * Elimina un secreto de la lista local.
   * @param {string} id
   */
  function remove(id) {
    list.value = list.value.filter((s) => s.id !== id)
  }

  /**
   * Limpia la lista. Llamar al destruir la sesión.
   */
  function clear() {
    list.value = []
    loading.value = false
  }

  return {
    list,
    loading,
    setList,
    add,
    update,
    remove,
    clear,
  }
})
