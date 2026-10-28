package org.iinicia.android.data.remote

import org.iinicia.android.data.model.ActividadProximaDto
import org.iinicia.android.data.model.AuthResponse
import org.iinicia.android.data.model.CursoInscritoDto
import org.iinicia.android.data.model.LoginRequest
import org.iinicia.android.data.model.MoodleSsoResponse
import org.iinicia.android.data.model.RegistroRequest
import org.iinicia.android.data.model.Usuario
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * Contrato HTTP hacia el backend BFF de IINICIA (NestJS).
 *
 * Endpoints soportados actualmente por el backend:
 * - POST /auth/login
 * - POST /auth/registro
 * - GET /auth/me
 * - GET /estudiante/cursos
 * - GET /estudiante/actividades
 * - GET /estudiante/moodle-sso
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

    /** Cursos reales del estudiante autenticado, sincronizados por el backend desde Moodle. */
    @GET("estudiante/cursos")
    suspend fun getCursos(): List<CursoInscritoDto>

    /** Próximas actividades con fecha límite de todos los cursos del estudiante autenticado. */
    @GET("estudiante/actividades")
    suspend fun getActividadesProximas(): List<ActividadProximaDto>

    /**
     * URL de un solo uso para entrar a Moodle ya autenticado (SSO vía auth_userkey, ver
     * `backend/src/moodle/moodle.service.ts`), sin pedir una segunda contraseña. Expira en
     * segundos: se abre de inmediato en el navegador del dispositivo, nunca se guarda.
     */
    @GET("estudiante/moodle-sso")
    suspend fun getMoodleSsoUrl(
        @Query("cursoId") cursoId: Int? = null,
        @Query("actividadUrl") actividadUrl: String? = null
    ): MoodleSsoResponse
}
