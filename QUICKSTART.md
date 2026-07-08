# بدء سريع - تشغيل تطبيق الهاتف

## خطوات التشغيل السريع

### 1. تثبيت المكتبات (إذا لم يتم بعد)

```bash
cd packages/db/packages/platform/mobile
npm install
```

✅ **تم التثبيت بنجاح!** المكتبات جاهزة.

### 2. إعداد ملف .env (مطلوب)

أنشئ ملف `.env` في هذا المجلد:

```env
EXPO_PUBLIC_SUPABASE_URL=https://ragjzeptkuogixjofeux.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZ2p6ZXB0a3VvZ2l4am9mZXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTkwNzgsImV4cCI6MjA4MTU3NTA3OH0.ly4ZB763PzolSwfeKJQSKXwtJq3rweblQbZlWiJr1rE
```

**⚠️ ملاحظة:** القيم أعلاه من بيئة التطوير الحالية.

### 3. اختبار الاتصال (اختياري)

```bash
node tools/test-supabase-connection.js
```

يجب أن ترى: `✅ Connection successful!`

### 4. تشغيل التطبيق

```bash
npm start
```

أو

```bash
npx expo start
```

### 5. فتح التطبيق

بعد التشغيل، اختر أحد الخيارات:

- **للويب:** اضغط `w` في Terminal
- **لمحاكي Android:** اضغط `a`
- **لمحاكي iOS:** اضغط `i` (يتطلب macOS)
- **للهاتف الحقيقي:** امسح QR code بتطبيق Expo Go

## اختبار Supabase في التطبيق

بعد فتح التطبيق:

1. انتقل إلى تبويب **Supabase** (الأيقونة السحابية)
2. اضغط على "اختبار الاتصال"
3. يجب أن ترى رسالة نجاح

## الأوامر المفيدة

```bash
# تشغيل التطبيق
npm start

# تشغيل على الويب مباشرة
npm run web

# تشغيل على Android
npm run android

# تشغيل على iOS
npm run ios

# تنظيف الكاش
npx expo start --clear
```

## استكشاف الأخطاء

### خطأ: "Supabase environment variables not set"

- تأكد من وجود ملف `.env` في مجلد `mobile`
- تأكد من استخدام `EXPO_PUBLIC_` prefix
- أعد تشغيل خادم Expo

### خطأ: "Metro bundler failed"

```bash
# نظف الكاش وأعد التشغيل
npx expo start --clear
```

### خطأ: "Module not found"

```bash
# أعد تثبيت المكتبات
rm -rf node_modules
npm install
```

## الحالة الحالية

✅ Expo مثبت (v54.0.19)
✅ @supabase/supabase-js مثبت (v2.88.0)
✅ Supabase client مُعد
✅ صفحة اختبار Supabase جاهزة
✅ الاتصال بـ Supabase يعمل
⏳ يحتاج فقط إلى ملف `.env`

## الخطوة التالية

**أنشئ ملف `.env` وشغّل `npm start`!** 🚀

