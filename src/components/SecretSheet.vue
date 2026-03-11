<script setup>
/**
 * @fileoverview Bottom sheet de detalle de secreto.
 * Flujo: apertura → carga blob → modal PIN → modal frase → descifrado → muestra datos (60s).
 * Al cerrar o al expirar el timer, los datos en claro se eliminan del componente.
 */

import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { useCryptoStore } from '../stores/crypto.js'
import { useSecretsStore } from '../stores/secrets.js'
import { secretsApi } from '../services/api.js'
import { decrypt, deriveKey } from '../crypto/vault.js'

// ─── Props / emits ─────────────────────────────────────────────────────────

const props = defineProps({
  /** ID del secreto a mostrar. null = cerrado */
  secretId: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['close'])

// ─── Stores ────────────────────────────────────────────────────────────────

const crypto = useCryptoStore()
const secrets = useSecretsStore()

// ─── Estado interno ────────────────────────────────────────────────────────

/** @type {import('vue').Ref<'idle'|'loading'|'locked'|'pin'|'phrase'|'unlocked'|'error'>} */
const phase = ref('idle')

/** Metadatos del secreto activo */
const meta = computed(() => secrets.list.find((s) => s.id === props.secretId) ?? null)

/** Blob cifrado traído del servidor */
const encryptedBlob = ref(null)
const ivBlob = ref(null)

/** Datos descifrados en claro — solo viven aquí, jamás en el store */
const plainData = ref(null)

/** Intentos fallidos de PIN (máx 3) */
const pinAttempts = ref(0)
const MAX_ATTEMPTS = 3

/** Inputs de PIN y frase */
const pinInput = ref('')
const phraseInput = ref('')
const pinError = ref('')
const phraseError = ref('')
const shakePin = ref(false)
const shakePhrase = ref(false)

/** Timer de visibilidad de datos (60s) */
const visibilityTimer = ref(null)
const secondsLeft = ref(60)
const VISIBILITY_SECONDS = 60

/** Loading del PIN/frase */
const decryptLoading = ref(false)

// ─── Computed ──────────────────────────────────────────────────────────────

/** Campos a mostrar según el tipo de secreto */
const FIELD_LABELS = {
  token:    [['token', 'Token']],
  database: [['host', 'Host'], ['port', 'Port'], ['database', 'Database'], ['username', 'Username'], ['password', 'Password']],
  login:    [['url', 'URL'], ['username', 'Username'], ['password', 'Password']],
  ssh:      [['host', 'Host'], ['username', 'Username'], ['private_key', 'Private Key']],
  api_key:  [['api_key', 'API Key'], ['api_secret', 'API Secret']],
}

const fields = computed(() => {
  if (!meta.value) return []
  return FIELD_LABELS[meta.value.secret_type] ?? []
})

const isOpen = computed(() => !!props.secretId)

// ─── Lógica principal ──────────────────────────────────────────────────────

watch(() => props.secretId, async (id) => {
  if (!id) {
    _cleanup()
    return
  }
  _reset()
  phase.value = 'loading'
  try {
    const { data } = await secretsApi.get(id)
    encryptedBlob.value = data.encrypted
    ivBlob.value = data.iv
    phase.value = 'pin'
    await nextTick()
    document.getElementById('pin-input')?.focus()
  } catch {
    phase.value = 'error'
  }
}, { immediate: true })

/**
 * Valida el PIN e inicia el paso de frase.
 * En este diseño el PIN no se verifica contra el servidor —
 * si la derivación + descifrado falla, la clave era incorrecta.
 * Pasamos a la fase de frase primero, y la validación real ocurre en el descifrado.
 */
async function submitPin() {
  if (!pinInput.value.trim()) return
  pinError.value = ''
  phase.value = 'phrase'
  await nextTick()
  document.getElementById('phrase-input')?.focus()
}

/**
 * Deriva la clave con PIN + frase y descifra el blob.
 * Si falla, registra un intento fallido.
 */
async function submitPhrase() {
  if (!phraseInput.value.trim()) return
  decryptLoading.value = true
  phraseError.value = ''

  try {
    const auth = (await import('../stores/auth.js')).useAuthStore()
    const key = await deriveKey(pinInput.value, phraseInput.value, auth.salt)
    const data = await decrypt(encryptedBlob.value, ivBlob.value, key)
    plainData.value = data
    phase.value = 'unlocked'
    _startVisibilityTimer()
  } catch {
    pinAttempts.value++
    if (pinAttempts.value >= MAX_ATTEMPTS) {
      emit('close')
      return
    }
    _triggerShake('phrase')
    phraseError.value = `Credenciales incorrectas. ${MAX_ATTEMPTS - pinAttempts.value} intento(s) restante(s).`
    // Vuelve a PIN para que el usuario reintente desde el principio
    phraseInput.value = ''
    pinInput.value = ''
    phase.value = 'pin'
    await nextTick()
    document.getElementById('pin-input')?.focus()
  } finally {
    decryptLoading.value = false
  }
}

/** Inicia el contador de 60 segundos de visibilidad. */
function _startVisibilityTimer() {
  secondsLeft.value = VISIBILITY_SECONDS
  visibilityTimer.value = setInterval(() => {
    secondsLeft.value--
    if (secondsLeft.value <= 0) _lockData()
  }, 1000)
}

/** Bloquea los datos y vuelve al estado cerrado. */
function _lockData() {
  clearInterval(visibilityTimer.value)
  visibilityTimer.value = null
  plainData.value = null
  phase.value = 'locked'
}

/** Activa la animación de shake en el input indicado. */
function _triggerShake(target) {
  if (target === 'pin') {
    shakePin.value = true
    setTimeout(() => (shakePin.value = false), 500)
  } else {
    shakePhrase.value = true
    setTimeout(() => (shakePhrase.value = false), 500)
  }
}

/** Limpia todo el estado sin cerrar el sheet. */
function _reset() {
  clearInterval(visibilityTimer.value)
  visibilityTimer.value = null
  plainData.value = null
  encryptedBlob.value = null
  ivBlob.value = null
  pinInput.value = ''
  phraseInput.value = ''
  pinError.value = ''
  phraseError.value = ''
  pinAttempts.value = 0
  phase.value = 'idle'
}

/** Limpia todo y cierra. */
function _cleanup() {
  _reset()
}

/** Copia texto al portapapeles. */
async function copyField(value) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    // fallback silencioso
  }
}

