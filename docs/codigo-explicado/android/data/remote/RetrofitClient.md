# `android/app/src/main/java/org/iinicia/android/data/remote/RetrofitClient.kt`

**En una frase:** construye el cliente HTTP (Retrofit + OkHttp) que la app usa para hablar con el backend, incluyendo el interceptor que añade el JWT a cada petición y el que filtra qué se escribe en los logs.

## Por qué existe

Retrofit necesita que alguien lo configure: URL base, tiempos de espera, cómo convertir JSON a objetos Kotlin, y qué hacer con cada petición antes de enviarla (como agregar el header de autenticación). En vez de repetir esa configuración en cada lugar que necesite hacer una llamada de red, `RetrofitClient` la construye una sola vez, de forma parametrizable, y devuelve directamente la interfaz `IiniciaApiService` ya lista para usar.

## Recorrido del código

```kotlin
    fun createApiService(
        baseUrl: String = ApiConfig.DEFAULT_BASE_URL,
        tokenProvider: () -> String? = { null }
    ): IiniciaApiService {
```

`tokenProvider` es una función, no un valor directo: recibe `() -> String?` en vez de un `String?` fijo. Esto es clave porque el JWT puede cambiar durante la vida de la app (login, logout, expiración). Si se pasara el token como un valor congelado al momento de crear el cliente, un logout posterior nunca se reflejaría en las peticiones siguientes. Al pasar una función, cada petición llama a `tokenProvider()` en el momento exacto en que se envía, así que siempre lee el token más reciente (en la práctica, `{ tokenStorage.getToken() }` desde `IiniciaRepositoryImpl`).

```kotlin
        val authInterceptor = Interceptor { chain ->
            val token = tokenProvider()
            val requestBuilder = chain.request().newBuilder()
                .header("Accept", "application/json")
            if (!token.isNullOrBlank()) {
                requestBuilder.header("Authorization", "Bearer $token")
            }
            chain.proceed(requestBuilder.build())
        }
```

Un `Interceptor` de OkHttp se ejecuta en TODAS las peticiones que pasan por este cliente, sin que cada llamada en `IiniciaApiService` tenga que preocuparse de poner el header manualmente. Si no hay token (usuario no autenticado, como en `login`/`registro`), simplemente no se agrega `Authorization` — el backend decide qué endpoints lo requieren.

```kotlin
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            // Bloquea encabezados sensibles en logs (Requerimiento 16 / 9.3)
            redactHeader("Authorization")
            redactHeader("Cookie")
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BASIC
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
```

Este interceptor imprime las peticiones en Logcat para depuración, pero con dos cuidados de seguridad deliberados: `redactHeader("Authorization")` y `redactHeader("Cookie")` hacen que, aunque el logging esté activo, el JWT nunca aparezca en texto plano en los logs (donde cualquier herramienta de diagnóstico del dispositivo podría leerlo). Además, el nivel de detalle (`BASIC`) solo se activa en builds de depuración (`BuildConfig.DEBUG`); en una build de producción (`release`) el logging se apaga por completo (`Level.NONE`), para no exponer tráfico de red a quien inspeccione un APK instalado.

```kotlin
        val okHttpClient = OkHttpClient.Builder()
            .connectTimeout(ApiConfig.CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(ApiConfig.READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .build()

        return Retrofit.Builder()
            .baseUrl(normalizedUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(IiniciaApiService::class.java)
```

El orden de `addInterceptor` importa: `authInterceptor` corre antes, agregando el header; `loggingInterceptor` corre después, y como es el último antes de que la petición salga, puede loguear la petición ya completa (con el header de Authorization, que luego oculta al imprimir). `GsonConverterFactory` es lo que traduce automáticamente entre JSON y las `data class` de `data/model/Models.kt`. La llamada final `.create(IiniciaApiService::class.java)` es la magia de Retrofit: genera en tiempo de ejecución una implementación de la interfaz `IiniciaApiService` que realmente hace las peticiones HTTP.

## Conexión con el resto del sistema

- Usa `ApiConfig` para la URL base, los timeouts y la normalización de la URL.
- Produce una instancia de `IiniciaApiService` (`data/remote/IiniciaApiService.kt`).
- `IiniciaRepositoryImpl` es quien lo invoca, pasándole `tokenProvider = { tokenStorage.getToken() }`, conectando así el almacenamiento cifrado de sesión con cada petición de red.

## Cosas que no son obvias a primera vista

- El `redactHeader` sobre `Authorization` y `Cookie` es una decisión de seguridad explícita, no un descuido: significa que ni en modo debug con logging activado se puede ver el JWT completo en Logcat.
- En producción (`BuildConfig.DEBUG == false`) no hay ningún log de red: esto facilita depurar en desarrollo pero reduce la superficie de información expuesta en manos de un usuario final.
- Como el token se lee con una función (`tokenProvider`) y no un valor fijo, un mismo `IiniciaApiService` sigue siendo válido durante todo el ciclo de vida de la app, incluso después de cerrar sesión y volver a iniciarla con otra cuenta: no hay que reconstruir el cliente Retrofit en cada cambio de sesión.
