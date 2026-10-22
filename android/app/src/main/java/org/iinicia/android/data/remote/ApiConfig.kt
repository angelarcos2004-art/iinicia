package org.iinicia.android.data.remote

import org.iinicia.android.BuildConfig

/**
 * Configuración centralizada de red para el Backend for Frontend (BFF) de IINICIA.
 * Ningún endpoint ni credencial de Moodle se expone en el cliente Android.
 */
object ApiConfig {
    /**
     * URL base configurable (por defecto `http://10.0.2.2:3001/` desde BuildConfig
     * para conectar desde el emulador Android al localhost de la máquina host).
     */
    const val DEFAULT_BASE_URL: String = BuildConfig.API_BASE_URL

    const val CONNECT_TIMEOUT_SECONDS: Long = 10L
    const val READ_TIMEOUT_SECONDS: Long = 15L

    /**
     * Garantiza que la URL base termine en `/` como exige Retrofit.
     */
    fun normalizeBaseUrl(rawUrl: String): String {
        val trimmed = rawUrl.trim()
        require(trimmed.isNotEmpty()) { "La baseUrl no puede estar vacía" }
        return if (trimmed.endsWith("/")) trimmed else "$trimmed/"
    }
}
