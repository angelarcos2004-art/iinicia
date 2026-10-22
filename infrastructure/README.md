# Infraestructura IINICIA (desarrollo local)

Levanta PostgreSQL + Moodle en Docker para desarrollo local. El backend
(NestJS) lo corre por separado el equipo de `backend/` hasta que tenga su
propio `Dockerfile` (hay un servicio comentado en `docker-compose.yml`
listo para cuando lo agreguen).

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
- Web Services REST ya habilitados y probados por HTTP de verdad
  (`core_webservice_get_site_info` y `core_user_get_users_by_field`
  contra el servicio real, no solo revisando la base de datos):
  - Servicio: `IINICIA Backend` (shortname `iinicia_backend`), con las
    9 funciones que el backend va a necesitar (ver script en "Habilitar
    Web Services" abajo).
  - Token del usuario `admin` para ese servicio:
    `ddde4b467e7b7d79ac7696b36d23b26e` — úsalo tal cual en
    `backend/.env` (`MOODLE_URL=http://localhost:8080`,
    `MOODLE_TOKEN=ddde4b467e7b7d79ac7696b36d23b26e`) si trabajas en esta
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
  --lang=en \
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

## Comandos útiles

```bash
docker compose ps                 # ver estado de los contenedores
docker compose logs -f moodle     # logs en vivo de Moodle
docker compose down               # apagar todo (conserva los datos)
docker compose down -v            # apagar y BORRAR los datos (reinstala desde cero)
```

## Siguiente fase (no es parte de esta entrega)

- Dockerfile para `backend/` y descomentar el servicio `backend` en
  `docker-compose.yml`.
- Tema/plugins propios en `moodle-custom/` (nunca modificar
  `moodle-src/` directamente — eso es el core de Moodle).
- Dominios reales (`aula.iinicia.org`, `api.iinicia.org`) y HTTPS, solo
  para ambientes STAGING/PRODUCTION — no aplica a desarrollo local.
