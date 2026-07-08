# تشغيل تطبيق الهاتف

## ✅ البيئة جاهزة تماماً!

تم إعداد كل شيء بنجاح:
- ✅ المكتبات مثبتة
- ✅ Supabase مُعد ومُختبر
- ✅ ملف `.env` موجود
- ✅ صفحة اختبار Supabase جاهزة

## 🚀 التشغيل

### الطريقة 1: تشغيل عادي
```bash
cd packages/db/packages/platform/mobile
npx expo start
```

### الطريقة 2: تنظيف الكاش والتشغيل
```bash
cd packages/db/packages/platform/mobile
npx expo start --clear
```

## 📱 فتح التطبيق

بعد التشغيل، اختر:

### للويب (أسرع للاختبار)
اضغط `w` في Terminal

### لمحاكي Android
اضغط `a` في Terminal

### لمحاكي iOS (macOS فقط)
اضغط `i` في Terminal

### للهاتف الحقيقي
1. ثبّت تطبيق **Expo Go** من متجر التطبيقات
2. امسح QR code الظاهر في Terminal

## 🧪 اختبار Supabase

### من Terminal (قبل التشغيل)
```bash
cd packages/db/packages/platform/mobile
node tools/test-supabase-connection.js
```

### من التطبيق (بعد التشغيل)
1. افتح التطبيق
2. انتقل إلى تبويب **Supabase** (أيقونة السحابة ☁️)
3. اضغط على **"اختبار الاتصال"**
4. يجب أن ترى: `✅ نجح الاتصال!`

## 🎯 ما يمكنك فعله الآن

### في صفحة Supabase Test
- **اختبار الاتصال**: يتحقق من الاتصال بقاعدة البيانات
- **إدراج بيانات تجريبية**: يضيف سجل جديد في جدول sync_event
- **عرض النتائج**: يعرض البيانات المسترجعة

### في الكود
```typescript
import { supabase } from '@/lib/supabaseClient';

// جلب البيانات
const { data, error } = await supabase
  .from('sync_event')
  .select('*');

// إدراج بيانات
const { data, error } = await supabase
  .from('sync_event')
  .insert([{ /* ... */ }]);
```

## 🔧 استكشاف الأخطاء

### المشكلة: "Supabase environment variables not set"
**الحل:** ملف `.env` موجود بالفعل، أعد تشغيل Expo

### المشكلة: "Metro bundler failed"
**الحل:**
```bash
npx expo start --clear
```

### المشكلة: "Port 8081 already in use"
**الحل:**
```bash
# أغلق العملية القديمة أو استخدم منفذ آخر
npx expo start --port 8082
```

## 📊 الحالة الحالية

| المكون | الحالة |
|--------|---------|
| Expo | ✅ مثبت (v54.0.19) |
| Supabase | ✅ مُعد ومُختبر |
| .env | ✅ موجود |
| صفحة الاختبار | ✅ جاهزة |
| الاتصال | ✅ يعمل (Status: 200) |

## 🎉 كل شيء جاهز!

فقط شغّل:
```bash
npx expo start
```

واضغط `w` للويب أو امسح QR code للهاتف!

