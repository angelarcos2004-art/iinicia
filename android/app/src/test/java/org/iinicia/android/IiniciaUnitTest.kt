package org.iinicia.android

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.iinicia.android.data.local.InMemorySessionTokenStorage
import org.iinicia.android.data.model.ActividadProximaDto
import org.iinicia.android.data.model.AuthResponse
import org.iinicia.android.data.model.CursoInscritoDto
import org.iinicia.android.data.model.EstadoCurso
import org.iinicia.android.data.model.LoginRequest
import org.iinicia.android.data.model.MoodleSsoResponse
import org.iinicia.android.data.model.RegistrarPushTokenRequest
import org.iinicia.android.data.model.RegistroRequest
import org.iinicia.android.data.model.Usuario
import org.iinicia.android.data.remote.ApiConfig
import org.iinicia.android.data.remote.IiniciaApiService
import org.iinicia.android.data.remote.RetrofitClient
import org.iinicia.android.data.repository.IiniciaRepositoryImpl
import org.iinicia.android.ui.theme.IiniciaAccent
import org.iinicia.android.ui.theme.IiniciaPrimary
import org.iinicia.android.ui.theme.IiniciaSecondary
import org.iinicia.android.ui.viewmodel.MainViewModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response

/** Implementación falsa de [IiniciaApiService] para pruebas sin red real. */
private class FakeApiService(
    private val cursos: List<CursoInscritoDto>,
    private val moodleSsoUrl: String = "http://localhost:8080/auth/userkey/login.php?key=abc",
    private val actividades: List<ActividadProximaDto> = emptyList(),
    private val actividadesFallan: Boolean = false
) : IiniciaApiService {
    override suspend fun login(request: LoginRequest): AuthResponse = throw NotImplementedError()
    override suspend fun registro(request: RegistroRequest): AuthResponse = throw NotImplementedError()
    override suspend fun getPerfilActual(): Usuario = throw NotImplementedError()
    override suspend fun getCursos(): List<CursoInscritoDto> = cursos
    override suspend fun getActividadesProximas(): List<ActividadProximaDto> =
        if (actividadesFallan) throw java.io.IOException("Moodle no respondió a tiempo") else actividades
    override suspend fun getMoodleSsoUrl(cursoId: Int?, actividadUrl: String?): MoodleSsoResponse =
        MoodleSsoResponse(moodleSsoUrl)
    override suspend fun registrarPushToken(request: RegistrarPushTokenRequest) = Unit
}

/** Login que siempre funciona, pero `getCursos()` falla (p. ej. timeout real contra Moodle). */
private class FakeApiServiceConCursosQueFallan : IiniciaApiService {
    override suspend fun login(request: LoginRequest): AuthResponse =
        AuthResponse(token = "jwt-falso", usuario = Usuario(id = "u1", nombre = "Ana", correo = request.correo))

    override suspend fun registro(request: RegistroRequest): AuthResponse = throw NotImplementedError()
    override suspend fun getPerfilActual(): Usuario = throw NotImplementedError()
    override suspend fun getCursos(): List<CursoInscritoDto> =
        throw java.io.IOException("Moodle no respondió a tiempo")
    override suspend fun getActividadesProximas(): List<ActividadProximaDto> = emptyList()
    override suspend fun getMoodleSsoUrl(cursoId: Int?, actividadUrl: String?): MoodleSsoResponse =
        throw NotImplementedError()
    override suspend fun registrarPushToken(request: RegistrarPushTokenRequest) = Unit
}

class ExampleUnitTest {
    @Test
    fun institutionalColors_areCorrect() {
        assertEquals(0xFF0B2A5BUL, IiniciaPrimary.value shr 32)
        assertEquals(0xFF1E5AA8UL, IiniciaSecondary.value shr 32)
        assertEquals(0xFFF2A900UL, IiniciaAccent.value shr 32)
    }

    @Test
    fun apiConfig_normalizesBaseUrlCorrectly() {
        assertEquals("http://10.0.2.2:3001/", ApiConfig.DEFAULT_BASE_URL)
        assertEquals("http://10.0.2.2:3001/", ApiConfig.normalizeBaseUrl("http://10.0.2.2:3001"))
        assertEquals("http://10.0.2.2:3001/", ApiConfig.normalizeBaseUrl("http://10.0.2.2:3001/"))
        assertEquals("http://localhost:3001/", ApiConfig.normalizeBaseUrl("http://localhost:3001"))
        assertEquals("http://localhost:3001/", ApiConfig.normalizeBaseUrl("http://localhost:3001/"))
    }

