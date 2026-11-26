# `infrastructure/moodle-custom/auth/userkey/db/access.php`

**En una frase:** define el permiso (`capability`) `auth/userkey:generatekey` que Moodle exige para poder pedir una URL de login de un solo uso.

## Por qué existe

Moodle controla casi todas las acciones sensibles mediante "capabilities" (permisos con nombre, como `moodle/course:view` o `moodle/user:create`), no mediante roles hardcodeados. Cualquier plugin que quiera agregar una acción protegida debe declarar su propio capability en `db/access.php`, con el nivel de riesgo y el contexto en el que aplica. Sin esta declaración, `require_capability('auth/userkey:generatekey', ...)` dentro de `externallib.php` fallaría — ese permiso simplemente no existiría en el sistema.

## Recorrido del código

```php
$capabilities = [
    'auth/userkey:generatekey' => [
        'riskbitmask' => RISK_PERSONAL | RISK_SPAM | RISK_XSS,
        'captype' => 'write',
        'contextlevel' => CONTEXT_SYSTEM,
        'archetypes' => [
        ],
    ],
];
```

Desglosando cada campo:

- **Nombre del capability**: `auth/userkey:generatekey` — el mismo string que aparece en `require_capability()` dentro de `externallib.php` y en el campo `capabilities` de `services.php`. Son tres archivos que deben estar de acuerdo en este nombre exacto.
- **`riskbitmask`**: Moodle clasifica cada capability por el tipo de riesgo que representa si se otorga mal. Aquí se marca como `RISK_PERSONAL` (puede exponer datos personales — tiene sentido, genera acceso autenticado como otro usuario), `RISK_SPAM` (podría usarse para acciones masivas no deseadas) y `RISK_XSS`. Esta clasificación no bloquea nada por sí sola, pero Moodle la usa para advertir visualmente en su panel de administración de roles ("este permiso es de alto riesgo") cuando un administrador intenta otorgarlo a un rol.
- **`captype: 'write'`**: coherente con `services.php` — esta acción modifica estado (crea una llave).
- **`contextlevel: CONTEXT_SYSTEM`**: el permiso se evalúa a nivel de todo el sitio, no por curso o por categoría. Tiene sentido: generar un login no es una acción específica de un curso.
- **`archetypes: []`**: una lista vacía significa que **ningún rol estándar de Moodle** (`admin`, `editingteacher`, `student`, etc.) lo tiene por default. Hay que otorgarlo explícitamente a la cuenta que va a usarlo — en el caso de IINICIA, a la cuenta `admin` cuyo token usa el backend (ver `infrastructure/README.md`, sección "SSO portal → Moodle").

## Conexión con el resto del sistema

Este archivo no es llamado directamente por nadie en tiempo de ejecución de una petición normal — Moodle lo lee al instalar o actualizar el plugin (`admin/cli/upgrade.php`) para sincronizar su tabla de capabilities. Después de eso, `require_capability('auth/userkey:generatekey', ...)` en `externallib.php` consulta esa tabla en cada llamada.

## Cosas que no son obvias a primera vista

- **`archetypes: []` es una decisión de seguridad, no un descuido.** Que ningún rol lo tenga por default obliga a un paso explícito de configuración (otorgarlo a la cuenta de servicio del backend) antes de que el SSO funcione — exactamente el tipo de permiso que no quieres que termine, por accidente, en manos de un rol amplio como `editingteacher`.
- El `riskbitmask` no cambia el comportamiento del sistema automáticamente (no bloquea ni exige aprobación extra); es metadata informativa para quien administra roles manualmente en la interfaz de Moodle.
