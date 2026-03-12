<script setup>
/**
 * @fileoverview Vista de login — flujo de un solo paso.
 * email + password → JWT + salt → setSession → /vault
 * El PIN+frase se solicita on-demand en el bottom sheet al ver un secreto.
 */

import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { authApi } from '../services/api.js'

const router = useRouter()
const auth = useAuthStore()

const credentials = reactive({ email: '', password: '' })
const credError = ref('')
const credLoading = ref(false)

/**
 * Autentica al usuario. Distingue error de red de credenciales incorrectas.
 */
async function submitCredentials() {
  credError.value = ''
  credLoading.value = true
  try {
    const { data } = await authApi.login({
      email: credentials.email,
      password: credentials.password,
    })
    auth.setSession({
      token: data.access_token,
      refreshToken: data.refresh_token,
      email: credentials.email,
      salt: data.salt,
    })
    router.push('/vault')
  } catch (err) {
    if (!err.response) {
      credError.value = 'No se puede conectar al servidor. Verifica tu conexión.'
    } else if (err.response.status === 401) {
      credError.value = 'Credenciales incorrectas.'
    } else {
      credError.value = 'Error al iniciar sesión. Intenta de nuevo.'
    }
  } finally {
    credLoading.value = false
  }
}

// ─── Recuperar contraseña ─────────────────────────────────────────────────
const showForgot = ref(false)
const forgotEmail = ref('')
const forgotStatus = ref('')
const forgotLoading = ref(false)

async function submitForgot() {
  forgotLoading.value = true
  try {
    await authApi.forgotPassword({ email: forgotEmail.value })
  } finally {
    // Siempre el mismo mensaje (anti-enumeration)
    forgotStatus.value = 'Si el email existe, recibirás un enlace de recuperación.'
    forgotLoading.value = false
  }
}
</script>

<template>
  <div class="login-shell">
    <div class="bg-grid" aria-hidden="true" />
    <div class="bg-vignette" aria-hidden="true" />

    <main class="login-card">
      <header class="login-header">
        <div class="logo-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 class="login-title">secretly</h1>
        <p class="login-subtitle">acceso seguro</p>
      </header>

      <Transition name="slide" mode="out-in">

        <!-- Credenciales -->
        <form
          v-if="!showForgot"
          key="credentials"
          class="login-form"
          @submit.prevent="submitCredentials"
          novalidate
        >
          <div class="field">
            <label class="field-label" for="email">Email</label>
            <input
              id="email"
              v-model="credentials.email"
              type="email"
              class="field-input"
              placeholder="tu@email.com"
              autocomplete="email"
              required
            />
          </div>

          <div class="field">
            <label class="field-label" for="password">Contraseña</label>
            <input
              id="password"
              v-model="credentials.password"
              type="password"
              class="field-input"
              placeholder="••••••••"
              autocomplete="current-password"
              required
            />
          </div>

          <p v-if="credError" class="form-error" role="alert">{{ credError }}</p>

          <button type="submit" class="btn-primary" :disabled="credLoading">
            <span v-if="!credLoading">Ingresar</span>
            <span v-else class="btn-loading" aria-label="Cargando">
              <span class="dot" /><span class="dot" /><span class="dot" />
            </span>
          </button>

          <button type="button" class="btn-ghost" @click="showForgot = true">
            ¿Olvidaste tu contraseña?
          </button>

          <RouterLink to="/register" class="btn-ghost">
            ¿No tienes cuenta? Regístrate
          </RouterLink>
        </form>

        <!-- Recuperar contraseña -->
        <form
          v-else
          key="forgot"
          class="login-form"
          @submit.prevent="submitForgot"
          novalidate
        >
          <p class="step-hint">
            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
          </p>

          <div class="field">
            <label class="field-label" for="forgot-email">Email</label>
            <input
              id="forgot-email"
              v-model="forgotEmail"
              type="email"
              class="field-input"
              placeholder="tu@email.com"
              autocomplete="email"
              required
            />
          </div>

          <p v-if="forgotStatus" class="form-success" role="status">{{ forgotStatus }}</p>

          <button type="submit" class="btn-primary" :disabled="forgotLoading || !!forgotStatus">
            <span v-if="!forgotLoading">Enviar email</span>
            <span v-else class="btn-loading" aria-label="Enviando">
              <span class="dot" /><span class="dot" /><span class="dot" />
            </span>
          </button>

          <RouterLink v-if="forgotStatus" to="/reset-password" class="btn-primary btn-primary--outline">
            Ingresar token →
          </RouterLink>

          <button
            type="button"
            class="btn-ghost"
            @click="showForgot = false; forgotStatus = ''"
          >
            ← Volver
          </button>
        </form>

      </Transition>
    </main>
  </div>
</template>

<style scoped>
/* ─── Variables ─────────────────────────────────────────────────── */
.login-shell {
  --c-bg: #090a0c;
  --c-surface: #0e1014;
  --c-border: #1a1f26;
  --c-border-focus: #36816a;
  --c-text: #c4cad4;
  --c-text-muted: #3e4855;
  --c-accent: #36816a;
  --c-accent-hover: #43a088;
  --c-accent-dim: rgba(54, 129, 106, 0.1);
  --c-error: #b83232;
  --c-success: #36816a;
  --font-mono: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
  --radius: 5px;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
}

