<script setup>
/**
 * @fileoverview Vista principal del vault.
 * Muestra la lista de secretos en modo lista o grilla.
 * Los blobs cifrados nunca se cargan aquí — solo alias y tipo.
 */

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useCryptoStore } from '../stores/crypto.js'
import { useSecretsStore } from '../stores/secrets.js'
import { secretsApi } from '../services/api.js'
import SecretCard from '../components/SecretCard.vue'
import SecretSheet from '../components/SecretSheet.vue'

const router = useRouter()
const auth = useAuthStore()
const crypto = useCryptoStore()
const secrets = useSecretsStore()

/** @type {import('vue').Ref<'list'|'grid'>} */
const viewMode = ref(localStorage.getItem('vault_view') ?? 'list')

/** @type {import('vue').Ref<string|null>} Error de carga */
const loadError = ref(null)

/** @type {import('vue').Ref<string|null>} ID del secreto con bottom sheet abierto */
const activeId = ref(null)

const isEmpty = computed(() => !secrets.loading && secrets.list.length === 0)

/**
 * Cambia el modo de vista y persiste la preferencia.
 * @param {'list'|'grid'} mode
 */
function setViewMode(mode) {
  viewMode.value = mode
  localStorage.setItem('vault_view', mode)
}

/** Destruye la sesión y recarga la app. */
function logout() {
  auth.clear()
  crypto.clear()
  secrets.clear()
  window.location.reload()
}

onMounted(async () => {
  secrets.loading = true
  loadError.value = null
  try {
    const { data } = await secretsApi.list()
    secrets.setList(data)
  } catch {
    loadError.value = 'No se pudo cargar el vault. Intenta de nuevo.'
  } finally {
    secrets.loading = false
  }
})
</script>

<template>
  <div class="vault-shell">
    <div class="bg-grid" aria-hidden="true" />

    <!-- Topbar -->
    <header class="topbar">
      <div class="topbar-brand">
        <div class="logo-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <span class="brand-name">secretly</span>
      </div>

      <div class="topbar-actions">
        <!-- Toggle vista -->
        <div class="view-toggle" role="group" aria-label="Modo de vista">
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'list' }"
            @click="setViewMode('list')"
            title="Vista lista"
            aria-pressed="viewMode === 'list'"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="3" width="12" height="1.5" rx="0.75"/>
              <rect x="2" y="7.25" width="12" height="1.5" rx="0.75"/>
              <rect x="2" y="11.5" width="12" height="1.5" rx="0.75"/>
            </svg>
          </button>
          <button
            class="toggle-btn"
            :class="{ active: viewMode === 'grid' }"
            @click="setViewMode('grid')"
            title="Vista grilla"
            aria-pressed="viewMode === 'grid'"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="5.5" height="5.5" rx="1"/>
              <rect x="8.5" y="2" width="5.5" height="5.5" rx="1"/>
              <rect x="2" y="8.5" width="5.5" height="5.5" rx="1"/>
              <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1"/>
            </svg>
          </button>
        </div>

        <button class="btn-logout" @click="logout" title="Cerrar sesión">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Contenido principal -->
    <main class="vault-main">
      <!-- Loading skeleton -->
      <template v-if="secrets.loading">
        <div :class="viewMode === 'grid' ? 'secrets-grid' : 'secrets-list'">
          <div v-for="n in 4" :key="n" class="card-skeleton" />
        </div>
      </template>

      <!-- Error -->
      <div v-else-if="loadError" class="state-empty">
        <p class="state-message error">{{ loadError }}</p>
        <button class="btn-retry" @click="$router.go(0)">Reintentar</button>
      </div>

      <!-- Empty state -->
      <div v-else-if="isEmpty" class="state-empty">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <p class="state-title">Vault vacío</p>
        <p class="state-message">Agrega tu primer secreto.</p>
        <RouterLink to="/vault/new" class="btn-primary-sm">+ Nuevo secreto</RouterLink>
      </div>

      <!-- Lista de secretos -->
      <template v-else>
        <div
          :class="viewMode === 'grid' ? 'secrets-grid' : 'secrets-list'"
          role="list"
        >
          <SecretCard
            v-for="secret in secrets.list"
            :key="secret.id"
            :secret="secret"
            :layout="viewMode"
            @click="activeId = secret.id"
          />
        </div>
      </template>
    </main>

    <!-- Bottom sheet de detalle -->
    <Teleport to="body">
      <SecretSheet :secret-id="activeId" @close="activeId = null" />
    </Teleport>

    <!-- FAB -->
    <RouterLink to="/vault/new" class="fab" aria-label="Nuevo secreto">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </RouterLink>
  </div>
</template>

<style scoped>
.vault-shell {
  --c-bg: #090a0c;
  --c-surface: #0e1014;
  --c-surface-2: #12161b;
  --c-border: #1a1f26;
  --c-border-focus: #36816a;
  --c-text: #c4cad4;
  --c-text-muted: #3e4855;
  --c-accent: #36816a;
  --c-accent-hover: #43a088;
  --c-accent-dim: rgba(54, 129, 106, 0.1);
  --c-error: #c45a5a;
  --font-mono: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
  --radius: 5px;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 100dvh;
  background: var(--c-bg);
  font-family: var(--font-mono);
  color: var(--c-text);
  position: relative;
}

