# `android/app/src/main/java/org/iinicia/android/ui/screens/LoginScreen.kt`

**En una frase:** la pantalla visual de inicio de sesión en dos pasos (correo+contraseña, luego código de verificación), que solo dibuja lo que `MainUiState` le dice y delega toda la lógica al `MainViewModel` a través de callbacks.

## Por qué existe

Es la primera pantalla que ve cualquier usuario sin sesión. Tiene que soportar dos "modos" visuales (el formulario de correo/contraseña, y el campo de código de 6 dígitos) sin que la pantalla misma sepa nada de JWT, HTTP ni Retrofit — solo reacciona al booleano `uiState.esperandoCodigo2FA` para decidir qué grupo de campos mostrar.

## Recorrido del código

```kotlin
@Composable
fun LoginScreen(
    uiState: MainUiState,
    onFieldEdited: () -> Unit,
    onSubmitLogin: (correo: String, password: String) -> Unit,
    onSubmitCodigo: (codigo: String) -> Unit,
    onVolverAlPaso1: () -> Unit,
    modifier: Modifier = Modifier
) {
    var correo by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var passwordVisible by rememberSaveable { mutableStateOf(false) }
    var codigo by rememberSaveable { mutableStateOf("") }
```

`LoginScreen` no recibe el `MainViewModel` directamente, sino solo el estado (`uiState`) y funciones (callbacks) para notificar acciones. Esto la hace "sin estado propio de negocio" y fácil de previsualizar (`@Preview`) o probar sin un ViewModel real. Lo único que guarda localmente con `rememberSaveable` son los textos que el usuario está escribiendo en ese momento (correo, contraseña, código) y si la contraseña se muestra en claro — `rememberSaveable` hace que esto sobreviva a una rotación de pantalla sin perder lo escrito.

```kotlin
    if (uiState.esperandoCodigo2FA) {
        // ... campo "Código de verificación" + botón "Verificar" + botón "Volver"
    } else {
        // ... campos "Correo institucional" y "Contraseña" + botón "Iniciar sesión"
    }
```

Toda la pantalla es, en esencia, un `if/else` sobre `uiState.esperandoCodigo2FA`. No hay dos pantallas separadas ni navegación de por medio para el cambio de paso 1 a paso 2: es el mismo `Card`, cambiando de contenido según el estado que vino del ViewModel tras llamar `onSubmitLogin`.

```kotlin
            trailingIcon = {
                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                    Icon(
                        imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                        contentDescription = if (passwordVisible) "Ocultar contraseña" else "Mostrar contraseña"
                    )
                }
            },
            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
```

El botón de mostrar/ocultar contraseña es puramente visual (`VisualTransformation`): no cambia el tipo de teclado ni afecta cómo se envía la contraseña al backend, solo si se dibuja como puntos (`•••`) o como texto legible en pantalla.

```kotlin
        Button(
            onClick = { onSubmitLogin(correo, password) },
            enabled = !uiState.isLoading,
            ...
        ) {
            if (uiState.isLoading) {
                CircularProgressIndicator(...)
            } else {
                Text(text = "Iniciar sesión", ...)
            }
        }
```

El botón se deshabilita mientras `isLoading` es verdadero, para evitar que el usuario mande dos veces la misma petición tocando rápido. El propio contenido del botón cambia a un spinner — es un patrón repetido también en el botón "Verificar" del paso 2.

## Conexión con el resto del sistema

- Recibe `MainUiState` (definido en `ui/viewmodel/MainViewModel.kt`).
- `IiniciaNavGraph` (`ui/navigation/IiniciaNavGraph.kt`) es quien conecta sus callbacks a las funciones reales del ViewModel: `onSubmitLogin` → `viewModel.iniciarSesion(...)`, `onSubmitCodigo` → `viewModel.verificarCodigo2FA(...)`, etc.
- Indirectamente, cada envío de este formulario termina llamando `POST /auth/login` y `POST /auth/login/verificar` en el backend, vía `IiniciaRepositoryImpl` e `IiniciaApiService`.

## Cosas que no son obvias a primera vista

- Esta pantalla **nunca** guarda ni envía nada a Moodle: solo conoce correo, contraseña y el código de verificación, todos destinados al backend propio de IINICIA.
- La validación de formato que ve el usuario (mensajes de error bajo cada campo) no ocurre aquí: viene ya calculada en `uiState.correoError`/`uiState.passwordError`, que llena `MainViewModel.validarFormularioLogin`. `LoginScreen` solo los muestra si no son `null`.
- `volverAlPaso1()` (función local de la pantalla) limpia el campo de código antes de notificar al ViewModel, para que si el usuario vuelve a intentar el login no quede un código viejo visible en el siguiente intento.
