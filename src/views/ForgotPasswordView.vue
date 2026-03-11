<script setup>
/**
 * @fileoverview Vista de recuperación de contraseña.
 * Siempre muestra el mismo mensaje (anti user-enumeration).
 */

import { ref } from 'vue'
import { authApi } from '../services/api.js'

const email = ref('')
const status = ref('')
const loading = ref(false)

async function submit() {
  loading.value = true
  try {
    await authApi.forgotPassword({ email: email.value })
  } finally {
    status.value = 'Si el email existe, recibirás un enlace de recuperación.'
    loading.value = false
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
        <p class="login-subtitle">recuperar acceso</p>
      </header>

      <form class="login-form" @submit.prevent="submit" novalidate>
        <p class="step-hint">
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        <div class="field">
          <label class="field-label" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="field-input"
            placeholder="tu@email.com"
            autocomplete="email"
            required
          />
        </div>

        <p v-if="status" class="form-success" role="status">{{ status }}</p>

        <button type="submit" class="btn-primary" :disabled="loading || !!status">
          <span v-if="!loading">Enviar enlace</span>
          <span v-else class="btn-loading" aria-label="Enviando">
            <span class="dot" /><span class="dot" /><span class="dot" />
          </span>
        </button>

        <RouterLink to="/login" class="btn-ghost">← Volver al login</RouterLink>
      </form>
    </main>
  </div>
</template>

<style scoped>
/* Reutiliza las mismas variables y estilos que LoginView */
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
  --c-success: #36816a;
  --font-mono: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
  --radius: 5px;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
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

.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 360px;
  padding: 2.25rem 1.875rem;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6), 0 0 60px rgba(54, 129, 106, 0.04);
  animation: card-in 380ms cubic-bezier(0.34, 1.46, 0.64, 1) both;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(18px) scale(0.975); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.login-header { text-align: center; margin-bottom: 1.875rem; }

.logo-mark {
  width: 42px; height: 42px;
  margin: 0 auto 1rem;
  color: var(--c-accent);
  background: var(--c-accent-dim);
  border: 1px solid rgba(54, 129, 106, 0.2);
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  padding: 9px;
}

.logo-mark svg { width: 100%; height: 100%; }

.login-title {
  font-size: 1.375rem; font-weight: 700; letter-spacing: -0.04em;
  color: var(--c-text); margin: 0 0 0.25rem;
}

.login-subtitle {
  font-size: 0.68rem; color: var(--c-text-muted);
  letter-spacing: 0.14em; text-transform: uppercase; margin: 0;
}

.login-form { display: flex; flex-direction: column; gap: 1rem; }

.step-hint {
  font-size: 0.75rem; color: var(--c-text-muted); line-height: 1.65; margin: 0;
  padding: 0.7rem 0.8rem;
  border-left: 2px solid var(--c-border-focus);
  border-radius: 0 var(--radius) var(--radius) 0;
  background: rgba(54, 129, 106, 0.05);
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

.form-success {
  font-size: 0.72rem; color: var(--c-success); margin: 0;
  padding: 0.5rem 0.7rem;
  background: rgba(54, 129, 106, 0.07);
  border: 1px solid rgba(54, 129, 106, 0.18);
  border-radius: var(--radius);
}

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

.btn-ghost {
  background: none; border: none; padding: 0.3rem;
  color: var(--c-text-muted); font-family: var(--font-mono); font-size: 0.7rem;
  cursor: pointer; text-align: center; text-decoration: none; display: block;
  transition: color 150ms var(--ease); letter-spacing: 0.04em;
}

.btn-ghost:hover { color: var(--c-text); }

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
