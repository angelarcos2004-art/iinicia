# `android/app/src/main/java/org/iinicia/android/data/local/EncryptedSessionTokenStorage.kt`

**En una frase:** guarda el JWT de sesión y el perfil del usuario en disco, cifrados con AES-256 usando una llave que vive en el Android Keystore, nunca en texto plano.

## Por qué existe

Cuando el usuario cierra la app y la vuelve a abrir, se espera que siga con la sesión iniciada (nadie quiere escribir su contraseña cada vez). Eso obliga a guardar el JWT en algún lugar persistente del dispositivo. Pero un `SharedPreferences` normal se guarda como un archivo XML plano dentro del almacenamiento de la app — en un dispositivo rooteado, o si alguien hace un backup/extracción, ese archivo se puede leer directo. Como el JWT es lo único que hace falta para suplantar a un usuario frente al backend (ver `CLAUDE.md`: "los permisos se validan en el backend"), guardarlo así sería un riesgo de seguridad real. `EncryptedSharedPreferences` (parte de Jetpack Security) resuelve esto cifrando tanto las claves como los valores con una llave maestra que el propio sistema operativo protege en el Android Keystore — ni siquiera este código ve la llave en texto plano.

## Recorrido del código

```kotlin
private const val PREFS_NAME = "iinicia_session"
private const val KEY_TOKEN = "token"
private const val KEY_USUARIO_JSON = "usuario_json"
private const val KEY_NOTIFICACIONES_HABILITADAS = "notificaciones_habilitadas"
```

Son simplemente los nombres de archivo y de claves dentro de ese archivo. Están como constantes de módulo (no dentro de la clase) para que ningún otro archivo del proyecto pueda referenciarlas por accidente ni duplicarlas con un typo.

```kotlin
class EncryptedSessionTokenStorage(context: Context) : SessionTokenStorage {
    private val gson = Gson()

    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        PREFS_NAME,
        MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC),
        context.applicationContext,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )
```

`MasterKeys.getOrCreate(...)` es la parte clave: la primera vez que se ejecuta, genera una llave AES-256 y la guarda en el Android Keystore (un almacén de hardware/sistema aislado del resto de la app). Las siguientes veces, la recupera en vez de crear otra. `EncryptedSharedPreferences.create(...)` usa esa llave para cifrar:

- Las **claves** del archivo (`AES256_SIV`) — así ni siquiera se puede ver qué campos existen sin la llave.
- Los **valores** (`AES256_GCM`) — el contenido real (el JWT, el JSON del usuario).

`context.applicationContext` (no el `context` de la Activity que lo llamó) evita quedarse con una referencia a una Activity que podría destruirse, lo cual causaría una fuga de memoria.

```kotlin
    override fun getUsuario(): Usuario? =
        prefs.getString(KEY_USUARIO_JSON, null)?.let { json ->
            runCatching { gson.fromJson(json, Usuario::class.java) }.getOrNull()
        }
```

El `Usuario` no tiene un slot propio por campo (nombre, correo, rol...): se serializa entero a JSON con Gson y se guarda como un solo string. Es más simple que mapear cada campo a su propia clave, y como es un objeto pequeño no hay ganancia real en desglosarlo. `runCatching { }.getOrNull()` evita que un JSON corrupto (p. ej. de una versión vieja de la app con un modelo distinto) tire la app entera: si no se puede parsear, simplemente se comporta como si no hubiera sesión guardada.

```kotlin
    override fun saveSession(token: String, usuario: Usuario) {
        prefs.edit {
            putString(KEY_TOKEN, token)
            putString(KEY_USUARIO_JSON, gson.toJson(usuario))
        }
    }
```

Nótese qué **no** se guarda aquí: la contraseña del usuario nunca llega a este método, y no existe ningún campo para un token de Moodle. Esto es consistente con la regla del proyecto: Android solo conoce el JWT propio de IINICIA.

```kotlin
    override fun clearSession() {
        // Solo la sesión: notificacionesHabilitadas es una preferencia del dispositivo, no de
        // quién tiene sesión iniciada, así que no se borra al cerrar sesión.
        prefs.edit {
            remove(KEY_TOKEN)
            remove(KEY_USUARIO_JSON)
        }
    }
```

Cerrar sesión borra el token y el usuario, pero deliberadamente **no** toca la preferencia de notificaciones: si el usuario desactivó los avisos push, eso debe seguir desactivado aunque cierre sesión y otra persona (o él mismo) vuelva a entrar en ese mismo dispositivo más tarde — es una preferencia del teléfono, no de la cuenta.

## Conexión con el resto del sistema

- Implementa `SessionTokenStorage` (`data/local/SessionTokenStorage.kt`), así que todo lo que use esa interfaz (el repositorio, el servicio de push) puede recibir esta implementación sin saber que hay cifrado de por medio.
- `MainActivity` es quien la instancia y la inyecta en `IiniciaRepositoryImpl` — es la única implementación real usada en la app en ejecución.
- `IiniciaFirebaseMessagingService` también la instancia directamente (no recibe el repositorio por constructor, porque un `FirebaseMessagingService` lo crea el sistema, no `MainActivity`) para revisar si hay sesión y si las notificaciones están habilitadas.

## Cosas que no son obvias a primera vista

- El cifrado es simétrico y la llave vive en el Keystore del propio dispositivo: esto protege contra "alguien lee el archivo de la app", pero no contra "alguien tiene el teléfono desbloqueado y usa la app normalmente". No es un sustituto de un buen bloqueo de pantalla.
- Si en el futuro se migra de `MasterKeys`/`EncryptedSharedPreferences` (API marcada como en mantenimiento por Google, a favor de Jetpack Security más reciente), el contrato `SessionTokenStorage` no tendría que cambiar: solo esta clase.
- `KEY_NOTIFICACIONES_HABILITADAS` por defecto es `true` (`getBoolean(KEY_NOTIFICACIONES_HABILITADAS, true)`), es decir, las notificaciones llegan habilitadas desde la primera instalación salvo que el usuario las apague explícitamente en `PerfilScreen`.
