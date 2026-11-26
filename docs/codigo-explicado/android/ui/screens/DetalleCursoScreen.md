# `android/app/src/main/java/org/iinicia/android/ui/screens/DetalleCursoScreen.kt`

**En una frase:** muestra el detalle de un curso específico (nombre, periodo, estado, progreso) y el botón "Entrar al Campus" que lleva a Moodle ya autenticado dentro de la propia app.

## Por qué existe

El requerimiento 9.1 del proyecto pide un "detalle básico de cada curso" dentro de la app nativa, no solo la lista del dashboard. Esta pantalla también es el punto de entrada principal hacia Moodle desde el flujo normal de navegación (a diferencia de `DashboardScreen`, que entra a Moodle solo desde una actividad puntual).

## Recorrido del código

```kotlin
/**
 * Pantalla de detalle de curso (requerimientos 9.1: "detalle básico de cada curso").
 * Moodle no expone docente/descripción/actividades en `GET /estudiante/cursos`, así que esos
 * campos no se muestran inventados: solo lo que el backend sí reporta de verdad.
 *
 * "Entrar al Campus" reutiliza el mismo SSO del portal web (auth_userkey): pide una URL de un
 * solo uso y la abre en CampusWebViewScreen (dentro de la app, con la barra de IINICIA, sin
 * barra de direcciones) — nunca en un navegador externo ni en Custom Tabs, para que no se vea
 * como "una página web" con una URL de por medio.
 */
```

Este comentario explica dos decisiones de diseño importantes a la vez: por qué la pantalla no muestra nombre de docente/descripción/actividades (porque serían datos inventados, no reales — ver también `IiniciaRepository.aCursoEstudiante()`), y por qué Moodle se abre en un `WebView` propio en vez de en el navegador del teléfono o en Chrome Custom Tabs: la intención de producto es que se sienta parte de la app IINICIA, no "salir a internet".

```kotlin
    if (curso == null) {
        Column(modifier = Modifier.fillMaxSize().padding(innerPadding).padding(20.dp)) {
            Text(text = "No se encontró este curso. Vuelve al dashboard e intenta de nuevo.", ...)
        }
        return@Scaffold
    }
```

`curso` puede ser `null` si, por ejemplo, el usuario llegó aquí con un `cursoId` que ya no existe en `MainViewModel.obtenerCursoPorId` (el curso vive solo en memoria, llenado al cargar el dashboard — ver `MainViewModel.kt`). En vez de crashear con un `NullPointerException` o mostrar una pantalla en blanco, se avisa explícitamente y se corta el resto del contenido con `return@Scaffold`.

```kotlin
                    if (curso.progreso != null) {
                        ... LinearProgressIndicator + "${curso.progreso}% completado"
                    } else {
                        Text(text = "Este curso no tiene seguimiento de progreso activado en Moodle.", ...)
                    }
```

Mismo patrón que en `DashboardScreen`: `progreso == null` no se trata como "0%", sino que se explica al usuario por qué no hay barra de progreso en absoluto (Moodle no tiene "finalización de curso" configurada para ese curso en particular).

```kotlin
                Button(
                    onClick = {
                        errorCampus = null
                        abriendoCampus = true
                        scope.launch {
                            onEntrarAlCampus()
                                .onSuccess { url ->
                                    abriendoCampus = false
                                    onUrlObtenida(url)
                                }
                                .onFailure { error ->
                                    abriendoCampus = false
                                    errorCampus = error.message ?: "No se pudo abrir el campus. Intenta más tarde."
                                }
                        }
                    },
                    enabled = !abriendoCampus,
                    ...
```

`onEntrarAlCampus` es `suspend () -> Result<String>`, en la práctica conectado a `viewModel.obtenerUrlCampus(cursoId)` desde `IiniciaNavGraph`. El botón se deshabilita (`enabled = !abriendoCampus`) mientras espera la respuesta, para que no se disparen dos peticiones de SSO simultáneas si el usuario toca varias veces mientras carga.

## Conexión con el resto del sistema

- Recibe el `CursoEstudiante` ya resuelto por `MainViewModel.obtenerCursoPorId(cursoId)` (dato en memoria, sin llamada de red adicional).
- `onEntrarAlCampus` termina llamando `GET /estudiante/moodle-sso` en el backend (vía `IiniciaApiService.getMoodleSsoUrl`).
- `onUrlObtenida` guarda la URL en `MainUiState.urlCampusActual` y navega a `CampusWebViewScreen`.
- `IiniciaNavGraph` la registra en la ruta `Screen.DetalleCurso` (`"curso/{cursoId}"`), que también es el destino de los deep links de notificaciones push.

## Cosas que no son obvias a primera vista

- Esta pantalla nunca recibe ni maneja ningún token de Moodle: solo recibe de vuelta una URL ya lista para abrir (de un solo uso, que expira en segundos según el comentario de `IiniciaApiService.getMoodleSsoUrl`).
- El `WebView` real no vive aquí: esta pantalla solo pide la URL y la entrega hacia arriba (`onUrlObtenida`); quien efectivamente renderiza Moodle es `CampusWebViewScreen`, una pantalla separada.
- Si Moodle no tiene seguimiento de progreso configurado, la pantalla lo dice explícitamente en vez de simplemente omitir la sección — es una decisión consciente de transparencia con el usuario.
