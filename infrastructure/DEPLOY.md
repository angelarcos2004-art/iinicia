# Despliegue en producción (VM gratuita + Vercel)

Objetivo: una URL pública real para backend + Moodle (en una VM gratuita de
Google Cloud) y el portal en Vercel, para que Android/el portal funcionen
desde cualquier dispositivo sin depender de tu red local. Ver
`infrastructure/README.md` para el detalle de cada paso de Moodle (aquí solo
se listan las diferencias respecto a ese entorno de desarrollo local).

**No se sube nada de esto al repo** (`.env`, `.env.prod`, claves, tokens).

## 0. Resumen de piezas

- **VM gratuita (Google Cloud `e2-micro`, "Always Free")**: Postgres + Moodle
  + backend (NestJS), con Caddy delante dando HTTPS automático.
- **Vercel** (ya tienes cuenta): el portal Next.js.
- **sslip.io**: en vez de comprar un dominio, `api.<IP-con-guiones>.sslip.io`
  y `campus.<IP-con-guiones>.sslip.io` resuelven directo a la IP pública de
  tu VM. Ej. IP `34.12.45.9` → `api.34-12-45-9.sslip.io`.

La VM tiene solo 1GB de RAM — ajustado pero suficiente para una demo con
pocos usuarios simultáneos. El paso 2 (swap) es la red de seguridad para que
un pico de memoria no tumbe la VM entera.

## 1. Crear la VM

Consola de Google Cloud (console.cloud.google.com) → Compute Engine → Crear
instancia:

- Región: **us-central1**, **us-west1** o **us-east1** (son las únicas
  elegibles para el `e2-micro` gratuito).
- Tipo de máquina: `e2-micro`.
- Imagen: Debian 12.
- Firewall: habilita "Permitir tráfico HTTP" y "Permitir tráfico HTTPS".
- Anota la **IP externa** que te asigna (es fija mientras no borres la VM).

## 2. Preparar la VM (conectado por SSH desde la consola)

```bash
# Swap de 2GB: sin esto, Postgres + Moodle + Node en 1GB de RAM real
# arriesgan que el kernel mate contenedores al azar bajo carga.
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Docker + plugin de compose (repo oficial de Docker para Debian)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# Cierra la sesión SSH y vuelve a entrar para que el grupo "docker" surta efecto.
```

## 3. Subir el proyecto

Clona tu repo (o `git archive`/`scp` si es privado y no quieres dar acceso
SSH a GitHub desde la VM) y el código de Moodle, igual que en local:

```bash
git clone <url-de-tu-repo> iinicia
cd iinicia/infrastructure
git clone --branch MOODLE_405_STABLE --depth 1 https://github.com/moodle/moodle.git moodle-src
```

## 4. Variables de entorno

```bash
cp .env.prod.example .env.prod
# Edita .env.prod: POSTGRES_PASSWORD con una clave real, y API_DOMAIN /
# CAMPUS_DOMAIN con tu IP real en formato con guiones.

cp ../backend/.env.example ../backend/.env
```

Edita `backend/.env` con valores de producción:

- `JWT_SECRET`: genera uno nuevo (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) — **no reutilices el de tu máquina local**.
- `DB_SYNCHRONIZE=false` (en producción no se auto-migra el esquema a ciegas).
- `ALLOWED_ORIGIN`: la URL de tu proyecto en Vercel (ej. `https://iinicia.vercel.app`).
- `FRONTEND_URL`: la misma URL de Vercel.
- `MOODLE_URL=http://moodle` (nombre del servicio Docker, igual que en dev).
- `GOOGLE_CLIENT_ID`: el mismo que ya usas.
- `MOODLE_TOKEN` y `MOODLE_HOST_HEADER` los completas en el paso 6 (todavía
  no existen).
- `MAIL_*` / `FIREBASE_SERVICE_ACCOUNT`: opcionales, igual que en desarrollo.

## 5. Instalar Moodle (con el dominio público real, no `localhost:8080`)

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d postgres moodle

# Reemplaza <CAMPUS_DOMAIN> por el valor real de tu .env.prod
docker compose -f docker-compose.prod.yml exec -T moodle php admin/cli/install.php \
  --lang=en \
  --wwwroot=https://<CAMPUS_DOMAIN> \
  --dataroot=/var/www/moodledata \
  --dbtype=pgsql \
  --dbhost=postgres \
  --dbname=moodle \
  --dbuser=iinicia \
  --dbpass='<el-POSTGRES_PASSWORD-de-.env.prod>' \
  --dbport=5432 \
  --prefix=mdl_ \
  --fullname='IINICIA Campus Virtual' \
  --shortname=IINICIA \
  --adminuser=admin \
  --adminpass='<elige-una-contraseña-segura-nueva>' \
  --adminemail=admin@iinicia.local \
  --non-interactive \
  --agree-license

# Caddy termina el HTTPS y le habla a Moodle por HTTP simple dentro de
# Docker: sin esto Moodle genera enlaces/redirecciones http:// y rompe.
docker compose -f docker-compose.prod.yml exec -T moodle php admin/cli/cfg.php --name=sslproxy --set=1
```

## 6. Web services + SSO (`auth_userkey`)

Repite exactamente los scripts de "Habilitar Web Services" y "SSO portal →
Moodle" de `infrastructure/README.md`, pero corriéndolos contra esta VM
(mismo `docker compose exec`, sin `MSYS_NO_PATHCONV=1` porque aquí ya estás
en Linux, no Git Bash). El token que imprima `seed-webservice-token.php` es
nuevo — distinto al de tu máquina local — y es el que pones en
`MOODLE_TOKEN` dentro de `backend/.env`. Pon también en `backend/.env`:

```
MOODLE_HOST_HEADER=<CAMPUS_DOMAIN>
```

## 7. Crear curso y usuarios de prueba

Igual que en local (sección "Crear curso y usuarios de prueba" del README):
`maketestcourse.php` + el script `seed-test-users.php`, y
`moodle-seed-cursos.php` si quieres el catálogo completo.

## 8. Levantar todo (backend + Caddy)

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend node dist/seed.js
```

La primera visita a `https://<API_DOMAIN>` o `https://<CAMPUS_DOMAIN>` tarda
unos segundos más: Caddy pide el certificado a Let's Encrypt en ese momento.

Prueba:

```bash
curl -i https://<API_DOMAIN>/   # debe responder el backend, no un error TLS
```

## 9. Portal en Vercel

En el proyecto de Vercel, variables de entorno (Settings → Environment
Variables):

- `NEXT_PUBLIC_API_URL=https://<API_DOMAIN>`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: el mismo de siempre.

Redeploy del proyecto para que tomen efecto.

## 10. Android: que el APK funcione en cualquier teléfono sin cable

En `android/local.properties` (en tu máquina, antes de generar el APK que
vas a compartir):

```
apiBaseUrl=https://<API_DOMAIN>/
```

Genera el APK de release (`./gradlew assembleRelease`) y compártelo. Con el
backend público, cualquier teléfono con internet (WiFi o datos) funciona sin
tocar `local.properties` por dispositivo ni conectar cable — ya no depende
de estar en tu misma red.

## Mantenimiento

```bash
docker compose -f docker-compose.prod.yml ps                 # estado
docker compose -f docker-compose.prod.yml logs -f backend     # logs en vivo
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build  # tras un cambio en backend/
```

Si la VM se queda sin memoria bajo carga real (revisa `free -h`), lo primero
es subir el swap antes que mover servicios a otra máquina — para una demo no
debería hacer falta.