    @Test
    fun retrofitClient_createsApiServiceWithPlaceholderUrl() {
        val service = RetrofitClient.createApiService(baseUrl = "http://10.0.2.2:3001/")
        assertNotNull(service)
        val defaultRepository = IiniciaRepositoryImpl()
        assertTrue(defaultRepository.isConnectToRemoteEnabled)
        assertEquals("http://10.0.2.2:3001/", defaultRepository.baseUrl)
    }

    @Test
    fun loginFormValidation_validatesEmailAndMin8CharPassword() {
        val viewModel = MainViewModel()

        val emptyValidation = viewModel.validarFormularioLogin("", "")
        assertFalse(emptyValidation.isValid)
        assertNotNull(emptyValidation.correoError)
        assertNotNull(emptyValidation.passwordError)

        val shortPasswordValidation = viewModel.validarFormularioLogin(
            "rodrigo.hernandez@iinicia.edu.mx",
            "1234567" // 7 caracteres (< 8)
        )
        assertFalse(shortPasswordValidation.isValid)
        assertNull(shortPasswordValidation.correoError)
        assertNotNull(shortPasswordValidation.passwordError)

        val invalidEmailValidation = viewModel.validarFormularioLogin("correo-invalido", "Secreto123")
        assertFalse(invalidEmailValidation.isValid)
        assertNotNull(invalidEmailValidation.correoError)
        assertNull(invalidEmailValidation.passwordError)

        val validValidation = viewModel.validarFormularioLogin("rodrigo.hernandez@iinicia.edu.mx", "Secreto123")
        assertTrue(validValidation.isValid)
        assertNull(validValidation.correoError)
        assertNull(validValidation.passwordError)
    }

    @Test
    fun repository_loginAndDashboardPlaceholder_storesOnlyJwtAndEmptyCoursesList() = runTest {
        val tokenStorage = InMemorySessionTokenStorage()
        val repository = IiniciaRepositoryImpl(
            baseUrl = "http://10.0.2.2:3001/",
            tokenStorage = tokenStorage,
            isConnectToRemoteEnabled = false
        )

        assertNull(tokenStorage.getToken())

        val loginResult = repository.login("rodrigo.hernandez@iinicia.edu.mx", "Secreto123!")
        assertTrue(loginResult.isSuccess)
        assertNotNull(tokenStorage.getToken())
        assertEquals("rodrigo.hernandez@iinicia.edu.mx", tokenStorage.getUsuario()?.correo)

        val dashboardResult = repository.getDashboardEstudiante()
        assertTrue(dashboardResult.isSuccess)
        assertTrue(dashboardResult.getOrThrow().cursos.isEmpty())

        repository.logout()
        assertNull(tokenStorage.getToken())
    }

    @Test
    fun estadoCurso_seDeriveDelProgreso() {
        assertEquals(EstadoCurso.SIN_SEGUIMIENTO, EstadoCurso.desdeProgreso(null))
        assertEquals(EstadoCurso.POR_INICIAR, EstadoCurso.desdeProgreso(0))
        assertEquals(EstadoCurso.EN_CURSO, EstadoCurso.desdeProgreso(50))
        assertEquals(EstadoCurso.FINALIZADO, EstadoCurso.desdeProgreso(100))
    }

    @Test
    fun repository_getCursosAutorizados_mapeaCursosRealesDelBackend() = runTest {
        val fakeApi = FakeApiService(
            cursos = listOf(
                CursoInscritoDto(id = 2, nombre = "Test course: XS", shortname = "IINICIA101", progreso = null)
            )
        )
        val repository = IiniciaRepositoryImpl(
            baseUrl = "http://10.0.2.2:3001/",
            isConnectToRemoteEnabled = true,
            apiService = fakeApi
        )

        val result = repository.getCursosAutorizados()
        assertTrue(result.isSuccess)
        val curso = result.getOrThrow().single()
        assertEquals("2", curso.id)
        assertEquals("IINICIA101", curso.periodo)
        assertEquals(EstadoCurso.SIN_SEGUIMIENTO, curso.estado)
        assertNull(curso.progreso)
    }

    @Test
    fun repository_getDashboardEstudiante_incluyeActividadesDelBackend() = runTest {
        val fakeApi = FakeApiService(
            cursos = emptyList(),
            actividades = listOf(
                ActividadProximaDto(id = 5, titulo = "Entrega Tarea 1", curso = "Curso X", fecha = "2026-11-01T00:00:00.000Z", url = null)
            )
        )
        val repository = IiniciaRepositoryImpl(
            baseUrl = "http://10.0.2.2:3001/",
            isConnectToRemoteEnabled = true,
            apiService = fakeApi
        )

        val dashboard = repository.getDashboardEstudiante().getOrThrow()
        assertEquals(1, dashboard.actividades.size)
        assertEquals("Entrega Tarea 1", dashboard.actividades.single().titulo)
    }

