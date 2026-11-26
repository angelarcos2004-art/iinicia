# `infrastructure/moodle-custom/auth/userkey/logout.php`

**En una frase:** endpoint HTTP (`/auth/userkey/logout.php?return=...`) que cierra la sesión de Moodle de un usuario que entró vía `auth_userkey` y lo regresa a una URL local.

## Por qué existe

Simétrico a `login.php`: si el plugin agrega una forma especial de entrar a Moodle, también necesita (opcionalmente) una forma de salir que respete esa misma lógica — por ejemplo, para que "cerrar sesión" desde el portal de IINICIA pueda también cerrar la sesión de Moodle sin pasar por la pantalla normal de logout de Moodle. Igual que `login.php`, es solo un punto de entrada HTTP delgado que delega el trabajo real en `auth.php`.

## Recorrido del código

```php
require_once(dirname(__FILE__) . '/../../config.php');

if (!is_enabled_auth('userkey')) {
    throw new moodle_exception(get_string('pluginisdisabled', 'auth_userkey'));
}

get_auth_plugin('userkey')->user_logout_userkey();
```

Mismo patrón que `login.php`: arranca Moodle, verifica que el plugin esté habilitado, y delega en `user_logout_userkey()` (documentado en `auth.md`), que:

- Exige un parámetro `return` validado como URL **local** (`PARAM_LOCALURL`) — no se puede usar este endpoint para redirigir a un sitio externo arbitrario.
- Solo cierra la sesión si el usuario no tiene sesión activa, o si su sesión es específicamente de tipo `userkey`. Si el usuario entró por otro método (por ejemplo, con usuario/contraseña directo en Moodle), lanza un error en vez de cerrarle la sesión — evita que este atajo se use para desloguear sesiones ajenas a este mecanismo.

## Conexión con el resto del sistema

A diferencia de `login.php`, este endpoint **no es llamado activamente por el flujo actual del backend de IINICIA**: `MoodleService` solo implementa `solicitarUrlAutologin` (login), no un logout equivalente. El cierre de sesión de Moodle, hoy, ocurre por los mecanismos normales de Moodle (expiración de sesión, o el botón de logout dentro de la propia interfaz de Moodle) — este archivo queda disponible como parte del plugin por si en el futuro se agrega un logout coordinado portal↔Moodle, pero documentarlo aquí es también documentar que **hoy no está conectado** a ningún flujo de IINICIA.

## Cosas que no son obvias a primera vista

- **Que este archivo exista no significa que esté en uso activo.** Es parte íntegra del plugin de terceros `auth_userkey`; IINICIA lo recibió junto con `login.php`, `auth.php`, etc., al vendorizar el plugin completo, no lo agregó a propósito para un caso de uso específico. Vale la pena saber que está ahí si más adelante se quiere sincronizar el cierre de sesión entre el portal y Moodle.
- Igual que `login.php`, no tiene nada específico de IINICIA: es el archivo original del plugin de Catalyst.
