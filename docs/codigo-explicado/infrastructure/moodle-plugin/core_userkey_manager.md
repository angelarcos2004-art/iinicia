# `infrastructure/moodle-custom/auth/userkey/classes/core_userkey_manager.php`

**En una frase:** la clase que realmente crea, valida y borra las llaves de un solo uso, apoyándose en el mecanismo nativo de Moodle para "llaves privadas de usuario" (`user_private_key`).

## Por qué existe

`auth.php` necesita generar y validar llaves, pero separar esa responsabilidad en su propia clase (en vez de mezclarla con la lógica de login/logout) tiene dos ventajas que se aprovechan en este plugin: se puede **sustituir** por otra implementación (ver `userkey_manager_interface.md` — de hecho, las pruebas PHPUnit del plugin usan un doble de prueba, `fake_userkey_manager`, en vez de esta clase real) y se puede reutilizar sin duplicar código en cualquier otro punto que necesite crear o validar llaves.

Internamente, esta clase no reinventa el almacenamiento de llaves: usa `create_user_key()` / `delete_user_key()`, funciones que ya existen en el core de Moodle (`lib/moodlelib.php`) para un propósito genérico ("llave privada asociada a un usuario, con vencimiento y restricción de IP opcional"), que varios plugins de Moodle usan para distintos fines (recuperación de contraseña, feeds RSS privados, etc.). `auth_userkey` las reutiliza con su propio "script" identificador (`'auth/userkey'`) para no mezclarse con las llaves de otros plugins.

## Recorrido del código

```php
class core_userkey_manager implements userkey_manager_interface {
    const CORE_USER_KEY_MANAGER_SCRIPT = 'auth/userkey';
    const DEFAULT_KEY_LIFE_TIME_IN_SECONDS = 60;

    protected $config;

    public function __construct(\stdClass $config) {
        $this->config = $config;
    }
```

`implements userkey_manager_interface` (ver `userkey_manager_interface.md`) es lo que permite a `auth.php` aceptar cualquier implementación compatible vía `set_userkey_manager()`, no solo esta. `CORE_USER_KEY_MANAGER_SCRIPT` es la etiqueta ("script") bajo la cual Moodle guarda estas llaves en su tabla genérica `user_private_key` — sirve para que `delete_user_key('auth/userkey', ...)` borre únicamente las llaves de este plugin, sin tocar las de otros.

```php
    public function create_key($userid, $allowedips = null) {
        $this->delete_keys($userid);

        if (isset($this->config->keylifetime) && (int)$this->config->keylifetime > 0) {
            $validuntil = di::get(clock::class)->time() + $this->config->keylifetime;
        } else {
            $validuntil = di::get(clock::class)->time() + self::DEFAULT_KEY_LIFE_TIME_IN_SECONDS;
        }

        $iprestriction = null;
        if (isset($this->config->iprestriction) && !empty($this->config->iprestriction)) {
            $iprestriction = $allowedips ?: getremoteaddr(null);
        }

        return create_user_key(
            self::CORE_USER_KEY_MANAGER_SCRIPT,
            $userid,
            $userid,
            $iprestriction,
            $validuntil
        );
    }
```

Antes de crear una llave nueva, **borra cualquier llave previa de ese mismo usuario** (`$this->delete_keys($userid)`). Esto es intencional: solo puede existir una llave viva por usuario a la vez, así que pedir una segunda llave invalida automáticamente la anterior (si alguien pidiera dos URLs de login seguidas, solo la última serviría).

El tiempo de vida (`$validuntil`) sale de la configuración del plugin (`keylifetime`, default 60 segundos si no está configurado — ver `settings.md`), calculado con `di::get(clock::class)->time()` en vez de `time()` directo: Moodle moderno inyecta un "reloj" (`clock`) a través de su contenedor de dependencias para que el tiempo sea sustituible en pruebas automatizadas (se puede simular "el tiempo avanzó" sin esperar de verdad).

La restricción de IP (`$iprestriction`) es opcional y está desactivada por configuración en IINICIA (ver `infrastructure/README.md`: "sin restricción de IP"). Si se activara, la llave solo podría usarse desde la IP que la generó o una lista explícita.

`create_user_key(...)` es la función nativa de Moodle que realmente inserta la fila en `user_private_key` y devuelve el valor de la llave (un string aleatorio alfanumérico).

```php
    public function delete_keys($userid) {
         delete_user_key(self::CORE_USER_KEY_MANAGER_SCRIPT, $userid);
    }
```

