package org.iinicia.android.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.iinicia.android.data.model.ActividadProximaDto
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
    val actividades: List<ActividadProximaDto> = emptyList(),
    val dashboard: DashboardEstudiante? = null,
    val errorMessage: String? = null,
    /** Null = sin error. "Mis cursos (0)" solo significa "sin cursos" cuando esto es null. */
    val cargandoCursos: Boolean = false,
    val errorCursos: String? = null,
    /** URL de un solo uso para CampusWebViewScreen; se limpia al volver de esa pantalla. */
    val urlCampusActual: String? = null
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
     * Valida los campos en el cliente y envía el login al repositorio (BFF real por defecto,
     * ver `IiniciaRepositoryImpl.isConnectToRemoteEnabled`).
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
                    _uiState.update {
                        it.copy(isLoading = false, usuarioAutenticado = authResponse.usuario)
                    }
                    cargarCursos()
                    registrarTokenPushActual()
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

    /**
     * Carga (o recarga, p. ej. tras un error con "Reintentar") el dashboard del usuario ya
     * autenticado. Si falla, lo deja explícito en `errorCursos` en vez de mostrar "0 cursos"
     * como si de verdad no tuviera ninguno (p. ej. un timeout real contra Moodle).
     */
    fun cargarCursos() {
        viewModelScope.launch {
            _uiState.update { it.copy(cargandoCursos = true, errorCursos = null) }
            repository.getDashboardEstudiante()
                .onSuccess { dashboard ->
                    _uiState.update {
                        it.copy(
                            cargandoCursos = false,
                            dashboard = dashboard,
                            cursos = dashboard.cursos,
                            actividades = dashboard.actividades
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            cargandoCursos = false,
                            errorCursos = error.message ?: "No se pudieron cargar tus cursos. Intenta de nuevo."
                        )
                    }
                }
        }
    }

    /** Curso ya cargado en memoria (viene de `iniciarSesion`); evita otra llamada de red. */
    fun obtenerCursoPorId(cursoId: String): CursoEstudiante? =
        _uiState.value.cursos.firstOrNull { it.id == cursoId }

    /**
     * URL de un solo uso para abrir Moodle ya autenticado (SSO), que se muestra en
     * CampusWebViewScreen vía [fijarUrlCampus]. Es una acción puntual de los botones "Entrar al
     * Campus"/"Abrir en Moodle", no vive en uiState hasta que se obtiene.
     */
    suspend fun obtenerUrlCampus(cursoId: String?): Result<String> =
        repository.getUrlCampus(cursoId?.toIntOrNull())

    /** Igual que [obtenerUrlCampus], pero aterriza directo en la actividad (no en el curso). */
    suspend fun obtenerUrlCampusActividad(actividadUrl: String): Result<String> =
        repository.getUrlCampus(actividadUrl = actividadUrl)

    /** Guarda (o limpia, con null) la URL que CampusWebViewScreen debe mostrar. */
    fun fijarUrlCampus(url: String?) {
        _uiState.update { it.copy(urlCampusActual = url) }
    }

    /**
     * Registra el token FCM del dispositivo justo después de iniciar sesión (cubre el caso
     * normal: el token ya existía desde antes de este login, así que
     * [IiniciaFirebaseMessagingService.onNewToken] no vuelve a dispararse). Nunca bloquea el
     * login ni muestra error: es una mejora de la experiencia, no una condición para usar la app.
     */
    private fun registrarTokenPushActual() {
        try {
            FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
                viewModelScope.launch { repository.registrarTokenPush(token) }
            }
        } catch (e: Exception) {
            // Firebase no inicializado (p. ej. pruebas unitarias en JVM puro, sin contexto
            // Android real) o google-services.json inválido: el login ya funcionó, esto es
            // solo una mejora adicional, así que no debe propagarse.
        }
    }

    fun cerrarSesion() {
        repository.logout()
        _uiState.update {
            it.copy(
                usuarioAutenticado = null,
                dashboard = null,
                cursos = emptyList(),
                actividades = emptyList(),
                correoError = null,
                passwordError = null,
                errorMessage = null,
                cargandoCursos = false,
                errorCursos = null,
                urlCampusActual = null
            )
        }
    }

    companion object {
        fun provideFactory(
            repository: IiniciaRepository = IiniciaRepositoryImpl()
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return MainViewModel(repository) as T
            }
        }
    }
}
