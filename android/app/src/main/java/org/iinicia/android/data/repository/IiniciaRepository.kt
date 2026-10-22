package org.iinicia.android.data.repository

import com.google.gson.JsonParser
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import org.iinicia.android.data.local.InMemorySessionTokenStorage
import org.iinicia.android.data.local.MockDataSource
import org.iinicia.android.data.local.SessionTokenStorage
import org.iinicia.android.data.model.AuthResponse
import org.iinicia.android.data.model.CursoEstudiante
import org.iinicia.android.data.model.DashboardEstudiante
import org.iinicia.android.data.model.LoginRequest
import org.iinicia.android.data.model.Usuario
import org.iinicia.android.data.remote.ApiConfig
import org.iinicia.android.data.remote.IiniciaApiService
import org.iinicia.android.data.remote.RetrofitClient
import retrofit2.HttpException

/**
 * Contrato de la capa de repositorio de IINICIA.
 * Abstrae el origen de datos (cliente HTTP Retrofit hacia el BFF NestJS para endpoints de auth
 * y datos mock locales para el dashboard).
 */
interface IiniciaRepository {
    val baseUrl: String
    val isConnectToRemoteEnabled: Boolean

    fun getCurrentSessionUser(): Usuario?
    suspend fun login(correo: String, password: String): Result<AuthResponse>
    suspend fun getDashboardEstudiante(): Result<DashboardEstudiante>
    suspend fun getCursosAutorizados(): Result<List<CursoEstudiante>>
    suspend fun getDetalleCurso(cursoId: String): Result<CursoEstudiante>
    fun logout()
}

class IiniciaRepositoryImpl(
    override val baseUrl: String = ApiConfig.DEFAULT_BASE_URL,
    private val tokenStorage: SessionTokenStorage = InMemorySessionTokenStorage(),
    override val isConnectToRemoteEnabled: Boolean = true,
    private val apiService: IiniciaApiService = RetrofitClient.createApiService(
        baseUrl = baseUrl,
        tokenProvider = { tokenStorage.getToken() }
    )
) : IiniciaRepository {

    override fun getCurrentSessionUser(): Usuario? = tokenStorage.getUsuario()

    override suspend fun login(correo: String, password: String): Result<AuthResponse> {
        return try {
            val response = if (isConnectToRemoteEnabled) {
                apiService.login(LoginRequest(correo = correo.trim(), password = password))
            } else {
                // Respaldo simulado para pruebas unitarias locales
                delay(300)
                MockDataSource.buildMockAuthResponse(correo = correo.trim())
            }
            // Regla estricta de seguridad:
            // Se persiste únicamente `response.token` (JWT del BFF) y `response.usuario`
            // en EncryptedSessionTokenStorage (EncryptedSharedPreferences).
            // JAMÁS se almacena `password` ni tokens de Moodle bajo ninguna circunstancia.
            tokenStorage.saveSession(response.token, response.usuario)
            Result.success(response)
        } catch (cancellation: CancellationException) {
            throw cancellation
        } catch (httpException: HttpException) {
            val rawErrorBody = runCatching {
                httpException.response()?.errorBody()?.string()
            }.getOrNull()
            val fallbackMessage = httpException.message().takeIf { it.isNotBlank() }
                ?: "El servidor respondió con un error (${httpException.code()})."
            val parsedMessage = parseErrorMessage(rawErrorBody, fallbackMessage)
            Result.failure(Exception(parsedMessage, httpException))
        } catch (e: Exception) {
            val fallback = e.message?.takeIf { it.isNotBlank() }
                ?: "No se pudo conectar con el servidor. Verifica tu conexión."
            Result.failure(Exception(fallback, e))
        }
    }

    /**
     * El backend actual solo expone `/auth/login`, `/auth/registro` y `/auth/me`.
     * El dashboard consume datos locales directamente sin pasar por Retrofit.
     */
    override suspend fun getDashboardEstudiante(): Result<DashboardEstudiante> {
        return runCatching {
            val usuario = tokenStorage.getUsuario() ?: MockDataSource.mockUsuarioEstudiante
            // Para el primer avance, el Dashboard inicia con una lista vacía de cursos
            DashboardEstudiante(
                usuario = usuario,
                cuatrimestre = "1er cuatrimestre",
                creditosObtenidos = 0,
                creditosTotales = 300,
                progresoCurricular = 0,
                cursos = emptyList(),
                avisos = emptyList()
            )
        }
    }

    override suspend fun getCursosAutorizados(): Result<List<CursoEstudiante>> {
        return runCatching {
            emptyList()
        }
    }

    override suspend fun getDetalleCurso(cursoId: String): Result<CursoEstudiante> {
        return runCatching {
            MockDataSource.mockCursos.firstOrNull { it.id == cursoId }
                ?: throw IllegalArgumentException("Curso no encontrado: $cursoId")
        }
    }

    override fun logout() {
        tokenStorage.clearSession()
    }

    companion object {
        /**
         * Parsea el cuerpo de error JSON devuelto por el backend NestJS (`{ "message": "..." }`)
         * y devuelve el mensaje en español, o [fallbackMessage] si el parseo falla.
         */
        fun parseErrorMessage(rawErrorBody: String?, fallbackMessage: String): String {
            if (rawErrorBody.isNullOrBlank()) return fallbackMessage
            return try {
                val jsonObject = JsonParser.parseString(rawErrorBody).asJsonObject
                val messageElement = jsonObject.get("message") ?: return fallbackMessage
                val extracted = when {
                    messageElement.isJsonPrimitive -> messageElement.asString
                    messageElement.isJsonArray && messageElement.asJsonArray.size() > 0 ->
                        messageElement.asJsonArray[0].asString
                    else -> null
                }
                extracted?.takeIf { it.isNotBlank() } ?: fallbackMessage
            } catch (_: Exception) {
                fallbackMessage
            }
        }
    }
}
