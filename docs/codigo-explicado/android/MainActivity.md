# `android/app/src/main/java/org/iinicia/android/MainActivity.kt`

**En una frase:** es la puerta de entrada de la app: arranca la pantalla de Compose, pide permiso de notificaciones y decide si la app se abrió "normal" o porque el usuario tocó una notificación push que apunta a un curso específico.

## Por qué existe

Toda app de Android necesita una `Activity` que Android pueda lanzar. En una app 100% Jetpack Compose como esta, esa Activity hace muy poco por sí misma: su único trabajo real es montar el árbol de Compose (`IiniciaNavGraph`) y resolver dos cosas que SÍ necesitan el sistema operativo clásico (no Compose):

1. Pedir el permiso de notificaciones en Android 13+ (`POST_NOTIFICATIONS`), porque sin ese permiso el sistema recibe el push pero no lo muestra.
2. Leer el "deep link" que puede venir en el `Intent` cuando el usuario toca una notificación (ver `IiniciaFirebaseMessagingService`), para saber a qué curso debe navegar la app apenas abra.

## Recorrido del código

```kotlin
class MainActivity : ComponentActivity() {
    private val solicitarPermisoNotificaciones =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* el usuario decide; ... */ }

    private var deepLinkCursoId by mutableStateOf<String?>(null)
```

`solicitarPermisoNotificaciones` es el lanzador del diálogo nativo de Android que pregunta "¿permitir notificaciones?". No hace nada con la respuesta (el comentario lo deja explícito): si el usuario dice que no, la app sigue funcionando igual, solo que no mostrará push.

`deepLinkCursoId` guarda el id del curso al que hay que saltar, si la app se abrió desde una notificación. Está declarado con `mutableStateOf` (el delegado de estado de Compose) para que, en cuanto cambie, `IiniciaNavGraph` reaccione y navegue — no hace falta ningún callback manual.

```kotlin
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        pedirPermisoDeNotificacionesSiHaceFalta()
        deepLinkCursoId = intent?.getStringExtra(EXTRA_CURSO_ID)
        setContent {
            IiniciaTheme {
                val mainViewModel: MainViewModel = viewModel(
                    factory = MainViewModel.provideFactory(
                        repository = IiniciaRepositoryImpl(
                            tokenStorage = EncryptedSessionTokenStorage(applicationContext)
                        )
                    )
                )
                IiniciaNavGraph(
                    viewModel = mainViewModel,
                    deepLinkCursoId = deepLinkCursoId,
                    onDeepLinkConsumido = { deepLinkCursoId = null },
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
    }
```

Aquí pasan varias cosas importantes, en orden:

- `enableEdgeToEdge()` deja que el contenido de la app use toda la pantalla (detrás de la barra de estado/navegación), que es el look moderno esperado en Android.
- `pedirPermisoDeNotificacionesSiHaceFalta()` solo pide el permiso si todavía no se concedió (ver más abajo).
- `deepLinkCursoId` se lee del `Intent` con el que se creó la Activity (`EXTRA_CURSO_ID`), por si la app arrancó "en frío" desde una notificación.
- Dentro de `setContent`, se construye **a mano** el `MainViewModel` con su `IiniciaRepositoryImpl` y, dentro de ese repositorio, el `EncryptedSessionTokenStorage`. Esto es la "inyección de dependencias" de esta app: no hay Hilt/Koin, se construye todo explícitamente aquí porque es un proyecto pequeño. Es el único lugar de todo el código donde se decide **qué implementación real de almacenamiento de sesión se usa** (la cifrada, no la de memoria).
- Todo el resto de la UI (login, dashboard, etc.) vive dentro de `IiniciaNavGraph`, que recibe el ViewModel ya armado.

```kotlin
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        deepLinkCursoId = intent.getStringExtra(EXTRA_CURSO_ID)
    }
```

Esto cubre el caso en que la app **ya está abierta** y el usuario toca otra notificación. Android no vuelve a llamar `onCreate` (porque el `AndroidManifest` declara `launchMode="singleTop"`): en su lugar llama `onNewIntent` con el nuevo `Intent`. Si este método no existiera, tocar una segunda notificación mientras la app está abierta no haría nada.

```kotlin
    private fun pedirPermisoDeNotificacionesSiHaceFalta() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val yaConcedido = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
        if (!yaConcedido) {
            solicitarPermisoNotificaciones.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
```

Antes de Android 13 (Tiramisu) este permiso ni existe — las apps siempre podían notificar — así que la función se sale de inmediato (`return`) en versiones viejas. En Android 13+ primero revisa si ya está concedido (para no spamear el diálogo cada vez que se abre la app) y solo lo pide si falta.

```kotlin
    companion object {
        const val EXTRA_CURSO_ID = "cursoId"
    }
```

Esta constante es el "contrato" compartido entre `MainActivity` e `IiniciaFirebaseMessagingService`: el servicio de push pone el id del curso en el `Intent` bajo esta misma clave, y `MainActivity` lo lee con la misma clave. Si cambiara en un solo lado, el deep link se rompería silenciosamente.

## Conexión con el resto del sistema

- Construye `IiniciaRepositoryImpl` con `EncryptedSessionTokenStorage`, que es la implementación real (cifrada) de `SessionTokenStorage` usada en toda la app.
- Pasa el `MainViewModel` ya armado a `IiniciaNavGraph` (`ui/navigation/IiniciaNavGraph.kt`), que es quien decide qué pantalla mostrar primero.
- Recibe el `Intent` que genera `IiniciaFirebaseMessagingService` (`push/IiniciaFirebaseMessagingService.kt`) cuando el usuario toca una notificación, usando la constante `EXTRA_CURSO_ID` y la clase `IiniciaNavGraph` para resolver el deep link hacia `DetalleCursoScreen`.

## Cosas que no son obvias a primera vista

- No hay ningún framework de inyección de dependencias: todo se conecta a mano en `onCreate`. Es intencional para un proyecto de este tamaño, pero significa que si algún día se necesita otra implementación de `SessionTokenStorage` (p. ej. para tests instrumentados), hay que cambiarla aquí.
- `deepLinkCursoId` no navega directo: solo guarda el dato. La navegación real ocurre en `IiniciaNavGraph`, que espera a que haya sesión y los cursos ya estén cargados antes de saltar al detalle (evita abrir un curso que todavía no existe en memoria).
- Negar el permiso de notificaciones no bloquea nada de la app: es un permiso "mejor tenerlo", no una condición de uso.
