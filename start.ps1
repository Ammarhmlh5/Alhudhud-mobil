# سكربت تشغيل تطبيق Expo مع زيادة حجم الذاكرة
# Kingdom of Bees Mobile App Startup Script

Write-Host "🚀 Starting Expo with increased memory..." -ForegroundColor Green
Write-Host ""

# زيادة حجم الذاكرة المتاحة لـ Node.js
$env:NODE_OPTIONS="--max-old-space-size=4096"

Write-Host "✅ Memory limit set to 4GB" -ForegroundColor Cyan
Write-Host "✅ Loading environment variables from .env" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 Starting Expo..." -ForegroundColor Yellow
Write-Host ""

# تشغيل Expo
npx expo start --clear

# ملاحظة: إذا واجهت مشاكل، جرب:
# npx expo start --tunnel  (للاستخدام مع Expo Go)
# npx expo start --android (لمحاكي Android)
# npx expo start --ios     (لمحاكي iOS)

