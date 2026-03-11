<script setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth.js'
import { useCryptoStore } from './stores/crypto.js'
import { useSecretsStore } from './stores/secrets.js'
import { useActivityMonitor } from './composables/useActivityMonitor.js'

const router = useRouter()
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
  () => auth.isAuthenticated && crypto.hasKey,
  (authenticated) => {
    if (authenticated) start()
    else stop()
  },
  { immediate: true },
)
</script>

<template>
  <RouterView />
</template>
