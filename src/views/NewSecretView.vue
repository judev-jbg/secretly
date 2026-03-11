<script setup>
/**
 * @fileoverview Vista de creación de nuevo secreto.
 * Formulario dinámico según el tipo de secreto seleccionado.
 * Cifra el blob en el navegador antes de enviarlo al backend.
 */

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useCryptoStore } from '../stores/crypto.js'
import { useSecretsStore } from '../stores/secrets.js'
import { secretsApi } from '../services/api.js'
import { encrypt, generateIV } from '../crypto/vault.js'

const router = useRouter()
const auth = useAuthStore()
const crypto = useCryptoStore()
const secrets = useSecretsStore()

const alias = ref('')
const secretType = ref('login')
const loading = ref(false)
const error = ref('')

/** Campos del blob según el tipo */
const fields = ref({})

/** Definición de campos por tipo de secreto */
const TYPE_FIELDS = {
  token:    [['token', 'Token', 'text']],
  database: [['host', 'Host', 'text'], ['port', 'Port', 'text'], ['database', 'Database', 'text'], ['username', 'Username', 'text'], ['password', 'Password', 'password']],
  login:    [['url', 'URL', 'url'], ['username', 'Username', 'text'], ['password', 'Password', 'password']],
  ssh:      [['host', 'Host', 'text'], ['username', 'Username', 'text'], ['private_key', 'Private Key', 'textarea']],
  api_key:  [['api_key', 'API Key', 'text'], ['api_secret', 'API Secret', 'password']],
}

/** Tipos disponibles con etiquetas legibles */
const SECRET_TYPES = [
  { value: 'login', label: 'Login' },
  { value: 'token', label: 'Token' },
  { value: 'database', label: 'Database' },
  { value: 'ssh', label: 'SSH' },
  { value: 'api_key', label: 'API Key' },
]

const currentFields = computed(() => TYPE_FIELDS[secretType.value] ?? [])

/** @returns {boolean} true si el alias y al menos un campo tienen valor */
const isValid = computed(() => {
  if (!alias.value.trim()) return false
  return currentFields.value.some(([key]) => fields.value[key]?.trim())
})

/**
 * Cifra el blob y envía el secreto al backend.
 */
