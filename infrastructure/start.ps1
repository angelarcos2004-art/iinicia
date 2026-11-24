# Prende todo lo necesario para desarrollo local: Docker Desktop (si no esta corriendo) y
# los 4 servicios (postgres, moodle, backend, frontend). Se corre una vez por sesion/reboot.
#
# No toca nada relacionado con la red (IP, wwwroot de Moodle, CORS) - eso es
# fix-network.ps1, que se corre aparte cada vez que cambias de wifi/hotspot.
#
# Uso: parado en infrastructure/
#   ./start.ps1
$ErrorActionPreference = "Stop"

$dockerListo = $false
try { docker info *> $null; $dockerListo = $true } catch {}

if (-not $dockerListo) {
    Write-Host "Docker Desktop no esta corriendo, arrancandolo..." -ForegroundColor Cyan
    $dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerExe) {
        Start-Process $dockerExe
    } else {
        Write-Error "No encontre Docker Desktop en la ruta default. Abrelo manualmente y vuelve a correr este script."
        exit 1
    }

    $intentos = 0
    do {
        Start-Sleep -Seconds 5
        $intentos++
        try { docker info *> $null; $dockerListo = $true } catch {}
    } while (-not $dockerListo -and $intentos -lt 24)

    if (-not $dockerListo) {
        Write-Error "Docker no respondio despues de 2 minutos. Revisa Docker Desktop manualmente."
        exit 1
    }
}

docker compose up -d

Write-Host ""
Write-Host "Todo arriba. Si es la primera vez en esta red (o cambiaste de wifi/hotspot)," -ForegroundColor Green
Write-Host "corre tambien ./fix-network.ps1 para que Moodle/backend/frontend apunten a tu IP actual."
