package org.iinicia.android.ui.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.iinicia.android.data.local.EncryptedSessionTokenStorage
import org.iinicia.android.data.model.CursoEstudiante
import org.iinicia.android.data.model.DashboardEstudiante
import org.iinicia.android.data.model.Usuario
import org.iinicia.android.data.repository.IiniciaRepository
import org.iinicia.android.data.repository.IiniciaRepositoryImpl

data class LoginValidationResult(
    val correoError: String? = null,
    val passwordError: String? = null
) {
    val isValid: Boolean
        get() = correoError == null && passwordError == null
}

/**
 * Estado de interfaz expuesto por [MainViewModel] hacia la capa UI (Jetpack Compose).
 */
data class MainUiState(
    val baseUrl: String = "",
    val isLoading: Boolean = false,
    val correoError: String? = null,
    val passwordError: String? = null,
    val usuarioAutenticado: Usuario? = null,
    val cursos: List<CursoEstudiante> = emptyList(),
    val dashboard: DashboardEstudiante? = null,
    val errorMessage: String? = null
)

class MainViewModel(
    private val repository: IiniciaRepository = IiniciaRepositoryImpl()
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        MainUiState(
            baseUrl = repository.baseUrl,
            usuarioAutenticado = repository.getCurrentSessionUser()
        )
    )
    val uiState: StateFlow<MainUiState> = _uiState.asStateFlow()

    fun limpiarErroresFormulario() {
        _uiState.update {
            it.copy(correoError = null, passwordError = null, errorMessage = null)
        }
    }

    /**
     * Valida en el cliente el formato del correo electrónico y la contraseña.
     */
    fun validarFormularioLogin(correo: String, password: String): LoginValidationResult {
        val trimmedEmail = correo.trim()
        val emailRegex = Regex("^\\S+@\\S+\\.\\S+$")

        val correoError = when {
            trimmedEmail.isEmpty() -> "Ingresa tu correo institucional o de aspirante."
            !emailRegex.matches(trimmedEmail) -> "Ingresa un correo electrónico válido (ej. alumno@iinicia.edu.mx)."
            else -> null
        }

        val passwordError = when {
            password.isEmpty() -> "Ingresa tu contraseña."
            password.length < 8 -> "La contraseña debe tener al menos 8 caracteres."
            else -> null
        }

        return LoginValidationResult(
            correoError = correoError,
            passwordError = passwordError
        )
    }

    /**
     * Valida los campos en el cliente y ejecuta el inicio de sesión contra el repositorio
     * (conectado al backend BFF real en `http://10.0.2.2:3001/`).
     *
     * Confirmación de seguridad:
     * La contraseña solo viaja en la petición de autenticación hacia el BFF y jamás se persiste
     * en almacenamiento local; `EncryptedSessionTokenStorage` guarda únicamente el JWT y los
     * datos públicos de `Usuario`.
     */
    fun iniciarSesion(
        correo: String,
        password: String,
        onLoginSuccess: () -> Unit = {}
    ) {
        val validation = validarFormularioLogin(correo, password)
        if (!validation.isValid) {
            _uiState.update {
                it.copy(
                    correoError = validation.correoError,
                    passwordError = validation.passwordError,
                    errorMessage = null
                )
            }
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true,
                    correoError = null,
                    passwordError = null,
                    errorMessage = null
                )
            }

            repository.login(correo.trim(), password)
                .onSuccess { authResponse ->
                    val dashboardResult = repository.getDashboardEstudiante().getOrNull()
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            usuarioAutenticado = authResponse.usuario,
                            dashboard = dashboardResult,
                            cursos = dashboardResult?.cursos ?: emptyList()
                        )
                    }
                    onLoginSuccess()
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = error.message ?: "No se pudo iniciar sesión."
                        )
                    }
                }
        }
    }

    fun cerrarSesion() {
        repository.logout()
        _uiState.update {
            it.copy(
                usuarioAutenticado = null,
                dashboard = null,
                cursos = emptyList(),
                correoError = null,
                passwordError = null,
                errorMessage = null
            )
        }
    }

    companion object {
        /**
         * Factory de producción que inyecta [EncryptedSessionTokenStorage] (`EncryptedSharedPreferences`)
         * en [IiniciaRepositoryImpl] para persistir de forma segura el token JWT y datos del usuario.
         */
        fun provideFactory(
            context: Context
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                val secureTokenStorage = EncryptedSessionTokenStorage(context.applicationContext)
                val repository = IiniciaRepositoryImpl(
                    tokenStorage = secureTokenStorage,
                    isConnectToRemoteEnabled = true
                )
                return MainViewModel(repository) as T
            }
        }

        /**
         * Sobrecarga para inyectar un repositorio específico en pruebas unitarias.
         */
        fun provideFactory(
            repository: IiniciaRepository
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return MainViewModel(repository) as T
            }
        }
    }
}