onUnmounted(() => {
  _cleanup()
})

// Expuesto para tests — permite setear refs y llamar handlers directamente
defineExpose({ pinInput, phraseInput, submitPin, submitPhrase, phase })
</script>

<template>
  <div class="sheet-root">
  <!-- Overlay -->
    <Transition name="overlay">
      <div
        v-if="isOpen"
        class="sheet-overlay"
        aria-hidden="true"
        @click="emit('close')"
      />
    </Transition>

    <!-- Sheet -->
    <Transition name="sheet">
      <div
        v-if="isOpen"
        class="sheet"
        role="dialog"
        aria-modal="true"
        :aria-label="meta?.alias ?? 'Detalle de secreto'"
      >
        <!-- Handle -->
        <div class="sheet-handle" />

        <!-- Header -->
        <header class="sheet-header">
          <div class="sheet-meta" v-if="meta">
            <span class="sheet-alias">{{ meta.alias }}</span>
            <span class="sheet-type">{{ meta.secret_type }}</span>
          </div>
          <button class="sheet-close" @click="emit('close')" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <!-- ─── Loading ──────────────────── -->
        <div v-if="phase === 'loading'" class="sheet-body sheet-body--center">
          <div class="spinner" aria-label="Cargando" />
        </div>

        <!-- ─── Error ────────────────────── -->
        <div v-else-if="phase === 'error'" class="sheet-body sheet-body--center">
          <p class="phase-error">No se pudo cargar el secreto.</p>
        </div>

        <!-- ─── PIN ──────────────────────── -->
        <div v-else-if="phase === 'pin'" class="sheet-body">
          <p class="phase-hint">Ingresa tu PIN para continuar.</p>
          <form class="phase-form" @submit.prevent="submitPin" novalidate>
            <div class="field" :class="{ shake: shakePin }">
              <label class="field-label" for="pin-input">PIN</label>
              <input
                id="pin-input"
                v-model="pinInput"
                type="password"
                inputmode="numeric"
                class="field-input"
                placeholder="••••"
                autocomplete="off"
                required
              />
              <span v-if="pinError" class="field-error">{{ pinError }}</span>
              <span v-if="phraseError && phase === 'pin'" class="field-error">{{ phraseError }}</span>
            </div>
            <button type="submit" class="btn-primary" :disabled="!pinInput.trim()">
              Continuar
            </button>
          </form>
        </div>

        <!-- ─── Frase ─────────────────────── -->
        <div v-else-if="phase === 'phrase'" class="sheet-body">
          <p class="phase-hint">Ingresa tu frase de seguridad.</p>
          <form class="phase-form" @submit.prevent="submitPhrase" novalidate>
            <div class="field" :class="{ shake: shakePhrase }">
              <label class="field-label" for="phrase-input">Frase de seguridad</label>
              <input
                id="phrase-input"
                v-model="phraseInput"
                type="password"
                class="field-input"
                placeholder="••••••••••••"
                autocomplete="off"
                required
              />
              <span v-if="phraseError" class="field-error">{{ phraseError }}</span>
            </div>
            <button type="submit" class="btn-primary" :disabled="!phraseInput.trim() || decryptLoading">
              <span v-if="!decryptLoading">Desbloquear</span>
              <span v-else class="btn-loading" aria-label="Descifrando">
                <span class="dot" /><span class="dot" /><span class="dot" />
              </span>
            </button>
            <button type="button" class="btn-ghost" @click="phase = 'pin'; phraseInput = ''">
              ← Volver al PIN
            </button>
          </form>
        </div>

        <!-- ─── Bloqueado (datos expirados) ─ -->
        <div v-else-if="phase === 'locked'" class="sheet-body sheet-body--center">
          <p class="phase-hint" style="text-align:center">
            Los datos han expirado.<br />Ingresa tu PIN nuevamente para verlos.
          </p>
          <button
            class="btn-primary"
            style="margin-top:0.5rem"
            @click="phase = 'pin'; pinInput = ''; phraseInput = ''"
          >
            Reintentar
          </button>
        </div>

        <!-- ─── Desbloqueado ──────────────── -->
        <div v-else-if="phase === 'unlocked' && plainData" class="sheet-body">
          <!-- Timer -->
          <div class="visibility-timer" :class="{ urgent: secondsLeft <= 10 }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Los datos se ocultarán en <strong>{{ secondsLeft }}s</strong></span>
          </div>

          <!-- Campos -->
          <div class="fields-list">
            <div
              v-for="[key, label] in fields"
              :key="key"
              class="plain-field"
            >
              <div class="plain-field-header">
                <label class="field-label">{{ label }}</label>
                <button
                  class="btn-copy"
                  :title="`Copiar ${label}`"
                  @click="copyField(plainData[key] ?? '')"
                  :disabled="!plainData[key]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                class="field-input field-input--plain"
                :value="plainData[key] ?? ''"
                readonly
              />
            </div>
          </div>

          <button class="btn-ghost btn-lock" @click="_lockData">
            Ocultar datos
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ─── Variables (heredadas del vault) ──────────────── */
.sheet-overlay,
.sheet {
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
  --c-warn: #c49a3a;
  --font-mono: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
  --radius: 5px;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
}

