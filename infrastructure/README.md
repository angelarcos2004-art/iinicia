# Infraestructura IINICIA (desarrollo local)

Levanta PostgreSQL + Moodle + backend (NestJS) en Docker para desarrollo
local. El backend necesita `backend/.env` ya configurado (copia
`backend/.env.example`) antes de `docker compose up`.

## Estado actual (ya configurado en este equipo)

Ya se ejecutaron todos los pasos de este README una vez: Moodle está
instalado, con web services/REST habilitados y con curso + usuarios de
prueba creados. Si clonas el repo en **esta misma máquina**, solo
necesitas `docker compose up -d` — no vuelvas a correr
`admin/cli/install.php` (reinstalaría encima y puede dejar el sitio en
estado inconsistente). En una máquina nueva sí sigue la guía completa de
abajo desde el paso 1.

- Moodle: http://localhost:8080 — admin / `ChangeMe123x` (es la que se
  uso en esta instalacion de ejemplo; usa una propia en una instalacion
  nueva).
- Curso de prueba: `IINICIA101` (id interno 2).
- Usuarios de prueba inscritos en ese curso:
  - `profesor.prueba` / `Profesor#2026` — rol editingteacher
  - `estudiante.prueba` / `Estudiante#2026` — rol student
  - `tool_generator_000001` — otro estudiante, generado automáticamente
    por `tool_generator` (nombre aleatorio, ignóralo salvo que necesites
    más volumen de datos de prueba).

  **Importante**: las cuentas de arriba (`profesor.prueba`/`estudiante.prueba`
  sin dominio, contraseñas `...#2026`) son usuarios de **Moodle**, en una
  base de datos separada de la del portal — no sirven para iniciar sesión en
  `http://localhost:3000`. Para el portal (backend + Postgres `iinicia_backend`)
  usa las cuentas de la sección siguiente.

### Cuentas de prueba del portal IINICIA (una por rol)

Se crean/actualizan con `npm run seed` en `backend/` (requiere Postgres y
Moodle arriba, y `backend/.env` configurado). Es idempotente: se puede
correr otra vez cuando se quiera, siempre deja estas credenciales conocidas
aunque la cuenta ya existiera con otra contraseña (p. ej. si alguien se
autorregistró antes con ese mismo correo como aspirante).

| Correo | Contraseña | Rol |
| --- | --- | --- |
| `superadmin.prueba@iinicia.test` | `Superadmin#2026` | superadmin |
| `admin.prueba@iinicia.test` | `AdminAcademico#2026` | admin_academico |
| `coordinador.prueba@iinicia.test` | `Coordinador#2026` | coordinador |
| `profesor.prueba@iinicia.test` | `Profesor#2026` | profesor (vinculado y matriculado como editingteacher en `IINICIA-SOFT1`, `IINICIA-CIBER1` e `IINICIA-NEG1`, si ya corriste `moodle-seed-cursos.php` — ver abajo) |
| `estudiante.prueba@iinicia.test` | `Estudiante#2026` | estudiante (vinculado y matriculado en `IINICIA101`) |

**Ojo:** esta cuenta Moodle del profesor (creada con el correo del portal,
`profesor.prueba@iinicia.test`) es distinta del usuario Moodle
`profesor.prueba` / `...@iinicia.local` que crea a mano la sección "Crear
curso y usuarios de prueba" de abajo — ese otro solo sirve para entrar
directo a Moodle sin pasar por el portal. El dashboard de "Mi IINICIA" del
profesor usa la cuenta vinculada por `npm run seed` (la de arriba).

