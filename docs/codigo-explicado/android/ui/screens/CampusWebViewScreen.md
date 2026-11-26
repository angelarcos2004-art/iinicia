# `android/app/src/main/java/org/iinicia/android/ui/screens/CampusWebViewScreen.kt`

**En una frase:** la única pantalla de la app que muestra una página web real (Moodle) dentro de un `WebView`, ya autenticada por SSO, con la barra superior de IINICIA y sin barra de direcciones.

## Por qué existe

Reimplementar Moodle de forma nativa (tareas, cuestionarios, foros, calificaciones, recursos de todos los tipos de actividad que un profesor pueda configurar) sería un proyecto en sí mismo, y además violaría la regla de "no modificar el core de Moodle" si se intentara replicar su comportamiento exacto por fuera. En vez de eso, la app reutiliza Moodle tal cual es, mostrándolo dentro de un `WebView` embebido — el usuario interactúa con el verdadero Moodle (tareas, calificaciones, todo), pero envuelto visualmente para que se sienta parte de la app IINICIA.

## Recorrido del código

```kotlin
/**
 * Muestra Moodle ya autenticado (SSO) dentro de la app: sin salir a un navegador externo y sin
 * barra de direcciones, para que se sienta como parte de la app y no como "una página web" con
 * localhost o cualquier otra URL de por medio. Es la única pantalla que usa un WebView — el
 * resto (cursos, actividades, perfil) es 100% nativo con datos reales del backend, así que no
 * se incumple el requerimiento 9 ("no debe limitarse a ser una WebView").
 */
```

Este comentario responde directamente a una posible objeción del requerimiento 9: la app no es "solo una WebView" porque todas las demás pantallas (login, dashboard, detalle, perfil) son 100% Compose nativo con datos reales; solo el contenido de Moodle en sí mismo —que ya existe y funciona en el navegador— se muestra así.

```kotlin
    var cargando by remember { mutableStateOf(true) }
    var puedeRegresarEnHistorial by remember { mutableStateOf(false) }
    var webView by remember { mutableStateOf<WebView?>(null) }

    BackHandler(enabled = puedeRegresarEnHistorial) {
        webView?.goBack()
    }
```

`BackHandler` intercepta el botón "atrás" del sistema Android. Si el usuario navegó dentro de Moodle (por ejemplo, de la página de un curso a una actividad), el botón atrás primero regresa en el historial del `WebView` (como esperaría cualquier navegador), no cierra la pantalla de inmediato — eso solo pasa cuando ya no hay más historial dentro del `WebView` (`puedeRegresarEnHistorial = false`).

```kotlin
                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { context ->
                        WebView(context).apply {
                            settings.javaScriptEnabled = true
                            settings.domStorageEnabled = true
                            webViewClient = object : WebViewClient() {
                                override fun onPageFinished(view: WebView, finishedUrl: String) {
                                    cargando = false
                                    puedeRegresarEnHistorial = view.canGoBack()
                                }
                            }
                            webView = this
                            loadUrl(url)
                        }
                    }
                )
```

`AndroidView` es el puente de Compose hacia una vista clásica de Android (`WebView`), que todavía no tiene equivalente nativo en Compose. `javaScriptEnabled = true` y `domStorageEnabled = true` son necesarios porque Moodle es una aplicación web completa que depende de JavaScript y de almacenamiento local del navegador para funcionar correctamente (navegación, formularios, editor de texto enriquecido, etc.) — sin esto, Moodle se vería roto o no funcionaría en absoluto. `onPageFinished` actualiza el spinner de carga y recalcula si ya hay historial para el botón "atrás".

```kotlin
            if (cargando) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            if (url == null) {
                Text(text = "No se encontró el acceso al campus. Vuelve e inténtalo de nuevo.", ...)
            } else {
                AndroidView(...)
            }
```

Si `url` llega como `null` (por ejemplo, si se navegó a esta pantalla sin haber pedido antes una URL de SSO válida), se muestra un mensaje de error en vez de intentar cargar un `WebView` vacío o con una URL inválida.

## Conexión con el resto del sistema

- Recibe la URL desde `MainUiState.urlCampusActual`, llenada por `MainViewModel.fijarUrlCampus(url)` tras una llamada exitosa a `GET /estudiante/moodle-sso`.
- Es el destino final del flujo que empieza en `DetalleCursoScreen` (botón "Entrar al Campus") o en `DashboardScreen` (botón "Abrir en Moodle" de una actividad).
- `IiniciaNavGraph` registra su ruta (`Screen.CampusWebView`) y limpia `urlCampusActual` al volver (`viewModel.fijarUrlCampus(null)`), para que la próxima vez que se abra esta pantalla no reutilice por error una URL de SSO ya expirada.

## Cosas que no son obvias a primera vista

- La URL que recibe esta pantalla es de un solo uso y expira en segundos (según el contrato documentado en `IiniciaApiService.getMoodleSsoUrl`): si el usuario tarda demasiado en llegar a esta pantalla tras pedirla, Moodle podría rechazarla y pedir login — esta pantalla no tiene ninguna lógica para detectar o reintentar ese caso, simplemente muestra lo que Moodle responda dentro del `WebView`.
- No hay ninguna barra de direcciones ni controles de navegador visibles a propósito (ni atrás/adelante/recargar nativos de un navegador): el único control de navegación expuesto es la flecha "Volver" de la `TopAppBar` y el botón físico/gesto "atrás" del sistema.
- Esta es la única pantalla de toda la app donde corre JavaScript arbitrario (el que sirve Moodle) — todo el resto de la app es Compose puro sin ningún motor de renderizado web.
