#Requires -Version 5.1
<#
.SYNOPSIS
  Starts two Cloudflare quick tunnels: frontend (8080) and API (2000).
  Run "npm run dev" from HSRL_ui first so those ports are listening.

.USAGE
  .\start-tunnels.ps1
  .\start-tunnels.ps1 -FrontendPort 8081 -BackendPort 2000
#>
param(
  [int] $FrontendPort = 8080,
  [int] $BackendPort = 2000
)

$ErrorActionPreference = "Stop"

$cf = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cf) {
  Write-Host "cloudflared not found in PATH. Install from:" -ForegroundColor Red
  Write-Host "https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" -ForegroundColor Yellow
  exit 1
}

Write-Host "Starting Cloudflare quick tunnels..." -ForegroundColor Cyan
Write-Host "  Frontend -> http://localhost:$FrontendPort" -ForegroundColor Gray
Write-Host "  API      -> http://localhost:$BackendPort" -ForegroundColor Gray
Write-Host "Ensure HSRL_ui is running (npm run dev) first." -ForegroundColor Yellow
Write-Host ""

$pwsh = if (Get-Command pwsh -ErrorAction SilentlyContinue) { "pwsh" } else { "powershell" }

Start-Process $pwsh -ArgumentList @(
  "-NoExit", "-NoProfile", "-Command",
  "Write-Host 'FRONTEND TUNNEL (port $FrontendPort) — copy https URL below' -ForegroundColor Green; cloudflared tunnel --url http://localhost:$FrontendPort"
)

Start-Sleep -Milliseconds 800

Start-Process $pwsh -ArgumentList @(
  "-NoExit", "-NoProfile", "-Command",
  "Write-Host 'API TUNNEL (port $BackendPort) — copy https URL into frontend/.env as VITE_API_URL' -ForegroundColor Cyan; cloudflared tunnel --url http://localhost:$BackendPort"
)

Write-Host "Two tunnel windows opened. Update backend/.env and frontend/.env, then restart npm run dev." -ForegroundColor Green
