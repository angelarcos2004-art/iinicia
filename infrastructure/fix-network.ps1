# Detecta la IP de LAN actual (la de la red con salida a internet: hotspot, wifi de casa,
# wifi de la escuela, lo que sea) y reescribe todo lo que depende de ella, para no tener que
# editar 4 archivos a mano cada vez que la laptop cambia de red:
#   - infrastructure/docker-compose.override.yml (MOODLE_HOST_HEADER)
#   - backend/.env (ALLOWED_ORIGIN)
#   - frontend/.env.local (NEXT_PUBLIC_API_URL / NEXT_PUBLIC_MOODLE_URL)
#   - el wwwroot forzado en el config.php de Moodle
#
# Requiere que los servicios ya esten corriendo (./start.ps1 primero). No reinicia
# postgres/moodle: solo recrea backend y frontend, que son los que leen esas variables.
#
# Uso: parado en infrastructure/, cada vez que cambies de red
#   ./fix-network.ps1
#
# Android: no hace falta recompilar el APK. Abre la app, toca el texto "Servidor" al fondo
# de la pantalla de login y pega la URL de Backend que este script imprime al final.
$ErrorActionPreference = "Stop"

$route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
    Sort-Object -Property RouteMetric |
    Select-Object -First 1

if (-not $route) {
    Write-Error "No hay ruta default: conectate a una red (wifi/hotspot) y vuelve a correr este script."
    exit 1
}

$ip = Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "169.254.*" } |
    Select-Object -First 1 -ExpandProperty IPAddress

if (-not $ip) {
    Write-Error "No se pudo determinar la IPv4 de la interfaz con salida a internet."
    exit 1
}

Write-Host "IP de red detectada: $ip" -ForegroundColor Cyan

# 1. docker-compose.override.yml
@"
services:
  backend:
    environment:
      MOODLE_HOST_HEADER: ${ip}:8080
"@ | Set-Content -Path (Join-Path $PSScriptRoot "docker-compose.override.yml") -Encoding utf8

# 2. backend/.env
$backendEnvPath = Join-Path $PSScriptRoot "..\backend\.env"
(Get-Content $backendEnvPath) -replace '^ALLOWED_ORIGIN=.*$', "ALLOWED_ORIGIN=http://localhost:3000,http://${ip}:3000" |
    Set-Content -Path $backendEnvPath -Encoding utf8

# 3. frontend/.env.local
$frontendEnvPath = Join-Path $PSScriptRoot "..\frontend\.env.local"
(Get-Content $frontendEnvPath) `
    -replace '^NEXT_PUBLIC_API_URL=.*$', "NEXT_PUBLIC_API_URL=http://${ip}:3001" `
    -replace '^NEXT_PUBLIC_MOODLE_URL=.*$', "NEXT_PUBLIC_MOODLE_URL=http://${ip}:8080" |
    Set-Content -Path $frontendEnvPath -Encoding utf8

# 4. wwwroot de Moodle: es un valor forzado en config.php (no vive en la BD), por eso no
# alcanza con admin/cli/cfg.php. preg_replace de una sola linea via stdin, mismo patron que
# los demas scripts PHP del README.
$phpTemplate = @'
<?php
$p = '/var/www/html/config.php';
$c = file_get_contents($p);
$c = preg_replace('/\$CFG->wwwroot(\s*)=(\s*).*?;/', '$CFG->wwwroot$1=$2\'http://IPPLACEHOLDER:8080\';', $c, 1);
file_put_contents($p, $c);
echo "wwwroot de Moodle actualizado\n";
'@
($phpTemplate.Replace('IPPLACEHOLDER', $ip)) | docker compose exec -T moodle php

# 5. Reiniciar moodle: OPcache corre con opcache.validate_timestamps=0 (ver
# moodle-custom/php/opcache-dev.ini), asi que Apache/PHP sigue sirviendo el config.php
# viejo desde memoria aunque el archivo ya se reescribio arriba - sin este restart, Moodle
# redirige (303) de vuelta a la IP anterior.
docker compose restart moodle

# 6. Recrear backend/frontend para que relean su .env
docker compose up -d --force-recreate backend frontend

Write-Host ""
Write-Host "Listo. Nueva direccion de esta sesion:" -ForegroundColor Green
Write-Host "  Portal:  http://${ip}:3000"
Write-Host "  Moodle:  http://${ip}:8080"
Write-Host "  Backend: http://${ip}:3001/"
Write-Host ""
Write-Host "Android: toca 'Servidor' en la pantalla de login y pega http://${ip}:3001/" -ForegroundColor Yellow
