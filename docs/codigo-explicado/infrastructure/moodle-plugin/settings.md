# `infrastructure/moodle-custom/auth/userkey/settings.php`

**En una frase:** construye la pantalla de administración del plugin dentro de Moodle, donde se definen (o se dejan en sus valores por default) todas las opciones de configuración de `auth_userkey`.

## Por qué existe

Moodle genera automáticamente la página de ajustes de cada plugin de auth bajo *Site administration > Plugins > Authentication > Manage authentication*, pero necesita que el plugin le diga **qué campos mostrar**. Este archivo define esos campos (y sus valores por default) usando la API estándar de `admin_setting_*` de Moodle — el mismo mecanismo que usa cualquier otro plugin para exponer configuración editable sin tocar código.

## Recorrido del código

```php
if ($ADMIN->fulltree) {
    $yesno = [get_string('no'), get_string('yes')];
    $fields = get_auth_plugin('userkey')->get_allowed_mapping_fields();
```

Moodle carga este archivo dos veces en distintos contextos: una ligera (solo para listar el plugin) y una completa (`$ADMIN->fulltree`, cuando el administrador realmente abre la página de configuración). El bloque `if` evita construir todos los controles de formulario cuando no es necesario — una optimización estándar de Moodle, no algo específico de este plugin.

```php
    $settings->add(new admin_setting_configselect(
        'auth_userkey/mappingfield',
        new lang_string('mappingfield', 'auth_userkey'),
        new lang_string('mappingfield_desc', 'auth_userkey'),
        auth_plugin_userkey::DEFAULT_MAPPING_FIELD,
        $fields
    ));
```

**`mappingfield`** — el campo del usuario de Moodle contra el que se busca la coincidencia cuando el backend pide una llave (opciones: `username`, `email`, `idnumber`, `id`). IINICIA lo deja en su default, `email` (ver `DEFAULT_MAPPING_FIELD` en `auth.php`), porque el backend ya identifica usuarios por correo en todo el resto del sistema (es el campo que vincula el usuario de PostgreSQL con `moodleUserId`).

```php
    $settings->add(new admin_setting_configtext(
        'auth_userkey/keylifetime',
        get_string('keylifetime', 'auth_userkey'),
        get_string('keylifetime_desc', 'auth_userkey', 'auth'),
        '60',
        PARAM_INT
    ));
```

**`keylifetime`** — segundos de vida de cada llave antes de expirar (default: 60). Esto es lo que lee `core_userkey_manager::create_key()` para calcular `$validuntil`. Un valor bajo (60s) es deliberado: la llave se genera y se consume casi instantáneamente (el backend la pide justo antes de redirigir), así que no necesita vivir mucho — menos tiempo de vida significa menos ventana de oportunidad si alguien intercepta la URL.

```php
    $settings->add(new admin_setting_configselect(
        'auth_userkey/iprestriction', ..., 0, $yesno
    ));
    $settings->add(new admin_setting_configtext(
        'auth_userkey/ipwhitelist', ..., '', PARAM_TEXT
    ));
```

**`iprestriction`** / **`ipwhitelist`** — si se activa, cada llave solo es válida desde la IP que la generó (o desde una lista blanca). IINICIA lo deja desactivado (ver `infrastructure/README.md`): el backend está en un contenedor Docker distinto del usuario final, así que "la IP que generó la llave" sería la del backend, no la del navegador del usuario — activar esto sin ajustar la lógica rompería el flujo. Queda documentado en `core_userkey_manager.md` qué pasaría si se activara.

```php
    $settings->add(new admin_setting_configtext(
        'auth_userkey/redirecturl', ..., '', PARAM_URL
    ));
    $settings->add(new admin_setting_configtext(
        'auth_userkey/ssourl', ..., '', PARAM_URL
    ));
```

**`redirecturl`** — a dónde mandar al usuario tras cerrar sesión (usado por `logout.php`/`logoutpage_hook()` en `auth.php`). **`ssourl`** — si se define, fuerza que *toda* la pantalla de login normal de Moodle redirija ahí en vez de mostrar el formulario (ver `should_login_redirect()` en `auth.php`). Ambos se dejan vacíos en IINICIA a propósito: no se quiere forzar un "solo SSO", sino que `auth_userkey` sea un método de entrada adicional junto al login normal con usuario/contraseña del `admin`.

```php
    $settings->add(new admin_setting_configselect(
        'auth_userkey/createuser', ..., 0, $yesno
    ));
    $settings->add(new admin_setting_configselect(
        'auth_userkey/updateuser', ..., 0, $yesno
    ));
```

**`createuser`** / **`updateuser`** — si el plugin debe crear/actualizar automáticamente el usuario de Moodle al pedir la llave, usando los datos (`firstname`, `lastname`, `email`) que vengan en la llamada al Web Service (ver `create_user()`/`update_user()` en `auth.php`). Ambos en `0` (desactivados): IINICIA ya administra la creación/vinculación de usuarios de Moodle desde el backend (`MoodleService`, vía `core_user_create_users`), así que este plugin solo necesita **encontrar** usuarios existentes, nunca crearlos por su cuenta — mantener esta responsabilidad en un solo lugar (el backend) evita que dos sistemas distintos intenten crear usuarios de Moodle con reglas potencialmente distintas.

```php
    $authplugin = get_auth_plugin('userkey');
    display_auth_lock_options(
        $settings,
        $authplugin->authtype,
        $authplugin->userfields,
        get_string('auth_fieldlocks_help', 'auth'),
        false,
        false
    );
```

Agrega al final la sección estándar de "bloqueo de campos" que Moodle ofrece a *todos* los plugins de autenticación externos (por ejemplo, impedir que un usuario externo edite su propio nombre desde el perfil de Moodle si ese dato debe venir siempre de la fuente externa) — no es código específico de `auth_userkey`, es la integración con un mecanismo común del core.

## Conexión con el resto del sistema

Este archivo no es llamado por el backend de IINICIA ni por ningún flujo HTTP de usuario final — es exclusivamente la pantalla de administración dentro de Moodle. Los valores que un administrador guarde aquí terminan en la tabla de configuración de Moodle y son los que `auth.php` (vía `get_config('auth_userkey')` en su constructor) y `core_userkey_manager` leen en cada petición.

## Cosas que no son obvias a primera vista

- **Casi todos los valores quedan en su default de fábrica, y eso es a propósito.** Es tentador pensar que un plugin "configurado para IINICIA" debería tener varios ajustes personalizados — pero en este caso los defaults (`mappingfield=email`, sin restricción de IP, sin creación automática de usuarios, sin forzar SSO) son exactamente lo que IINICIA necesita, porque toda la lógica de negocio (quién puede tener cuenta, cómo se crea, qué correo usa) ya vive en el backend. Cambiar cualquiera de estos valores sin coordinarlo con `backend/src/moodle/moodle.service.ts` podría romper silenciosamente el flujo de SSO.