Borra todas las llaves de este plugin para ese usuario. Se llama en tres momentos distintos del flujo (ver `auth.md`): antes de crear una nueva, al validarse exitosamente (consumo de un solo uso), y si el usuario ya estaba logueado.

```php
    public function validate_key($keyvalue) {
        global $DB;

        $options = ['script' => self::CORE_USER_KEY_MANAGER_SCRIPT, 'value' => $keyvalue];

        if (!$key = $DB->get_record('user_private_key', $options)) {
            throw new \moodle_exception('invalidkey');
        }

        if (!empty($key->validuntil) && $key->validuntil < di::get(clock::class)->time()) {
            throw new \moodle_exception('expiredkey');
        }

        $this->validate_ip_address($key);

        if (!$user = $DB->get_record('user', ['id' => $key->userid])) {
            throw new \moodle_exception('invaliduserid');
        }
        return $key;
    }
```

Tres validaciones encadenadas, cada una con su propio mensaje de error específico (útil para depurar, aunque de cara al usuario Moodle suele mostrar un mensaje genérico de login fallido):

1. ¿Existe una fila con exactamente ese valor de llave bajo este script? Si no, `invalidkey`.
2. ¿Ya venció? Comparando contra el reloj inyectado, no `time()` directo. Si sí, `expiredkey`.
3. ¿La IP de origen cumple la restricción (si está activa)? (delegado a `validate_ip_address`, ver abajo).
4. ¿El usuario al que apunta la llave todavía existe en Moodle? Si fue borrado después de generar la llave, `invaliduserid`.

Importante: **esta función no borra la llave**. Quien decide cuándo "consumirla" (borrarla) es `auth.php`, después de decidir qué hacer con el resultado de la validación — separar "¿es válida?" de "ya se usó" permite que `auth.php` tenga lógica especial (como el caso de otro usuario ya logueado) sin que esta clase necesite saber nada de sesiones HTTP.

```php
    protected function validate_ip_address($key) {
        if (!$key->iprestriction) {
            return true;
        }

        $remoteaddr = getremoteaddr(null);
        if (empty($remoteaddr)) {
            throw new \moodle_exception('noip', 'auth_userkey');
        }
        if (address_in_subnet($remoteaddr, $key->iprestriction)) {
            return true;
        }

        if (isset($this->config->ipwhitelist)) {
            $ips = explode(';', $this->config->ipwhitelist);
            foreach ($ips as $ip) {
                if (address_in_subnet($remoteaddr, $ip)) {
                    return true;
                }
            }
        }

        throw new \moodle_exception('ipmismatch', ...);
    }
```

Solo entra en juego si la llave se creó con restricción de IP. Compara la IP real de quien está haciendo la petición (`getremoteaddr`) contra la IP (o subred) grabada en la llave, y adicionalmente contra una lista blanca configurable (`ipwhitelist`) — pensada para, por ejemplo, permitir siempre la IP del propio servidor backend aunque la llave se generara para la IP del usuario final. En IINICIA esta ruta nunca se ejecuta porque `iprestriction` está en `0`.

## Conexión con el resto del sistema

El backend de IINICIA nunca llama a esta clase directamente — ni siquiera sabe que existe. La cadena es: `MoodleService.solicitarUrlAutologin` → web service `auth_userkey_request_login_url` (`externallib.php`) → `auth_plugin_userkey::get_login_url()` (`auth.php`) → `core_userkey_manager::create_key()` (este archivo) para generar, y luego, cuando el navegador visita `login.php` → `auth_plugin_userkey::user_login_userkey()` → `core_userkey_manager::validate_key()` / `delete_keys()` (este archivo) para validar y consumir.

## Cosas que no son obvias a primera vista

- **No se reinventa el almacenamiento de llaves.** En vez de crear una tabla nueva solo para `auth_userkey`, se reutiliza la tabla genérica `user_private_key` del core de Moodle (vía `create_user_key()`/`delete_user_key()`), con un identificador de "script" propio para no mezclarse con otros usos de esa misma tabla. Esto es consistente con "no modificar el core": se **usa** una API pública del core, no se le agrega nada.
- **El uso de `di::get(clock::class)` en vez de `time()`** es una señal de que este archivo está escrito contra una versión moderna de Moodle (la inyección de un reloj sustituible es un patrón que Moodle adoptó para que el código sea más fácil de probar automáticamente) — justamente lo que permite que las pruebas PHPUnit de este plugin (mencionadas en `infrastructure/README.md`) puedan simular el paso del tiempo sin esperar segundos reales.
