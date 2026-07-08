# إعداد تطبيق الهاتف - Kingdom of Bees Mobile App

## المتطلبات الأساسية

- Node.js (v18 أو أحدث)
- npm أو yarn
- Expo CLI (سيتم تثبيته تلقائياً)
- محاكي Android أو iOS (اختياري)
- تطبيق Expo Go على هاتفك (للتطوير السريع)

## خطوات الإعداد

### 1. تثبيت المكتبات

```bash
cd packages/db/packages/platform/mobile
npm install
```

### 2. إعداد متغيرات البيئة

أنشئ ملف `.env` في مجلد `mobile` بالمحتوى التالي:

```env
EXPO_PUBLIC_SUPABASE_URL=https://ragjzeptkuogixjofeux.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**ملاحظة مهمة:** 
- في Expo، يجب استخدام البادئة `EXPO_PUBLIC_` للمتغيرات البيئية
- احصل على `ANON_KEY` من Supabase Dashboard → Settings → API → anon public key

### 3. التحقق من الاتصال بـ Supabase

قبل تشغيل التطبيق، تأكد من عمل الاتصال:

```bash
node tools/test-supabase-connection.js
```

يجب أن ترى رسالة نجاح مثل:
```
✅ Connection successful!
🎉 Supabase is ready for mobile app!
```

### 4. تشغيل التطبيق

#### للتطوير (Development Mode)

```bash
npm start
# أو
npx expo start
```

بعد التشغيل، ستظهر لك خيارات:
- اضغط `a` لفتح محاكي Android
- اضغط `i` لفتح محاكي iOS
- امسح QR code بتطبيق Expo Go على هاتفك

#### للويب

```bash
npm run web
```

#### لنظام Android

```bash
npm run android
```

#### لنظام iOS (يتطلب macOS)

```bash
npm run ios
```

## استخدام Supabase في التطبيق

### استيراد العميل

```typescript
import { supabase } from '@/lib/supabaseClient';
```

### مثال: جلب البيانات

```typescript
const { data, error } = await supabase
  .from('sync_event')
  .select('*')
  .limit(10);

if (error) {
  console.error('Error:', error);
} else {
  console.log('Data:', data);
}
```

### مثال: إدراج بيانات

```typescript
const { data, error } = await supabase
  .from('sync_event')
  .insert([
    {
      client_id: 'test-client',
      entity: 'test',
      operation: 'create',
      payload: { message: 'Hello from mobile!' }
    }
  ]);
```

## الملفات المهمة

- `lib/supabaseClient.ts` - إعداد عميل Supabase
- `lib/testSupabase.ts` - دالة اختبار الاتصال
- `tools/test-supabase-connection.js` - سكربت اختبار مستقل
- `.env` - متغيرات البيئة (لا تضعه في Git!)

## استكشاف الأخطاء

### خطأ: "Supabase environment variables not set"

تأكد من:
1. وجود ملف `.env` في مجلد `mobile`
2. استخدام البادئة `EXPO_PUBLIC_` للمتغيرات
3. إعادة تشغيل خادم Expo بعد تعديل `.env`

### خطأ: "Could not find the table"

تأكد من:
1. تطبيق schema على Supabase (راجع `infra/supabase/README.md`)
2. استخدام اسم الجدول الصحيح: `sync_event` (بشرطة سفلية)

### خطأ في التثبيت

إذا واجهت مشاكل في التثبيت:

```bash
# احذف node_modules وأعد التثبيت
rm -rf node_modules package-lock.json
npm install

# أو استخدم yarn
yarn install
```

## الموارد المفيدة

- [Expo Documentation](https://docs.expo.dev/)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [React Native Documentation](https://reactnative.dev/)

## الحالة الحالية

✅ Supabase client مُعد ومُختبر
✅ المكتبات مثبتة
✅ الاتصال بـ Supabase يعمل
⏳ يحتاج إلى ملف `.env` في مجلد mobile
⏳ جاهز للتشغيل

## الخطوات التالية

1. أنشئ ملف `.env` بالقيم الصحيحة
2. شغّل `npm start` لبدء التطوير
3. ابدأ بتطوير واجهة المستخدم
4. استخدم `supabase` client للتفاعل مع قاعدة البيانات

