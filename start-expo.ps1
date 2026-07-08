# Start Expo Go for Kingdom-of-Bees Mobile App
$MobileDir = "C:\ALHudhud\ALHudhud\ALHudhudMobile"
Write-Host "🚀 Starting Expo Go for Kingdom of Bees..." -ForegroundColor Cyan

Set-Location $MobileDir

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Clear cache and start
Write-Host "✨ Starting Expo server with clear cache..." -ForegroundColor Green
npx expo start -c
