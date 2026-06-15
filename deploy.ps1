# ─────────────────────────────────────────────────────────────────────────────
# HSRL Dashboard - Windows deploy script (PowerShell)
# Usage:  .\deploy.ps1
#         .\deploy.ps1 -SkipDocker     (copy files only, no docker compose)
#         .\deploy.ps1 -EnvOnly        (restart container with new .env only)
# Reads:  backend\.env  for DEPLOY_* variables
# ─────────────────────────────────────────────────────────────────────────────

param(
    [switch]$SkipDocker,
    [switch]$EnvOnly
)

Set-StrictMode -Off
$ErrorActionPreference = "Stop"

# ── 1. Load .env ──────────────────────────────────────────────────────────────
$envFile = Join-Path $PSScriptRoot "backend\.env"
if (-not (Test-Path $envFile)) {
    Write-Error "backend\.env not found. Copy backend\.env.example to backend\.env and fill in values."
    exit 1
}

$cfg = @{}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line -match '=') {
        $key, $val = $line -split '=', 2
        $cfg[$key.Trim()] = $val.Trim().Trim('"').Trim("'")
    }
}

$DEPLOY_HOST     = $cfg['DEPLOY_HOST']
$DEPLOY_PORT     = if ($cfg['DEPLOY_PORT']) { $cfg['DEPLOY_PORT'] } else { '9000' }
$DEPLOY_SSH_PORT = if ($cfg['DEPLOY_SSH_PORT']) { $cfg['DEPLOY_SSH_PORT'] } else { '22' }
$DEPLOY_USER     = $cfg['DEPLOY_USERNAME']
$DEPLOY_PASS     = $cfg['DEPLOY_PASSWORD']
$REMOTE_DIR      = "/home/$DEPLOY_USER/hsrl_ui"
$HOSTKEY         = "SHA256:6Baen1grUYnDnTDoabyDf1AAgIES16u5NDj2KuvxaV0"

if (-not $DEPLOY_HOST -or -not $DEPLOY_USER -or -not $DEPLOY_PASS) {
    Write-Error "DEPLOY_HOST, DEPLOY_USERNAME, DEPLOY_PASSWORD must be set in backend\.env"
    exit 1
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  HSRL Dashboard - Deploy" -ForegroundColor Cyan
Write-Host "  Host : $DEPLOY_HOST (SSH :$DEPLOY_SSH_PORT)" -ForegroundColor Cyan
Write-Host "  Port : $DEPLOY_PORT" -ForegroundColor Cyan
Write-Host "  Dir  : $REMOTE_DIR" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# ── Helper: run remote SSH command ───────────────────────────────────────────
function Invoke-SSH($cmd) {
    $wrapped = "echo '$DEPLOY_PASS' | sudo -S -p '' bash -c '$cmd'"
    $out = & plink -batch -ssh -P $DEPLOY_SSH_PORT -pw $DEPLOY_PASS -hostkey $HOSTKEY "$DEPLOY_USER@$DEPLOY_HOST" $wrapped 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "SSH ERROR: $out" -ForegroundColor Red
        exit 1
    }
    return $out
}

# ── Helper: SCP upload ────────────────────────────────────────────────────────
function Invoke-SCP($local, $remote) {
    & pscp -P $DEPLOY_SSH_PORT -pw $DEPLOY_PASS -hostkey $HOSTKEY -r -q $local "$DEPLOY_USER@${DEPLOY_HOST}:$remote" 2>&1
}

# ── 2. Ensure remote dir exists ───────────────────────────────────────────────
Write-Host "Creating remote directory..." -ForegroundColor Yellow
Invoke-SSH "mkdir -p $REMOTE_DIR"

# ── 3. EnvOnly mode — just restart with new .env ──────────────────────────────
if ($EnvOnly) {
    Write-Host "Uploading .env only..." -ForegroundColor Yellow
    Invoke-SCP "$PSScriptRoot\backend\.env" "$REMOTE_DIR/backend/.env"
    Invoke-SSH "cd $REMOTE_DIR && sudo docker compose up -d --force-recreate 2>&1"
    Write-Host "Container restarted with new .env" -ForegroundColor Green
    Write-Host "http://${DEPLOY_HOST}:${DEPLOY_PORT}" -ForegroundColor Cyan
    exit 0
}

# ── 4. Copy project files ─────────────────────────────────────────────────────
Write-Host "Uploading project files..." -ForegroundColor Yellow

# Docker/config files
foreach ($f in @("Dockerfile", "nginx.conf", "supervisord.conf", "docker-compose.yml")) {
    $src = Join-Path $PSScriptRoot $f
    if (Test-Path $src) {
        Invoke-SCP $src $REMOTE_DIR
        Write-Host "   OK $f" -ForegroundColor Gray
    }
}

# backend (skip node_modules, exports, test)
Write-Host "   Uploading backend..." -ForegroundColor Gray
Invoke-SSH "mkdir -p $REMOTE_DIR/backend"
$backendItems = Get-ChildItem "$PSScriptRoot\backend" | Where-Object {
    $_.Name -notin @('node_modules', 'exports', 'test', '.env')
}
foreach ($item in $backendItems) {
    Invoke-SCP $item.FullName "$REMOTE_DIR/backend/"
}

# Upload .env separately
Invoke-SCP "$PSScriptRoot\backend\.env" "$REMOTE_DIR/backend/.env"
Write-Host "   OK backend/.env" -ForegroundColor Gray

# frontend (skip node_modules, dist)
Write-Host "   Uploading frontend..." -ForegroundColor Gray
Invoke-SSH "mkdir -p $REMOTE_DIR/frontend"
$frontendItems = Get-ChildItem "$PSScriptRoot\frontend" | Where-Object {
    $_.Name -notin @('node_modules', 'dist')
}
foreach ($item in $frontendItems) {
    Invoke-SCP $item.FullName "$REMOTE_DIR/frontend/"
}

Write-Host "Files uploaded successfully" -ForegroundColor Green

# ── 5. Docker build & run ─────────────────────────────────────────────────────
if (-not $SkipDocker) {
    Write-Host ""
    Write-Host "Building Docker image (this takes 2-5 mins)..." -ForegroundColor Yellow
    Invoke-SSH "cd $REMOTE_DIR && sudo docker compose down 2>&1 || true"
    Invoke-SSH "cd $REMOTE_DIR && sudo docker compose build --no-cache 2>&1"
    Invoke-SSH "cd $REMOTE_DIR && sudo docker compose up -d 2>&1"

    Write-Host ""
    Write-Host "Checking status..." -ForegroundColor Yellow
    $status = Invoke-SSH "cd $REMOTE_DIR && sudo docker compose ps 2>&1"
    Write-Host $status

    $logs = Invoke-SSH "cd $REMOTE_DIR && sudo docker compose logs --tail 20 2>&1"
    Write-Host $logs

}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  DEPLOYED SUCCESSFULLY" -ForegroundColor Green
Write-Host "  http://${DEPLOY_HOST}:${DEPLOY_PORT}" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
