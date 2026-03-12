<script setup>
import { watch } from 'vue'
import { useAuthStore } from './stores/auth.js'
import { useCryptoStore } from './stores/crypto.js'
import { useSecretsStore } from './stores/secrets.js'
import { useActivityMonitor } from './composables/useActivityMonitor.js'
import { useBackendHealth } from './composables/useBackendHealth.js'

const auth = useAuthStore()
const crypto = useCryptoStore()
const secrets = useSecretsStore()

const { start, stop } = useActivityMonitor(() => {
  // Destruir sesión al expirar el monitor de actividad
  auth.clear()
  crypto.clear()
  secrets.clear()
  window.location.reload()
})

// Arrancar/detener el monitor según el estado de autenticación
watch(
  () => auth.isAuthenticated,
  (authenticated) => {
    if (authenticated) start()
    else stop()
  },
  { immediate: true },
)

const { isOnline } = useBackendHealth()
</script>

<template>
  <Transition name="banner">
    <div v-if="!isOnline" class="connection-banner" role="alert" aria-live="assertive">
      <svg class="banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
      <span>Sin conexión al servidor. Reintentando…</span>
    </div>
  </Transition>
  <RouterView />
</template>

<style>
/* ─── Banner de conexión ──────────────────────────────────────────────────── */
.connection-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: #2a1515;
  border-bottom: 1px solid rgba(196, 90, 90, 0.35);
  color: #c45a5a;
  font-family: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
}

.banner-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

/* ─── Transition ──────────────────────────────────────────────────────────── */
.banner-enter-active,
.banner-leave-active {
  transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 250ms;
}

.banner-enter-from,
.banner-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
