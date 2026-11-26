# `android/app/src/main/java/org/iinicia/android/data/remote/IiniciaApiService.kt`

**En una frase:** es el contrato HTTP completo entre la app Android y el backend: cada función aquí es exactamente un endpoint del BFF (Backend for Frontend) de IINICIA.

## Por qué existe

Retrofit funciona generando una implementación real de una interfaz anotada: cada función con `@GET`/`@POST`/`@PATCH` se convierte en una llamada HTTP de verdad. Declarar aquí, en un solo archivo, todos los endpoints que la app puede llamar le da a cualquier persona que lea el código un mapa completo y preciso de "todo lo que la app Android puede pedirle al backend" — ni más, ni menos. Esto también hace cumplir la regla arquitectónica del proyecto: Android nunca habla directo con Moodle, solo con este backend intermedio.

## Recorrido del código

```kotlin
/** Primer factor: no entrega el token todavía, el backend manda el código por correo. */
@POST("auth/login")
suspend fun login(@Body request: LoginRequest): Requiere2FAResponse

/** Segundo factor: el código de 6 dígitos que llegó al correo. */
@POST("auth/login/verificar")
suspend fun verificar2FA(@Body request: Verificar2FARequest): AuthResponse
```

El login está partido en dos llamadas porque el sistema usa autenticación de dos factores (ver `MEMORY.md`: "Migración login Google → 2FA"). La primera función manda correo+contraseña y el backend responde solo confirmando que mandó un código por correo (`Requiere2FAResponse`), sin entregar ningún JWT todavía. Recién la segunda función, con el código de 6 dígitos, devuelve el `AuthResponse` con el token real. Separar esto en dos funciones (en vez de una sola con un parámetro opcional de "código") hace explícito en el tipo de retorno que el primer paso **nunca** puede dar acceso por sí solo.

```kotlin
@GET("estudiante/cursos")
suspend fun getCursos(): List<CursoInscritoDto>

@GET("estudiante/actividades")
suspend fun getActividadesProximas(): List<ActividadProximaDto>
```

Todas las funciones son `suspend`: son corutinas de Kotlin, pensadas para llamarse desde `viewModelScope.launch { }` en el `MainViewModel` sin bloquear el hilo principal de la UI mientras se espera la respuesta de red.

```kotlin
/**
 * URL de un solo uso para entrar a Moodle ya autenticado (SSO vía auth_userkey, ver
 * `backend/src/moodle/moodle.service.ts`), sin pedir una segunda contraseña. Expira en
 * segundos: se abre de inmediato en el navegador del dispositivo, nunca se guarda.
 */
@GET("estudiante/moodle-sso")
suspend fun getMoodleSsoUrl(
    @Query("cursoId") cursoId: Int? = null,
    @Query("actividadUrl") actividadUrl: String? = null
): MoodleSsoResponse
```

Este endpoint es el único punto de contacto (indirecto) con Moodle desde Android, y aun así nunca toca un token de servicio de Moodle: el backend genera una URL de un solo uso (patrón `auth_userkey` de Moodle) que ya lleva la autenticación embebida y expira casi de inmediato. La app solo recibe esa URL y la abre; nunca ve ni guarda ninguna credencial de Moodle. Los dos parámetros opcionales (`cursoId`/`actividadUrl`) permiten pedir "entra al curso X" o "entra directo a esta actividad específica dentro de un curso".

```kotlin
/** Registra (o reemplaza) el token FCM del dispositivo actual, para notificaciones push. */
@PATCH("estudiante/push-token")
suspend fun registrarPushToken(@Body request: RegistrarPushTokenRequest)
```

Es `PATCH` y no `POST` porque conceptualmente se está actualizando un campo del registro del estudiante (su token de push vigente), no creando un recurso nuevo cada vez — el backend simplemente sobrescribe el token anterior con el nuevo.

## Conexión con el resto del sistema

- `RetrofitClient.createApiService` es quien genera la implementación real de esta interfaz.
- `IiniciaRepositoryImpl` es el único consumidor: todas las llamadas de red de la app pasan por aquí, nunca directo desde un `ViewModel` o una pantalla.
- Los tipos de los parámetros y retornos (`LoginRequest`, `AuthResponse`, `CursoInscritoDto`, etc.) están definidos en `data/model/Models.kt`.
- `getMoodleSsoUrl` conecta indirectamente con `backend/src/moodle/moodle.service.ts` (fuera del scope de Android, pero documentado en el comentario del propio código para quien necesite rastrear el flujo completo).

## Cosas que no son obvias a primera vista

- Esta lista de funciones es, literalmente, la lista completa de endpoints que Android puede alcanzar. Si un endpoint del backend no está declarado aquí, la app Android no puede llamarlo — es una barrera de diseño, no solo documentación.
- `login` nunca devuelve un token: es fácil asumir por el nombre que "login" = "ya hay sesión", pero aquí específicamente no es así por el 2FA.
- No existe ninguna función que reciba o envíe algo relacionado con Moodle directamente (usuario, contraseña o token de servicio web de Moodle): todo pasa por el backend, que es el único que tiene esas credenciales (ver `backend/.env`).