El rol `aspirante` se obtiene registrándose normalmente desde
`http://localhost:3000/registro`. Un `superadmin`/`admin_academico` puede
promover a cualquier usuario (incluido un aspirante autorregistrado) a otro
rol con `PATCH /usuarios/:id/rol` (body `{ "rol": "estudiante" }`); si se
promueve a `estudiante` y el usuario no tenía cuenta Moodle, el backend la
crea/vincula y lo matricula en el curso de prueba automáticamente.
- Web Services REST ya habilitados y probados por HTTP de verdad
  (`core_webservice_get_site_info` y `core_user_get_users_by_field`
  contra el servicio real, no solo revisando la base de datos):
  - Servicio: `IINICIA Backend` (shortname `iinicia_backend`), con las
    9 funciones que el backend va a necesitar (ver script en "Habilitar
    Web Services" abajo).
  - Token del usuario `admin` para ese servicio:
    `REDACTED_MOODLE_TOKEN` — úsalo tal cual en
    `backend/.env` (`MOODLE_URL=http://localhost:8080`,
    `MOODLE_TOKEN=REDACTED_MOODLE_TOKEN`) si trabajas en esta
    misma máquina. En una instalación nueva, el script de la sección
    "Habilitar Web Services" genera uno distinto.

## Por qué esta estructura

- **Un solo motor de base de datos (PostgreSQL)**, con dos bases
  separadas: `iinicia_backend` (para NestJS) y `moodle` (para Moodle). Se
  crea automáticamente la segunda vía
  `postgres/init/01-create-moodle-db.sql` la primera vez que arranca el
  contenedor.
- **Moodle no viene como imagen "todo en uno".** `bitnami/moodle` ya no
  está disponible gratis en Docker Hub, así que se usa la imagen oficial
  de Moodle HQ (`moodlehq/moodle-php-apache`, solo runtime PHP+Apache) y
  se monta el código fuente real de Moodle desde `./moodle-src/` (no se
  versiona en git, son ~700 MB — ver abajo cómo obtenerlo).
- Se usa **Moodle 4.5 LTS** (`MOODLE_405_STABLE`), no la 5.0, porque 5.0
  reestructuró el webroot (`public/`) de un modo que rompe la imagen base
  y la mayoría de guías/herramientas existentes. 4.5 es soporte largo.

## Requisitos

- Docker Desktop corriendo.
- Git.
- **En Windows con Git Bash**: antepón `MSYS_NO_PATHCONV=1` a cualquier
  comando `docker compose exec`/`run` que incluya una ruta tipo
  `/var/www/...` — si no, Git Bash la convierte a una ruta de Windows y
  todo falla con errores confusos de "directory does not exist". Ya nos
  pasó una vez montando esto.

## Primer arranque, paso a paso

```bash
cd infrastructure

# 1. Clonar el codigo fuente de Moodle (una sola vez; no se versiona)
git clone --branch MOODLE_405_STABLE --depth 1 https://github.com/moodle/moodle.git moodle-src

# 2. Levantar postgres y esperar a que este sano
docker compose up -d postgres

# 3. Levantar moodle (imagen base; Moodle todavia no esta instalado)
docker compose up -d moodle

# 4. Instalar Moodle via CLI (una sola vez; crea config.php y las tablas)
#    En Windows/Git Bash, con MSYS_NO_PATHCONV=1 adelante:
docker compose exec -T moodle php admin/cli/install.php \
  --lang=es \
  --wwwroot=http://localhost:8080 \
  --dataroot=/var/www/moodledata \
  --dbtype=pgsql \
  --dbhost=postgres \
  --dbname=moodle \
  --dbuser=iinicia \
  --dbpass='iinicia_dev_password' \
  --dbport=5432 \
  --prefix=mdl_ \
  --fullname='IINICIA Campus Virtual (dev)' \
  --shortname=IINICIA \
  --adminuser=admin \
  --adminpass='<elige-una-contrasena-segura>' \
  --adminemail=admin@iinicia.local \
  --non-interactive \
  --agree-license
```

Cuando termine, Moodle queda disponible en **http://localhost:8080**
(usuario `admin`, la contraseña que hayas puesto arriba).

Si tu instancia ya quedó instalada en inglés (instalada antes de este
cambio, con `--lang=en`), no hace falta reinstalar — eso borraría el
curso y usuarios de prueba. Importa el paquete de idioma y cambia el
default. Moodle 4.5 ya no trae un script CLI para esto
(`admin/tool/langimport/cli/install.php` no existe), así que se usa el
controller del plugin directamente (mismo patrón que los demás scripts
de este README):

```bash
cat > install-lang-es.php << 'EOF'
<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once($CFG->dirroot . '/admin/tool/langimport/classes/controller.php');

$controller = new \tool_langimport\controller();
$controller->install_languagepacks(['es']);
foreach ($controller->info as $m) { echo strip_tags($m) . "\n"; }
foreach ($controller->errors as $m) { echo "ERROR: " . strip_tags($m) . "\n"; }

set_config('lang', 'es');
echo "Default lang set to es\n";
EOF
MSYS_NO_PATHCONV=1 docker compose exec -T moodle php < install-lang-es.php
rm install-lang-es.php
docker compose exec -T moodle php admin/cli/purge_caches.php
```

> Las credenciales de ejemplo de este README (`iinicia` /
> `iinicia_dev_password`) son solo para desarrollo local. No las
> reutilices en ningún ambiente real, y nunca subas un `.env` con
> credenciales reales al repo (copia `.env.example` a `.env`).

## Crear curso y usuarios de prueba

Moodle trae una herramienta oficial para generar datos de prueba
(`admin/tool/generator`), en vez de crear todo a mano:

```bash
MSYS_NO_PATHCONV=1 docker compose exec -T moodle php admin/tool/generator/cli/maketestcourse.php \
  --shortname=IINICIA101 \
  --size=XS \
  --fixeddataset \
  --bypasscheck
```

Esto crea el curso y matricula al `admin` como profesor y **un** alumno
con nombre aleatorio generado por la herramienta (no `teacher1`/
`student1` legibles — eso es lo que documentaba una version anterior de
este README y no es correcto, `tool_generator` no nombra los usuarios
asi). `--size=XS` es el preset mas chico; usa `S`/`M` si necesitas mas
volumen para pruebas de carga mas adelante.

Para tener credenciales de prueba legibles (útiles para documentar y
para que el backend las use al probar la integración), crea además dos
cuentas con nombre claro, matriculadas en el mismo curso:

```bash
cat > seed-test-users.php << 'EOF'
<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once($CFG->dirroot . '/user/lib.php');
require_once($CFG->dirroot . '/lib/enrollib.php');

function make_user(string $username, string $first, string $last, string $email, string $password): int {
    global $CFG, $DB;
    if ($existing = $DB->get_record('user', ['username' => $username, 'deleted' => 0])) {
        return (int) $existing->id;
    }
    $u = new stdClass();
    $u->auth = 'manual';
    $u->username = $username;
    $u->firstname = $first;
    $u->lastname = $last;
    $u->email = $email;
    $u->password = $password;
    $u->confirmed = 1;
    $u->mnethostid = $CFG->mnet_localhost_id;
    return (int) user_create_user($u, false, false);
}

$course = $DB->get_record('course', ['shortname' => 'IINICIA101'], '*', MUST_EXIST);
$studentrole = $DB->get_record('role', ['shortname' => 'student'], '*', MUST_EXIST);
$teacherrole = $DB->get_record('role', ['shortname' => 'editingteacher'], '*', MUST_EXIST);

$teacherid = make_user('profesor.prueba', 'Profesor', 'Prueba', 'profesor.prueba@iinicia.local', 'Profesor#2026');
$studentid = make_user('estudiante.prueba', 'Estudiante', 'Prueba', 'estudiante.prueba@iinicia.local', 'Estudiante#2026');

$plugin = enrol_get_plugin('manual');
$instance = null;
foreach (enrol_get_instances($course->id, true) as $i) {
    if ($i->enrol === 'manual') { $instance = $i; break; }
}
$plugin->enrol_user($instance, $teacherid, $teacherrole->id);
$plugin->enrol_user($instance, $studentid, $studentrole->id);
echo "OK\n";
EOF
MSYS_NO_PATHCONV=1 docker compose exec -T moodle php < seed-test-users.php
rm seed-test-users.php
```

Es normal que imprima dos avisos `email_to_user(): Invalid address` — no
hay servidor de correo configurado en este entorno local, no afecta la
creación del usuario.

### Catálogo de cursos realistas para pruebas

Además del curso genérico `IINICIA101` de arriba, `moodle-seed-cursos.php`
(en este mismo directorio) crea 3 cursos con contenido real — páginas,
una tarea con fecha límite, un cuestionario con 2 preguntas y un foro con
una discusión — para poder probar el selector de curso del botón
"Matricular" del panel admin (`POST /usuarios/:id/matricula`) con más de
una opción real:

| Shortname | Tema |
| --- | --- |
| `IINICIA-SOFT1` | Fundamentos de Ingeniería de Software e IA |
| `IINICIA-CIBER1` | Ciberseguridad Defensiva y SOC |
| `IINICIA-NEG1` | Administración de Negocios Digitales |

```bash
MSYS_NO_PATHCONV=1 docker compose exec -T moodle php < moodle-seed-cursos.php
```

`profesor.prueba` queda matriculado como `editingteacher` en los 3. A
propósito **no** se matricula a `estudiante.prueba` ni se vinculan estos
cursos a los programas académicos (`PROGRAMAS_SEMILLA` en
`backend/src/seed.ts`): el acceso a Moodle solo lo debe conceder un
administrador de forma explícita (ver `AuthService.registro`/`.login` en
el backend, y `docs/requerimientos.md` §12) — usa el botón "Matricular"
del panel admin para probarlo.

Idempotente a nivel de curso: si el shortname ya existe, se omite por
completo (no actualiza contenido). Para rehacer uno, bórralo primero
desde Moodle y vuelve a correr el script.

Para probar con varios estudiantes a la vez (p. ej. un foro con más de
una voz), este script crea 5 cuentas más (`estudiante1.prueba` ...
`estudiante5.prueba`, contraseña `Estudiante{N}#2026`) matriculadas en
`IINICIA-SOFT1`:

```bash
cat > seed-5-estudiantes.php << 'EOF'
<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once($CFG->dirroot . '/user/lib.php');
require_once($CFG->dirroot . '/lib/enrollib.php');

function make_user(string $username, string $first, string $last, string $email, string $password): int {
    global $CFG, $DB;
    if ($existing = $DB->get_record('user', ['username' => $username, 'deleted' => 0])) {
        return (int) $existing->id;
    }
    $u = new stdClass();
    $u->auth = 'manual';
    $u->username = $username;
    $u->firstname = $first;
    $u->lastname = $last;
    $u->email = $email;
    $u->password = $password;
    $u->confirmed = 1;
    $u->mnethostid = $CFG->mnet_localhost_id;
    return (int) user_create_user($u, false, false);
}

$course = $DB->get_record('course', ['shortname' => 'IINICIA-SOFT1'], '*', MUST_EXIST);
$studentrole = $DB->get_record('role', ['shortname' => 'student'], '*', MUST_EXIST);

$plugin = enrol_get_plugin('manual');
$instance = null;
foreach (enrol_get_instances($course->id, true) as $i) {
    if ($i->enrol === 'manual') { $instance = $i; break; }
}

for ($n = 1; $n <= 5; $n++) {
    $username = "estudiante$n.prueba";
    $id = make_user($username, "Estudiante$n", 'Prueba', "estudiante$n.prueba@iinicia.local", "Estudiante{$n}#2026");
    $plugin->enrol_user($instance, $id, $studentrole->id);
    echo "OK $username (id $id) matriculado en IINICIA-SOFT1\n";
}
EOF
MSYS_NO_PATHCONV=1 docker compose exec -T moodle php < seed-5-estudiantes.php
rm seed-5-estudiantes.php
```

### Progreso: por qué hace falta `moodle-habilitar-completion.php`

Por default, un curso recién creado (por `admin/tool/generator` o por
`moodle-seed-cursos.php`) NO tiene seguimiento de finalización
(`enablecompletion`) activado, aunque tenga actividades reales. Sin eso,
Moodle siempre reporta `progress: null` en
`core_enrol_get_users_courses` — la barra de progreso de Mi IINICIA nunca
avanza, y peor: la seriación de materias
(`MoodleService.obtenerCursosAprobados`, que exige `progress === 100`)
**nunca puede desbloquear a nadie**, aunque el estudiante haya hecho
todo. Este script habilita seguimiento manual (la casilla que Moodle
muestra junto a cada actividad) en `IINICIA101`, `IINICIA-SOFT1`,
`IINICIA-CIBER1` e `IINICIA-NEG1`:

```bash
MSYS_NO_PATHCONV=1 docker compose exec -T moodle php < moodle-habilitar-completion.php
```

Ya está corrido en esta máquina. Es idempotente (se puede repetir sin
romper nada) — vuelve a correrlo si creas un curso nuevo con contenido
que también deba seguir progreso/seriación.

### Correo: por qué hace falta `noemailever` en este entorno

Esta imagen de Moodle no trae `sendmail` ni SMTP configurado. La mayoría
de las operaciones no lo necesitan, pero matricular a alguien con un rol
"de riesgo" (p. ej. `editingteacher`, que es lo que hace `npm run seed`
con `profesor.prueba` arriba) dispara una notificación interna de Moodle
que intenta enviarse por correo. Esa llamada a `/usr/sbin/sendmail`
falla (`sh: 1: /usr/sbin/sendmail: not found`), y a diferencia de la
creación de usuario (donde Moodle solo deja un aviso
`email_to_user(): Invalid address` y sigue), aquí el fallo del
procesador de mensajes sí se propaga como excepción de la llamada REST
(`"Message was not sent."`) — aunque la matrícula ya se guardó en la
base de datos antes de ese paso. Para que esa llamada no truene, en una
instalación nueva corre:

```bash
docker compose exec -T moodle php admin/cli/cfg.php --name=noemailever --set=1
docker compose exec -T moodle php admin/cli/cfg.php --name=noreplyaddress --set="noreply@iinicia.local"
```

`noemailever` es la bandera oficial de Moodle para entornos de prueba:
desactiva todo envío de correo saliente (igual que `MailService` en el
backend, que sin `MAIL_HOST` solo registra el correo en el log en vez de
enviarlo). Ya está puesto en esta máquina.

## Habilitar Web Services (para que el backend conecte)

El backend necesita conectarse a Moodle vía Web Services/REST, de forma
idempotente (ver CLAUDE.md y docs/requerimientos.md sección 13). Pasos:

1. **Habilitar web services y el protocolo REST** (vía CLI, con
   `admin/cli/cfg.php`):

   ```bash
   docker compose exec -T moodle php admin/cli/cfg.php --name=enablewebservices --set=1
   docker compose exec -T moodle php admin/cli/cfg.php --name=webserviceprotocols --set=rest
   ```

2. **Crear el servicio web externo + token.** La interfaz de admin
   (*Site administration > Server > Web services*) hace exactamente
   esto — aquí lo hacemos por script para que sea repetible y no
   dependa de clicks. Usa las mismas funciones internas que usa esa UI
   (`webservice::add_external_service()`,
   `add_external_function_to_service()`, `external_generate_token()`):

   ```bash
   cat > seed-webservice-token.php << 'EOF'
   <?php
   define('CLI_SCRIPT', true);
   require('/var/www/html/config.php');
   require_once($CFG->dirroot . '/webservice/lib.php');
   require_once($CFG->libdir . '/externallib.php');

   $shortname = 'iinicia_backend';
   $functions = [
       'core_user_get_users',
       'core_user_get_users_by_field',
       'core_user_create_users',
       'core_user_update_users',
       'core_course_get_courses',
       'core_course_create_courses',
       'enrol_manual_enrol_users',
       'core_enrol_get_users_courses',
       'core_webservice_get_site_info',
       'core_calendar_get_action_events_by_timesort',
       'core_enrol_get_enrolled_users', // GET /usuarios/mis-estudiantes (profesor)
   ];

   $wsmanager = new webservice();
   $service = $wsmanager->get_external_service_by_shortname($shortname);
   if (!$service) {
       $data = new stdClass();
       $data->name = 'IINICIA Backend';
       $data->shortname = $shortname;
       $data->enabled = 1;
       $data->restrictedusers = 0;
       $data->downloadfiles = 0;
       $data->uploadfiles = 0;
       $wsmanager->add_external_service($data);
       $service = $wsmanager->get_external_service_by_shortname($shortname);
   }
   $existing = array_column(
       $DB->get_records('external_services_functions', ['externalserviceid' => $service->id]),
       'functionname',
   );
   foreach ($functions as $fn) {
       if (!in_array($fn, $existing, true)) {
           $wsmanager->add_external_function_to_service($fn, $service->id);
       }
   }

   $admin = $DB->get_record('user', ['username' => 'admin', 'deleted' => 0], '*', MUST_EXIST);
   $existingtoken = $DB->get_record('external_tokens', [
       'tokentype' => EXTERNAL_TOKEN_PERMANENT,
       'userid' => $admin->id,
       'externalserviceid' => $service->id,
   ]);
   $token = $existingtoken ? $existingtoken->token : external_generate_token(
       EXTERNAL_TOKEN_PERMANENT, $service->id, $admin->id, context_system::instance(),
   );
   echo "MOODLE_TOKEN=$token\n";
   EOF
   MSYS_NO_PATHCONV=1 docker compose exec -T moodle php < seed-webservice-token.php
   rm seed-webservice-token.php
   ```

   Verifica que el token sirve de verdad (debe devolver JSON con el
   nombre del sitio, no un error):

   ```bash
   curl -s "http://localhost:8080/webservice/rest/server.php?wstoken=<EL_TOKEN>&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json"
   ```

3. Ese token va en `backend/.env` como `MOODLE_TOKEN` (y la URL base
   como `MOODLE_URL=http://localhost:8080`) — **nunca** en
   `frontend/.env*` ni en el código de Android, por regla de CLAUDE.md.
   El token ya generado en esta máquina está en la sección "Estado
   actual" arriba.

## SSO portal → Moodle (auth_userkey)

`GET /estudiante/moodle-sso` (backend) devuelve una URL de un solo uso
que entra a Moodle ya autenticado, sin pedir contraseña — es el botón
"Entrar al Campus" de Mi IINICIA. Usa el plugin de terceros
[`auth_userkey`](https://github.com/catalyst/moodle-auth_userkey)
(gratuito, GPL), vendorizado en `moodle-custom/auth/userkey/` y montado
sobre `moodle-src` vía `docker-compose.yml` — **nunca se copia dentro de
`moodle-src/`**, que es el checkout del core sin versionar.

Se investigó primero el mecanismo nativo de Moodle
(`tool_mobile_get_autologin_key`), pero exige HTTPS (`is_https()` en
`admin/tool/mobile/classes/api.php`) y que el request venga con el
User-Agent de la app oficial de Moodle (`core_useragent::is_moodle_app()`
en `classes/external.php`) — no sirve para un BFF propio sin saltarse esa
protección a propósito. `auth_userkey` sí está pensado exactamente para
esto: el backend pide por email una URL de login con hash+expiración
corta (`auth_userkey_request_login_url`), sin exigir HTTPS ni la app.

Ya configurado en esta máquina (idempotente, repetible en una
instalación nueva):

```bash
# 1. El plugin ya está en moodle-custom/auth/userkey/ y montado en
#    docker-compose.yml. Si cambias el código del plugin o es la
#    primera vez, hay que registrar/actualizar en Moodle:
MSYS_NO_PATHCONV=1 docker compose exec -T moodle php admin/cli/upgrade.php --non-interactive

# 2. Habilitar el método de autenticación (mantén los que ya tengas en
#    $CFG->auth, solo agrega "userkey"; "manual" siempre está implícito,
#    no hace falta listarlo):
docker compose exec -T moodle php admin/cli/cfg.php --name=auth --set="email,userkey"

# 3. Agregar la función al servicio ya existente (mismo patrón que el
#    script de "Habilitar Web Services" arriba, por si no está):
cat > add-userkey-function.php << 'EOF'
<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once($CFG->dirroot . '/webservice/lib.php');
$service = (new webservice())->get_external_service_by_shortname('iinicia_backend');
$existing = array_column(
    $DB->get_records('external_services_functions', ['externalserviceid' => $service->id]),
    'functionname',
);
if (!in_array('auth_userkey_request_login_url', $existing, true)) {
    (new webservice())->add_external_function_to_service('auth_userkey_request_login_url', $service->id);
}
echo "OK\n";
EOF
MSYS_NO_PATHCONV=1 docker compose exec -T moodle php < add-userkey-function.php
rm add-userkey-function.php
```

La configuración del plugin (mapeo por `email`, sin crear/actualizar
usuarios, sin restricción de IP) se deja en sus valores por defecto —
son exactamente los que necesitamos. El `key` que genera expira en 60s
y sirve una sola vez: el backend lo pide justo antes de redirigir,
nunca lo guarda (ver `MoodleService.solicitarUrlAutologin`).

## Identidad visual de Moodle (CA-15: logo, favicon, color de marca)

Moodle trae su tema Boost por defecto, sin tocar ningún archivo de
`moodle-src` (nunca se modifica el core). Logo, logo compacto y favicon
se suben vía la API de archivos de Moodle (no hay forma de subir un
archivo con `admin/cli/cfg.php`, ese solo sirve para valores simples):

```bash
# 1. Copiar los mismos assets que ya usa el portal (frontend/public/) al contenedor.
# Ojo: logo-inicia.png tiene letras BLANCAS sobre fondo transparente (pensado
# para el navbar oscuro del portal) - en el recuadro de fondo claro que usa
# Moodle para el logo se ve lavado/casi invisible. Usa la version de letras
# oscuras para que se vea bien ahi.
MSYS_NO_PATHCONV=1 docker cp ../frontend/public/logo-iinicia-oscuro-letras.jpg iinicia-moodle:/tmp/logo-iinicia-oscuro-letras.jpg
MSYS_NO_PATHCONV=1 docker cp ../frontend/public/logo-iinicia-oscuro-letras.ico iinicia-moodle:/tmp/favicon.ico

# 2. Registrarlos como logo/logocompact/favicon vía la API de archivos
cat > set-branding.php << 'EOF'
<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');

function set_stored_file(string $setting, string $filearea, string $path, string $filename): void {
    $syscontext = context_system::instance();
    $fs = get_file_storage();
    $fs->delete_area_files($syscontext->id, 'core_admin', $filearea, 0);
    $fs->create_file_from_pathname([
        'contextid' => $syscontext->id,
        'component' => 'core_admin',
        'filearea'  => $filearea,
        'itemid'    => 0,
        'filepath'  => '/',
        'filename'  => $filename,
    ], $path);
    set_config($setting, '/' . $filename, 'core_admin');
}

set_stored_file('logo', 'logo', '/tmp/logo-iinicia-oscuro-letras.jpg', 'logo-iinicia-oscuro-letras.jpg');
set_stored_file('logocompact', 'logocompact', '/tmp/logo-iinicia-oscuro-letras.jpg', 'logo-iinicia-oscuro-letras.jpg');
set_stored_file('favicon', 'favicon', '/tmp/favicon.ico', 'favicon.ico');
theme_reset_all_caches();
echo "OK\n";
EOF
MSYS_NO_PATHCONV=1 docker compose exec -T moodle php < set-branding.php
rm set-branding.php

# 3. Color de marca (mismo azul marino del portal y Android, ver android/README.md)
docker compose exec -T moodle php admin/cli/cfg.php --component=theme_boost --name=brandcolor --set="#0B2A5B"
docker compose exec -T moodle php admin/cli/cfg.php --name=sitename --set="IINICIA Campus Virtual"

# 4. Purgar caché de temas para que recompile el SCSS con el nuevo color
docker compose exec -T moodle php admin/cli/purge_caches.php
```

Esto NO cubre un theme a medida (tipografía, layout, componentes) — es
el ajuste de bajo riesgo (sin plugin de tema nuevo, sin tocar
`moodle-src`) que da identidad coherente con el portal y Android: logo,
favicon y color primario. Un theme propio completo queda para una fase
posterior si hace falta más que esto.

## Por qué el backend en Docker necesita MOODLE_HOST_HEADER

El servicio `backend` del `docker-compose.yml` llama a Moodle por el
nombre interno de la red de Docker (`http://moodle`), no por
`http://localhost:8080` (eso solo funciona desde tu máquina, no entre
contenedores). Pero Moodle tiene configurado `$CFG->wwwroot =
http://localhost:8080`, y redirige (303) cualquier petición que llegue
con un `Host` distinto al de su `wwwroot` — incluida
`webservice/rest/server.php`. El backend seguía esa redirección hacia
`http://localhost:8080` **desde dentro de su propio contenedor**, donde
no hay nada escuchando en ese puerto, y fallaba con
`TypeError: fetch failed` / "No se pudo conectar con Moodle".

(Probamos primero `$CFG->reverseproxy`, que parecía la opción obvia para
"mismatch de host" — pero Moodle usa ese flag para un escenario distinto:
asume que SOLO se accede a través de un proxy real y rechaza con error 500
cualquier request cuyo Host coincida exactamente con el wwwroot, lo cual
rompía el acceso normal desde el navegador a `localhost:8080`. Se revirtió.)

La solución real: `MOODLE_HOST_HEADER=localhost:8080` en el `environment:`
del servicio `backend` (`docker-compose.yml`). `MoodleService` (ver
`backend/src/moodle/moodle.service.ts`) usa esa variable para forzar el
header `Host` correcto mientras conecta físicamente a `moodle` — con
`node:http` directamente, porque `fetch()` no puede sobreescribir `Host`
(la spec Fetch lo prohíbe). Sin Docker (backend corriendo local con
`npm run start:dev`), no se define esta variable y todo sigue igual que
antes (vía `fetch`, sin cambios).

## Arrancar todo y cambiar de red sin editar nada a mano

Dos scripts de PowerShell, para dos problemas distintos:

- **`start.ps1`** — prende Docker Desktop (si está apagado) y sube los 4
  servicios (`docker compose up -d`). Se corre una vez por sesión/reboot.
- **`fix-network.ps1`** — se corre cada vez que cambias de red (otros
  datos celulares, wifi de la escuela, otro hotspot). Detecta la IP de
  la interfaz con salida a internet y reescribe lo que depende de ella:
  `docker-compose.override.yml` (`MOODLE_HOST_HEADER`), `backend/.env`
  (`ALLOWED_ORIGIN`), `frontend/.env.local`
  (`NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_MOODLE_URL`) y el `wwwroot` forzado
  en el `config.php` de Moodle — luego reinicia `moodle` (OPcache corre
  con `validate_timestamps=0`, ver `moodle-custom/php/opcache-dev.ini`:
  sin este restart Apache sigue sirviendo el `config.php` viejo desde
  memoria y Moodle redirige de vuelta a la IP anterior) y recrea
  `backend`/`frontend`. Antes había que editar los cuatro a mano cada vez.

```powershell
cd infrastructure
./start.ps1          # una vez por sesión
./fix-network.ps1    # cada vez que cambies de red
```

Para la app Android en un dispositivo físico sí hay que recompilar:
actualiza `apiBaseUrl` en `android/local.properties` con la URL de
Backend que imprime `fix-network.ps1` (ver el comentario en
`android/app/build.gradle.kts`) y vuelve a instalar el APK.

Esto sigue exigiendo que todos los dispositivos (laptop, celular)
estén en la MISMA red — no resuelve demos desde una red que no
controlas tú. Para eso, la opción es un túnel con hostname fijo
(Cloudflare Tunnel) o el despliegue real a producción (ver `DEPLOY.md`).

**Ojo con el portal en blanco al abrirlo por IP:** Next 16 bloquea por
default los recursos de dev (`_next/hmr`, bundles JS) si el `Host` de
la petición no está en `allowedDevOrigins` — la página carga el HTML
pero nunca hidrata, se ve vacía (sin error visible; el aviso solo sale
en `docker compose logs frontend`: "Blocked cross-origin request to
Next.js dev resource"). `frontend/next.config.ts` ya deriva ese host de
`NEXT_PUBLIC_API_URL`, así que `fix-network.ps1` lo resuelve solo (no
hace falta tocar nada aparte) — pero si alguna vez vuelve a pasar,
revisa esos logs primero.

## Comandos útiles

```bash
docker compose ps                 # ver estado de los contenedores
docker compose logs -f moodle     # logs en vivo de Moodle
docker compose down               # apagar todo (conserva los datos)
docker compose down -v            # apagar y BORRAR los datos (reinstala desde cero)
```

## Siguiente fase (no es parte de esta entrega)

- Tema propio de Moodle en `moodle-custom/` (igual que `auth/userkey`,
  nunca modificar `moodle-src/` directamente — eso es el core de
  Moodle).
- Dominios reales (`aula.iinicia.org`, `api.iinicia.org`) y HTTPS, solo
  para ambientes STAGING/PRODUCTION — no aplica a desarrollo local.
- **Keycloak / OIDC (docs/requerimientos.md sección 10) — pendiente.**
  El SSO portal→Moodle de hoy (`GET /estudiante/moodle-sso`, plugin
  `auth_userkey`) es un puente punto a punto: el backend usa su token
  admin de Moodle para pedir una URL de login de un solo uso a nombre
  del usuario. Resuelve el síntoma (no se pide una segunda contraseña
  para entrar al LMS desde el portal web) pero no es una identidad
  única: Android no está cubierto, no hay MFA ni revocación de sesión
  centralizada, y Moodle sigue sin saber nada de la identidad real del
  portal (solo recibe URLs firmadas por el backend). Resolverlo de
  fondo implica levantar Keycloak como IdP, que portal/Moodle/Android
  hagan el mismo flujo OAuth2/OIDC contra él, y cambiar Moodle de
  `auth_userkey` a `auth_oidc`.