    @Test
    fun repository_getDashboardEstudiante_siActividadesFalla_noTumbaElDashboard() = runTest {
        val fakeApi = FakeApiService(
            cursos = listOf(CursoInscritoDto(id = 2, nombre = "Curso", shortname = "X", progreso = null)),
            actividadesFallan = true
        )
        val repository = IiniciaRepositoryImpl(
            baseUrl = "http://10.0.2.2:3001/",
            isConnectToRemoteEnabled = true,
            apiService = fakeApi
        )

        val result = repository.getDashboardEstudiante()
        assertTrue(result.isSuccess)
        val dashboard = result.getOrThrow()
        assertTrue(dashboard.actividades.isEmpty())
        assertEquals(1, dashboard.cursos.size)
    }

    @Test
    fun repository_getUrlCampus_devuelveLaUrlDeAutologinDelBackend() = runTest {
        val fakeApi = FakeApiService(
            cursos = emptyList(),
            moodleSsoUrl = "http://localhost:8080/auth/userkey/login.php?key=xyz"
        )
        val repository = IiniciaRepositoryImpl(
            baseUrl = "http://10.0.2.2:3001/",
            isConnectToRemoteEnabled = true,
            apiService = fakeApi
        )

        val result = repository.getUrlCampus(cursoId = 2)
        assertTrue(result.isSuccess)
        assertEquals("http://localhost:8080/auth/userkey/login.php?key=xyz", result.getOrThrow())
    }

    @Test
    fun repository_getUrlCampus_pasaActividadUrlAlBackend() = runTest {
        var cursoIdRecibido: Int? = -1
        var actividadUrlRecibida: String? = null
        val fakeApi = object : IiniciaApiService {
            override suspend fun login(request: LoginRequest): AuthResponse = throw NotImplementedError()
            override suspend fun registro(request: RegistroRequest): AuthResponse = throw NotImplementedError()
            override suspend fun getPerfilActual(): Usuario = throw NotImplementedError()
            override suspend fun getCursos(): List<CursoInscritoDto> = emptyList()
            override suspend fun getActividadesProximas(): List<ActividadProximaDto> = emptyList()
            override suspend fun getMoodleSsoUrl(cursoId: Int?, actividadUrl: String?): MoodleSsoResponse {
                cursoIdRecibido = cursoId
                actividadUrlRecibida = actividadUrl
                return MoodleSsoResponse("http://localhost:8080/auth/userkey/login.php?key=abc")
            }
            override suspend fun registrarPushToken(request: RegistrarPushTokenRequest) = Unit
        }
        val repository = IiniciaRepositoryImpl(
            baseUrl = "http://10.0.2.2:3001/",
            isConnectToRemoteEnabled = true,
            apiService = fakeApi
        )

        val result = repository.getUrlCampus(actividadUrl = "http://localhost:8080/mod/assign/view.php?id=5")
        assertTrue(result.isSuccess)
        assertNull(cursoIdRecibido)
        assertEquals("http://localhost:8080/mod/assign/view.php?id=5", actividadUrlRecibida)
    }

    @Test
    fun repository_getUrlCampus_fallaSinConexionAlBackendReal() = runTest {
        val repository = IiniciaRepositoryImpl(
            baseUrl = "http://10.0.2.2:3001/",
            isConnectToRemoteEnabled = false,
            apiService = FakeApiService(cursos = emptyList())
        )

        assertTrue(repository.getUrlCampus().isFailure)
    }

    @Test
    fun repository_notificacionesHabilitadas_defaultTrueYSePuedeApagar() {
        val tokenStorage = InMemorySessionTokenStorage()
        val repository = IiniciaRepositoryImpl(tokenStorage = tokenStorage)

        assertTrue(repository.notificacionesHabilitadas())

        repository.setNotificacionesHabilitadas(false)
        assertFalse(repository.notificacionesHabilitadas())
    }