async function submit() {
  if (!isValid.value) return
  loading.value = true
  error.value = ''

  try {
    const blob = {}
    for (const [key] of currentFields.value) {
      blob[key] = fields.value[key] ?? ''
    }

    const iv = generateIV()
    const encrypted = await encrypt(blob, crypto.encryptionKey, iv)

    const { data } = await secretsApi.create({
      alias: alias.value.trim(),
      secret_type: secretType.value,
      encrypted,
      iv,
    })

    secrets.add(data)
    router.push('/vault')
  } catch {
    error.value = 'No se pudo guardar el secreto. Intenta de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="new-shell">
    <div class="bg-grid" aria-hidden="true" />

    <!-- Topbar -->
    <header class="topbar">
      <RouterLink to="/vault" class="btn-back" aria-label="Volver al vault">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </RouterLink>
      <span class="topbar-title">Nuevo secreto</span>
      <div style="width:28px" />
    </header>

    <!-- Formulario -->
    <main class="new-main">
      <form class="new-form" @submit.prevent="submit" novalidate>
        <!-- Alias -->
        <div class="field">
          <label class="field-label" for="alias">Alias</label>
          <input
            id="alias"
            v-model="alias"
            type="text"
            class="field-input"
            placeholder="Mi secreto"
            autocomplete="off"
            required
          />
          <span class="field-hint">Nombre visible en el vault (no se cifra)</span>
        </div>

        <!-- Tipo -->
        <div class="field">
          <label class="field-label">Tipo</label>
          <div class="type-grid">
            <button
              v-for="t in SECRET_TYPES"
              :key="t.value"
              type="button"
              class="type-btn"
              :class="{ active: secretType === t.value }"
              @click="secretType = t.value; fields = {}"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- Campos dinámicos -->
        <fieldset class="fields-section">
          <legend class="fields-legend">Datos a cifrar</legend>

          <div
            v-for="[key, label, type] in currentFields"
            :key="key"
            class="field"
          >
            <label class="field-label" :for="`field-${key}`">{{ label }}</label>
            <textarea
              v-if="type === 'textarea'"
              :id="`field-${key}`"
              v-model="fields[key]"
              class="field-input field-textarea"
              :placeholder="`Ingresa ${label.toLowerCase()}`"
              rows="4"
              autocomplete="off"
            />
            <input
              v-else
              :id="`field-${key}`"
              v-model="fields[key]"
              :type="type"
              class="field-input"
              :placeholder="`Ingresa ${label.toLowerCase()}`"
              autocomplete="off"
            />
          </div>
        </fieldset>

        <!-- Error -->
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>

        <!-- Submit -->
        <button type="submit" class="btn-primary" :disabled="loading || !isValid">
          <span v-if="!loading">Guardar secreto</span>
          <span v-else class="btn-loading" aria-label="Guardando">
            <span class="dot" /><span class="dot" /><span class="dot" />
          </span>
        </button>
      </form>
    </main>
  </div>
</template>

<style scoped>
.new-shell {
  --c-bg: #090a0c;
  --c-surface: #0e1014;
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

.topbar-title {
  font-size: 0.8rem; font-weight: 600; letter-spacing: -0.02em;
  color: var(--c-text);
}

.btn-back {
  width: 28px; height: 28px;
  background: none; border: 1px solid var(--c-border);
  border-radius: var(--radius); cursor: pointer;
  color: var(--c-text-muted);
  display: flex; align-items: center; justify-content: center;
  transition: color 150ms, border-color 150ms;
  text-decoration: none;
}
.btn-back svg { width: 16px; height: 16px; }
.btn-back:hover { color: var(--c-text); border-color: var(--c-text-muted); }

/* ─── Main ────────────────────────────────────── */

.new-main {
  position: relative;
  z-index: 1;
  padding: 1.25rem;
  max-width: 480px;
  margin: 0 auto;
}

.new-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ─── Field ───────────────────────────────────── */

.field { display: flex; flex-direction: column; gap: 0.375rem; }

.field-label {
  font-size: 0.67rem; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--c-text-muted);
}

.field-hint {
  font-size: 0.62rem; color: var(--c-text-muted); opacity: 0.6;
  letter-spacing: 0.04em;
}

.field-input {
  width: 100%; padding: 0.6rem 0.8rem;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid var(--c-border); border-radius: var(--radius);
  color: var(--c-text); font-family: var(--font-mono); font-size: 0.85rem;
  outline: none; box-sizing: border-box;
  transition: border-color 150ms var(--ease), background 150ms var(--ease), box-shadow 150ms var(--ease);
}

.field-input::placeholder { color: var(--c-text-muted); opacity: 0.4; }

.field-input:focus {
  border-color: var(--c-border-focus);
  background: rgba(54, 129, 106, 0.04);
  box-shadow: 0 0 0 3px rgba(54, 129, 106, 0.08);
}

.field-textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
  font-size: 0.8rem;
}

/* ─── Type grid ───────────────────────────────── */

.type-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.type-btn {
  padding: 0.4rem 0.7rem;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  color: var(--c-text-muted);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: border-color 150ms var(--ease), color 150ms var(--ease), background 150ms var(--ease);
}

.type-btn:hover {
  border-color: var(--c-text-muted);
  color: var(--c-text);
}

.type-btn.active {
  border-color: var(--c-accent);
  color: var(--c-accent);
  background: var(--c-accent-dim);
}

/* ─── Fields section ──────────────────────────── */

.fields-section {
  border: 1px solid var(--c-border);
  border-radius: 8px;
  padding: 1rem;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.fields-legend {
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--c-text-muted);
  padding: 0 0.5rem;
}

/* ─── Error ───────────────────────────────────── */

.form-error {
  font-size: 0.72rem; color: var(--c-error); margin: 0;
  padding: 0.5rem 0.7rem;
  background: rgba(196, 90, 90, 0.07);
  border: 1px solid rgba(196, 90, 90, 0.18);
  border-radius: var(--radius);
}

/* ─── Botones ─────────────────────────────────── */

.btn-primary {
  padding: 0.7rem 1rem; background: var(--c-accent); border: none;
  border-radius: var(--radius); color: #060708;
  font-family: var(--font-mono); font-size: 0.75rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer;
  display: flex; align-items: center; justify-content: center; min-height: 40px;
  transition: background 150ms var(--ease), transform 150ms var(--ease), opacity 150ms var(--ease);
}

.btn-primary:hover:not(:disabled) { background: var(--c-accent-hover); transform: translateY(-1px); }
.btn-primary:active:not(:disabled) { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-loading { display: flex; gap: 4px; align-items: center; }
.dot {
  width: 4px; height: 4px; border-radius: 50%; background: currentColor;
  animation: pulse 1.1s ease-in-out infinite;
}
.dot:nth-child(2) { animation-delay: 0.18s; }
.dot:nth-child(3) { animation-delay: 0.36s; }
@keyframes pulse {
  0%, 80%, 100% { opacity: 0.15; transform: scale(0.75); }
  40%            { opacity: 1;   transform: scale(1); }
}
</style>
