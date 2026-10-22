package org.iinicia.android

import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.iinicia.android.data.local.InMemorySessionTokenStorage
import org.iinicia.android.data.model.AuthResponse
import org.iinicia.android.data.model.LoginRequest
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
