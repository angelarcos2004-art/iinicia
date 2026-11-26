# `infrastructure/moodle-custom/auth/userkey/db/services.php`

**En una frase:** registra ante Moodle qué función de Web Service expone este plugin (`auth_userkey_request_login_url`), con qué clase la implementa y qué permiso exige.

## Por qué existe

Moodle no descubre automáticamente qué funciones un plugin quiere exponer como Web Service: cada plugin debe declararlas explícitamente en un archivo `db/services.php` con un formato fijo. Sin este archivo, el método `request_login_url` de `externallib.php` existiría en el código pero sería **invisible** para el sistema de Web Services de Moodle — no se podría llamar por `webservice/rest/server.php` ni agregar a un servicio externo (como `IINICIA Backend`, ver `infrastructure/README.md`).

Este archivo se lee, entre otros momentos, cuando se corre `admin/cli/upgrade.php` (mencionado en el README al instalar o actualizar el plugin): ahí Moodle sincroniza su base de datos interna de funciones disponibles con lo que los archivos `services.php` de todos los plugins declaran.

## Recorrido del código

```php
$functions = [
    'auth_userkey_request_login_url' => [
        'classname'   => 'auth_userkey_external',
        'methodname'  => 'request_login_url',
        'classpath'   => 'auth/userkey/externallib.php',
        'description' => 'Return one time key based login URL',
        'type'        => 'write',
        'capabilities'  => 'auth/userkey:generatekey',
    ],
];
```

Esta es la declaración central: define el **nombre público** de la función (`auth_userkey_request_login_url`, el valor que se manda en `wsfunction=` al llamar por REST) y lo conecta con la clase y método PHP reales que la implementan (`auth_userkey_external::request_login_url`, en `externallib.php`). `'type' => 'write'` le dice a Moodle que esta función modifica estado (crea una llave en base de datos), no es una simple lectura — Moodle trata las funciones de escritura con más cautela (por ejemplo, algunos clientes de Web Service separan permisos de lectura/escritura). `'capabilities' => 'auth/userkey:generatekey'` es la referencia al permiso declarado en `access.php` (ver `access.md`): Moodle usa este campo para, entre otras cosas, mostrar en su UI de administración qué permiso necesita un rol para poder usar esta función.

```php
$services = [
    'User key authentication web service' => [
        'functions' => ['auth_userkey_request_login_url'],
        'restrictedusers' => 1,
        'enabled' => 1,
    ],
];
```

Esto declara un **servicio** propio del plugin, separado del servicio `IINICIA Backend` (`iinicia_backend`) que el equipo de IINICIA crea manualmente por script (ver "Habilitar Web Services" en `infrastructure/README.md`). `restrictedusers => 1` significa que este servicio, por default, solo puede ser usado por usuarios explícitamente autorizados (no por cualquier token válido). En la práctica, IINICIA **no usa este servicio predeclarado**: en vez de eso, agrega la función `auth_userkey_request_login_url` directamente al servicio `iinicia_backend` ya existente (ver el script en la sección "SSO portal → Moodle" del README), para que el mismo token que el backend ya usa para todo lo demás (crear usuarios, matricular, etc.) también sirva para pedir URLs de login. El servicio declarado aquí queda disponible pero sin usar activamente en este proyecto.

## Conexión con el resto del sistema

Indirecta: este archivo es lo que hace posible que `externallib.php` sea alcanzable por HTTP. El backend de IINICIA llama a la función **por nombre** (`auth_userkey_request_login_url`), que existe como función invocable solo porque este archivo la registró.

## Cosas que no son obvias a primera vista

- **El servicio declarado aquí no es el que realmente usa el backend.** Es fácil asumir, al ver `db/services.php`, que ese es "el" servicio de Web Service para este plugin — pero IINICIA prefirió reutilizar su propio servicio (`iinicia_backend`, ver `infrastructure/README.md`) agregándole esta función, para no manejar dos tokens distintos (uno para operaciones generales de Moodle y otro solo para SSO). Vale la pena no confundir ambos mecanismos al depurar permisos.
