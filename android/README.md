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
- **`DashboardScreen` (`dashboard`):** `"Bienvenido"` + rol, y la lista real de cursos (`GET /estudiante/cursos`, sincronizada con Moodle). Distingue cargando / error (con botón "Reintentar") / vacío de verdad — un fallo de red nunca se ve igual que "no tienes cursos". Botón de perfil y cierre de sesión con confirmación.
- **`DetalleCursoScreen` (`curso/{cursoId}`):** Info básica del curso (Moodle no expone más en este endpoint, no se inventa nada) y el botón **"Entrar al Campus"**.
- **`PerfilScreen` (`perfil`):** Nombre/correo/rol del usuario autenticado, sin otra llamada de red.

### SSO "Entrar al Campus"

Pide una URL de login de un solo uso al backend (`GET /estudiante/moodle-sso`, mismo mecanismo `auth_userkey` que usa el portal web — ver `infrastructure/README.md`) y la abre con **Chrome Custom Tabs** (`androidx.browser`), no con un `Intent.ACTION_VIEW` genérico: así se queda dentro de la experiencia de la app (barra con los colores de IINICIA, botón "X" para volver), en vez de saltar al navegador por separado. No es un WebView embebido de todo Moodle — eso lo pide explícitamente evitar la sección 9 de requerimientos.

**Para probarlo desde el emulador** hace falta un paso extra de red que no aplica a nada más de la app: Moodle devuelve esa URL con su propio `wwwroot` (`http://localhost:8080`, correcto para el navegador de tu PC), pero dentro del emulador `localhost` apunta al propio emulador, no a tu PC donde corre Moodle. Redirige ese puerto una vez por sesión del emulador:

```bash
adb reverse tcp:8080 tcp:8080
```

(En un dispositivo físico esto no aplica igual — ahí el problema sería que `localhost:8080` tampoco es alcanzable desde la red del teléfono; en producción no existe este problema porque Moodle vive en un dominio real, no en `localhost`.)

## Ejecución y Pruebas

Abrir la carpeta `android/` en **Android Studio** y ejecutar en un emulador o dispositivo físico, o bien desde terminal:

```bash
./gradlew testDebugUnitTest assembleDebug
```

- **Dispositivo físico:** `10.0.2.2` (el default de `API_BASE_URL`) solo funciona en el emulador. Agrega `apiBaseUrl=http://TU-IP-DE-RED:3001/` a `android/local.properties` (gitignored, es por máquina) para apuntar al backend desde un teléfono real.
- **Pantalla negra en el emulador (no es crash):** en algunas máquinas el modo de GPU `auto` del AVD renderiza todo en negro con Jetpack Compose. Cambia el AVD a software: Device Manager → tu AVD → Edit → Graphics: "Software - GLES 2.0" (o lanza con `-gpu swiftshader_indirect`).
