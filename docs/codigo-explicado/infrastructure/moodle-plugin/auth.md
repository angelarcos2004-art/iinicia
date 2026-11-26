# `infrastructure/moodle-custom/auth/userkey/auth.php`

**En una frase:** define el plugin de autenticación `userkey`, el "método de login" de Moodle que no pide contraseña, sino que confía en una llave de un solo uso generada por el backend de IINICIA.

## Por qué existe

Moodle, de fábrica, solo sabe autenticar usuarios con contraseña (o con métodos externos como LDAP/OAuth que requieren infraestructura adicional). IINICIA necesita que un estudiante que ya inició sesión en el portal pueda hacer clic en "Entrar al Campus" y caer dentro de Moodle **ya autenticado**, sin volver a escribir una contraseña — y sin que React o Android tengan que conocer ni manejar credenciales de Moodle (regla de CLAUDE.md: "Ningún token de Moodle en React ni en Android; solo en el backend").

Moodle organiza la autenticación en "plugins de auth" (`auth_manual`, `auth_ldap`, `auth_oidc`, etc.), cada uno una clase que extiende `auth_plugin_base`. Este archivo es exactamente eso: un plugin nuevo, `auth_userkey`, que Moodle reconoce porque vive en `auth/userkey/auth.php` con una clase llamada `auth_plugin_userkey`. Al ser un plugin, se activa/desactiva desde la configuración de Moodle sin tocar una sola línea del core.

## Recorrido del código

```php
class auth_plugin_userkey extends auth_plugin_base {
    const DEFAULT_MAPPING_FIELD = 'email';

    protected $defaults = [
        'mappingfield' => self::DEFAULT_MAPPING_FIELD,
        'keylifetime' => 60,
        'iprestriction' => 0,
        ...
    ];

    public function __construct() {
        $this->authtype = 'userkey';
        $this->config = get_config('auth_userkey');
        $this->userkeymanager = new core_userkey_manager($this->config);
    }
```

`extends auth_plugin_base` es lo que hace que Moodle trate esta clase como un método de autenticación válido. `$this->authtype = 'userkey'` es el identificador interno: cuando un usuario de Moodle tiene `auth = 'userkey'` en la tabla `user`, Moodle sabe que este plugin es responsable de autenticarlo. El constructor crea un `core_userkey_manager` (ver `core_userkey_manager.md`), que es quien realmente genera/valida las llaves — este archivo delega esa lógica en vez de mezclarla aquí.

```php
    public function user_login($username, $password) {
        return false;
    }
```

Este método es el que Moodle llama cuando alguien intenta entrar con el formulario normal de usuario/contraseña. Siempre devuelve `false`: **nadie puede iniciar sesión como usuario `userkey` con contraseña**, a propósito. La única puerta de entrada válida es la llave de un solo uso. Esto es justamente lo que impide que, aunque alguien adivinara o filtrara el nombre de usuario de un estudiante en Moodle, pudiera intentar entrar probando contraseñas — este método de auth no tiene contraseña que probar.

```php
    public function user_login_userkey() {
        global $SESSION, $CFG, $USER;

        $keyvalue = required_param('key', PARAM_ALPHANUM);
        $wantsurl = optional_param('wantsurl', '', PARAM_URL);

        try {
            $key = $this->userkeymanager->validate_key($keyvalue);
        } catch (moodle_exception $exception) {
            if (isloggedin()) {
                require_logout();
            }
            throw $exception;
        }

        if (isloggedin()) {
            if ($USER->id != $key->userid) {
                require_logout();
                $loginurl = new moodle_url('/auth/userkey/login.php', ['key' => $keyvalue, 'wantsurl' => $wantsurl]);
                $this->redirect($loginurl->out(false));
            } else {
                $this->userkeymanager->delete_keys($key->userid);
                $this->redirect($redirecturl);
            }
        }

        $this->userkeymanager->delete_keys($key->userid);
        $user = get_complete_user_data('id', $key->userid);
        complete_user_login($user);
        $SESSION->userkey = true;
        $this->redirect($redirecturl);
    }
```

