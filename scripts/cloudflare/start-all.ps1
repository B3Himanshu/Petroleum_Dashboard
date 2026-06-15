#Requires -Version 5.1
<#
.SYNOPSIS
  Opens HSRL_ui dev server + both Cloudflare tunnels in separate windows.

.USAGE
  .\start-all.ps1
  .\start-all.ps1 -FrontendPort 8081
#>
param(
  [int] $FrontendPort = 8080,
  [int] $BackendPort = 2000
)

$ErrorActionPreference = "Stop"

$hsrlUi = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$cf = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cf) {
  Write-Host "cloudflared not found in PATH." -ForegroundColor Red
  exit 1
}

$pwsh = if (Get-Command pwsh -ErrorAction SilentlyContinue) { "pwsh" } else { "powershell" }

Write-Host "Starting npm run dev in: $hsrlUi" -ForegroundColor Cyan
Start-Process $pwsh -ArgumentList @(
  "-NoExit", "-NoProfile", "-Command",
  "Set-Location -LiteralPath '$hsrlUi'; npm run dev"
)

Write-Host "Waiting 12s for backend/frontend to bind..." -ForegroundColor Yellow
Start-Sleep -Seconds 12

& (Join-Path $PSScriptRoot "start-tunnels.ps1") -FrontendPort $FrontendPort -BackendPort $BackendPort
