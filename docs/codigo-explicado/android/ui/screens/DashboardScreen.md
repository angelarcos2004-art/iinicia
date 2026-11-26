# `android/app/src/main/java/org/iinicia/android/ui/screens/DashboardScreen.kt`

**En una frase:** la pantalla principal tras iniciar sesión: muestra la bienvenida, la lista de cursos reales del estudiante y sus próximas actividades con fecha límite, con estados claros de carga/error/vacío.

## Por qué existe

Es el "home" de la app para un estudiante autenticado. Tiene que resolver un problema de UX delicado: diferenciar "estamos cargando tus cursos", "algo falló al pedirlos" y "de verdad no tienes ningún curso asignado todavía" — tres situaciones muy distintas que, mostradas igual (p. ej. una lista vacía en los tres casos), confundirían al usuario sobre si debe esperar, reintentar, o contactar a un administrador.

## Recorrido del código

```kotlin
    val cursos: List<CursoEstudiante> = uiState.cursos
    var mostrarConfirmacionLogout by remember { mutableStateOf(false) }
    var abriendoActividadId by remember { mutableStateOf<Int?>(null) }
    var errorActividad by remember { mutableStateOf<String?>(null) }
```

`abriendoActividadId` guarda qué actividad específica se está abriendo en este momento (no solo un booleano general), porque la lista puede tener varias actividades con botón "Abrir en Moodle" y hay que saber cuál mostrar como "Abriendo…" sin afectar a las demás.

```kotlin
    if (uiState.cargandoCursos) {
        item { /* Card: "Consultando tus cursos en Moodle…" */ }
    } else if (uiState.errorCursos != null) {
        item { /* Card con el mensaje de error + botón "Reintentar" */ }
    } else if (cursos.isEmpty()) {
        item { /* Card: "Aún no tienes acceso a ningún curso" */ }
    } else {
        items(cursos, key = { it.id }) { curso -> /* Card de cada curso */ }
    }
```

Esta cadena de `if/else` es la resolución visual exacta del problema descrito arriba: cada una de las tres situaciones especiales (cargando, error, vacío real) tiene su propia tarjeta con un mensaje distinto, y solo si ninguna aplica se dibuja la lista real de cursos. El botón "Reintentar" en el caso de error llama `onReintentarCursos`, que termina en `viewModel.cargarCursos()` — la misma función que cargó el dashboard la primera vez.

```kotlin
                                if (curso.progreso != null) {
                                    Spacer(modifier = Modifier.height(10.dp))
                                    LinearProgressIndicator(
                                        progress = { curso.progreso / 100f },
                                        ...
                                    )
                                    ...
                                    Text(text = "${curso.progreso}% completado", ...)
                                }
```

La barra de progreso solo se dibuja si `curso.progreso != null`. Como se explicó en `Models.kt`, un `progreso` nulo significa que Moodle no tiene seguimiento de avance configurado para ese curso — en vez de mostrar una barra en 0% (que insinuaría "no has avanzado nada" cuando en realidad el dato simplemente no existe), la pantalla no dibuja ninguna barra en absoluto.

```kotlin
                                val actividadUrl = actividad.url
                                if (actividadUrl != null) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    OutlinedButton(
                                        onClick = {
                                            errorActividad = null
                                            abriendoActividadId = actividad.id
                                            scope.launch {
                                                onAbrirActividad(actividadUrl)
                                                    .onSuccess { ssoUrl ->
                                                        abriendoActividadId = null
                                                        onUrlObtenida(ssoUrl)
                                                    }
                                                    .onFailure { error ->
                                                        abriendoActividadId = null
                                                        errorActividad = error.message ?: "No se pudo abrir la actividad. Intenta más tarde."
                                                    }
                                            }
                                        },
                                        enabled = abriendoActividadId != actividad.id
                                    ) {
                                        Text(if (abriendoActividadId == actividad.id) "Abriendo…" else "Abrir en Moodle")
                                    }
                                }
```

`onAbrirActividad` es una función `suspend` que viene de fuera (en la práctica, `viewModel.obtenerUrlCampusActividad(actividadUrl)`): pide al backend una URL de SSO de un solo uso apuntando directo a esa actividad dentro de Moodle. Se lanza con `scope.launch` (un `rememberCoroutineScope()`) porque un `onClick` normal de Compose no puede ser `suspend` directamente. Al tener éxito, `onUrlObtenida(ssoUrl)` guarda esa URL en el estado del ViewModel y navega a `CampusWebViewScreen` (ver `IiniciaNavGraph`).

```kotlin
private fun formatFechaActividad(fechaIso: String): String {
    if (fechaIso.length < 10) return fechaIso
    val (anio, mes, dia) = fechaIso.substring(0, 10).split("-").takeIf { it.size == 3 }
        ?: return fechaIso
    return "$dia/$mes/$anio"
}
```

Convierte `"2026-11-01T00:00:00.000Z"` en `"01/11/2026"` recortando manualmente el string en vez de usar `java.time` — el comentario del código explica que es porque el módulo no tiene "core library desugaring" habilitado y el `minSdk` es 24 (versiones de Android donde `java.time` no está disponible de forma nativa). Es una solución deliberadamente simple para no agregar una dependencia solo por esto.

## Conexión con el resto del sistema

- Consume `MainUiState.cursos` y `MainUiState.actividades`, llenados por `MainViewModel.cargarCursos()` desde `GET /estudiante/cursos` y `GET /estudiante/actividades`.
- Usa `ConfirmarCerrarSesionDialog` (`ui/components/ConfirmarCerrarSesionDialog.kt`) antes de ejecutar `onLogout`.
- `IiniciaNavGraph` conecta `onCursoClick` a la navegación hacia `DetalleCursoScreen`, y `onPerfilClick` hacia `PerfilScreen`.
- `onAbrirActividad`/`onUrlObtenida` terminan abriendo `CampusWebViewScreen` con una URL de SSO hacia Moodle.

## Cosas que no son obvias a primera vista

- El conteo "Mis cursos (N)" en el encabezado siempre refleja `cursos.size`, incluso mientras está cargando o en error — solo la lista de abajo cambia según el estado; esto es una decisión menor de diseño, no un bug.
- `onCursoClick`, `onPerfilClick`, `onReintentarCursos`, `onAbrirActividad` y `onUrlObtenida` todos tienen valores por defecto vacíos/no-operativos en la firma de la función, lo cual permite usar `DashboardScreen` en un `@Preview` (ver `DashboardScreenPreview` al final del archivo) sin tener que simular cada callback.
- Nunca se llama a Moodle directo desde aquí: todas las URLs de Moodle se obtienen siempre a través del backend (`onAbrirActividad`/`onEntrarAlCampus`), nunca están hardcodeadas en esta pantalla.
