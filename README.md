# Secretly

Gestor de secretos Zero-Knowledge. Cifrado AES-256-GCM con clave derivada localmente via Argon2id — el servidor nunca ve datos en claro.

**Frontend:** [secretly-two.vercel.app](https://secretly-two.vercel.app/) · **API:** Railway

---

## Stack

- **Frontend:** Vue 3 + Vite, Pinia, Vue Router — desplegado en Vercel
- **Backend:** FastAPI + PostgreSQL — desplegado en Railway
- **Crypto:** hash-wasm (Argon2id) + WebCrypto API (AES-256-GCM)

## Variables de entorno

| Variable       | Descripción          | Ejemplo                                   |
| -------------- | -------------------- | ----------------------------------------- |
| `VITE_API_URL` | URL base del backend | `https://secretly-api.up.railway.app/api` |

Configurar en **Vercel → Settings → Environment Variables**.

## Desarrollo local

```bash
npm install
echo "VITE_API_URL=http://localhost:8000/api" > .env
npm run dev
```

## Estructura

```
src/
├── main.js
├── App.vue                        ← monta activityMonitor si está autenticado
│
├── crypto/
│   └── vault.js                   ← Argon2id + AES-256-GCM, sin dependencias Vue
│
├── composables/
│   ├── useActivityMonitor.js      ← timer de inactividad (60s → destruye sesión)
│   ├── useBackendHealth.js        ← polling /health, expone isOnline
│   ├── usePinVerification.js      ← flujo PIN + frase reutilizable
│   └── useClipboard.js            ← copiar al portapapeles con feedback
│
├── stores/
│   ├── auth.js                    ← JWT, email, estado de sesión
│   ├── crypto.js                  ← encryption_key en memoria RAM
│   └── secrets.js                 ← lista de secretos (metadatos)
│
├── views/
│   ├── LoginView.vue              ← login + recuperación de contraseña inline
│   ├── RegisterView.vue
│   ├── ResetPasswordView.vue
│   ├── VaultView.vue
│   └── NewSecretView.vue
│
└── components/
    ├── SecretCard.vue             ← card individual (lista o grilla)
    ├── SecretGrid.vue
    ├── SecretList.vue
    ├── BottomSheet.vue
    ├── SecretDetail.vue           ← contenido del bottom sheet con reveal + timer
    ├── PinModal.vue               ← modal reutilizable PIN/frase
    ├── SecretField.vue            ← input password + reveal + copy
    ├── CountdownBar.vue           ← barra de 60s visible
    └── FabButton.vue              ← botón flotante nuevo secreto
```

## Seguridad

- `encryption_key` nunca sale del navegador ni se persiste en disco
- Inactividad 60s → sesión destruida automáticamente
- Máx. 3 intentos de PIN por bottom sheet
- Tokens de reset expiran en 15 minutos
