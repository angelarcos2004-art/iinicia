# `android/app/src/main/java/org/iinicia/android/ui/viewmodel/MainViewModel.kt`

**En una frase:** mantiene todo el estado de la UI de la app (sesión, cursos, errores, flujo de 2FA) en un único `StateFlow`, y expone las acciones que las pantallas pueden disparar sin que ellas tengan que saber cómo hablar con el backend.

## Por qué existe

Jetpack Compose necesita algo que sobreviva a recomposiciones y rotaciones de pantalla, y que separe "qué se muestra" de "cómo se obtiene ese dato". Un `ViewModel` de Android es justo eso: vive más tiempo que una sola pantalla y es el lugar correcto para coordinar llamadas asíncronas (corutinas) sin que una `Composable` function tenga que preocuparse de cancelación, hilos o reintentos. Aquí específicamente, separar el estado (`MainUiState`, una `data class` inmutable) de las funciones que lo modifican hace que cada pantalla (`LoginScreen`, `DashboardScreen`, etc.) sea "tonta": solo lee el estado actual y llama funciones, nunca decide por sí misma si hay sesión válida o si debe reintentar una llamada.

## Recorrido del código

```kotlin
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
    val esperandoCodigo2FA: Boolean = false,
    val correoPendiente2FA: String? = null,
    val cargandoCursos: Boolean = false,
    val errorCursos: String? = null,
    val urlCampusActual: String? = null,
    val notificacionesHabilitadas: Boolean = true
)
```

Es un solo objeto inmutable que representa "todo lo que la UI necesita saber en este instante". Cada campo tiene un propósito deliberado; dos merecen atención especial:
- `cargandoCursos` + `errorCursos` (ambos nulos vs. no nulos) existen para distinguir **tres** estados distintos de "Mis cursos": cargando, error real, y "de verdad no tiene cursos". Si solo existiera `cursos.isEmpty()`, no se podría diferenciar "todavía no sabemos" de "sabemos que no tiene ninguno".
- `urlCampusActual` no es parte del "estado persistente" de la sesión: es una acción puntual (abrir Moodle) que se guarda temporalmente en el estado solo para que `CampusWebViewScreen` la lea, y se limpia al volver de esa pantalla.

```kotlin
class MainViewModel(
    private val repository: IiniciaRepository = IiniciaRepositoryImpl()
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        MainUiState(
            baseUrl = repository.baseUrl,
            usuarioAutenticado = repository.getCurrentSessionUser(),
            notificacionesHabilitadas = repository.notificacionesHabilitadas()
        )
    )
    val uiState: StateFlow<MainUiState> = _uiState.asStateFlow()
```

El patrón `_uiState` (privado, mutable) + `uiState` (público, solo lectura) es estándar en Compose/Android: ninguna pantalla puede modificar el estado directamente, solo observarlo (`collectAsStateWithLifecycle` en `IiniciaNavGraph`) y pedir cambios a través de las funciones del ViewModel. El estado inicial ya lee `repository.getCurrentSessionUser()`: si había una sesión guardada de una apertura anterior de la app, el ViewModel nace ya "logueado", sin esperar ninguna llamada de red.

```kotlin
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
        return LoginValidationResult(correoError = correoError, passwordError = passwordError)
    }
```

Esta validación es puramente de experiencia de usuario (formato de correo, longitud mínima): evita una llamada de red inútil si el usuario claramente no llenó el formulario bien. Pero —siguiendo la regla de `CLAUDE.md` ("los permisos se validan en el backend, no solo en la interfaz")— esta validación **nunca** es la única barrera: el backend vuelve a validar todo del lado del servidor independientemente de lo que Android ya haya verificado.

```kotlin
    fun iniciarSesion(correo: String, password: String) {
        val validation = validarFormularioLogin(correo, password)
        if (!validation.isValid) {
            _uiState.update { it.copy(correoError = validation.correoError, ...) }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, ...) }
            repository.login(correo.trim(), password)
                .onSuccess { respuesta ->
                    _uiState.update { it.copy(isLoading = false, esperandoCodigo2FA = true, correoPendiente2FA = respuesta.correo) }
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false, errorMessage = error.message ?: "No se pudo iniciar sesión.") }
                }
        }
    }
```

