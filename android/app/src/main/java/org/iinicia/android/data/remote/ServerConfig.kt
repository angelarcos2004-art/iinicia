package org.iinicia.android.data.remote

import android.content.Context

/**
 * URL del backend editable en runtime (pantalla de login), sin recompilar el APK: la IP de LAN
 * de la laptop que corre el backend cambia cada vez que se mueve de red (hotspot, wifi de la
 * escuela, etc. - ver infrastructure/dev-network.ps1). Simple SharedPreferences: no es secreto.
 */
object ServerConfig {
    private const val PREFS_NAME = "server_config"
    private const val KEY_BASE_URL = "base_url"

    fun getBaseUrl(context: Context): String {
        val guardado = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_BASE_URL, null)
        return guardado?.takeIf { it.isNotBlank() } ?: ApiConfig.DEFAULT_BASE_URL
    }

    fun setBaseUrl(context: Context, url: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_BASE_URL, ApiConfig.normalizeBaseUrl(url))
            .apply()
    }
}