Este es el corazón del login SSO, llamado por `login.php` (ver `login.md`). Paso a paso, en español simple:

1. Lee de la URL el parámetro `key` (la llave de un solo uso) y, opcionalmente, `wantsurl` (a dónde redirigir tras entrar — por ejemplo, directo al curso).
2. Pide al `core_userkey_manager` que valide la llave. Si está vencida, ya se usó, o no existe, lanza una excepción — y si por casualidad ya había alguien con sesión abierta en ese navegador, lo desloguea primero (para no dejar una sesión vieja a medio camino).
3. **Caso raro pero manejado con cuidado**: si ya hay una sesión de Moodle abierta pero de **otro** usuario (`$USER->id != $key->userid` — por ejemplo, dos personas usan el mismo navegador), el código no mezcla sesiones: cierra la sesión actual (`require_logout()`) y **vuelve a pedir el login** redirigiendo a la misma URL con la misma llave. El comentario en el código explica por qué no se puede simplemente seguir en la misma petición: `require_logout()` cierra la sesión PHP, y seguir usando `complete_user_login()` en esa misma request intentaría regenerar un ID de sesión que ya no existe. La llave todavía no se "gasta" en este punto, así que el segundo intento (ya sin sesión previa) sí la consume normalmente.
4. Si todo es normal (nadie logueado, o el mismo usuario ya logueado): borra la llave inmediatamente (`delete_keys`) — **de un solo uso, de verdad** — carga los datos completos del usuario y llama a `complete_user_login($user)`, la función interna de Moodle que efectivamente abre la sesión (cookies, `$USER` global, etc.), exactamente como si hubiera iniciado sesión con usuario y contraseña.
5. Marca `$SESSION->userkey = true` para que el resto de Moodle sepa que esta sesión entró por este método (lo usa, por ejemplo, el logout — ver `logout.md`).
6. Redirige a `wantsurl` si vino, o al `wwwroot` por default.

```php
    public function prevent_local_passwords() {
        return true;
    }

    public function is_internal() {
        return false;
    }

    public function can_change_password() {
        return false;
    }
```

Tres métodos pequeños que refuerzan la misma idea: este plugin **no gestiona contraseñas**. `is_internal() === false` le dice a Moodle "no guardes/verifiques contraseña para estos usuarios dentro de tu propia base de datos" (típico de métodos externos como LDAP). Esto es coherente con que el usuario real y su contraseña viven en el backend de IINICIA (PostgreSQL), no en Moodle.

```php
    protected function create_user(array $data) { ... }
    protected function update_user(\stdClass $user, array $data) { ... }
    protected function get_user(array $data) { ... }
```

Estos tres métodos implementan una función opcional del plugin: si está configurado (`createuser`/`updateuser` en los ajustes, ver `settings.md`), el plugin puede crear o actualizar el usuario de Moodle **en el momento de pedir la llave**, usando los datos que el backend mande (nombre, apellido, email). IINICIA mantiene esto desactivado por defecto (ver `infrastructure/README.md`, sección SSO): el backend ya crea/vincula los usuarios de Moodle por su cuenta vía `core_user_create_users` (otra función de la API de Moodle, llamada desde `MoodleService`), así que `auth_userkey` solo necesita **encontrar** al usuario ya existente por su correo, no crearlo.

```php
    public function get_login_url($data) {
        global $CFG;
        $userdata = $this->validate_user_data($data);
        $userkey  = $this->generate_user_key($userdata);
        return $CFG->wwwroot . '/auth/userkey/login.php?key=' . $userkey;
    }
```

Este es el método que la función del web service (ver `externallib.md`) llama para construir la URL final. Valida los datos recibidos, genera la llave (delegando en `core_userkey_manager::create_key`), y arma la URL apuntando siempre al **`wwwroot` público real de Moodle**, nunca a una URL que el llamador pudiera inyectar — esto importa para seguridad (ver más abajo).

