# `infrastructure/docker-compose.yml` + `docker-compose.override.yml` + `docker-compose.prod.yml` + `.env.example` + `.env.prod.example`

**En una frase:** estos archivos levantan, con un solo comando, los contenedores que forman todo IINICIA (base de datos, Moodle y backend) y los conectan entre sí, con una configuración distinta para "en mi laptop" (dev) y "en la VM real" (prod).

## Por qué existe

IINICIA no es una sola aplicación: es un portal (Next.js), un backend (NestJS) y un Moodle, que además comparten un motor de base de datos (PostgreSQL). Si cada desarrollador tuviera que instalar Moodle, PHP, Apache y Postgres a mano en su máquina, cada instalación terminaría distinta y "funciona en mi máquina" sería la norma. Docker Compose describe esos servicios una sola vez, en un archivo versionado, y cualquiera que clone el repo con Docker Desktop instalado levanta exactamente el mismo stack con `docker compose up -d`.

Que existan **tres** archivos de compose (no uno) resuelve un problema distinto: desarrollo y producción necesitan configuraciones que se contradicen (puertos abiertos al host vs. cerrados, hot-reload vs. imagen compilada, HTTPS vs. HTTP plano). Docker Compose permite "apilar" archivos (`docker-compose.yml` + `docker-compose.override.yml` en dev; o `docker-compose.yml` + `docker-compose.prod.yml` en producción) en vez de duplicar todo el stack dos veces.

## Recorrido del código

### `docker-compose.yml` — la base, usada en ambos entornos

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-iinicia}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-iinicia_dev_password}
      POSTGRES_DB: ${POSTGRES_DB:-iinicia_backend}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-iinicia} -d ${POSTGRES_DB:-iinicia_backend}"]
```

Un único contenedor de PostgreSQL sirve **dos** bases de datos distintas: `iinicia_backend` (la del portal/NestJS) y `moodle` (la de Moodle). La segunda la crea un script SQL montado en `docker-entrypoint-initdb.d` la primera vez que el contenedor arranca con un volumen vacío. Esto evita correr dos motores de base de datos distintos solo porque Moodle y NestJS normalmente no comparten infraestructura — es una simplificación deliberada para un proyecto académico, no lo que harías con dos equipos de producción separados.

El `healthcheck` (`pg_isready`) es importante: otros servicios declaran `depends_on: postgres: condition: service_healthy`, es decir, "no arranques hasta que Postgres esté realmente aceptando conexiones", no solo "hasta que el contenedor exista". Sin esto, Moodle o el backend podrían arrancar una fracción de segundo antes de que Postgres esté listo y fallar en el primer intento de conexión.

```yaml
  moodle:
    image: moodlehq/moodle-php-apache:8.3
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "8080:80"
    volumes:
      - ./moodle-src:/var/www/html
      - moodledata_data:/var/www/moodledata
      - ./moodle-custom/auth/userkey:/var/www/html/auth/userkey
      - ./moodle-custom/php/opcache-dev.ini:/usr/local/etc/php/conf.d/99-opcache-dev.ini:ro
```

Este bloque es la pieza que conecta directamente con la regla de CLAUDE.md "no modificar el core de Moodle". `moodlehq/moodle-php-apache` es solo el runtime (PHP + Apache), sin código de Moodle dentro de la imagen: el código real de Moodle vive en `./moodle-src` (un checkout de GitHub, ~700 MB, **no versionado en git** porque es código de terceros) y se monta ahí encima. El plugin propio (`auth_userkey`) se monta en un **segundo** volumen, separado, directamente sobre la carpeta `auth/userkey` dentro de ese árbol de Moodle. Así, aunque `moodle-src` se borre y se vuelva a clonar desde cero, el plugin personalizado no se pierde — vive en `moodle-custom/`, que sí está en git.

El volumen de OPcache (`opcache-dev.ini`) resuelve un problema de rendimiento específico de Windows: leer miles de archivos PHP de Moodle a través de un bind mount desde el sistema de archivos de Windows es lento, y sin cachear el bytecode compilado cada petición puede tardar más que el timeout que el backend usa para hablar con Moodle.

```yaml
  backend:
    build:
      context: ../backend
      target: dev
    depends_on:
      postgres:
        condition: service_healthy
      moodle:
        condition: service_started
    env_file:
      - ../backend/.env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-iinicia}:${POSTGRES_PASSWORD:-iinicia_dev_password}@postgres:5432/${POSTGRES_DB:-iinicia_backend}
      MOODLE_URL: http://moodle
      MOODLE_HOST_HEADER: 172.20.10.5:8080
      PORT: 3001
    volumes:
      - ../backend/src:/app/src
      - ../backend/test:/app/test