    @Test
    fun repository_registrarTokenPush_envíaElTokenAlBackend() = runTest {
        var tokenRecibido: String? = null
        val fakeApi = object : IiniciaApiService {
            override suspend fun login(request: LoginRequest): AuthResponse = throw NotImplementedError()
            override suspend fun registro(request: RegistroRequest): AuthResponse = throw NotImplementedError()
            override suspend fun getPerfilActual(): Usuario = throw NotImplementedError()
            override suspend fun getCursos(): List<CursoInscritoDto> = emptyList()
            override suspend fun getActividadesProximas(): List<ActividadProximaDto> = emptyList()
            override suspend fun getMoodleSsoUrl(cursoId: Int?, actividadUrl: String?): MoodleSsoResponse =
                throw NotImplementedError()
            override suspend fun registrarPushToken(request: RegistrarPushTokenRequest) {
                tokenRecibido = request.token
            }
        }
        val repository = IiniciaRepositoryImpl(
            baseUrl = "http://10.0.2.2:3001/",
            isConnectToRemoteEnabled = true,
            apiService = fakeApi
        )

        val result = repository.registrarTokenPush("token-fcm-xyz")
        assertTrue(result.isSuccess)
        assertEquals("token-fcm-xyz", tokenRecibido)
    }

    @Test
    fun repository_registrarTokenPush_noHaceNadaSinConexionAlBackendReal() = runTest {
        val repository = IiniciaRepositoryImpl(
            baseUrl = "http://10.0.2.2:3001/",
            isConnectToRemoteEnabled = false,
            apiService = FakeApiService(cursos = emptyList())
        )

        assertTrue(repository.registrarTokenPush("token-fcm-xyz").isSuccess)
    }

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    @Test
    fun viewModel_siFallaLaCargaDeCursos_loMuestraComoErrorNoComoListaVacia() = runTest {
        // viewModelScope.launch necesita un Dispatchers.Main real; en un test JVM puro no
        // existe uno por defecto, así que se instala uno de prueba para esta única prueba.
        Dispatchers.setMain(UnconfinedTestDispatcher(testScheduler))
        try {
            val repository = IiniciaRepositoryImpl(
                baseUrl = "http://10.0.2.2:3001/",
                tokenStorage = InMemorySessionTokenStorage(),
                isConnectToRemoteEnabled = true,
                apiService = FakeApiServiceConCursosQueFallan()
            )
            val viewModel = MainViewModel(repository)

            viewModel.iniciarSesion("ana@iinicia.test", "Secreto123")

            val estado = viewModel.uiState.value
            assertNotNull(estado.usuarioAutenticado) // el login sí funcionó
            assertTrue(estado.cursos.isEmpty())
            assertFalse(estado.cargandoCursos)
            assertNotNull(estado.errorCursos) // "(0 cursos)" en la UI debe venir acompañado de este error

            // "Reintentar" limpia y vuelve a intentar (sigue fallando con este fake, pero no debe crashear)
            viewModel.cargarCursos()
            assertNotNull(viewModel.uiState.value.errorCursos)
        } finally {
            Dispatchers.resetMain()
        }
    }

    @Test
    fun repository_loginHttpException_parsesBackendJsonMessageInSpanish() = runTest {
        val fakeApi = object : IiniciaApiService {
            override suspend fun login(request: LoginRequest): AuthResponse {
                val errorJson = """{"message":"Correo o contraseña incorrectos"}"""
                val errorBody = errorJson.toResponseBody("application/json".toMediaType())
                throw HttpException(Response.error<AuthResponse>(401, errorBody))
            }

            override suspend fun registro(request: RegistroRequest): AuthResponse {
                throw UnsupportedOperationException()
            }

            override suspend fun getPerfilActual(): Usuario {
                throw UnsupportedOperationException()
            }

            override suspend fun getCursos(): List<CursoInscritoDto> {
                throw UnsupportedOperationException()
            }

            override suspend fun getActividadesProximas(): List<ActividadProximaDto> {
                throw UnsupportedOperationException()
            }

            override suspend fun getMoodleSsoUrl(cursoId: Int?, actividadUrl: String?): MoodleSsoResponse {
                throw UnsupportedOperationException()
            }

            override suspend fun registrarPushToken(request: RegistrarPushTokenRequest) {
                throw UnsupportedOperationException()
            }
        }

        val repository = IiniciaRepositoryImpl(
            baseUrl = "http://10.0.2.2:3001/",
            tokenStorage = InMemorySessionTokenStorage(),
            isConnectToRemoteEnabled = true,
            apiService = fakeApi
        )

        val result = repository.login("rodrigo.hernandez@iinicia.edu.mx", "Incorrecta123")
        assertTrue(result.isFailure)
        assertEquals("Correo o contraseña incorrectos", result.exceptionOrNull()?.message)

        // Verifica también el respaldo cuando el cuerpo no es JSON válido
        val fallback = IiniciaRepositoryImpl.parseErrorMessage("no-es-json", "Error genérico de respaldo")
        assertEquals("Error genérico de respaldo", fallback)
    }
}
