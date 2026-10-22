# IINICIA — Aplicación Android (Primer Avance)

Aplicación nativa Android desarrollada con **Kotlin + Jetpack Compose** para el ecosistema universitario **IINICIA**.

## Arquitectura y Reglas de Seguridad

- **Capas:** `UI (Jetpack Compose)` → `ViewModel (StateFlow)` → `Repository` → `Cliente HTTP (Retrofit 2 + OkHttp)`.
- **BFF (Backend for Frontend):** La aplicación apunta al backend NestJS de IINICIA (`BuildConfig.API_BASE_URL`, por defecto `http://localhost:3000/api/`).
- **Cero tokens de Moodle en Android:** Ningún token administrativo o de servicio web de Moodle existe ni se procesa en la app móvil.
- **Seguridad de credenciales:** Prohibido almacenar contraseñas en texto plano. Se incluye el contrato `SessionTokenStorage` con los marcadores `TODO(Seguridad - Login Real)` para conectar `EncryptedSharedPreferences` / `DataStore` cifrado con Android Keystore cuando el login real del backend esté disponible.

## Identidad Visual Institucional

Configurada en `ui/theme/Color.kt` y `ui/theme/Theme.kt`:
- **Primario (Azul marino):** `#0B2A5B`
- **Secundario (Azul):** `#1E5AA8`
- **Acento (Ámbar):** `#F2A900`

## Navegación y Pantallas (Fase 4)

- **`LoginScreen` (`login`):** Campos de correo institucional y contraseña con validación de formato en el cliente y simulación de inicio de sesión exitoso hacia el `MainViewModel`.
- **`DashboardScreen` (`dashboard`):** Pantalla placeholder del estudiante con encabezado `"Bienvenido"`, lista vacía de cursos (`emptyList()`) y cierre de sesión.

## Ejecución y Pruebas

Abrir la carpeta `android/` en **Android Studio** y ejecutar en un emulador o dispositivo físico, o bien desde terminal:

```bash
./gradlew testDebugUnitTest assembleDebug
```
