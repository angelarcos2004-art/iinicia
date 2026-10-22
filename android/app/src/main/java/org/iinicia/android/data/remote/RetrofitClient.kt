package org.iinicia.android.data.remote

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import org.iinicia.android.BuildConfig
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Proveedor del cliente HTTP (Retrofit + OkHttp) con `baseUrl` configurable.
 */
object RetrofitClient {

    /**
     * Crea una instancia de [IiniciaApiService] apuntando a [baseUrl].
     *
     * @param baseUrl URL base del BFF (por defecto [ApiConfig.DEFAULT_BASE_URL]).
     * @param tokenProvider Proveedor opcional del JWT de sesión para inyectar el header Authorization.
     */
    fun createApiService(
        baseUrl: String = ApiConfig.DEFAULT_BASE_URL,
        tokenProvider: () -> String? = { null }
    ): IiniciaApiService {
        val normalizedUrl = ApiConfig.normalizeBaseUrl(baseUrl)

        val authInterceptor = Interceptor { chain ->
            val token = tokenProvider()
            val requestBuilder = chain.request().newBuilder()
                .header("Accept", "application/json")
            if (!token.isNullOrBlank()) {
                requestBuilder.header("Authorization", "Bearer $token")
            }
            chain.proceed(requestBuilder.build())
        }

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
    }
}
