package org.iinicia.android.data.repository

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

/**
 * Contrato de la capa de repositorio de IINICIA.
 * Abstrae el origen de datos (cliente HTTP Retrofit hacia el BFF NestJS o simulación local
 * mientras el backend está en construcción).
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
    override val isConnectToRemoteEnabled: Boolean = false,
    private val apiService: IiniciaApiService = RetrofitClient.createApiService(
        baseUrl = baseUrl,
        tokenProvider = { tokenStorage.getToken() }
    )
) : IiniciaRepository {

    override fun getCurrentSessionUser(): Usuario? = tokenStorage.getUsuario()

    override suspend fun login(correo: String, password: String): Result<AuthResponse> {
        return runCatching {
            val response = if (isConnectToRemoteEnabled) {
                apiService.login(LoginRequest(correo = correo.trim(), password = password))
            } else {
                // Simulación de inicio de sesión exitoso sin llamada real al backend
                delay(300)
                MockDataSource.buildMockAuthResponse(correo = correo.trim())
            }
            // TODO(Seguridad - Login Real): Cuando exista conexión real al backend (BFF),
            //  persistir `response.token` (JWT de IINICIA) usando EncryptedSharedPreferences
            //  o Jetpack DataStore cifrado con Android Keystore.
            //  PROHIBIDO almacenar `password` en texto plano o guardar tokens de Moodle.
            tokenStorage.saveSession(response.token, response.usuario)
            response
        }
    }

    override suspend fun getDashboardEstudiante(): Result<DashboardEstudiante> {
        return runCatching {
            if (isConnectToRemoteEnabled) {
                apiService.getDashboardEstudiante()
            } else {
                val usuario = tokenStorage.getUsuario() ?: MockDataSource.mockUsuarioEstudiante
                // Para el primer avance (Fase 4), el Dashboard inicia con una lista vacía de cursos
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
    }

    override suspend fun getCursosAutorizados(): Result<List<CursoEstudiante>> {
        return runCatching {
            if (isConnectToRemoteEnabled) {
                apiService.getCursosAutorizados()
            } else {
                emptyList()
            }
        }
    }

    override suspend fun getDetalleCurso(cursoId: String): Result<CursoEstudiante> {
        return runCatching {
            if (isConnectToRemoteEnabled) {
                apiService.getDetalleCurso(cursoId)
            } else {
                MockDataSource.mockCursos.firstOrNull { it.id == cursoId }
                    ?: throw IllegalArgumentException("Curso no encontrado: $cursoId")
            }
        }
    }

    override fun logout() {
        tokenStorage.clearSession()
    }
}