`viewModelScope.launch` ata la corutina al ciclo de vida del ViewModel: si la pantalla se destruye antes de que la respuesta llegue, la corutina se cancela automáticamente, evitando actualizar un estado que ya nadie observa. El resultado de `repository.login` (un `Result<Requiere2FAResponse>`) se maneja con `onSuccess`/`onFailure`, dejando el código lineal y legible en vez de un `try/catch` anidado.

```kotlin
    fun cargarCursos() {
        viewModelScope.launch {
            _uiState.update { it.copy(cargandoCursos = true, errorCursos = null) }
            repository.getDashboardEstudiante()
                .onSuccess { dashboard -> _uiState.update { it.copy(cargandoCursos = false, dashboard = dashboard, cursos = dashboard.cursos, actividades = dashboard.actividades) } }
                .onFailure { error ->
                    if (error is SesionExpiradaException) {
                        cerrarSesion()
                    } else {
                        _uiState.update { it.copy(cargandoCursos = false, errorCursos = error.message ?: "No se pudieron cargar tus cursos. Intenta de nuevo.") }
                    }
                }
        }
    }
```

Aquí se ve el manejo especial de `SesionExpiradaException`: si el error es justamente ese (el repositorio ya detectó un 401 y limpió el token guardado), el ViewModel no lo trata como "error de carga de cursos" sino que llama `cerrarSesion()` directamente, lo cual pone `usuarioAutenticado = null` y hace que `IiniciaNavGraph` redirija a Login automáticamente.

```kotlin
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
```

Se llama justo después de un login exitoso (ver `verificarCodigo2FA`), para cubrir el caso normal donde el token FCM del dispositivo ya existía desde antes de iniciar sesión (así nunca se dispara `IiniciaFirebaseMessagingService.onNewToken`, que es el otro lugar donde se registra ese token). El `try/catch` amplio es deliberado: Firebase puede no estar disponible en pruebas unitarias JVM, y una falla aquí nunca debe tumbar un login que de otro modo fue exitoso.

## Conexión con el resto del sistema

- Consume únicamente `IiniciaRepository` (nunca `IiniciaApiService` directo).
- Expone `uiState: StateFlow<MainUiState>`, que todas las pantallas (`LoginScreen`, `DashboardScreen`, `DetalleCursoScreen`, `PerfilScreen`, `CampusWebViewScreen`) y `IiniciaNavGraph` observan.
- `IiniciaNavGraph` llama a casi todas sus funciones públicas (`iniciarSesion`, `verificarCodigo2FA`, `cargarCursos`, `cerrarSesion`, `obtenerUrlCampus`, `alternarNotificaciones`, etc.) como respuesta a acciones del usuario en la UI.
- `MainActivity.provideFactory(...)` es quien construye la única instancia real de este ViewModel para toda la app.

## Cosas que no son obvias a primera vista

- `esperandoCodigo2FA` y `correoPendiente2FA` son el "estado temporal" del segundo factor: viven solo en memoria mientras dura el flujo de login, y se limpian tanto al completar el login (`verificarCodigo2FA`) como al cancelarlo (`volverAlPaso1Login`) como al cerrar sesión (`cerrarSesion`).
- `obtenerCursoPorId` no hace ninguna llamada de red: busca en la lista de cursos que ya está en memoria (`_uiState.value.cursos`), que se llenó cuando se cargó el dashboard. Esto evita una llamada redundante solo para abrir el detalle de un curso ya visto.
- `cerrarSesionSiExpiro` es un patrón reutilizado tanto en `obtenerUrlCampus` como en `obtenerUrlCampusActividad`: cualquier intento de entrar a Moodle con un JWT vencido también cierra sesión automáticamente, no solo la carga del dashboard.