```

Dos cosas no obvias aquí:

1. **`env_file` + `environment` al mismo tiempo.** El backend carga su `.env` normal (pensado para correr *sin* Docker, con `localhost`) vía `env_file`, pero luego `environment:` **sobreescribe** `DATABASE_URL` y `MOODLE_URL` con los nombres de servicio de la red interna de Docker (`postgres`, `moodle`). Dentro de la red de Docker, `localhost` se referiría al propio contenedor del backend, no a Postgres o Moodle — por eso hace falta esta superposición.
2. **`target: dev`** apunta a una etapa del `Dockerfile` del backend que monta `src/` como volumen y corre `nest start --watch`. Esto es lo que permite editar código en el editor del host y ver el cambio reflejado sin reconstruir la imagen Docker — igual que correr el backend fuera de Docker, pero dentro de la red de contenedores.

```yaml
  frontend:
    build: ../frontend
    depends_on:
      - backend
    volumes:
      - ../frontend:/app
      - /app/node_modules
      - /app/.next
```

El frontend monta todo el directorio como volumen (hot-reload de Next.js), pero `node_modules` y `.next` quedan en **volúmenes anónimos propios del contenedor** — si no se hiciera esto, el volumen del directorio completo pisaría lo que `npm install` instaló dentro del contenedor con lo que (o no) exista en el `node_modules` del host, rompiendo la instalación.

### `docker-compose.override.yml` — ajuste de dev que varía por red

```yaml
services:
  backend:
    environment:
      MOODLE_HOST_HEADER: 172.20.10.5:8080
