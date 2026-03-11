/**
 * @fileoverview Composable de monitor de actividad del usuario.
 * Destruye la sesión tras 60 segundos de inactividad.
 * Solo activo cuando el usuario está autenticado.
 */

const TIMEOUT_MS = 60_000
const EVENTS = ['click', 'scroll', 'keydown', 'mousemove', 'touchstart']

/**
 * Monitor de inactividad.
 * @param {() => void} onTimeout - Callback ejecutado al expirar el timer.
 * @returns {{ start: () => void, stop: () => void }}
 */
export function useActivityMonitor(onTimeout) {
  let timer = null

  function reset() {
    clearTimeout(timer)
    timer = setTimeout(onTimeout, TIMEOUT_MS)
  }

  function start() {
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
  }

  function stop() {
    clearTimeout(timer)
    timer = null
    EVENTS.forEach((e) => window.removeEventListener(e, reset))
  }

  return { start, stop }
}
