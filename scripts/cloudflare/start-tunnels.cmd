@echo off
REM Double-click friendly: starts frontend + API Cloudflare tunnels.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-tunnels.ps1" %*
