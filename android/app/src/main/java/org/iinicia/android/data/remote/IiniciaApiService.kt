package org.iinicia.android.data.remote

import org.iinicia.android.data.model.AuthResponse
import org.iinicia.android.data.model.CursoEstudiante
import org.iinicia.android.data.model.DashboardEstudiante
import org.iinicia.android.data.model.LoginRequest
import org.iinicia.android.data.model.RegistroRequest
import org.iinicia.android.data.model.Usuario
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Contrato HTTP hacia el backend BFF de IINICIA (NestJS).
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

    @GET("estudiante/dashboard")
    suspend fun getDashboardEstudiante(): DashboardEstudiante

    @GET("estudiante/cursos")
    suspend fun getCursosAutorizados(): List<CursoEstudiante>

    @GET("estudiante/cursos/{cursoId}")
    suspend fun getDetalleCurso(@Path("cursoId") cursoId: String): CursoEstudiante
}