/* ─── Overlay ──────────────────────────────────────── */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 40;
}

.overlay-enter-active,
.overlay-leave-active { transition: opacity 240ms var(--ease); }
.overlay-enter-from,
.overlay-leave-to    { opacity: 0; }

/* ─── Sheet ────────────────────────────────────────── */
.sheet {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 50;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-bottom: none;
  border-radius: 14px 14px 0 0;
  font-family: var(--font-mono);
  color: var(--c-text);
  max-height: 85dvh;
  overflow-y: auto;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

@media (min-width: 600px) {
  .sheet {
    left: 50%; right: auto;
    transform: translateX(-50%);
    width: 480px;
    border-radius: 14px;
    bottom: 1.5rem;
    border: 1px solid var(--c-border);
  }
}

.sheet-enter-active,
.sheet-leave-active { transition: transform 300ms cubic-bezier(0.34, 1.2, 0.64, 1); }
.sheet-enter-from,
.sheet-leave-to    { transform: translateY(100%); }

@media (min-width: 600px) {
  .sheet-enter-from,
  .sheet-leave-to { transform: translateX(-50%) translateY(24px); opacity: 0; }
  .sheet-enter-active,
  .sheet-leave-active { transition: transform 280ms var(--ease), opacity 240ms var(--ease); }
}

/* ─── Handle / Header ──────────────────────────────── */
.sheet-handle {
  width: 36px; height: 4px;
  background: var(--c-border);
  border-radius: 2px;
  margin: 0.75rem auto 0;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.125rem 0.625rem;
  border-bottom: 1px solid var(--c-border);
}

.sheet-meta {
  display: flex; flex-direction: column; gap: 0.15rem;
}

.sheet-alias {
  font-size: 0.9rem; font-weight: 700; letter-spacing: -0.02em;
  color: var(--c-text);
}

.sheet-type {
  font-size: 0.6rem; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--c-text-muted);
}

