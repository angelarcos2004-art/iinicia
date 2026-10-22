# IINICIA — Aplicación Android (Primer Avance)

Aplicación nativa Android desarrollada con **Kotlin + Jetpack Compose** para el ecosistema universitario **IINICIA**.

## Arquitectura y Reglas de Seguridad

- **Capas:** `UI (Jetpack Compose)` → `ViewModel (StateFlow)` → `Repository` → `Cliente HTTP (Retrofit 2 + OkHttp)`.
- **BFF (Backend for Frontend):** La aplicación apunta al backend NestJS de IINICIA (`BuildConfig.API_BASE_URL`, por defecto `http://10.0.2.2:3001/` para conexión desde el emulador Android).
- **Cero tokens de Moodle en Android:** Ningún token administrativo o de servicio web de Moodle existe ni se procesa en la app móvil.
- **Seguridad de credenciales y sesión:** Prohibido almacenar contraseñas en texto plano o cifradas. La sesión se persiste mediante `EncryptedSessionTokenStorage` (`androidx.security:security-crypto` / `EncryptedSharedPreferences` con Android Keystore `AES256_SIV` y `AES256_GCM`), guardando únicamente el JWT de sesión y los datos públicos de `Usuario`.

## Identidad Visual Institucional

Configurada en `ui/theme/Color.kt` y `ui/theme/Theme.kt`:
- **Primario (Azul marino):** `#0B2A5B`
- **Secundario (Azul):** `#1E5AA8`
- **Acento (Ámbar):** `#F2A900`

## Navegación y Pantallas

- **`LoginScreen` (`login`):** Campos de correo institucional y contraseña con validación de formato en el cliente (mínimo 8 caracteres), conexión real a `POST /auth/login` y parseo nativo de mensajes de error JSON (`{ "message": "..." }`) del backend.
- **`DashboardScreen` (`dashboard`):** Pantalla placeholder del estudiante con encabezado `"Bienvenido"`, lista vacía de cursos (`emptyList()`) y cierre de sesión que limpia `EncryptedSharedPreferences`.

## Ejecución y Pruebas

Abrir la carpeta `android/` en **Android Studio** y ejecutar en un emulador o dispositivo físico, o bien desde terminal:

```bash
./gradlew testDebugUnitTest assembleDebug
```
