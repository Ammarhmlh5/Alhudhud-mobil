# AlHudhud Connect - Stop Services
# Stops: Gateway API, Expo Dev Server

$ErrorActionPreference = "SilentlyContinue"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "  🛑 AlHudhud Connect - Stopping Services" -ForegroundColor Red
Write-Host "  ═════════════════════════════════════════" -ForegroundColor Red
Write-Host ""

$stopped = 0

# Stop Gateway
$gwPidFile = Join-Path $projectRoot ".gateway.pid"
if (Test-Path $gwPidFile) {
    $gwPid = Get-Content $gwPidFile | Select-Object -First 1
    $proc = Get-Process -Id $gwPid -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "  📡 Stopping Gateway (PID: $gwPid)..." -ForegroundColor Yellow
        Stop-Process -Id $gwPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
        Write-Host "     ✅ Gateway stopped" -ForegroundColor Green
        $stopped++
    }
    Remove-Item $gwPidFile -Force
}

# Stop Expo
$expoPidFile = Join-Path $projectRoot ".expo.pid"
if (Test-Path $expoPidFile) {
    $expoPid = Get-Content $expoPidFile | Select-Object -First 1
    $proc = Get-Process -Id $expoPid -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "  📱 Stopping Expo (PID: $expoPid)..." -ForegroundColor Yellow
        Stop-Process -Id $expoPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
        Write-Host "     ✅ Expo stopped" -ForegroundColor Green
        $stopped++
    }
    Remove-Item $expoPidFile -Force
}

# Also kill any orphan processes on known ports
$ports = @(4000, 8081)
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "  🧹 Killing orphan process on port $port (PID: $($proc.Id), Name: $($proc.Name))..." -ForegroundColor Yellow
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            $stopped++
        }
    }
}

# Clean up log files
$logFiles = @("gateway.log", "gateway-error.log")
foreach ($f in $logFiles) {
    $logPath = Join-Path $projectRoot $f
    if (Test-Path $logPath) {
        Remove-Item $logPath -Force
    }
}

Write-Host ""
if ($stopped -gt 0) {
    Write-Host "  ✅ Stopped $stopped service(s)" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  No running services found" -ForegroundColor DarkGray
}
Write-Host ""