.sheet-close {
  width: 28px; height: 28px;
  background: none; border: 1px solid var(--c-border);
  border-radius: var(--radius); cursor: pointer;
  color: var(--c-text-muted);
  display: flex; align-items: center; justify-content: center;
  transition: color 150ms, border-color 150ms;
  flex-shrink: 0;
}
.sheet-close svg { width: 14px; height: 14px; }
.sheet-close:hover { color: var(--c-text); border-color: var(--c-text-muted); }

/* ─── Body ─────────────────────────────────────────── */
.sheet-body {
  padding: 1.125rem;
  display: flex; flex-direction: column; gap: 1rem;
}

.sheet-body--center {
  align-items: center; justify-content: center;
  min-height: 120px;
}

/* ─── Spinner ──────────────────────────────────────── */
.spinner {
  width: 24px; height: 24px;
  border: 2px solid var(--c-border);
  border-top-color: var(--c-accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Form común ───────────────────────────────────── */
.phase-hint {
  font-size: 0.75rem; color: var(--c-text-muted); line-height: 1.65; margin: 0;
}

.phase-error {
  font-size: 0.75rem; color: var(--c-error); text-align: center; margin: 0;
}

.phase-form {
  display: flex; flex-direction: column; gap: 0.875rem;
}

.field { display: flex; flex-direction: column; gap: 0.375rem; }

.field-label {
  font-size: 0.67rem; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--c-text-muted);
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

.field-input--plain {
  cursor: text;
  font-size: 0.8rem;
}

.field-error {
  font-size: 0.67rem; color: var(--c-error); letter-spacing: 0.04em;
}

/* ─── Shake ────────────────────────────────────────── */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-5px); }
  40%       { transform: translateX(5px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
}
.shake { animation: shake 0.45s ease; }

/* ─── Botones ──────────────────────────────────────── */
.btn-primary {
  padding: 0.7rem 1rem; background: var(--c-accent); border: none;
  border-radius: var(--radius); color: #060708;
  font-family: var(--font-mono); font-size: 0.75rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer;
  display: flex; align-items: center; justify-content: center; min-height: 40px;
  transition: background 150ms var(--ease), opacity 150ms var(--ease);
}
.btn-primary:hover:not(:disabled) { background: var(--c-accent-hover); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-ghost {
  background: none; border: none; padding: 0.3rem;
  color: var(--c-text-muted); font-family: var(--font-mono); font-size: 0.7rem;
  cursor: pointer; text-align: center; display: block;
  transition: color 150ms var(--ease); letter-spacing: 0.04em;
}
.btn-ghost:hover { color: var(--c-text); }

.btn-lock { margin-top: 0.25rem; }

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

/* ─── Timer ────────────────────────────────────────── */
.visibility-timer {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.7rem; color: var(--c-text-muted);
  padding: 0.45rem 0.7rem;
  background: var(--c-accent-dim);
  border: 1px solid rgba(54, 129, 106, 0.18);
  border-radius: var(--radius);
  transition: background 300ms, border-color 300ms, color 300ms;
}
.visibility-timer svg { width: 13px; height: 13px; flex-shrink: 0; color: var(--c-accent); }
.visibility-timer strong { color: var(--c-accent); }

.visibility-timer.urgent {
  background: rgba(196, 90, 90, 0.07);
  border-color: rgba(196, 90, 90, 0.2);
  color: var(--c-error);
}
.visibility-timer.urgent svg { color: var(--c-error); }
.visibility-timer.urgent strong { color: var(--c-error); }

/* ─── Campos en claro ──────────────────────────────── */
.fields-list {
  display: flex; flex-direction: column; gap: 0.75rem;
}

.plain-field { display: flex; flex-direction: column; gap: 0.375rem; }

.plain-field-header {
  display: flex; align-items: center; justify-content: space-between;
}

.btn-copy {
  width: 24px; height: 24px;
  background: none; border: 1px solid var(--c-border);
  border-radius: 4px; cursor: pointer;
  color: var(--c-text-muted);
  display: flex; align-items: center; justify-content: center;
  transition: color 150ms, border-color 150ms;
  flex-shrink: 0;
}
.btn-copy svg { width: 12px; height: 12px; }
.btn-copy:hover:not(:disabled) { color: var(--c-accent); border-color: var(--c-border-focus); }
.btn-copy:disabled { opacity: 0.3; cursor: default; }
</style>
