# Detecta la IP de LAN actual (la de la red con salida a internet: hotspot, wifi de casa,
# wifi de la escuela, lo que sea) y reescribe todo lo que depende de ella, para no tener que
# editar 5 archivos a mano cada vez que la laptop cambia de red:
#   - infrastructure/docker-compose.override.yml (MOODLE_HOST_HEADER)
#   - backend/.env (ALLOWED_ORIGIN)
#   - frontend/.env.local (NEXT_PUBLIC_API_URL / NEXT_PUBLIC_MOODLE_URL)
#   - android/local.properties (apiBaseUrl), si ya existe en esta maquina
#   - el wwwroot forzado en el config.php de Moodle
#
# Requiere que los servicios ya esten corriendo (./start.ps1 primero).
#
# Uso: parado en infrastructure/, cada vez que cambies de red
#   ./fix-network.ps1
#
# Android en un dispositivo fisico: el apiBaseUrl queda actualizado solo en
# local.properties, pero el APK sigue necesitando recompilarse/reinstalarse
# (./gradlew installDebug) para tomar el valor nuevo - lo imprime este script al final.
$ErrorActionPreference = "Stop"

# Set-Content -Encoding utf8 siempre agrega BOM, y utf8NoBOM no existe en Windows
# PowerShell 5.1 (solo en pwsh 6+) - de ahi que Gradle no encontrara sdk.dir en
# local.properties (leia la clave como "﻿sdk.dir"). Este helper escribe UTF-8 sin BOM
# en ambas versiones de PowerShell.
function Set-Utf8NoBom {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory, ValueFromPipeline)][string[]]$Content
    )
    begin { $lines = @() }
    process { $lines += $Content }
    end {
        $text = ($lines -join "`r`n") + "`r`n"
        [System.IO.File]::WriteAllText($Path, $text, (New-Object System.Text.UTF8Encoding($false)))
    }
}

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
"@ | Set-Utf8NoBom -Path (Join-Path $PSScriptRoot "docker-compose.override.yml")

# 2. backend/.env
$backendEnvPath = Join-Path $PSScriptRoot "..\backend\.env"
(Get-Content $backendEnvPath) -replace '^ALLOWED_ORIGIN=.*$', "ALLOWED_ORIGIN=http://localhost:3000,http://${ip}:3000" |
    Set-Utf8NoBom -Path $backendEnvPath

# 3. frontend/.env.local
$frontendEnvPath = Join-Path $PSScriptRoot "..\frontend\.env.local"
(Get-Content $frontendEnvPath) `
    -replace '^NEXT_PUBLIC_API_URL=.*$', "NEXT_PUBLIC_API_URL=http://${ip}:3001" `
    -replace '^NEXT_PUBLIC_MOODLE_URL=.*$', "NEXT_PUBLIC_MOODLE_URL=http://${ip}:8080" |
    Set-Utf8NoBom -Path $frontendEnvPath

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

# 5. android/local.properties (apiBaseUrl) - solo si el archivo ya existe (es por maquina,
# no se versiona; si no existe, Android usa el default del emulador y no hace falta tocarlo).
$localPropsPath = Join-Path $PSScriptRoot "..\android\local.properties"
if (Test-Path $localPropsPath) {
    $lineaApiBaseUrl = "apiBaseUrl=http://${ip}:3001/"
    $contenido = Get-Content $localPropsPath
    if ($contenido -match '^apiBaseUrl=') {
        $contenido = $contenido -replace '^apiBaseUrl=.*$', $lineaApiBaseUrl
    } else {
        $contenido += $lineaApiBaseUrl
    }
    $contenido | Set-Utf8NoBom -Path $localPropsPath
    Write-Host "android/local.properties actualizado - vuelve a instalar el APK (./gradlew installDebug) para que tome efecto." -ForegroundColor Yellow
}

# 6. Reiniciar moodle: OPcache corre con opcache.validate_timestamps=0 (ver
# moodle-custom/php/opcache-dev.ini), asi que Apache/PHP sigue sirviendo el config.php
# viejo desde memoria aunque el archivo ya se reescribio arriba - sin este restart, Moodle
# redirige (303) de vuelta a la IP anterior.
docker compose restart moodle

# 7. Recrear backend/frontend para que relean su .env
docker compose up -d --force-recreate backend frontend

Write-Host ""
Write-Host "Listo. Nueva direccion de esta sesion:" -ForegroundColor Green
Write-Host "  Portal:  http://${ip}:3000"
Write-Host "  Moodle:  http://${ip}:8080"
Write-Host "  Backend: http://${ip}:3001/"
if (Test-Path $localPropsPath) {
    Write-Host ""
    Write-Host "Android fisico: corre '.\gradlew installDebug' para reinstalar con la IP nueva." -ForegroundColor Yellow
}
