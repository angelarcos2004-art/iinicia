# `android/app/src/main/java/org/iinicia/android/data/remote/ApiConfig.kt`

**En una frase:** centraliza la URL base del backend y los tiempos de espera de red, para que no estén repetidos (y potencialmente desincronizados) en varios archivos.

## Por qué existe

Varias partes del código necesitan saber "a dónde le hablamos" (`RetrofitClient`, `IiniciaRepositoryImpl`) y "cuánto esperamos antes de rendirnos" en una petición HTTP. Si cada archivo tuviera su propio literal `"http://10.0.2.2:3001/"` o su propio `10L` de timeout, cambiar el backend de entorno (desarrollo → producción) implicaría buscar y reemplazar en varios lugares, con riesgo de dejar uno desactualizado. `ApiConfig` es el único lugar donde vive esa configuración.

## Recorrido del código

```kotlin
object ApiConfig {
    /**
     * URL base configurable (por defecto `http://10.0.2.2:3001/` desde BuildConfig
     * para conectar desde el emulador Android al localhost de la máquina host).
     */
    const val DEFAULT_BASE_URL: String = BuildConfig.API_BASE_URL
```

`10.0.2.2` es una dirección especial que solo existe dentro del emulador de Android Studio: apunta al `localhost` de la máquina donde corre el emulador. Es necesaria porque, desde la perspectiva del emulador, `127.0.0.1`/`localhost` sería él mismo, no la máquina anfitriona donde corre el backend NestJS en desarrollo. El valor real viene de `BuildConfig.API_BASE_URL`, es decir, se define en la configuración de Gradle (por variante de build), no aquí — así se puede apuntar a otra URL en una build de "release" sin tocar código Kotlin.

```kotlin
    const val CONNECT_TIMEOUT_SECONDS: Long = 10L
    const val READ_TIMEOUT_SECONDS: Long = 15L
```

Son límites de paciencia para OkHttp: 10 segundos para establecer la conexión TCP, 15 para esperar la respuesta completa una vez conectado. Sin esto, una red lenta o un backend colgado dejaría la app esperando indefinidamente con el spinner de carga sin fin.

```kotlin
    fun normalizeBaseUrl(rawUrl: String): String {
        val trimmed = rawUrl.trim()
        require(trimmed.isNotEmpty()) { "La baseUrl no puede estar vacía" }
        return if (trimmed.endsWith("/")) trimmed else "$trimmed/"
    }
}
```

Retrofit **exige** que la `baseUrl` termine en `/`, o lanza una excepción al construir el cliente. Esta función es una pequeña salvaguarda: si alguien configura la URL sin el `/` final (fácil de olvidar), se corrige aquí en vez de que la app crashee al iniciar. `require(...)` además deja un mensaje claro si alguien pasa una URL vacía por error.

## Conexión con el resto del sistema

- `RetrofitClient.createApiService` usa `DEFAULT_BASE_URL`, `CONNECT_TIMEOUT_SECONDS`, `READ_TIMEOUT_SECONDS` y `normalizeBaseUrl` para armar el cliente HTTP real.
- `IiniciaRepositoryImpl.baseUrl` también usa `ApiConfig.DEFAULT_BASE_URL` como valor por defecto, y ese valor termina expuesto en `MainUiState.baseUrl` (hoy no se muestra en ninguna pantalla, pero existe para depuración).

## Cosas que no son obvias a primera vista

- Ningún endpoint ni credencial de Moodle aparece aquí, por diseño: la app Android solo necesita conocer la dirección del backend propio de IINICIA (el BFF), nunca la de Moodle directamente (ver `CLAUDE.md`: "No modificar el core de Moodle" / "Ningún token de Moodle en Android").
- Cambiar de entorno (local, staging, producción) es un cambio de configuración de Gradle (`BuildConfig.API_BASE_URL`), no un cambio de código en este archivo.
