# 🚀 Start All Servers - Petroleum Dashboard
# This script opens 2 terminals needed to run the project locally

$projectPath = "C:\Users\Gaurav Kumar\OneDrive\Desktop\company\newPetroleum\ui-enhancement-studio"

Write-Host "🚀 Starting Petroleum Dashboard" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# Check if servers are already running
Write-Host "🔍 Checking if servers are already running..." -ForegroundColor Yellow
$backendRunning = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$frontendRunning = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue

if ($backendRunning) {
    Write-Host "⚠️  Backend server (port 3001) is already running!" -ForegroundColor Yellow
    Write-Host "   You may want to stop it first (Ctrl+C in that terminal)" -ForegroundColor Gray
    Write-Host ""
}

if ($frontendRunning) {
    Write-Host "⚠️  Frontend server (port 8080) is already running!" -ForegroundColor Yellow
    Write-Host "   You may want to stop it first (Ctrl+C in that terminal)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "📝 Opening 2 terminal windows..." -ForegroundColor Green
Write-Host ""

# Terminal 1: Backend Server
Write-Host "✅ Terminal 1: Backend Server" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath\backend'; Write-Host '🔧 Terminal 1: Backend Server' -ForegroundColor Cyan; Write-Host '================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Starting backend server on port 3001...' -ForegroundColor Yellow; Write-Host 'Backend will be available at: http://localhost:3001' -ForegroundColor Gray; Write-Host ''; npm run dev"

Start-Sleep -Seconds 2

# Terminal 2: Frontend Server
Write-Host "✅ Terminal 2: Frontend Server" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath\frontend'; Write-Host '🎨 Terminal 2: Frontend Server' -ForegroundColor Cyan; Write-Host '=================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Starting frontend server on port 8080...' -ForegroundColor Yellow; Write-Host 'Frontend will be available at: http://localhost:8080' -ForegroundColor Gray; Write-Host ''; npm run dev"

Write-Host ""
Write-Host "✅ Both terminals have been opened!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access your application:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:8080" -ForegroundColor White
Write-Host "   Backend API: http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Important:" -ForegroundColor Yellow
Write-Host "   - Keep both terminals open while using the application" -ForegroundColor White
Write-Host "   - Visit http://localhost:8080 to access your app" -ForegroundColor White
Write-Host "   - Backend must be running before frontend can make API calls" -ForegroundColor White
Write-Host ""
Write-Host "📖 For detailed instructions, see: ALL_TERMINALS_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
