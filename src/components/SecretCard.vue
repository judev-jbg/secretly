<script setup>
/**
 * @fileoverview Card de secreto para el vault.
 * Solo muestra alias e icono de tipo — nunca datos sensibles.
 * Soporta layout "list" y "grid".
 */

/** @typedef {'token'|'database'|'login'|'ssh'|'api_key'} SecretType */

const props = defineProps({
  /** @type {{ id: string, alias: string, secret_type: SecretType }} */
  secret: {
    type: Object,
    required: true,
  },
  /** @type {'list'|'grid'} */
  layout: {
    type: String,
    default: 'list',
  },
})

/** Mapeo de tipo a icono SVG path (formato { paths, viewBox }) */
const TYPE_ICONS = {
  token: {
    viewBox: '0 0 24 24',
    paths: ['M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', 'M7 7h.01'],
  },
  database: {
    viewBox: '0 0 24 24',
    paths: ['M12 2C6.48 2 2 3.79 2 6v12c0 2.21 4.48 4 10 4s10-1.79 10-4V6c0-2.21-4.48-4-10-4z', 'M2 6c0 2.21 4.48 4 10 4s10-1.79 10-4', 'M2 12c0 2.21 4.48 4 10 4s10-1.79 10-4'],
  },
  login: {
    viewBox: '0 0 24 24',
    paths: ['M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4', 'M10 17l5-5-5-5', 'M15 12H3'],
  },
  ssh: {
    viewBox: '0 0 24 24',
    paths: ['M4 17l6-6-6-6', 'M12 19h8'],
  },
  api_key: {
    viewBox: '0 0 24 24',
    paths: ['M18 8h1a4 4 0 0 1 0 8h-1', 'M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z', 'M6 1v3', 'M10 1v3', 'M14 1v3'],
  },
}

/** Etiquetas legibles por tipo */
const TYPE_LABELS = {
  token: 'Token',
  database: 'Database',
  login: 'Login',
  ssh: 'SSH',
  api_key: 'API Key',
}

const icon = TYPE_ICONS[props.secret.secret_type] ?? TYPE_ICONS.token
const label = TYPE_LABELS[props.secret.secret_type] ?? props.secret.secret_type
</script>

<template>
  <article
    :class="['secret-card', `secret-card--${layout}`]"
    role="listitem"
    tabindex="0"
    @keydown.enter="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <div class="card-icon">
      <svg :viewBox="icon.viewBox" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path v-for="(p, i) in icon.paths" :key="i" :d="p" />
      </svg>
    </div>

    <div class="card-body">
      <span class="card-alias">{{ secret.alias }}</span>
      <span class="card-type">{{ label }}</span>
    </div>

    <div class="card-arrow">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  </article>
</template>

<style scoped>
.secret-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--c-surface, #0e1014);
  border: 1px solid var(--c-border, #1a1f26);
  border-radius: 5px;
  cursor: pointer;
  transition: border-color 150ms, background 150ms, transform 120ms;
  animation: card-in 260ms cubic-bezier(0.34, 1.46, 0.64, 1) both;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.secret-card:hover {
  border-color: var(--c-border-focus, #36816a);
  background: rgba(54, 129, 106, 0.04);
}

.secret-card:active { transform: scale(0.99); }

/* ─── List layout ─────────────────────────────── */

.secret-card--list {
  padding: 0.75rem 0.875rem;
  flex-direction: row;
}

.secret-card--list .card-alias {
  font-size: 0.83rem; font-weight: 600; letter-spacing: -0.01em;
  color: var(--c-text, #c4cad4);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.secret-card--list .card-type {
  font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--c-text-muted, #3e4855);
}

.secret-card--list .card-body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
  min-width: 0;
}

.secret-card--list .card-arrow {
  color: var(--c-text-muted, #3e4855);
  flex-shrink: 0;
  transition: color 150ms;
}
.secret-card--list .card-arrow svg { width: 14px; height: 14px; }
.secret-card--list:hover .card-arrow { color: var(--c-accent, #36816a); }

/* ─── Grid layout ─────────────────────────────── */

.secret-card--grid {
  padding: 1rem 0.875rem 0.875rem;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.secret-card--grid .card-body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  width: 100%;
}

.secret-card--grid .card-alias {
  font-size: 0.78rem; font-weight: 600; letter-spacing: -0.01em;
  color: var(--c-text, #c4cad4);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.secret-card--grid .card-type {
  font-size: 0.6rem; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--c-text-muted, #3e4855);
}

.secret-card--grid .card-arrow { display: none; }

/* ─── Icono ───────────────────────────────────── */

.card-icon {
  flex-shrink: 0;
  width: 30px; height: 30px;
  background: var(--c-accent-dim, rgba(54,129,106,0.1));
  border: 1px solid rgba(54, 129, 106, 0.15);
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  color: var(--c-accent, #36816a);
  padding: 6px;
}

.secret-card--grid .card-icon {
  width: 34px; height: 34px;
}

.card-icon svg { width: 100%; height: 100%; }
</style>