/* ─── Shell ─────────────────────────────────────────────────────── */
.login-shell {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg);
  position: relative;
  overflow: hidden;
  font-family: var(--font-mono);
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(54, 129, 106, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(54, 129, 106, 0.035) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: radial-gradient(ellipse 90% 90% at 50% 50%, black 20%, transparent 100%);
}

.bg-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 55% 55% at 50% 50%, transparent 0%, var(--c-bg) 100%);
  pointer-events: none;
}

/* ─── Card ──────────────────────────────────────────────────────── */
.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 360px;
  padding: 2.25rem 1.875rem;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.02),
    0 24px 48px rgba(0, 0, 0, 0.6),
    0 0 60px rgba(54, 129, 106, 0.04);
  animation: card-in 380ms cubic-bezier(0.34, 1.46, 0.64, 1) both;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(18px) scale(0.975); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ─── Header ────────────────────────────────────────────────────── */
.login-header {
  text-align: center;
  margin-bottom: 1.875rem;
}

.logo-mark {
  width: 42px;
  height: 42px;
  margin: 0 auto 1rem;
  color: var(--c-accent);
  background: var(--c-accent-dim);
  border: 1px solid rgba(54, 129, 106, 0.2);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 9px;
}

.logo-mark svg { width: 100%; height: 100%; }

.login-title {
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  color: var(--c-text);
  margin: 0 0 0.25rem;
}

.login-subtitle {
  font-size: 0.68rem;
  color: var(--c-text-muted);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin: 0;
}

/* ─── Formulario ────────────────────────────────────────────────── */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.step-hint {
  font-size: 0.75rem;
  color: var(--c-text-muted);
  line-height: 1.65;
  margin: 0;
  padding: 0.7rem 0.8rem;
  border-left: 2px solid var(--c-border-focus);
  border-radius: 0 var(--radius) var(--radius) 0;
  background: rgba(54, 129, 106, 0.05);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.67rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--c-text-muted);
}

.field-input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  color: var(--c-text);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  outline: none;
  transition:
    border-color 150ms var(--ease),
    background 150ms var(--ease),
    box-shadow 150ms var(--ease);
  box-sizing: border-box;
}

.field-input::placeholder {
  color: var(--c-text-muted);
  opacity: 0.4;
}

.field-input:focus {
  border-color: var(--c-border-focus);
  background: rgba(54, 129, 106, 0.04);
  box-shadow: 0 0 0 3px rgba(54, 129, 106, 0.08);
}

/* ─── Mensajes ──────────────────────────────────────────────────── */
.form-error {
  font-size: 0.72rem;
  color: var(--c-error);
  margin: 0;
  padding: 0.5rem 0.7rem;
  background: rgba(184, 50, 50, 0.07);
  border: 1px solid rgba(184, 50, 50, 0.18);
  border-radius: var(--radius);
}

.form-success {
  font-size: 0.72rem;
  color: var(--c-success);
  margin: 0;
  padding: 0.5rem 0.7rem;
  background: rgba(54, 129, 106, 0.07);
  border: 1px solid rgba(54, 129, 106, 0.18);
  border-radius: var(--radius);
}

/* ─── Botones ───────────────────────────────────────────────────── */
.btn-primary {
  padding: 0.7rem 1rem;
  background: var(--c-accent);
  border: none;
  border-radius: var(--radius);
  color: #060708;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background 150ms var(--ease),
    transform 150ms var(--ease),
    opacity 150ms var(--ease);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
}

.btn-primary:hover:not(:disabled) {
  background: var(--c-accent-hover);
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-primary--outline {
  background: transparent;
  border: 1px solid var(--c-accent);
  color: var(--c-accent);
}

.btn-primary--outline:hover:not(:disabled) {
  background: var(--c-accent-dim);
  transform: translateY(-1px);
}

.btn-ghost {
  background: none;
  border: none;
  padding: 0.3rem;
  color: var(--c-text-muted);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  cursor: pointer;
  text-align: center;
  transition: color 150ms var(--ease);
  letter-spacing: 0.04em;
  text-decoration: none;
  display: block;
}

.btn-ghost:hover { color: var(--c-text); }

/* ─── Loading dots ──────────────────────────────────────────────── */
.btn-loading {
  display: flex;
  gap: 4px;
  align-items: center;
}

.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 1.1s ease-in-out infinite;
}

.dot:nth-child(2) { animation-delay: 0.18s; }
.dot:nth-child(3) { animation-delay: 0.36s; }

@keyframes pulse {
  0%, 80%, 100% { opacity: 0.15; transform: scale(0.75); }
  40%            { opacity: 1;   transform: scale(1); }
}

/* ─── Slide transition ──────────────────────────────────────────── */
.slide-enter-active,
.slide-leave-active {
  transition: all 220ms var(--ease);
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(14px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-14px);
}

/* ─── Mobile ────────────────────────────────────────────────────── */
@media (max-width: 420px) {
  .login-card {
    margin: 1rem;
    padding: 1.875rem 1.375rem;
    border-radius: 8px;
  }
}
</style>
