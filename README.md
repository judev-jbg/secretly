# Secretly - Un gestor de secretos seguro y fácil de usar

Secretly es una aplicación de gestión de secretos con el principio Zero-Knowledge diseñada para almacenar y proteger información sensible. Utiliza cifrado AES-256-GCM con una clave derivada de la contraseña del usuario mediante Argon2id, garantizando que los datos estén protegidos incluso si el servidor es comprometido.

## Estructura de componentes Vue

```bash
src/
├── main.js
├── App.vue                        ← monta activityMonitor si está autenticado
│
├── crypto/
│   └── vault.js                   ← Argon2id + AES-256-GCM, sin dependencias Vue
│
├── composables/
│   ├── useActivityMonitor.js      ← lógica del timer de inactividad
│   ├── usePinVerification.js      ← flujo PIN + frase reutilizable
│   └── useClipboard.js            ← copiar al portapapeles con feedback
│
├── stores/
│   ├── auth.js                    ← JWT, email, estado de sesión
│   ├── crypto.js                  ← encryption_key en memoria
│   └── secrets.js                 ← lista de secretos (metadatos)
│
├── views/
│   ├── LoginView.vue
│   ├── ForgotPasswordView.vue
│   ├── ResetPasswordView.vue
│   └── VaultView.vue
│
└── components/
    ├── SecretCard.vue             ← card individual (lista o grilla)
    ├── SecretGrid.vue             ← layout grilla
    ├── SecretList.vue             ← layout lista
    ├── BottomSheet.vue            ← contenedor genérico animado
    ├── SecretDetail.vue           ← contenido del bottom sheet
    ├── PinModal.vue               ← modal reutilizable PIN/frase
    ├── SecretField.vue            ← input password + reveal + copy
    ├── CountdownBar.vue           ← barra de 60s visible
    └── FabButton.vue              ← botón flotante nuevo secreto
```
