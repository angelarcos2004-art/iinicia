package org.iinicia.android.data.local

import org.iinicia.android.data.model.Usuario

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
}

/**
 * Implementación en memoria: sin persistencia real, solo para previews y pruebas unitarias.
 * El uso en la app (`MainActivity`) es [EncryptedSessionTokenStorage], que sí cifra el token
 * en disco con el Android Keystore (`data/local/EncryptedSessionTokenStorage.kt`).
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
