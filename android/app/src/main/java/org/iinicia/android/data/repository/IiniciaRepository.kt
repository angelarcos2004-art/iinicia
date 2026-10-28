package org.iinicia.android.data.repository

import com.google.gson.JsonParser
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import org.iinicia.android.data.local.InMemorySessionTokenStorage
import org.iinicia.android.data.local.MockDataSource
import org.iinicia.android.data.local.SessionTokenStorage
import org.iinicia.android.data.model.AuthResponse
import org.iinicia.android.data.model.CursoEstudiante
import org.iinicia.android.data.model.CursoInscritoDto
import org.iinicia.android.data.model.DashboardEstudiante
import org.iinicia.android.data.model.EstadoCurso
import org.iinicia.android.data.model.LoginRequest
import org.iinicia.android.data.model.RegistrarPushTokenRequest
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
    suspend fun getUrlCampus(cursoId: Int? = null, actividadUrl: String? = null): Result<String>
    suspend fun registrarTokenPush(token: String): Result<Unit>
    fun logout()
}

/** Convierte el curso crudo del backend (`CursoInscritoDto`, directo de Moodle) al modelo de
 * dominio de la UI. No inventa `periodo`/`docente`/`descripcion`: Moodle no los expone en este
 * endpoint, así que quedan vacíos en vez de simular un dato que no es real. */
private fun CursoInscritoDto.aCursoEstudiante(): CursoEstudiante = CursoEstudiante(
    id = id.toString(),
    nombre = nombre,
    periodo = shortname,
    progreso = progreso,
    estado = EstadoCurso.desdeProgreso(progreso),
    docente = "",
    descripcion = "",
)

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
            // `tokenStorage` persiste esto en EncryptedSharedPreferences (ver
            // EncryptedSessionTokenStorage, usada por defecto desde MainActivity).
            // PROHIBIDO almacenar `password` en texto plano o guardar tokens de Moodle.
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
     * El backend todavía no expone créditos ni cuatrimestre (son datos académicos que
     * dependen de un modelo curricular aún no implementado), así que quedan en 0/placeholder
     * en vez de simular un avance que no es real. Los cursos sí son reales: vienen de
     * `GET /estudiante/cursos`, que el backend sincroniza directo con Moodle.
     */
    override suspend fun getDashboardEstudiante(): Result<DashboardEstudiante> {
        return runCatching {
            val usuario = tokenStorage.getUsuario() ?: MockDataSource.mockUsuarioEstudiante
            val cursos = if (isConnectToRemoteEnabled) {
                apiService.getCursos().map { it.aCursoEstudiante() }
            } else {
                emptyList()
            }
            // Si Moodle falla al pedir actividades, no se tumba todo el dashboard: los
            // cursos ya cargados son más importantes que esta lista secundaria.
            val actividades = if (isConnectToRemoteEnabled) {
                runCatching { apiService.getActividadesProximas() }.getOrDefault(emptyList())
            } else {
                emptyList()
            }
            DashboardEstudiante(
                usuario = usuario,
                cuatrimestre = "1er cuatrimestre",
                creditosObtenidos = 0,
                creditosTotales = 300,
                progresoCurricular = 0,
                cursos = cursos,
                avisos = emptyList(),
                actividades = actividades
            )
        }
    }

    override suspend fun getCursosAutorizados(): Result<List<CursoEstudiante>> {
        return runCatching {
            if (isConnectToRemoteEnabled) {
                apiService.getCursos().map { it.aCursoEstudiante() }
            } else {
                emptyList()
            }
        }
    }

    override suspend fun getDetalleCurso(cursoId: String): Result<CursoEstudiante> {
        return runCatching {
            if (isConnectToRemoteEnabled) {
                apiService.getCursos()
                    .map { it.aCursoEstudiante() }
                    .firstOrNull { it.id == cursoId }
                    ?: throw IllegalArgumentException("Curso no encontrado: $cursoId")
            } else {
                MockDataSource.mockCursos.firstOrNull { it.id == cursoId }
                    ?: throw IllegalArgumentException("Curso no encontrado: $cursoId")
            }
        }
    }

    override suspend fun getUrlCampus(cursoId: Int?, actividadUrl: String?): Result<String> = runCatching {
        if (!isConnectToRemoteEnabled) {
            throw IllegalStateException("El acceso a Moodle requiere conexión al backend real.")
        }
        apiService.getMoodleSsoUrl(cursoId, actividadUrl).url
    }

    override suspend fun registrarTokenPush(token: String): Result<Unit> = runCatching {
        if (!isConnectToRemoteEnabled) return@runCatching
        apiService.registrarPushToken(RegistrarPushTokenRequest(token))
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
