# `android/app/src/main/java/org/iinicia/android/data/local/SessionTokenStorage.kt`

**En una frase:** define el contrato (la "interfaz") de qué significa "guardar la sesión" en la app, y da una implementación simple en memoria que solo sirve para previews y pruebas, no para uso real.

## Por qué existe

El resto de la app (el `IiniciaRepositoryImpl`, el `MainViewModel`, el servicio de push) necesita poder decir "guarda este token" o "¿hay sesión activa?" sin saber **cómo** se guarda físicamente. Separar el contrato (`SessionTokenStorage`) de la implementación real (`EncryptedSessionTokenStorage`, en otro archivo) permite:

- Cambiar la forma de almacenamiento sin tocar el repositorio ni la UI.
- Usar una implementación falsa (`InMemorySessionTokenStorage`) en pruebas unitarias y en los `@Preview` de Compose, donde no existe un `Context` de Android real para `EncryptedSharedPreferences`.
- Dejar por escrito, en un solo lugar, las reglas de seguridad que CUALQUIER implementación debe cumplir.

## Recorrido del código

```kotlin
/**
 * Contrato de almacenamiento de sesión de IINICIA.
 *
 * Reglas de seguridad obligatorias:
 * - Prohibido almacenar contraseñas en texto plano.
 * - Solo se conserva el token JWT emitido por el BFF y los datos públicos del perfil.
 * - Ningún token de Moodle se almacena ni procesa en el dispositivo.
 */
interface SessionTokenStorage {
    fun getToken(): String?
    fun getUsuario(): Usuario?
    fun saveSession(token: String, usuario: Usuario)
    fun clearSession()

    fun notificacionesHabilitadas(): Boolean
    fun setNotificacionesHabilitadas(habilitadas: Boolean)
}
```

Este comentario no es decorativo: es la regla de oro del proyecto (ver `CLAUDE.md`: "Ningún token de Moodle en React ni en Android; solo en el backend"). Cualquier implementación de esta interfaz —presente o futura— tiene prohibido guardar la contraseña del usuario o un token de Moodle.

Los métodos de notificaciones (`notificacionesHabilitadas`/`setNotificacionesHabilitadas`) viven en esta misma interfaz aunque conceptualmente no son "sesión": es una preferencia del dispositivo, pero comparte el mismo almacenamiento físico (`EncryptedSharedPreferences`) así que se declara aquí para no crear una tercera clase solo para un booleano.

```kotlin
class InMemorySessionTokenStorage : SessionTokenStorage {
    @Volatile
    private var currentToken: String? = null

    @Volatile
    private var currentUsuario: Usuario? = null

    @Volatile
    private var notificacionesHabilitadas: Boolean = true
    ...
}
```

`@Volatile` evita condiciones de carrera si esta clase se llega a tocar desde más de un hilo a la vez (poco probable aquí, pero es la práctica correcta para un campo mutable que varios lugares podrían leer/escribir). Nótese que **no hay disco de por medio**: en cuanto el proceso de la app muere, todo se pierde. Por eso el comentario del archivo deja claro que es "solo para previews y pruebas unitarias": si se usara en producción, cerrar y abrir la app forzaría siempre un nuevo login.

## Conexión con el resto del sistema

- `IiniciaRepositoryImpl` (`data/repository/IiniciaRepository.kt`) depende de `SessionTokenStorage`, no de una implementación concreta, para poder leer/guardar el JWT y el `Usuario`.
- `MainActivity` decide en tiempo de ejecución cuál implementación inyectar: en la app real siempre pasa `EncryptedSessionTokenStorage`.
- `InMemorySessionTokenStorage` es el valor por defecto del parámetro `tokenStorage` en `IiniciaRepositoryImpl`, lo cual la hace conveniente para instanciar el repositorio en tests o `@Preview` sin un `Context`.

## Cosas que no son obvias a primera vista

- Esta interfaz es el único lugar donde está escrita, en forma de comentario, la regla "nunca Moodle, nunca password en texto plano". Cualquier cambio futuro a cómo se persiste la sesión debe seguir respetando ese contrato.
- `InMemorySessionTokenStorage` **no es un simulacro de red**: no habla con el backend, solo imita el guardado local. Quien decide si la app habla con datos simulados o reales es `IiniciaRepositoryImpl.isConnectToRemoteEnabled`, un parámetro distinto.
