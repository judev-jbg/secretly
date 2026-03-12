/**
 * @fileoverview Composable para monitorear la disponibilidad del backend.
 * Hace polling al endpoint /health y expone un ref reactivo `isOnline`.
 * El polling solo corre mientras la instancia esté activa (onMounted/onUnmounted).
 */

import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/** Intervalo de polling en ms cuando el backend está caído */
const POLL_OFFLINE_MS = 5_000
/** Intervalo de polling en ms cuando el backend está disponible */
const POLL_ONLINE_MS = 30_000

export function useBackendHealth() {
  /** @type {import('vue').Ref<boolean>} true si el backend respondió OK recientemente */
  const isOnline = ref(true)

  let timerId = null

  /**
   * Consulta el endpoint /health.
   * Cualquier respuesta 2xx se considera "online", cualquier error de red "offline".
   */
  async function check() {
    try {
      await axios.get(`${BASE_URL}/health`, { timeout: 4000 })
      isOnline.value = true
    } catch {
      isOnline.value = false
    } finally {
      // Replanificar según el estado actual
      timerId = setTimeout(check, isOnline.value ? POLL_ONLINE_MS : POLL_OFFLINE_MS)
    }
  }

  onMounted(() => {
    check()
  })

  onUnmounted(() => {
    clearTimeout(timerId)
  })

  return { isOnline }
}
