# استكشاف الأخطاء وحلها

## ❗ مشكلة: JavaScript heap out of memory

### الأعراض
```
FATAL ERROR: JavaScript heap out of memory
```

### السبب
React 19 و Expo 54 يستهلكان ذاكرة كبيرة أثناء البناء.

### الحلول

#### الحل 1: زيادة حجم الذاكرة (موصى به)
```bash
# Windows PowerShell
$env:NODE_OPTIONS="--max-old-space-size=4096"
npx expo start

# أو في سطر واحد
$env:NODE_OPTIONS="--max-old-space-size=4096"; npx expo start
```

#### الحل 2: استخدام وضع التطوير بدون Web
```bash
# تشغيل بدون بناء Web (أخف على الذاكرة)
npx expo start --no-dev --minify
```

#### الحل 3: استخدام Expo Go مباشرة
```bash
# تشغيل للهاتف فقط (بدون Web)
npx expo start --tunnel
```

#### الحل 4: تشغيل على Android/iOS فقط
```bash
# Android
npx expo start --android

# iOS (macOS فقط)
npx expo start --ios
```

---

## ✅ الحل الموصى به

### خطوة 1: إنشاء سكربت تشغيل
أنشئ ملف `start.ps1` في مجلد mobile:

```powershell
# start.ps1
$env:NODE_OPTIONS="--max-old-space-size=4096"
npx expo start --clear
```

### خطوة 2: تشغيل السكربت
```bash
cd packages/db/packages/platform/mobile
.\start.ps1
```

---

## 🔧 حلول أخرى

### مشكلة: Port 8081 already in use
```bash
# أغلق العملية القديمة
Get-Process -Name node | Stop-Process -Force

# أو استخدم منفذ آخر
npx expo start --port 8082
```

### مشكلة: Metro bundler cache
```bash
# نظف الكاش
npx expo start --clear
```

### مشكلة: Module not found
```bash
# أعد تثبيت المكتبات
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

## 📱 بدائل للتشغيل

### 1. استخدام Expo Go (الأسهل)
```bash
npx expo start --tunnel
```
ثم امسح QR code بتطبيق Expo Go على هاتفك.

### 2. استخدام Android Studio Emulator
```bash
# تأكد من تشغيل المحاكي أولاً
npx expo start --android
```

### 3. استخدام iOS Simulator (macOS)
```bash
npx expo start --ios
```

---

## 🧪 اختبار بدون تشغيل التطبيق

يمكنك اختبار الاتصال بـ Supabase بدون تشغيل Expo:

```bash
cd packages/db/packages/platform/mobile
node tools/test-supabase-connection.js
```

يجب أن ترى:
```
✅ Connection successful!
🎉 Supabase is ready for mobile app!
```

---

## 💡 نصائح للأداء

### 1. استخدم وضع Production للاختبار
```bash
npx expo start --no-dev --minify
```

### 2. أغلق التطبيقات الأخرى
قبل تشغيل Expo، أغلق التطبيقات التي تستهلك الذاكرة.

### 3. استخدم WSL2 (Windows)
إذا كنت على Windows، WSL2 أسرع وأكثر استقراراً:
```bash
wsl
cd /mnt/d/Kingdom-of-Bees/packages/db/packages/platform/mobile
export NODE_OPTIONS="--max-old-space-size=4096"
npx expo start
```

---

## 📊 متطلبات النظام

### الحد الأدنى
- RAM: 8 GB
- Node.js: v18+
- مساحة حرة: 5 GB

### الموصى به
- RAM: 16 GB
- Node.js: v20+
- SSD
- مساحة حرة: 10 GB

---

## 🆘 إذا لم تنجح الحلول

### الخيار 1: استخدم Expo Go فقط
لا تحتاج لبناء التطبيق محلياً:
```bash
npx expo start --tunnel
```

### الخيار 2: استخدم EAS Build (Expo Cloud)
```bash
npm install -g eas-cli
eas build --profile development --platform android
```

### الخيار 3: اختبر Supabase من Terminal فقط
```bash
node tools/test-supabase-connection.js
```

---

## ✅ التحقق من الإعداد

### 1. تحقق من Node.js
```bash
node --version  # يجب أن يكون v18+
```

### 2. تحقق من npm
```bash
npm --version
```

### 3. تحقق من Expo
```bash
npx expo --version  # يجب أن يكون 54.0.19
```

### 4. تحقق من المكتبات
```bash
npm list @supabase/supabase-js  # يجب أن يكون 2.88.0
```

### 5. تحقق من Supabase
```bash
node tools/test-supabase-connection.js
```

---

## 📝 ملخص الحلول السريعة

| المشكلة | الحل السريع |
|---------|-------------|
| Out of memory | `$env:NODE_OPTIONS="--max-old-space-size=4096"; npx expo start` |
| Port in use | `npx expo start --port 8082` |
| Cache issues | `npx expo start --clear` |
| Module not found | `npm install` |
| بطء التشغيل | `npx expo start --tunnel` (استخدم Expo Go) |

---

**الحل الأسرع:** استخدم Expo Go على هاتفك بدلاً من Web!

```bash
$env:NODE_OPTIONS="--max-old-space-size=4096"
npx expo start --tunnel
```

ثم امسح QR code بتطبيق Expo Go.

