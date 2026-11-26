# `android/app/src/main/java/org/iinicia/android/ui/screens/PerfilScreen.kt`

**En una frase:** muestra los datos del usuario autenticado (nombre, correo, rol) y el interruptor para activar/desactivar notificaciones push, además del botón de cerrar sesión.

## Por qué existe

Cubre el requerimiento de "acceso al perfil del estudiante" y, sobre todo, da al usuario control real sobre si quiere recibir notificaciones push (requerimiento 9.3: "notificaciones configurables por el usuario"). Es una pantalla deliberadamente simple: no permite editar nada, solo mostrar lo que ya se tiene y alternar una preferencia del dispositivo.

## Recorrido del código

```kotlin
/**
 * Pantalla de perfil (requerimientos 9.1: "acceso al perfil del estudiante"). Muestra lo que
 * ya devolvió el backend en el login (`/auth/login`, revalidado por rol en cada request), no
 * pide otra llamada de red para algo que ya se tiene en memoria.
 */
@Composable
fun PerfilScreen(
    usuario: Usuario?,
    notificacionesHabilitadas: Boolean,
    onAlternarNotificaciones: (Boolean) -> Unit,
    onLogout: () -> Unit,
    onVolver: () -> Unit,
    modifier: Modifier = Modifier
) {
```

No hay ninguna llamada de red en esta pantalla ni en su construcción: `usuario` viene directo de `MainUiState.usuarioAutenticado`, que ya se llenó en el login. Esto es deliberado — mostrar el perfil no necesita "refrescar" nada del backend porque los datos del usuario no cambian durante la sesión salvo que cierre sesión y vuelva a entrar.

```kotlin
            Card(...) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(20.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(text = "Notificaciones push", ...)
                        Text(text = "Avisos académicos y eventos relevantes", ...)
                    }
                    Switch(
                        checked = notificacionesHabilitadas,
                        onCheckedChange = onAlternarNotificaciones
                    )
                }
            }
```

El `Switch` es el único control interactivo real de esta pantalla (fuera de "cerrar sesión"). `onCheckedChange = onAlternarNotificaciones` conecta directo al callback — no hay estado local intermedio, porque el valor mostrado (`notificacionesHabilitadas`) viene del ViewModel y cualquier cambio se refleja de inmediato ahí mismo (ver `MainViewModel.alternarNotificaciones`), que a su vez lo persiste en `EncryptedSessionTokenStorage`.

```kotlin
    var mostrarConfirmacionLogout by remember { mutableStateOf(false) }

    if (mostrarConfirmacionLogout) {
        ConfirmarCerrarSesionDialog(
            onConfirmar = { mostrarConfirmacionLogout = false; onLogout() },
            onCancelar = { mostrarConfirmacionLogout = false }
        )
    }
    ...
    Button(
        onClick = { mostrarConfirmacionLogout = true },
        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
        ...
    ) {
        Text("Cerrar sesión")
    }
```

El botón de cerrar sesión no cierra la sesión directamente: primero muestra el diálogo de confirmación (`ConfirmarCerrarSesionDialog`), igual que en `DashboardScreen`. El color de error (rojo) en el botón es una señal visual intencional de que es una acción destructiva/irreversible para la sesión actual.

## Conexión con el resto del sistema

- Recibe `Usuario` y el booleano de notificaciones desde `MainUiState` (`ui/viewmodel/MainViewModel.kt`).
- Usa `ConfirmarCerrarSesionDialog` (`ui/components/ConfirmarCerrarSesionDialog.kt`).
- `onAlternarNotificaciones` llama a `MainViewModel.alternarNotificaciones`, que termina en `IiniciaRepository.setNotificacionesHabilitadas` → `SessionTokenStorage.setNotificacionesHabilitadas` (persistido cifrado).
- La misma preferencia que aquí se alterna es la que revisa `IiniciaFirebaseMessagingService.onMessageReceived` antes de mostrar cualquier notificación.
- `IiniciaNavGraph` la registra en la ruta `Screen.Perfil`, accesible desde el ícono de cuenta en `DashboardScreen`.

## Cosas que no son obvias a primera vista

- Apagar el interruptor de notificaciones no desregistra el token push del dispositivo en el backend: la app sigue recibiendo el mensaje de Firebase, solo que `IiniciaFirebaseMessagingService` decide no mostrarlo (ver ese archivo). Es un filtro local, no una baja de suscripción del lado del servidor.
- La preferencia de notificaciones sobrevive a cerrar sesión (ver `EncryptedSessionTokenStorage.clearSession`), así que si el mismo usuario (o otro, en el mismo dispositivo) vuelve a entrar, el interruptor recuerda el último valor que se dejó.
