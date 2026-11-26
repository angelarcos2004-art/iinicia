# `android/app/src/main/java/org/iinicia/android/ui/components/ConfirmarCerrarSesionDialog.kt`

**En una frase:** un diálogo de confirmación reutilizable que se interpone entre tocar "Cerrar sesión" y que la sesión realmente se cierre.

## Por qué existe

Cerrar sesión es una acción con costo real para el usuario (tiene que volver a pasar por el login de dos factores para entrar otra vez). Un toque accidental en el botón —fácil de que pase en un botón que vive en la barra superior o al final de una pantalla con scroll— no debería expulsar a nadie sin aviso. Este componente es esa pausa de seguridad, extraída a un solo archivo porque se usa en dos pantallas distintas (`DashboardScreen` y `PerfilScreen`), y duplicar el mismo `AlertDialog` en ambas invitaría a que un día quedaran con textos o comportamientos ligeramente distintos.

## Recorrido del código

```kotlin
@Composable
fun ConfirmarCerrarSesionDialog(
    onConfirmar: () -> Unit,
    onCancelar: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onCancelar,
        title = { Text("Cerrar sesión") },
        text = { Text("¿Seguro que quieres salir de tu sesión en IINICIA Campus Móvil?") },
        confirmButton = {
            TextButton(onClick = onConfirmar) {
                Text("Cerrar sesión")
            }
        },
        dismissButton = {
            TextButton(onClick = onCancelar) {
                Text("Cancelar")
            }
        }
    )
}
```

Es un `AlertDialog` estándar de Material 3 sin lógica propia: no sabe nada de `ViewModel`, repositorio, ni sesión real — solo expone dos callbacks (`onConfirmar`/`onCancelar`) que quien lo use debe conectar a lo que realmente signifique "confirmar" o "cancelar" en ese contexto. `onDismissRequest = onCancelar` cubre también el caso de que el usuario toque fuera del diálogo o presione "atrás": eso cuenta como cancelar, no como confirmar.

## Conexión con el resto del sistema

- `DashboardScreen` lo muestra cuando se toca "Cerrar sesión" en la barra superior, conectando `onConfirmar` a la función `onLogout` que recibe esa pantalla (en la práctica, `viewModel.cerrarSesion()` + navegación a Login, ver `IiniciaNavGraph`).
- `PerfilScreen` lo usa exactamente igual para su propio botón "Cerrar sesión".

## Cosas que no son obvias a primera vista

- No tiene ningún estado propio (ni `remember`, ni booleanos internos): quien lo usa es responsable de guardar un booleano ("¿se debe mostrar este diálogo ahora?") y de dejar de mostrarlo tanto en `onConfirmar` como en `onCancelar` — ambas pantallas que lo consumen siguen ese mismo patrón.
