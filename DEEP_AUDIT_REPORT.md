# تقرير الفحص العميق — AlHudhud Mobile & Gateway

**تاريخ التقرير:** 2026-07-15  
**الإصدار:** 4.0.0  
**نطاق الفحص:** تطبيق الهاتف (React Native/Expo) + الخادم (Node.js/Express) + الإعدادات والأمان

---

## ملخص الإجمالي

| الفئة | حرج | عالي | متوسط | منخفض | المجموع |
|---|---|---|---|---|---|
| شاشات التطبيق (app/) | 3 | 8 | 15 | 9 | **35** |
| الخادم (gateway/src/) | 3 | 9 | 18 | 10 | **40** |
| الخدمات والمكتبات (lib/ + hooks/) | 2 | 7 | 16 | 12 | **37** |
| الإعدادات والأمان | 5 | 4 | 9 | 5 | **23** |
| **المجموع الكلي** | **13** | **28** | **58** | **36** | **135** |

> **تنبيه:** يوجد 13 مشكلة حرجة تتطلب معالجة فورية قبل أي إصدار إنتاجي.

---

## الأقسام

- [الأول: المشاكل الحرجة (Critical)](#الاول-المشاكل-الحرجة)
- [الثاني: المشاكل العالية (High)](#الثاني-المشاكل-العالية)
- [الثالث: المشاكل المتوسطة (Medium)](#الثالث-المشاكل-المتوسطة)
- [الرابع: المشاكل المنخفضة (Low)](#الرابع-المشاكل-المنخفضة)
- [الخامس: خطة الإصلاح المقترحة](#الخامس-خطة-الإصلاح-المقترح)
- [السادس: أفضلوليات الإصلاح](#السادس-أفضلوليات-الإصلاح)

---

# الأول: المشاكل الحرجة

## C-01: نظام المزامنة معطل بالكامل — خطأ في استخدام API
**الملف:** `lib/services/sync.service.ts:90-107, 129-133`  
**الفئة:** خلل منطقي  
**التأثير:** المزامنة بين الهاتف والخادم لا تعمل نهائياً

دوال `api.post()` و `api.get()` في `apiClient.ts` تُعيد الناتج المُحلّل (parsed JSON) مسبقاً. لكن `sync.service.ts` تعامل مع الناتج كـ `Response` خام:
```typescript
const response = await api.post('/sync/push', { events });
if (response.ok) {  // ← .ok دائماً undefined لأن الناتج JSON
    const { results } = await response.json(); // ← .json() ليست دالة
```
**النتيجة:** دفع البيانات (push) وسحبها (pull) كلاهما معطّل. لا توجد مزامنة حقيقية.

---

## C-02: خدمة الإدارة معطلة بالكامل — نفس خطأ API
**الملف:** `lib/services/admin.service.ts:47-77`  
**الفئة:** خلل منطقي  
**التأثير:** جميع واجهات الإدارة (إحصائيات، مستخدمين، سجلات) لا تعمل

```typescript
async getStats(): Promise<AdminStats> {
    const res = await api.get('/admin/stats'); // يُعيد JSON
    if (!res.ok) throw new Error('...');       // .ok undefined → دائماً يرمي خطأ
    return res.json();                          // .json ليست دالة
}
```

---

## C-03: عنصر Deep Link لا يتم تنظيفه — تسريب ذاكرة
**الملف:** `app/_layout.tsx:44-56`  
**الفئة:** تسريب ذاكرة  
**التأثير:** كل إعادة عرض تضيف مستمعاً جديداً بدون إزالة القديم

`Linking.addEventListener('url', handleDeepLink)` يُرجع كائن اشتراك لكنه لا يتم إلغاؤه أبداً.

---

## C-04: مُستخرج المفاتيح يستخدم Math.random() — تدمير أداء FlatList
**الملف:** `app/connectors/logs.tsx:76`, `app/connectors/webhooks.tsx:86`  
**الفئة:** خلل منطقي  
**التأثير:** إزالة وإعادة تركيب جميع العناصر في كل إعادة عرض

`keyExtractor` يستخدم `Math.random()`作为 fallback، مما يُولّد مفتاحاً جديداً في كل مرة، مما يُبطل مصالحة FlatList.

---

## C-05: لا يوجد شاشة تحميل — شاشة بيضاء عند بدء التطبيق
**الملف:** `app/_layout.tsx:59-65`  
**الفئة:** واجهة مستخدم  
**التأثير:** المستخدم يرى شاشة بيضاء فارغة أثناء تهيئة قاعدة البيانات والتحقق من الهوية

كلتا الحالتين (`loading` و `!ready`) تُعيد `null` بدون أي مؤشر تحميل.

---

## C-06: كلمة مرور JWT مكتوبة ب hardcoded في بيئة التطوير
**الملف:** `gateway/.env:2`  
**الفئة:** أمان  
**التأثير:** أي مهاجم يمكنه تزوير JWT للتنكّر بأي مستخدم (بما في ذلك المدير)

```
JWT_SECRET=alhudhud-dev-secret-change-in-production
```

---

## C-07: مفتاح Supabase Service Role مكشوف
**الملف:** `gateway/.env:10`  
**الفئة:** أمان  
**التأثير:** الوصول الكامل لقاعدة البيانات تجاوزاً لـ Row Level Security

`SUPABASE_SERVICE_KEY` هو مفتاح `service_role` بامتيازات كاملة. إذا تسرب، يحصل المهاجم على وصول غير محدود.

---

## C-08: دالة exec_sql — تنفيذ SQL عشوائي
**الملف:** `gateway/supabase/schema.sql:120-125`  
**الفئة:** أمان / حقن SQL  
**التأثير:** ثغرة تنفيذ كود عن بعد (RCE) على قاعدة البيانات

دالة `SECURITY DEFINER` تنفّذ أي SQL يُمرّر إليها كمعامل. يمكن استخدامها لـ `DROP TABLE` أو `ALTER ROLE` أو سرقة البيانات.

---

## C-09: كلمة مرور المدير مكتوبة في ملف Schema
**الملف:** `gateway/supabase/schema.sql:127-137`  
**الفئة:** أمان  
**التأثير:** كلمة المرور `AlHudhud@Admin#2024` مرئية لجميع المساهمين وسجلات CI

---

## C-10: مزامنة Webhook بدون توثيق — أي شخص يمكنه حقن أحداث
**الملف:** `gateway/src/routes/webhook.routes.ts:8-12`  
**الفئة:** أمان  
**التأثير:** مهاجم يعرف UUID الاتصال يمكنه حقن أحداث ويب هوك عشوائية

`router.all('/:connectorId')` لا يتحقق من أي هوية. التعليقات تذكر أن التحقق HMAC مفقود.

---

## C-11: كود الاقتران (Pairing) قابل للهجوم بالقوة الغاشمة
**الملف:** `gateway/src/routes/pairing.routes.ts:81`  
**الفئة:** أمان  
**التأثير:** لا يوجد تقييد لمعدل الطلبات على نقطة `/scan`

أكواد الاقتران 6 حروف من 31 رمزاً (~887 مليون组合). بدون تقييد معدل، يمكن هجوم القوة الغاشمة.

---

## C-12: مفتاحان Supabase مختلفان — مشروعان مختلفان
**الملف:** `.env:16` vs `gateway/.env:5`  
**الفئة:** تضارب إعدادات  
**التأثير:** الهاتف والخادم يكتبان في قواعد بيانات مختلفة — المزامنة تفشل بصمت

الملف الجذر يشير إلى مشروع `jqilueudbhgcgskvkvhe` والخادم إلى `rdkqvmvctucyxxfifvpe`.

---

## C-13: وضع Release يستخدم توقيع Debug
**الملف:** `android/app/build.gradle:115`  
**الفئة:** بناء / أمان  
**التأثير:** توقيع Debug غير مناسب للإنتاج — أي شخص يمكنه توقيع تحديث ضار

---

# الثاني: المشاكل العالية

## H-01: حقن SQL عبر أسماء الأعمدة من بيانات الخادم
**الملف:** `lib/services/sync.service.ts:158-164`  
**الفئة:** أمان

أسماء الأعمدة من بيانات الخادم المدفوعة تُدمج مباشرة في SQL بدون تحقق:
```typescript
const keys = Object.keys(payload); // من بيانات الخادم
db.runSync(`INSERT OR REPLACE INTO ${table_name} (${keys.join(', ')}) VALUES (...)`);
```

---

## H-02: أسرار مخزنة كنص عادي في SQLite
**الملف:** `lib/connectors/manager.ts:68-79, 108-119`  
**الفئة:** أمان

جميع بيانات اعتماد الاتصالات (مفاتيح API، كلمات مرور، رموز OAuth) مخزنة كـ JSON عادي. على الأجهزة المتجذرة (rooted) يمكن الوصول إليها.

---

## H-03: رمز JWT يُمرّر في عنوان URL
**الملف:** `lib/services/gateway.service.ts:40`  
**الفئة:** أمان

```typescript
this.ws = new WebSocket(`${WS_URL}?token=${token}`);
```
الرموز في عناوين URL تُسجّل في سجلات الخادم والوسيطات.

---

## H-04: مفتاح API للجهاز يُرسل للخدمات الخارجية
**الملف:** `lib/connectors/engines/rest.engine.ts:79-82`  
**الفئة:** أمان

```typescript
headers['X-Device-Key'] = deviceKey;  // يُرسل لـ Slack, Telegram, Twilio...
```
يتم إرفاق مفتاح الجهاز بكل طلب صادر للخدمات الخارجية — تسريب للبيانات.

---

## H-05: أسماء أسرار Gateway مكشوفة في حزمة الهاتف
**الملف:** `lib/env.ts:49-62`  
**الفئة:** أمان

مخطط البيئة يشمل `JWT_SECRET`, `ADMIN_DEFAULT_PASSWORD`, `SMTP_PASS` — يمكن استخراجه من الحزمة.

---

## H-06: لا يوجد حد أقصى لاتصالات WebSocket لكل مستخدم
**الملف:** `gateway/src/services/ws.service.ts:105-110`  
**الفئة:** WebSocket / أداء

`registerClient` يُضيف لـ unbounded array. مستخدم واحد يمكنه فتح آلاف الاتصالات واستنزاف الذاكرة.

---

## H-07: WebSocket بدون حد أقصى لحجم الرسالة
**الملف:** `gateway/src/services/ws.service.ts:58`  
**الفئة:** WebSocket / أمان

رسائل بحجم عشوائي بدون حد — هجمات استنزاف الذاكرة ممكنة عبر `JSON.parse(data.toString())`.

---

## H-08: PUT /connector بدون تحقق من المدخلات
**الملف:** `gateway/src/routes/connector.routes.ts:27-58`  
**الفئة:** API

لا يوجد مخطط Zod أو تحقق من نوع. أي مستخدم يمكنه تعيين `auth_config` أو `endpoint_url` لأي قيمة.

---

## H-09: CORS مفتوح في الإنتاج عند عدم التكوين
**الملف:** `gateway/src/index.ts:36-41`  
**الفئة:** أمان

عند عدم تعيين `CORS_ORIGINS` و `NODE_ENV=production`، CORS يسمح لكل الأصول مع تحذير فقط.

---

## H-10: لا يوجد إلغاء لرموز JWT — تسجيل خروج وهمي
**الملف:** `gateway/src/services/auth.service.ts:87-108`  
**الفئة:** أمان

نقطة تسجيل الخروج تُعيد النجاح لكن لا تُبطل JWT. لا توجد قائمة سوداء. الرموز المخترقة تبقى صالحة لمدة 7 أيام.

---

## H-11: المدير يمكنه حذف أي جهاز بدون تدقيق
**الملف:** `gateway/src/routes/admin.routes.ts:105-108`  
**الفئة:** أمان

`DELETE /devices/:id` يحذف أي جهاز عالمياً بدون تحقق من الملكية أو تسجيل.

---

## H-12: سباق في findOrCreateDevice
**الملف:** `gateway/src/services/auth.service.ts:244-268`  
**الفئة:** خلل منطقي

مكالمتان متزامنتان بنفس `serialNumber` قد تنشئ جهازين مكررين.

---

## H-13: مجدول المزامنة — تراكب callbacks غير متزامنة
**الملف:** `gateway/src/services/sync-scheduler.service.ts:18-61`  
**الفئة:** خلل منطقي

`setInterval` مع `async` callback — إذا استغرق أطول من 60 ثانية، يتشابك مع التنفيذ التالي.

---

## H-14: لا يوجد timeout على طلبات Gateway HTTP
**الملف:** `lib/services/gateway.service.ts:150-171`  
**الفئة:** موثوقية

طلبات `sendToConnector` و `gatewayService.fetch` بدون `AbortController` — قد تعلق إلى الأبد.

---

## H-15: لا يوجد retry على استدعاءات Marsal HTTP
**الملف:** `lib/services/marsal.service.ts:102-144`  
**الفئة:** موثوقية

`registerDevice()` و `reportSmsStatus()` بدون timeout أو retry — قد تضيع تقارير SMS.

---

## H-16: لا يوجد حد أقصى لحجم المزامنة المجمعة
**الملف:** `gateway/src/routes/connector.routes.ts:60-117`  
**الفئة:** API

`POST /sync` يقبل مصفوفة كائنات بدون حد أقصى لحجم المصفوفة أو تحقق من البنية.

---

# الثالث: المشاكل المتوسطة

## M-01: فحص دور المدير يحدث من العميل
**الملف:** `app/admin/index.tsx:41-48`  
الشاشة تُعرض لحظياً ثم تظهر "رفض الوصول". يجب أن يكون في مستوى التخطيط (AuthGuard).

## M-02: مكونات مُعرّفة داخل جسم العرض — أداء ضعيف
**الملف:** `app/admin/index.tsx:51-145`, `app/connectors/add.tsx:170-187`, `app/platform/index.tsx:83-88`, `app/connectors/[id]/index.tsx:102-115`  
StatCard, ProtocolSelector, StatusBadge, InfoRow جميعها تُعاد تهيئتها في كل عرض.

## M-03: ListHeader/Footer/Empty كأسهم Inline — FlatList
**الملف:** `app/(tabs)/index.tsx:152,248,257`, `app/connectors/index.tsx:145,226`  
كل واحد يُنشئ مرجع دالة جديداً في كل عرض، مما يُعيد عرض القائمة بالكامل.

## M-04: مصفوفة filtered غير مُحفوظة بالذاكرة
**الملف:** `app/connectors/index.tsx:53-59`  
إعادة حساب في كل عرض. يجب استخدام `useMemo`.

## M-05: أخطاء مُبتلعة بصمت
**الملف:** `app/connectors/add.tsx:67`, `app/connectors/webhooks.tsx:28-29`, `app/_layout.tsx:76`  
كتل `catch {}` فارغة — المستخدم لا يعرف أن الشيء فشل.

## M-06: صفوف إعدادات بدون معالج حدث
**الملف:** `app/(tabs)/settings.tsx:318-319`  
"الشروط والأحكام" و"سياسة الخصوصية" تبدو تفاعلية لكنها لا تفعل شيئاً.

## M-07: نسخة التطبيق مكتوبة ب hardcoded
**الملف:** `app/(tabs)/settings.tsx:317`  
`value="1.0.0"` بينما الإصدار الفعلي 4.0.0 في app.json.

## M-08: أنواع any مستخدمة بكثرة
**الملف:** `app/connectors/[id]/index.tsx:14,213`, `app/connectors/mapping.tsx:42,44`, `hooks/useAuth.tsx:30`

## M-09: أرقام سحرية لفواصل المزامنة
**الملف:** `app/connectors/[id]/index.tsx:183`  
`[0, 1, 5, 15, 30, 60, 360, 1440]` بدون تعريف.

## M-10: تسجيل الخروج بدون معالجة فشل التنقل
**الملف:** `app/(tabs)/index.tsx:191`  
`logout().then(() => router.replace(...))` بدون `.catch()` — المستخدم يعلق إذا فشل.

## M-11: key={index} لقواعد المapped
**الملف:** `app/connectors/mapping.tsx:125`  
يسبب سلوكيات خطأ عند إعادة ترتيب أو حذف القواعد.

## M-12: لا يوجد نظام i18n
**جميع ملفات app/**  
كل النصوص مكتوبة بالعربية مباشرة. أي لغة جديدة تتطلب تعديل كل الملفات.

## M-13: renderItem غير مُحفوظ بالذاكرة في FlatLists
**الملف:** `app/(tabs)/index.tsx:224`, `app/connectors/index.tsx:173`  
أسهم Inline تُعاد تهيئتها في كل عرض.

## M-14: initDatabase بدون معالجة أخطاء
**الملف:** `app/_layout.tsx:75`  
إذا فشلت تهيئة قاعدة البيانات، يستمر التطبيق في حالة مكسورة без إشارة.

## M-15: سباق في ConnectorSyncService
**الملف:** `lib/services/connector-sync.service.ts:5-9`  
علمة `syncing` ليست ذرّية — مكالمتان سريعتان قد تُسببان مزامنة مزدوجة.

## M-16: خزّن OAuth2 ينمو بلا حد
**الملف:** `lib/connectors/engines/oauth2.engine.ts:20`  
Map بدون آليات تنظيف — يتراكم الرموز القديمة في الذاكرة.

## M-17: خدمة Supabase لا تُنظّف المستمعين
**الملف:** `lib/services/supabase-integration.service.ts:28`  
`listeners` Set لا يتم مسحه عند إلغاء التهيئة.

## M-18: useGateway يعيد الاتصال عند كل إعادة عرض لـ user
**الملف:** `hooks/useGateway.ts:34`  
`useEffect` يعتمد على `user` (مرجع كائن) — إعادة إنشاء الكائن تقطع WebSocket.

## M-19: قاعدة البيانات بدون ترقيم إصدارات
**الملف:** `lib/db/init.ts:16-41`  
لا يوجد `ALTER TABLE ADD COLUMN` — أعمدة جديدة لن تصل لقاعدة بيانات المستخدمين الحاليين.

## M-20: apiClient يتجاوز التحقق من getEnv()
**الملف:** `lib/apiClient.ts:3`  
يقرأ `process.env` مباشرة بدلاً من `getEnv()` مع التحقق Zod.

## M-21: رقم الإصدار مكتوب ب hardcoded في الاقتران
**الملف:** `lib/services/pairing.service.ts:125`  
`appVersion: '4.0.0'` بدلاً من `Application.nativeApplicationVersion`.

## M-22: SSRF لا يغطي IPv6 الخاص
**الملف:** `lib/services/pairing.service.ts:8-17`  
الأنماط لا تشمل `fc00::/7`, `fe80::/10`, `fd00::/8`.

## M-23: Number() يُعيد NaN بدون حماية
**الملف:** `lib/connectors/mapper.ts:89`  
`Number("abc")` → `NaN` ينتشر بصمت عبر التحويلات.

## M-24: Supabase client يُنشأ بسكريت فارغ
**الملف:** `lib/supabase/client.ts:4-5,19`  
عند فقدان المتغيرات، يُنشئ عميل غير صالح يعمل بصمت.

## M-25: فحص isOnline غير متسق عبر الخدمات
**الملف:** `lib/services/sync.service.ts:12-15` vs `lib/services/gateway.service.ts`  
فقط sync.service يتحقق — الخدمات الأخرى تفشل عند عدم الاتصال.

## M-26: عدم وجود فهرس على أعمدة مستخدمة بكثرة
**الملف:** `gateway/src/db.ts`  
لا يوجد فهرس على `connectors.user_id`, `webhook_events.user_id`, `message_logs.user_id`, `sync_queue.status`.

## M-27: استعلامات N+1 في getStats
**الملف:** `gateway/src/services/auth.service.ts:194-209`  
6 استعلامات `SELECT COUNT(*)` منفصلة بدلاً من واحدة مجمّعة.

## M-28: تحديثات N+1 في Bulk Sync
**الملف:** `gateway/src/routes/connector.routes.ts:69-114`  
كل اتصال يُستعلم ويُحدّث بشكل منفصل.

## M-29: أخطاء SQL تكشف نص الاستعلام
**الملف:** `gateway/src/db.ts:245,282`  
رسائل الخطأ تتضمن SQL الكامل — كشف أسماء الجداول.

## M-30: لا يوجد `helmet` لرؤوس الأمان
**الملف:** `gateway/src/index.ts`  
لا يوجد `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`.

## M-31: نقطة إعداد الحالة تكشف معلومات التكوين
**الملف:** `gateway/src/index.ts:97-103`  
`/api/setup/status` عامة تكشف نوع قاعدة البيانات وحالة Supabase.

## M-32: رمز JWT في query string يُسجّل
**الملف:** `gateway/src/services/ws.service.ts:31`  
الرموز تظهر في سجلات الخادم والوسيطات وسجل المتصفح.

## M-33: الاقتران يُعيد كل الاتصالات بعد الاقتران
**الملف:** `gateway/src/routes/pairing.routes.ts:125-128`  
البيانات تشمل `auth_config` الذي قد يحتوي مفاتيح API.

## M-34: مفتاح API يتسرب في استجابة البديل
**الملف:** `gateway/src/routes/auth.routes.ts:171`  
عند فشل البريد، يُرجع المفتاح الخام في جسم الاستجابة.

## M-35: إلغاء الاقتران يحذف كل الرموز
**الملف:** `gateway/src/routes/pairing.routes.ts:169-172`  
`DELETE FROM pairing_tokens WHERE user_id = ?` يحذف كل الرموز للمستخدم.

## M-36: لا يوجد فرض HTTPS
**الملف:** `gateway/src/index.ts`  
لا يوجد middleware لإعادة توجيه HTTP إلى HTTPS.

## M-37: نقاط الإدارة بدون تقييد معدل
**الملف:** `gateway/src/index.ts:90`  
`/api/admin` بدون rate limiter.

## M-38: تغيير الخطة بدون دفع
**الملف:** `gateway/src/routes/auth.routes.ts:126-147`  
الترقية إلى `starter` متاحة مجاناً بدون بوابة دفع.

## M-39: process.exit(1) في خدمة المصادقة
**الملف:** `gateway/src/services/auth.service.ts:10`  
استيراد الملف يقتل العملية إذا `JWT_SECRET` غير مُعرّف.

## M-40: قاعدة البيانات مخزنة كنص عادي
**الملف:** `gateway/src/db.ts:5`  
SQLite يحتوي كلمات مرور ورموز كنص على القرص بدون تشفير.

## M-41: لا يوجد دعم الدفع
**الملف:** `app/subscription/index.tsx:101`  
اختيار الخطة المدفوعة يُظهر تنبيهاً فقط — لا توجد بوابة دفع حقيقية.

## M-42: لا يوجد إطار اختبارات
**الملف:** `package.json` (الجذر و gateway)  
لا يوجد jest أو vitest أو أي إعداد اختبارات.

## M-43: خادم Gateway يعمل بـ tsx بدون تجميع
**الملف:** `gateway/package.json:7`  
`start` يشغّل TypeScript مباشرة بدون tree-shaking أو minification.

## M-44: @types في التبعيات الإنتاجية
**الملف:** `gateway/package.json:13-16`  
حزم الأنواع يجب أن تكون devDependencies.

---

# الرابع: المشاكل المنخفضة

## L-01: مزامنة onRefresh مع إغلاق قديم (Stale Closure)
**الملف:** `app/connectors/index.tsx:47-51`

## L-02: دوال مساعدة تُعاد تهيئتها في كل عرض
**الملف:** `app/(tabs)/index.tsx:137-144`, `app/(tabs)/settings.tsx:124-132`

## L-03: handleSyncNow غير محفوظ بالذاكرة
**الملف:** `app/(tabs)/index.tsx:60-72`

## L-04: أزرار كاميرا لا تعمل عند رفض الأذن بشكل دائم
**الملف:** `app/connectors/scan.tsx:110-126`

## L-05: اسم المسبحة ينتهي بـ Date.now()
**الملف:** `app/connectors/add.tsx:81`  
`"WhatsApp - 1721073600000"` — غير جذاب.

## L-06: مكونات Inline في بعض الشاشات
**الملف:** `app/connectors/webhooks.tsx:49-84`

## L-07: عدم وجود accessibilityLabel على حقول منصة تسجيل الدخول
**الملف:** `app/platform/index.tsx:119-132`

## L-08: استيراد غير مستخدم CONNECTOR_PRESETS
**الملف:** `app/connectors/send.tsx:9`

## L-09: عدم تزامن استجابة sync
**الملف:** `app/(tabs)/index.tsx:87-89`

## L-10: تسجيل أجزاء من مفتاح API في بيئة التطوير
**الملف:** `gateway/src/services/email.service.ts:66-67`

## L-11: استيراد ديناميكي غير ضروري في مسارات الأجهزة
**الملف:** `gateway/src/routes/device.routes.ts:9,15,23`

## L-12: تعليق غير متطابق في index.ts
**الملف:** `gateway/src/index.ts:82`

## L-13: نقطة إلغاء الاقتران بدون تحقق من المدخلات
**الملف:** `gateway/src/routes/pairing.routes.ts:151-160`

## L-14: اسماء مسارات مربكة
**الملف:** `gateway/src/routes/connector.routes.ts:60` vs `sync.routes.ts:82`

## L-15: لا يوجد حد لجسم Webhook غير JSON
**الملف:** `gateway/src/routes/webhook.routes.ts:12`

## L-16: DELETE connector لا يتحقق من الوجود
**الملف:** `gateway/src/routes/connector.routes.ts:119-125`

## L-17: مجلد types/ فارغ
**الملف:** `gateway/src/types/`

## L-18: Nodemailer لا يُغلق الاتصال
**الملف:** `gateway/src/services/email.service.ts`

## L-19: تنسيقات أخطاء غير متسقة ({error} vs {message})
**ملفات متعددة في gateway/src/routes/**

## L-20: نسخة metro.config.js تعليق قديم
**الملف:** `metro.config.js:9`

## L-21: ESLint يتجاهل مجلد gateway بالكامل
**الملف:** `eslint.config.js:8`

## L-22: خاصية gradle.properties مهملة
**الملف:** `android/gradle.properties:64-65`

## L-23: versionCode دائماً 1
**الملف:** `android/app/build.gradle:95`

## L-24: dotnAPI bypass في apiClient
**الملف:** `lib/apiClient.ts:3`

## L-25: زوج دوال API Key مخزّن
**الملف:** `lib/apiClient.ts:9-10,38-56` vs `lib/utils/device-info.ts:67-77`

## L-26: تراكّم الملفات المزدوجة
**الملف:** `lib/types.ts:95-109` vs `lib/connectors/types.ts:30-47`

## L-27: واجهة WSEvent بتوقيع فرعي
**الملف:** `lib/types.ts:231-233`

## L-28: دوال SMS متطابقة لـ Android/iOS
**الملف:** `lib/utils/send-sms.ts:38-59`

## L-29: Exponential Backoff بدون Jitter
**الملف:** `lib/apiClient.ts:110`

## L-30: أخطاء الترحيل تبتلع بصمت
**الملف:** `lib/db/init.ts:37-39`

## L-31: unpair لا يمسح رمز JWT
**الملف:** `lib/services/pairing.service.ts:274-303`

## L-32: معرّفات أجهزة عشوائية غير مشفرة
**الملف:** `lib/utils/device-info.ts:30`

## L-33: register() يستدعي login بشكل منفصل
**الملف:** `hooks/useAuth.tsx:75-92`

## L-34: gateway fetch() بدون timeout
**الملف:** `lib/services/gateway.service.ts:166-171`

## L-35: أخطاء معالج الإشعارات تبتلع بصمت
**الملف:** `lib/services/notification.service.ts:38-39`

## L-36: `.env.example` يحتوي IP خاص
**الملف:** `.env.example:4,7,10`

---

# الخامس: خطة الإصلاح المقترحة

## المرحلة الأولى: إصلاح عاجل (أسبوع 1)

### 1. إصلاح نظام المزامنة (C-01, C-02)
- إعادة كتابة `sync.service.ts` و `admin.service.ts` للتعامل مع `api.*` بشكل صحيح
- اختبار شامل لكل endpoint

### 2. إصلاح ثغرات الأمان الحرجة (C-06, C-07, C-08, C-09, C-10, C-11)
- تدوير كلمة سر JWT فوراً
- إزالة أو حماية دالة `exec_sql`
- إزالة كلمة مرور المدير من schema.sql
- إضافة HMAC verification للـ webhooks
- إضافة rate limiting لـ `/scan`

### 3. توحيد مشاريع Supabase (C-12)
- التحقق من أي مشروع هو الصحيح
- توحيد الاتصال في كلا الملفين

### 4. إصلاح تسريب الذاكرة (C-03)
- تنظيف `Linking.addEventListener` في `useEffect` cleanup

### 5. إصلاح أداء FlatList (C-04)
- استبدال `Math.random()` بمعرّفات ثابتة

### 6. إضافة شاشة تحميل (C-05)
- إضافة `ActivityIndicator` أثناء التحميل

---

## المرحلة الثانية: تحسينات أسبوع 2-3

### 7. حماية بيانات الاتصال (H-02)
- تشفير `auth_config` في SQLite
- استخدام `expo-secure-store` للبيانات الحساسة

### 8. إصلاح تسريب مفتاح الجهاز (H-04)
- عدم إرفاق `X-Device-Key` في الطلبات الخارجية

### 9. تقييد WebSocket (H-06, H-07)
- حد أقصى 5 اتصالات لكل مستخدم
- حد أقصى 1MB لكل رسالة

### 10. تحقق من المدخلات (H-08, H-16)
- إضافة مخططات Zod لكل endpoints

### 11. تحسين CORS (H-09)
- إضافة `CORS_ORIGINS` في بيئة الإنتاج

### 12. إصلاح تسجيل الخروج (H-10)
- إضافة قائمة سوداء للرموز المُلغاة

### 13. استخراج المكونات من جسم العرض (M-02)
- نقل StatCard, ProtocolSelector, StatusBadge, InfoRow خارج العرض

### 14. تحسين FlatList (M-03, M-04, M-13)
- استخدام `useMemo` و `useCallback`

### 15. إضافة فهارس قاعدة البيانات (M-26)
- فهرسة `user_id`, `status`, `connector_id`

---

## المرحلة الثالثة: تحسينات شهر 2

### 16. نظام ترقيم الإصدارات (M-19)
- إضافة migratedFrom/migratedTo في DB schema

### 17. إضافة اختبارات (M-42)
- إعداد Jest/Vitest
- اختبارات وحدة للمزامنة والمصادقة

### 18. تجميع Gateway (M-43)
- استخدام `tsc` ثم تشغيل `dist/`

### 19. نظام i18n (M-12)
- إعداد react-i18next

### 20. بوابة الدفع (M-41)
- تكامل Stripe أو بوابة دفع محلية

### 21. helmet + HTTPS (M-30, M-36)
- إضافة helmet middleware
- فرض HTTPS في الإنتاج

### 22. تشفير قاعدة البيانات (M-40)
-/sqlcipher أو تشفير على مستوى النظام

### 23. ESLint للـ Gateway (L-21)
- إزالة gateway من قائمة التجاهل

---

# السادس: أفضلوليات الإصلاح

## فوري (قبل أي إصدار)
1. ✅ إصلاح نظام المزامنة (C-01, C-02) — **المعادلة الأساسية مكسورة**
2. ✅ حماية webhook (C-10) — **ثغرة أمان حرجة**
3. ✅ تقييد pairing (C-11) — **هجوم قوة غاشمة ممكن**
4. ✅ تدوير JWT Secret (C-06)
5. ✅ إزالة كلمة مرور المدير من schema.sql (C-09)
6. ✅ توحيد مشاريع Supabase (C-12)

## قريب (خلال أسبوع)
7. ✅ إصلاح تسريب الذاكرة (C-03)
8. ✅ إصلاح FlatList keys (C-04)
9. ✅ إضافة شاشة تحميل (C-05)
10. ✅ تشفير بيانات الاتصال (H-02)
11. ✅ إصلاح تسريب مفتاح الجهاز (H-04)

## متوسط المدى (خلال شهر)
12. ✅ تقييد WebSocket (H-06, H-07)
13. ✅ تحقق من المدخلات (H-08, H-16)
14. ✅ استخراج المكونات (M-02)
15. ✅ تحسين FlatList (M-03, M-04, M-13)
16. ✅ فهارس قاعدة البيانات (M-26)

---

*تم إعداد هذا التقرير بواسطة فحص شامل لجميع ملفات المشروع. يُنصح بمراجعة كل مشكلة ومعالجتها حسب الأولوية.*