```

Docker Compose carga automáticamente `docker-compose.yml` + `docker-compose.override.yml` cuando no se especifica `-f` explícito — este es el mecanismo estándar de Compose para "overrides locales". Este archivo existe separado del principal porque `MOODLE_HOST_HEADER` cambia cada vez que el equipo de desarrollo cambia de red (wifi de la universidad, datos celulares, otro hotspot): el script `fix-network.ps1` (ver el README de `infrastructure/`) reescribe solo este archivo, sin tocar `docker-compose.yml`.

### `docker-compose.prod.yml` — producción

```yaml
name: iinicia-prod
services:
  postgres: # igual, pero sin "ports:" — no expuesto al host
  moodle:   # igual, pero sin "ports:" y con opcache-prod.ini
  backend:
    build:
      context: ../backend
      target: runtime   # NO "dev": imagen ya compilada, sin montar src/
    environment:
      MOODLE_HOST_HEADER: ${CAMPUS_DOMAIN}
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
```

Diferencias clave frente a dev:

- **Ningún puerto de `postgres`, `moodle` ni `backend` se publica al host** (sin `ports:`). El único servicio con puertos públicos es `caddy` (80/443): todo lo demás solo es alcanzable *dentro* de la red interna de Docker. Esto reduce la superficie de ataque — nadie puede conectarse directo a Postgres o al backend desde fuera de la VM.
- `backend` usa `target: runtime` (la imagen ya compilada por el `Dockerfile`, sin hot-reload) y no monta `src/` como volumen: el código que corre es exactamente el que se construyó en el build, no lo que haya en el disco en ese momento.
- Se agrega el servicio `caddy`, un proxy inverso que (a) hace de único punto de entrada HTTPS (certificados automáticos de Let's Encrypt, ver `Caddyfile`) y (b) enruta por nombre de dominio: `API_DOMAIN` → `backend:3001`, `CAMPUS_DOMAIN` → `moodle:80`.
- El frontend **no está en este archivo**: se despliega aparte en Vercel, no en la misma VM.
- `MOODLE_HOST_HEADER` ya no es una IP de LAN sino `${CAMPUS_DOMAIN}` — el dominio público real de Moodle en producción (ver la sección "Por qué `MOODLE_HOST_HEADER`" más abajo).

### `.env.example` (dev) y `.env.prod.example` (producción)

Ninguno de los dos se versiona con valores reales (regla de CLAUDE.md: "nunca subir `.env` al repositorio"); son plantillas que se copian a `.env` / `.env.prod` y se completan localmente.

| Variable | Dónde se usa | Para qué sirve |
| --- | --- | --- |
| `POSTGRES_USER` | `docker-compose.yml`, `.prod.yml` | Usuario de PostgreSQL (mismo para ambas bases, `iinicia_backend` y `moodle`). |
| `POSTGRES_PASSWORD` | idem | Contraseña de ese usuario. En dev tiene un default débil a propósito (`iinicia_dev_password`); en prod el ejemplo obliga a poner una propia larga y aleatoria. |
| `POSTGRES_DB` | idem | Nombre de la base del backend (NestJS). La base `moodle` se crea aparte, por script. |
| `MOODLE_ADMIN_USER` / `MOODLE_ADMIN_PASSWORD` / `MOODLE_ADMIN_EMAIL` | Solo documentación/uso manual al instalar Moodle (no se inyectan automáticamente a ningún contenedor) | Credenciales del superusuario `admin` de Moodle, usadas al correr `admin/cli/install.php` (ver `infrastructure/README.md`). |
| `API_DOMAIN` (solo `.env.prod.example`) | `docker-compose.prod.yml`, `Caddyfile` | Dominio público por el que el backend responde en producción; Caddy emite su certificado HTTPS para este nombre. |
| `CAMPUS_DOMAIN` (solo `.env.prod.example`) | idem, y además `MOODLE_HOST_HEADER` del backend | Dominio público de Moodle en producción. |

## Conexión con el resto del sistema

- `backend/src/moodle/moodle.service.ts` lee `MOODLE_URL`, `MOODLE_TOKEN` y, si está presente, `MOODLE_HOST_HEADER` (estas dos últimas vienen de `backend/.env`, no de `infrastructure/.env` — son dos archivos de entorno distintos para dos propósitos distintos: uno configura los contenedores, el otro configura la lógica de negocio del backend). Dentro de Docker, `MOODLE_URL` se sobreescribe a `http://moodle` por el bloque `environment:` de `docker-compose.yml`.
- `start.ps1` y `fix-network.ps1` (en `infrastructure/`) automatizan `docker compose up -d` y la reescritura de `docker-compose.override.yml` cuando cambia la red local.
- El plugin `auth_userkey` (documentado en `docs/codigo-explicado/infrastructure/moodle-plugin/`) es justamente el contenido que el volumen `./moodle-custom/auth/userkey:/var/www/html/auth/userkey` de este compose monta dentro del contenedor de Moodle.

## Cosas que no son obvias a primera vista

- **Por qué `MOODLE_HOST_HEADER` existe.** Moodle rechaza (redirige 303) cualquier petición cuyo header `Host` no coincida con su `$CFG->wwwroot` configurado. El backend, dentro de Docker, llega a Moodle por el nombre interno del servicio (`http://moodle`), no por el dominio/IP público que Moodle espera — así que sin forzar el header `Host` correcto, la petición del backend hacia Moodle termina en un bucle de redirección hacia sí mismo. Se decidió explícitamente **no** usar `$CFG->reverseproxy` de Moodle para esto: ese flag asume que *todo* el tráfico entra por un proxy real y rompe el acceso normal desde el navegador. La solución es forzar el header `Host` manualmente desde `MoodleService`, usando `node:http` en vez de `fetch()` (que no permite sobreescribir `Host` por especificación).
- **Por qué no se usa `bitnami/moodle`.** Era la opción obvia de "Moodle todo en uno" en Docker Hub, pero dejó de estar disponible gratis. De ahí la arquitectura de dos piezas (imagen oficial de solo runtime + código fuente de Moodle montado aparte).
- **Por qué Moodle 4.5 y no 5.0.** Moodle 5.0 reestructuró el webroot (introdujo una carpeta `public/`) de un modo incompatible con la imagen base `moodlehq/moodle-php-apache` usada aquí y con la mayoría de guías existentes; 4.5 es la rama LTS (soporte largo) anterior a ese cambio.
- **Por qué el frontend no tiene equivalente en `docker-compose.prod.yml`.** No es un descuido: se decidió desplegarlo en Vercel por separado, así que el compose de producción solo orquesta lo que corre en la VM (Postgres, Moodle, backend, Caddy).
