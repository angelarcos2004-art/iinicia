package org.iinicia.android

import kotlinx.coroutines.test.runTest
import org.iinicia.android.data.local.InMemorySessionTokenStorage
import org.iinicia.android.data.remote.ApiConfig
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

class ExampleUnitTest {
    @Test
    fun institutionalColors_areCorrect() {
        assertEquals(0xFF0B2A5BUL, IiniciaPrimary.value shr 32)
        assertEquals(0xFF1E5AA8UL, IiniciaSecondary.value shr 32)
        assertEquals(0xFFF2A900UL, IiniciaAccent.value shr 32)
    }

    @Test
    fun apiConfig_normalizesBaseUrlCorrectly() {
        assertEquals("http://localhost:3000/api/", ApiConfig.normalizeBaseUrl("http://localhost:3000/api"))
        assertEquals("http://localhost:3000/api/", ApiConfig.normalizeBaseUrl("http://localhost:3000/api/"))
    }

    @Test
    fun retrofitClient_createsApiServiceWithPlaceholderUrl() {
        val service = RetrofitClient.createApiService(baseUrl = "http://localhost:3000/api")
        assertNotNull(service)
    }

    @Test
    fun loginFormValidation_validatesEmailAndPasswordFormat() {
        val viewModel = MainViewModel()

        val emptyValidation = viewModel.validarFormularioLogin("", "")
        assertFalse(emptyValidation.isValid)
        assertNotNull(emptyValidation.correoError)
        assertNotNull(emptyValidation.passwordError)

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
            baseUrl = "http://localhost:3000/api/",
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
}