.bg-grid {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(54, 129, 106, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(54, 129, 106, 0.03) 1px, transparent 1px);
  background-size: 36px 36px;
  pointer-events: none;
  z-index: 0;
}

/* ─── Topbar ──────────────────────────────────── */

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.25rem;
  background: rgba(9, 10, 12, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--c-border);
}

.topbar-brand { display: flex; align-items: center; gap: 0.625rem; }

.logo-mark {
  width: 28px; height: 28px;
  color: var(--c-accent);
  background: var(--c-accent-dim);
  border: 1px solid rgba(54, 129, 106, 0.2);
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  padding: 5px; flex-shrink: 0;
}
.logo-mark svg { width: 100%; height: 100%; }

.brand-name {
  font-size: 0.9rem; font-weight: 700; letter-spacing: -0.03em;
  color: var(--c-text);
}

.topbar-actions { display: flex; align-items: center; gap: 0.5rem; }

.view-toggle {
  display: flex;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  overflow: hidden;
}

.toggle-btn {
  padding: 0.4rem 0.55rem;
  background: none; border: none; cursor: pointer;
  color: var(--c-text-muted);
  display: flex; align-items: center;
  transition: color 150ms var(--ease), background 150ms var(--ease);
}
.toggle-btn svg { width: 14px; height: 14px; }
.toggle-btn:hover { color: var(--c-text); background: rgba(255,255,255,0.04); }
.toggle-btn.active { color: var(--c-accent); background: var(--c-accent-dim); }

.btn-logout {
  padding: 0.4rem;
  background: none; border: 1px solid var(--c-border);
  border-radius: var(--radius); cursor: pointer;
  color: var(--c-text-muted);
  display: flex; align-items: center;
  transition: color 150ms var(--ease), border-color 150ms var(--ease);
}
.btn-logout svg { width: 16px; height: 16px; }
.btn-logout:hover { color: var(--c-text); border-color: var(--c-text-muted); }

/* ─── Main ────────────────────────────────────── */

.vault-main {
  position: relative;
  z-index: 1;
  padding: 1.25rem;
  padding-bottom: 5rem; /* espacio para el FAB */
  max-width: 800px;
  margin: 0 auto;
}

/* ─── Layouts ─────────────────────────────────── */

.secrets-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.secrets-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.625rem;
}

@media (min-width: 520px) {
  .secrets-grid { grid-template-columns: repeat(3, 1fr); }
}

/* ─── Skeleton ────────────────────────────────── */

.card-skeleton {
  height: 58px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  animation: shimmer 1.4s ease-in-out infinite;
}

.secrets-grid .card-skeleton { height: 90px; }

@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}

/* ─── Empty state ─────────────────────────────── */

.state-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 1rem;
  text-align: center;
}

.empty-icon {
  width: 52px; height: 52px;
  color: var(--c-text-muted);
  opacity: 0.3;
}
.empty-icon svg { width: 100%; height: 100%; }

.state-title {
  font-size: 0.85rem; font-weight: 600;
  color: var(--c-text); margin: 0;
  letter-spacing: -0.02em;
}

.state-message {
  font-size: 0.72rem; color: var(--c-text-muted); margin: 0; line-height: 1.6;
}

.state-message.error { color: var(--c-error); }

.btn-primary-sm {
  margin-top: 0.25rem;
  padding: 0.5rem 1rem;
  background: var(--c-accent); border: none;
  border-radius: var(--radius); color: #060708;
  font-family: var(--font-mono); font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  text-decoration: none;
  transition: background 150ms var(--ease);
}
.btn-primary-sm:hover { background: var(--c-accent-hover); }

.btn-retry {
  padding: 0.5rem 1rem;
  background: none;
  border: 1px solid var(--c-border);
  border-radius: var(--radius); color: var(--c-text-muted);
  font-family: var(--font-mono); font-size: 0.7rem;
  cursor: pointer;
  transition: color 150ms var(--ease), border-color 150ms var(--ease);
}
.btn-retry:hover { color: var(--c-text); border-color: var(--c-text-muted); }

/* ─── FAB ─────────────────────────────────────── */

.fab {
  position: fixed;
  bottom: 1.5rem; right: 1.5rem;
  width: 48px; height: 48px;
  background: var(--c-accent);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #060708;
  text-decoration: none;
  box-shadow: 0 8px 24px rgba(54, 129, 106, 0.35);
  transition: background 150ms var(--ease), transform 150ms var(--ease), box-shadow 150ms var(--ease);
  z-index: 20;
}
.fab svg { width: 20px; height: 20px; }
.fab:hover {
  background: var(--c-accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(54, 129, 106, 0.45);
}
.fab:active { transform: translateY(0); }
</style>