```php
    protected function should_login_redirect() {
        global $SESSION;
        $skipsso = optional_param('enrolkey_skipsso', 0, PARAM_BOOL);
        if ((isset($SESSION->enrolkey_skipsso) && $SESSION->enrolkey_skipsso == 1)) {
            return false;
        }
        $SESSION->enrolkey_skipsso = $skipsso;
        if (isset($this->config->ssourl) && $this->config->ssourl != '' && !$skipsso) {
            return true;
        }
    }
```

Esta es una función del plugin original (de Catalyst, ver abajo) que **IINICIA no usa activamente**: solo se activaría si se configurara `ssourl` (forzar que toda la pantalla normal de login de Moodle redirija a un login externo tipo "solo SSO"). En IINICIA, `ssourl` se deja vacío a propósito (ver `infrastructure/README.md`): se quiere que Moodle siga aceptando el login normal con usuario/contraseña del `admin`, y que `auth_userkey` sea *un método más* disponible, no el único.

```php
    public function user_logout_userkey() {
        global $CFG, $USER;
        $redirect = required_param('return', PARAM_LOCALURL);
        if (!isloggedin() || $USER->auth == 'userkey') {
            require_logout();
            $this->redirect($redirect);
        } else {
            throw new moodle_exception('incorrectlogout', 'auth_userkey', $CFG->wwwroot);
        }
    }
```

Llamado por `logout.php` (ver `logout.md`): cierra la sesión de Moodle y redirige de vuelta a una URL local (`PARAM_LOCALURL` impide que sea una URL externa arbitraria). Si el usuario logueado **no** entró con `userkey` sino con otro método, lanza un error en vez de desloguearlo silenciosamente — evita que este endpoint se use para cerrar sesiones que no le corresponden.

## Conexión con el resto del sistema

- El backend de IINICIA (`backend/src/moodle/moodle.service.ts`, método `solicitarUrlAutologin`) nunca llama a este archivo directamente: llama a la función de web service `auth_userkey_request_login_url` (ver `externallib.md`), que internamente usa `get_login_url()` de esta clase.
- El navegador del usuario sí llega directo a este plugin, pero a través de `login.php`/`logout.php`, no de `auth.php` — este archivo solo define comportamiento, no es un endpoint HTTP por sí mismo.
- `core_userkey_manager` (inyectado en el constructor) es quien habla con la tabla `user_private_key` de Moodle para crear/validar/borrar las llaves.

## Cosas que no son obvias a primera vista

- **No es código propio de IINICIA.** Este archivo es el plugin de código abierto [`auth_userkey` de Catalyst](https://github.com/catalyst/moodle-auth_userkey) (GPL), vendorizado tal cual en `moodle-custom/`. IINICIA no lo modificó — lo eligió, lo configuró (ver `settings.md`) y lo monta sobre Moodle sin tocar su código ni el del core de Moodle, cumpliendo ambas reglas de CLAUDE.md a la vez.
- **Por qué no se usó el autologin nativo de Moodle (`tool_mobile_get_autologin_key`).** Se investigó primero esa opción porque viene incluida en el core, pero exige HTTPS (`is_https()`) y que el request lleve el User-Agent exacto de la app oficial de Moodle (`core_useragent::is_moodle_app()`) — ninguna de las dos condiciones aplica a un backend propio (BFF) llamando por HTTP interno desde dentro de Docker. `auth_userkey` no tiene esas restricciones.
- **La llave nunca se expone al frontend ni se guarda.** El backend pide la URL de login justo antes de redirigir al usuario (ver `MoodleService.solicitarUrlAutologin`), nunca la cachea ni la persiste — coincide con el diseño de este plugin: la llave dura segundos (configurable, default 60s) y se borra en el primer uso.
