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
 * Implementación en memoria para simulación y pruebas unitarias.
 *
 * TODO(Seguridad - Login Real): Reemplazar este almacenamiento en memoria por
 *  EncryptedSharedPreferences (androidx.security:security-crypto) o Jetpack DataStore
 *  cifrado con Tink / Android Keystore para persistir únicamente el JWT de sesión del BFF.
 *  NUNCA almacenar la contraseña del usuario en texto plano ni tokens de Moodle.
 */
class InMemorySessionTokenStorage : SessionTokenStorage {
    @Volatile
    private var currentToken: String? = null

    @Volatile
    private var currentUsuario: Usuario? = null

    override fun getToken(): String? = currentToken

    override fun getUsuario(): Usuario? = currentUsuario

    override fun saveSession(token: String, usuario: Usuario) {
        // TODO(Seguridad - Login Real): Guardar `token` en EncryptedSharedPreferences o DataStore cifrado
        //  cuando se conecte el endpoint real POST /auth/login del backend NestJS.
        currentToken = token
        currentUsuario = usuario
    }

    override fun clearSession() {
        currentToken = null
        currentUsuario = null
    }
}
