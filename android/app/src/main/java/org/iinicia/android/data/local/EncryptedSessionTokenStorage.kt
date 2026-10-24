package org.iinicia.android.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import com.google.gson.Gson
import org.iinicia.android.data.model.Usuario

private const val PREFS_NAME = "iinicia_session"
private const val KEY_TOKEN = "token"
private const val KEY_USUARIO_JSON = "usuario_json"

/**
 * Persiste el JWT de sesión y el perfil público del usuario en
 * [EncryptedSharedPreferences] (cifrado AES-256 con una clave maestra del
 * Android Keystore). Nunca se guarda la contraseña ni ningún token de
 * Moodle, solo lo que ya devuelve el BFF en `/auth/login`.
 */
class EncryptedSessionTokenStorage(context: Context) : SessionTokenStorage {
    private val gson = Gson()

    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        PREFS_NAME,
        MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC),
        context.applicationContext,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    override fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

    override fun getUsuario(): Usuario? =
        prefs.getString(KEY_USUARIO_JSON, null)?.let { json ->
            runCatching { gson.fromJson(json, Usuario::class.java) }.getOrNull()
        }

    override fun saveSession(token: String, usuario: Usuario) {
        prefs.edit {
            putString(KEY_TOKEN, token)
            putString(KEY_USUARIO_JSON, gson.toJson(usuario))
        }
    }

    override fun clearSession() {
        prefs.edit { clear() }
    }
}
