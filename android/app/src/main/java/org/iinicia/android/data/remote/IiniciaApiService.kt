package org.iinicia.android.data.remote

import org.iinicia.android.data.model.AuthResponse
import org.iinicia.android.data.model.LoginRequest
import org.iinicia.android.data.model.RegistroRequest
import org.iinicia.android.data.model.Usuario
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/**
 * Contrato HTTP hacia el backend BFF de IINICIA (NestJS).
 *
 * Endpoints soportados actualmente por el backend:
 * - POST /auth/login
 * - POST /auth/registro
 * - GET /auth/me
 *
 * Regla de arquitectura:
 * - Android se comunica únicamente con el BFF de IINICIA.
 * - Ningún token administrativo o de servicio web de Moodle existe ni se procesa aquí.
 */
interface IiniciaApiService {

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("auth/registro")
    suspend fun registro(@Body request: RegistroRequest): AuthResponse

    @GET("auth/me")
    suspend fun getPerfilActual(): Usuario
}
