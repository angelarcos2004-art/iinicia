package org.iinicia.android.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.iinicia.android.data.model.Rol
import org.iinicia.android.data.model.Usuario

/**
 * Contrato de almacenamiento de sesión de IINICIA.
 *
 * Reglas de seguridad obligatorias:
 * - Prohibido almacenar contraseñas en texto plano o cifradas bajo cualquier circunstancia.
 * - Solo se conserva el token JWT emitido por el BFF y los datos públicos del perfil (`Usuario`).
 * - Ningún token de Moodle se almacena ni procesa en el dispositivo.
 */
interface SessionTokenStorage {
    fun getToken(): String?
    fun getUsuario(): Usuario?
    fun saveSession(token: String, usuario: Usuario)
    fun clearSession()
}

/**
 * Implementación persistente y segura de [SessionTokenStorage] basada en [EncryptedSharedPreferences]
 * respaldada por Android Keystore (AES256_SIV para claves y AES256_GCM para valores).
 *
 * Garantía de seguridad:
 * Esta clase únicamente recibe y almacena el `token` (JWT del BFF) y los campos de `Usuario`
 * (`id`, `nombre`, `correo`, `rol`). La contraseña del usuario jamás llega ni se persiste aquí.
 */
class EncryptedSessionTokenStorage(
    context: Context
) : SessionTokenStorage {

    private val encryptedPrefs: SharedPreferences by lazy {
        val appContext = context.applicationContext
        val masterKey = MasterKey.Builder(appContext)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            appContext,
            PREFS_FILE_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    override fun getToken(): String? {
        return encryptedPrefs.getString(KEY_JWT_TOKEN, null)?.takeIf { it.isNotBlank() }
    }

    override fun getUsuario(): Usuario? {
        val id = encryptedPrefs.getString(KEY_USER_ID, null) ?: return null
        val nombre = encryptedPrefs.getString(KEY_USER_NOMBRE, null) ?: return null
        val correo = encryptedPrefs.getString(KEY_USER_CORREO, null) ?: return null
        val rolStr = encryptedPrefs.getString(KEY_USER_ROL, null)
        return Usuario(
            id = id,
            nombre = nombre,
            correo = correo,
            rol = Rol.fromString(rolStr)
        )
    }

    override fun saveSession(token: String, usuario: Usuario) {
        // Confirmación de seguridad: NO se guarda la contraseña bajo ninguna circunstancia,
        // únicamente el token JWT y los datos públicos del usuario autenticado.
        encryptedPrefs.edit()
            .putString(KEY_JWT_TOKEN, token)
            .putString(KEY_USER_ID, usuario.id)
            .putString(KEY_USER_NOMBRE, usuario.nombre)
            .putString(KEY_USER_CORREO, usuario.correo)
            .putString(KEY_USER_ROL, usuario.rol.valor)
            .apply()
    }

    override fun clearSession() {
        encryptedPrefs.edit().clear().apply()
    }

    companion object {
        private const val PREFS_FILE_NAME = "iinicia_secure_session_prefs"
        private const val KEY_JWT_TOKEN = "jwt_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_NOMBRE = "user_nombre"
        private const val KEY_USER_CORREO = "user_correo"
        private const val KEY_USER_ROL = "user_rol"
    }
}

/**
 * Implementación en memoria utilizada exclusivamente para pruebas unitarias en la JVM local
 * (donde el Android Keystore del dispositivo no está presente).
 */
class InMemorySessionTokenStorage : SessionTokenStorage {
    @Volatile
    private var currentToken: String? = null

    @Volatile
    private var currentUsuario: Usuario? = null

    override fun getToken(): String? = currentToken

    override fun getUsuario(): Usuario? = currentUsuario

    override fun saveSession(token: String, usuario: Usuario) {
        currentToken = token
        currentUsuario = usuario
    }

    override fun clearSession() {
        currentToken = null
        currentUsuario = null
    }
}
