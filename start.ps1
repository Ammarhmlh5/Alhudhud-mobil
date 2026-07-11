# AlHudhud Connect - Start Services
# Starts: Gateway API + WebSocket, Expo Dev Server

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$gatewayDir = Join-Path $projectRoot "gateway"

Write-Host ""
Write-Host "  🚀 AlHudhud Connect - Starting Services" -ForegroundColor Cyan
Write-Host "  ══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if gateway .env exists
$envFile = Join-Path $gatewayDir ".env"
if (!(Test-Path $envFile)) {
    Write-Host "  ⚠️  gateway/.env not found!" -ForegroundColor Yellow
    Write-Host "  Copy gateway/.env.example to gateway/.env and fill in your credentials." -ForegroundColor Yellow
    Write-Host ""
}

# Check if node_modules exists
$gwNodeModules = Join-Path $gatewayDir "node_modules"
if (!(Test-Path $gwNodeModules)) {
    Write-Host "  📦 Installing gateway dependencies..." -ForegroundColor Yellow
    Push-Location $gatewayDir
    npm install
    Pop-Location
    Write-Host ""
}

# Check Node.js
$nodeVersion = node --version 2>$null
if (!$nodeVersion) {
    Write-Host "  ❌ Node.js is not installed or not in PATH." -ForegroundColor Red
    exit 1
}
Write-Host "  🟢 Node.js $nodeVersion" -ForegroundColor DarkGray

# Check for existing processes on ports
$gatewayPort = 4000
$expoPort = 8081

$existing4000 = Get-NetTCPConnection -LocalPort $gatewayPort -ErrorAction SilentlyContinue
$existing8081 = Get-NetTCPConnection -LocalPort $expoPort -ErrorAction SilentlyContinue

if ($existing4000) {
    Write-Host "  ⚠️  Port $gatewayPort is already in use. Gateway may already be running." -ForegroundColor Yellow
    Write-Host "     Run ./stop.ps1 first to stop existing services." -ForegroundColor Yellow
    Write-Host ""
}

# Start Gateway in background
Write-Host "  📡 Starting Gateway on port $gatewayPort..." -ForegroundColor Green
$gatewayProcess = Start-Process -FilePath "node" -ArgumentList "node_modules/.bin/tsx", "watch", "src/index.ts" `
    -WorkingDirectory $gatewayDir `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $projectRoot "gateway.log") `
    -RedirectStandardError (Join-Path $projectRoot "gateway-error.log")

$gatewayProcess | Out-File (Join-Path $projectRoot ".gateway.pid")
Write-Host "     PID: $($gatewayProcess.Id)" -ForegroundColor DarkGray

# Wait for gateway to start
Write-Host "  ⏳ Waiting for Gateway to start..." -ForegroundColor Yellow
$maxWait = 15
$waited = 0
while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 1
    $waited++
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:$gatewayPort/health" -TimeoutSec 2 -ErrorAction Stop
        if ($health.status -eq "ok") {
            Write-Host "     ✅ Gateway is running!" -ForegroundColor Green
            break
        }
    } catch {
        # still starting
    }
}

if ($waited -ge $maxWait) {
    Write-Host "     ⚠️  Gateway may not be ready yet. Check gateway.log for errors." -ForegroundColor Yellow
}

# Start Expo Dev Server
Write-Host ""
Write-Host "  📱 Starting Expo Dev Server on port $expoPort..." -ForegroundColor Green
$expoProcess = Start-Process -FilePath "npx" -ArgumentList "expo", "start", "--port", $expoPort `
    -WorkingDirectory $projectRoot `
    -PassThru `
    -WindowStyle Normal

$expoProcess | Out-File (Join-Path $projectRoot ".expo.pid")
Write-Host "     PID: $($expoProcess.Id)" -ForegroundColor DarkGray

Write-Host ""
Write-Host "  ══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "  📡 Gateway API:    http://localhost:$gatewayPort/api" -ForegroundColor White
Write-Host "  📊 Dashboard:      http://localhost:$gatewayPort/dashboard" -ForegroundColor White
Write-Host "  🔌 Webhook:        http://localhost:$gatewayPort/api/webhook/:connectorId" -ForegroundColor White
Write-Host "  🔗 WebSocket:      ws://localhost:$gatewayPort/ws" -ForegroundColor White
Write-Host "  ❤️  Health:         http://localhost:$gatewayPort/health" -ForegroundColor White
Write-Host "  📱 Expo Dev:       http://localhost:$expoPort" -ForegroundColor White
Write-Host ""
Write-Host "  Run ./stop.ps1 to stop all services" -ForegroundColor Yellow
Write-Host ""

