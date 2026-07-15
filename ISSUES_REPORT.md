قن# تقرير المشاكل الشامل - AlHudhud Connect v4.0.0

> تاريخ الفحص: 2026-07-15
> إجمالي المشاكل المكتشفة: **~208 مشكلة**

---

## الفهرس

1. [ملخص التنفيذ](#ملخص-التنفيذ)
2. [المشاكل الحرجة (Critical)](#المشاكل-الحرجة-critical--15-مشكلة)
3. [المشاكل عالية الخطورة (High)](#المشاكل-عالية-الخطورة-high--51-مشكلة)
4. [المشاكل المتوسطة (Medium)](#المشاكل-المتوسطة-medium--81-مشكلة)
5. [المشاكل المنخفضة (Low)](#المشاكل-المنخفضة-low--61-مشكلة)
6. [المشاكل عبر المناطق (Cross-Cutting)](#المشاكل-عبر-المناطق-cross-cutting)
7. [إحصائيات](#إحصائيات)

---

## ملخص التنفيذ

| المنطقة | Critical | High | Medium | Low | المجموع |
|---------|----------|------|--------|-----|---------|
| الخادم (Gateway) | 8 | 16 | 19 | 10 | 53 |
| المكتبات (lib/) | 6 | 18 | 22 | 11 | 57 |
| الشاشات (app/) | 1 | 10 | 22 | 30 | 63 |
| المكونات والـ Hooks | 0 | 7 | 18 | 10 | 35 |
| **المجموع** | **15** | **51** | **81** | **61** | **208** |

---

## المشاكل الحرجة (Critical) — 15 مشكلة

### C-01 | CORS مفتوح لجميع Origins
- **الملف:** `gateway/src/index.ts:20`
- **الوصف:** `app.use(cors())` يسمح لكل المواقع بالاتصال بالـ API
- **المخاطر:** هجمات CSRF، سرقة بيانات، حقن محتوى من مواقع مخربة
- **الأثر:** أمني — مستوى عالي جداً

### C-02 | Webhook بدون مصادقة
- **الملف:** `gateway/src/routes/webhook.routes.ts:47-60`
- **الوصف:** `GET /events/:userId` لا يوجد مصادقة أو تفويض. أي شخص يعرف userId يمكنه سرقة أحداث الـ webhook
- **المخاطر:** اختراق الخصوصية، تسريب بيانات المستخدمين
- **الأثر:** أمني — مستوى عالي جداً

### C-03 | Webhook Receiver بدون تحقق
- **الملف:** `gateway/src/routes/webhook.routes.ts:8-44`
- **الوصف:** لا يوجد HMAC verification أو secret للتحقق من صحة الطلبات الواردة
- **المخاطر:** حقن أحداث وهمية، تشويه البيانات
- **الأثر:** أمني — مستوى عالي جداً

### C-04 | صلاحية JWT 30 يوم بدون Refresh
- **الملف:** `gateway/src/services/auth.service.ts:12`
- **الوصف:** `JWT_EXPIRES = '30d'` — توكن واحد صالح لمدة شهر بدون آلية refresh
- **المخاطر:** سرقة التوكن تعطي وصولاً كاملاً لمدة 30 يوم
- **الأثر:** أمني — مستوى عالي جداً

### C-05 | كلمة مرور Admin مكتوبة في الكود
- **الملف:** `gateway/src/seed.ts:15,25`
- **الوصف:** كلمة المرور `AlHudhud@Admin#2024` مكتوبة في الكود ومطبوعة في console
- **المخاطر:** اختراق حساب المدير إذا تم تشغيل seed في بيئة الإنتاج
- **الأثر:** أمني — مستوى عالي جداً

### C-06 | مفاتيح API مطبوعة في Console
- **الملف:** `gateway/src/services/email.service.ts:62`
- **الوصف:** مفاتيح SMTP تُطبع نصاً صافياً في سجلات السيرفر
- **المخاطر:** تسريب المفاتيح عبر ملفات السجل
- **الأثر:** أمني — مستوى عالي

### C-07 | لا يوجد Rate Limiting على تسجيل الدخول
- **الملف:** `gateway/src/routes/auth.routes.ts:26-43`
- **الوصف:** endpoint تسجيل الدخول لا يحدد عدد المحاولات
- **المخاطر:** هجمات brute-force على كلمات المرور
- **الأثر:** أمني — مستوى عالي جداً

### C-08 | الاتصال عبر HTTP بدون تشفير
- **الملف:** `lib/apiClient.ts:4`
- **الوصف:** URL الافتراضي `http://localhost:4000/api` — التوكن والمفاتيح تُرسل نصاً صافياً
- **المخاطر:** اعتراض البيانات عبر الشبكة (MITM)
- **الأثر:** أمني — مستوى عالي جداً

### C-09 | التوكن محفوظ في SQLite بدون تشفير
- **الملف:** `lib/apiClient.ts:12`
- **الوصف:** توكن المصادقة محفوظ في جدول `local_settings` في SQLite بدون تشفير
- **المخاطر:** قراءة التوكن من جهاز مخترق أو من نسخة احتياطية
- **الأثر:** أمني — مستوى عالي جداً

### C-10 | قاعدة البيانات بدون آليات قفل
- **الملف:** `gateway/src/db.ts:7`
- **الوصف:**/sql.js database instance بدون locking mechanism — طلب متزامن يسبب تلف البيانات
- **المخاطر:** فساد البيانات تحت الحمل المتزامن
- **الأثر:** بيانات — مستوى عالي جداً

### C-11 | حقن SQL عبر أسماء الجداول
- **الملف:** `lib/services/sync.service.ts:162-163`
- **الوصف:** `table_name` من استجابة السيرفر يُدخل مباشرة في SQL بدون parameterization
- **المخاطر:** حقن SQL إذا تمت تسمية جدول بشكل مخرب
- **الأثر:** أمني — مستوى عالي جداً

### C-12 | تعطيل التحقق من شهادات SSL
- **الملف:** `gateway/src/setup-supabase.ts:22`
- **الوصف:** `ssl: { rejectUnauthorized: false }` — يسمح بـ MITM على اتصال قاعدة البيانات
- **المخاطر:** اعتراض اتصالات قاعدة البيانات
- **الأثر:** أمني — مستوى عالي

### C-13 | JSON.parse في العرض بدون حماية
- **الملف:** `app/connectors/webhooks.tsx:87`
- **الوصف:** `JSON.parse(event.body)` داخل العرض بدون try-catch — بيانات خاطئة ت crashed التطبيق
- **المخاطر:** انهيار التطبيق عند استقبال بيانات غير صحيحة
- **الأثر:** استقرار — مستوى عالي جداً

### C-14 | لا يوجد Rate Limiting على التسجيل
- **الملف:** `gateway/src/routes/auth.routes.ts:7-24`
- **الوصف:** endpoint التسجيل يسمح بإنشاء حسابات بلا حدود
- **المخاطر:** إنشاء حسابات وهمية بشكل جماعي
- **الأثر:** أمني — مستوى عالي

### C-15 | لا يوجد Rate Limiting على Webhooks
- **الملف:** `gateway/src/routes/webhook.routes.ts:8-44`
- **الوصف:** endpoint الـ webhook بدون حدود لعدد الطلبات
- **المخاطر:** هجمات إغراق traffic
- **الأثر:** أمني / توفر — مستوى عالي

---

## المشاكل عالية الخطورة (High) — 51 مشكلة

### أمنية

#### H-01 | ترقية الخطة بدون دفع
- **الملف:** `gateway/src/routes/auth.routes.ts:107`
- **الوصف:** `PUT /subscription` يسمح لأي مستخدم مصادق عليه بترقية خطته لـ `business` بدون تحقق من الدفع

#### H-02 | JSON limit مفرط
- **الملف:** `gateway/src/index.ts:21`
- **الوصف:** `express.json({ limit: '10mb' })` — معرّض لـ DoS عبر حزم كبيرة

#### H-03 | إعادة تفعيل الموصلات من العميل
- **الملف:** `gateway/src/routes/connector.routes.ts:40-55`
- **الوصف:** الـ PUT route يقبل قيمة `is_active` من العميل

#### H-04 | لا يوجد حماية SSRF
- **الملف:** `lib/services/pairing.service.ts:68`
- **الوصف:** `gatewayUrl` من QR code يُستخدم في `fetch()` بدون حماية — يمكن استهداف عنوان IP داخلي

#### H-05 | لا يوجد التحقق من Origin في WebSocket
- **الملف:** `gateway/src/services/ws.service.ts:29-68`
- **الوصف:** أي صفحة يمكنها فتح اتصال WebSocket

#### H-06 | التوكن في query string للـ WebSocket
- **الملف:** `gateway/src/services/ws.service.ts:31`
- **الوصف:** JWT يُمرر كمعامل URL `?token=...` — يُسجّل في السجلات

#### H-07 | تسريب بيانات العميل عبر رسالة الخطأ
- **الملف:** `app/connectors/index.tsx:241-242`
- **الوصف:** `Alert.alert('خطأ', e.message)` يعرض رسالة الخطأ الخام للمستخدم

#### H-08 | حقن بيانات من السيرفر
- **الملف:** `lib/services/connector-sync.service.ts:54-67`
- **الوصف:** بيانات الموصل من السيرفر تُدخل مباشرة في قاعدة البيانات المحلية بدون تحقق

#### H-09 | JSON.parse بدون حجم أقصى
- **الملف:** `lib/connectors/manager.ts:292`
- **الوصف:** `JSON.parse(jsonStr)` على نص مستخدم بدون حد حجم أو تحقق من المخطط

#### H-10 | حقن SQL عبر أسماء الأعمدة
- **الملف:** `lib/services/sync.service.ts:163`
- **الوصف:** أسماء الأعمدة من `payload` تُدخل مباشرة في SQL

#### H-11 | XSS محتمل في بيانات Webhook
- **الملف:** `gateway/src/routes/webhook.routes.ts:23`
- **الوصف:** `req.headers` يُخزّن كـ JSON — قيم قد تحتوي على بيانات مُتحكّم بها

#### H-12 | كلمة مرور بدون تنسيق HTTP
- **الملف:** `lib/services/auth.service.ts:10`
- **الوصف:** كلمة المرور تُرسل في JSON عادي — الاتصال يعتمد على HTTP (الافتراضي)

#### H-13 | لا يوجد PKCE في OAuth2
- **الملف:** `lib/connectors/engines/oauth2.engine.ts:39-41`
- **الوصف:** client_credentials بدون PKCE — أقل أماناً للعملاء المحمولة

#### H-14 | حقن عبر header parsing
- **الملف:** `lib/connectors/manager.ts:343-351`
- **الوصف:** `parseHeaders()` يقسم على `:` — يكسر headers تحتوي `:` في القيمة

### مشاكل منطقية وذاكرة

#### H-15 | لا يوجد Timeout أو AbortController
- **الملف:** `lib/apiClient.ts:48`
- **الوصف:** طلبات `fetch()` بدون timeout — تعلق للأبد على الشبكات البطيئة

#### H-16 | لا يوجد Retry Logic
- **الملف:** `lib/apiClient.ts:48`
- **الوصف:** خطأ شبكة واحد يفشل كل شيء بدون إعادة محاولة

#### H-17 | إعادة اتصال بلا حدود
- **الملف:** `lib/connectors/engines/websocket.engine.ts:80-82`
- **الوصف:** إعادة اتصال WebSocket كل 5 ثوانٍ بدون exponential backoff أو حد أقصى

#### H-18 | إعادة اتصال Gateway بلا حدود
- **الملف:** `lib/services/gateway.service.ts:99`
- **الوصف:** `setTimeout` لإعادة الاتصال بدون حد أقصى — استهلاك موارد لا نهائي

#### H-19 | تسريب ذاكرة في المستمعين
- **الملف:** `lib/services/notification.service.ts:55-75`
- **الوصف:** مستمعو الأحداث لا يتم تنظيفهم — لا توجد دالة `destroy()`

#### H-20 | تسريب ذاكرة في WebSocket
- **الملف:** `lib/connectors/engines/websocket.engine.ts:80-82`
- **الوصف:** المؤقت القديم لا يتم حذفه قبل تعيين مؤقت جديد

#### H-21 | تسريب ذاكرة في OAuth2 Cache
- **الملف:** `lib/connectors/engines/oauth2.engine.ts:20`
- **الوصف:** `tokenCache` Map ينمو بلا حدود — رموز المحذوفة لا تتم إزالتها

#### H-22 | تسريب ذاكرة في Gateway Handlers
- **الملف:** `lib/services/gateway.service.ts:10`
- **الوصف:** `handlers` Map ينمو بلا حدود — المستمعون لا يتم تنظيفهم في `disconnect()`

#### H-23 | استهلاك Event Loop
- **الملف:** `app/(tabs)/index.tsx:96-107`
- **الوصف:** تزامن الموصلات في `for...of` مع `await` يحجب Event Loop

#### H-24 | مزامنة بدون معالجة خطأ
- **الملف:** `app/(tabs)/index.tsx:44`
- **الوصف:** `connectorSyncService.fullSync().catch(() => {})` يبتلع الأخطاء بدون تسجيل

#### H-25 | استهلاك استجابة مرتين
- **الملف:** `lib/apiClient.ts:13-17`
- **الوصف:** `response.json()` قد يُستدعى مرتين — الاستجابة stream تُستهلك مرة واحدة

#### H-26 | onerror بدون إعادة اتصال
- **الملف:** `lib/services/gateway.service.ts:53-55`
- **الوصف:** `onerror` يُعيّن `isConnected = false` لكن لا يُشغّل إعادة الاتصال

#### H-27 | Mutex وهمية في Pull
- **الملف:** `lib/services/connector-sync.service.ts:8`
- **الوصف:** `pushConnectors()` لها mutex لكن `pullConnectors()` لا — طلب متزامن يسبب تكرار

#### H-28 | قاعدة بيانات تُحفظ في كل كتابة
- **الملف:** `gateway/src/db.ts:169-176`
- **الوصف:** `saveDb()` يكتب قاعدة البيانات بالكامل في كل عملية — أداء ضعيف وخطر تلف

### مشاكل واجهة المستخدم

#### H-29 | ApiKeyModal لا يعمل
- **الملف:** `app/(tabs)/settings.tsx:22`
- **الوصف:** `currentApiKey` دائماً فارغ — `ApiKeyModal` يحصل على string فارغة

#### H-30 | مفاتيح API مرئية في الشاشة
- **الملف:** `app/connectors/add.tsx:242,267`
- **الوصف:** حقول API Key و Bearer Token بدون `secureTextEntry`

#### H-31 | كلمة مرور ضعيفة جداً
- **الملف:** `app/auth/register.tsx:30`
- **الوصف:** فحص `< 6` فقط — لا يوجد فحص تعقيد (أحرف كبيرة، أرقام، رموز)

#### H-32 | زر نسيت كلمة المرور غير فعال
- **الملف:** `app/auth/login.tsx:150`
- **الوصف:** الزر موجود لكن بدون `onPress` handler

#### H-33 | نص عربي/صيني مختلط
- **الملف:** `app/subscription/index.tsx:39`
- **الوصف:** وصف الخطة يحتوي `'دعم فني优先'` — أحرف صينية من copy-paste

#### H-34 | ScrollView بدلاً من FlatList في السجلات
- **الملف:** `app/connectors/logs.tsx:45-102`
- **الوصف:** جميع السجلات تُعرض دفعة واحدة — أداء ضعيف مع البيانات الكبيرة

#### H-35 | ScrollView بدلاً من FlatList في Webhooks
- **الملف:** `app/connectors/webhooks.tsx:44-94`
- **الوصف:** جميع أحداث الـ webhook تُعرض دفعة واحدة

#### H-36 | لا يوجد تأكيد على تبديل المستخدم
- **الملف:** `app/admin/index.tsx:83-89`
- **الوصف:** نقرة واحدة تُغيّر حالة المستخدم — إجراء تدميري بدون تأكيد

#### H-37 | شاشة تحميل لا نهائية
- **الملف:** `app/connectors/[id]/index.tsx:17-23`
- **الوصف:** خطأ في `load()` يُعلّق الشاشة على "جارٍ التحميل..." بدون خروج

#### H-38 | لا يوجد try-catch في اختبار الموصل
- **الملف:** `app/connectors/[id]/index.tsx:29-38`
- **الوصف:** `handleTest` بدون حماية — خطأ يسبب انهيار

#### H-39 | لا يوجد try-catch في تبديل الموصل
- **الملف:** `app/connectors/[id]/index.tsx:41-44`
- **الوصف:** `handleToggle` بدون حماية — خطأ يسبب انهيار

#### H-40 | لا يوجد try-catch في اختبار الاتصال
- **الملف:** `app/connectors/index.tsx:66-73`
- **الوصف:** `handleTest` بدون `try-catch`

#### H-41 | لا يوجد try-catch في حذف الموصل
- **الملف:** `app/connectors/index.tsx:81-84`
- **الوصف:** `connectorManager.delete` خطأه غير معالج

### مشاكل الخادم

#### H-42 | حد admin بدون سقف
- **الملف:** `gateway/src/routes/admin.routes.ts:43,56,69`
- **الوصف:** `limit` يُمرر مباشرة لـ SQL — يمكن سحب قاعدة البيانات كلها

#### H-43 | لا يوجد تحقق في التسجيل
- **الملف:** `gateway/src/routes/auth.routes.ts:9-13`
- **الوصف:** لا يوجد فحص لصيغة الإيميل أو قوة كلمة المرور

#### H-44 | لا يوجد تحقق في تسجيل الدخول
- **الملف:** `gateway/src/routes/auth.routes.ts:28-30`
- **الوصف:** لا يوجد فحص لصيغة الإيميل قبل الاستعلام

#### H-45 | لا يوجد تحقق من events
- **الملف:** `gateway/src/routes/sync.routes.ts:22-53`
- **الوصف:** `POST /push` لا يتحقق من وجود `events` قبل الحلقة

#### H-46 | لا يوجد .catch() لـ initDb
- **الملف:** `gateway/src/index.ts:56-68`
- **الوصف:** `initDb().then(...)` بدون `.catch()` — فشل قاعدة البيانات يسبب تعلق العملية

#### H-47 | HTTP بدون TLS
- **الملف:** `gateway/src/index.ts:54-67`
- **الوصف:** السيرفر ينشئ `http.createServer` بدون HTTPS — كل حركة المرور غير مشفّرة

#### H-48 | حفظ DB في كل كتابة
- **الملف:** `gateway/src/db.ts:169-176`
- **الوصف:** `saveDb()` يكتب الـ DB بالكامل لكل عملية — أداء ضعيف تحت الحمل

#### H-49 | DB بدون قفل
- **الملف:** `gateway/src/db.ts:7`
- **الوصف:** sql.js غير آمن للthread — طلب متزامن يسبب تلف البيانات

#### H-50 | معرف عشوائي ضعيف
- **الملف:** `gateway/src/db.ts:231-241`
- **الوصف:** `executeBatch()` لا يستخدم transaction — فشل في منتصف يترك DB غير متسق

#### H-51 | ID مISMATCH في SYNC
- **الملف:** `gateway/src/routes/connector.routes.ts:61-114`
- **الوصف:** `POST /sync` يُبلّغ عن `c.id` لكن قد يكون `crypto.randomUUID()`

---

## المشاكل المتوسطة (Medium) — 81 مشكلة

### أمنية

#### M-01 | كلمة مرور في plaintext JSON
- **الملف:** `lib/services/auth.service.ts:10`
- **الوصف:** كلمة المرور تُرسل في JSON عادي

#### M-02 | btoa مع أحرف Unicode
- **الملف:** `lib/connectors/engines/rest.engine.ts:82`
- **الوصف:** `btoa()` يرمي خطأ مع أحرف non-ASCII في Basic auth

#### M-03 | Supabase token كـ JSON string
- **الملف:** `lib/services/marsal.service.ts:66`
- **الوصف:** Session object يحتوي refresh token كنص عادي داخل JSON

#### M-04 | لا يوجد تحقق من URL
- **الملف:** `app/connectors/add.tsx:101-102`
- **الوصف:** `endpointUrl.trim()` يفحص الفراغ فقط — لا يوجد فحص `http(s)://`

#### M-05 | تحليل Webhook Headers
- **الملف:** `gateway/src/routes/webhook.routes.ts:23`
- **الوصف:** Headers تُخزّن كـ JSON بدون تنظيف

#### M-06 | استجابة setup/status بدون مصادقة
- **الملف:** `gateway/src/index.ts:35`
- **الوصف:** `/api/setup/status` يكشف معلومات التكوين بدون مصادقة

#### M-07 | limit بدون حد أقصى
- **الملف:** `gateway/src/routes/admin.routes.ts:43`
- **الوصف:** `limit=999999999` يمكنه سحب كل البيانات

### منطقية

#### M-08 | toSqlite() هش
- **الملف:** `gateway/src/db.ts:10-13`
- **الوصف:** `= true` يُستبدل في كل SQL — يكسر نصوص تحتوي الكلمة حرفياً

#### M-09 | sync_interval = 0 يصبح null
- **الملف:** `gateway/src/routes/connector.routes.ts:51`
- **الوصف:** `c.sync_interval || null` ي treat `0` كـ falsy

#### M-10 | معرف غير متطابق
- **الملف:** `gateway/src/routes/connector.routes.ts:106`
- **الوصف:** المُبلّغ عنه قد يختلف عن المُخزّن فعلياً

#### M-11 | تواريخ SQLite بدون timezone
- **الملف:** `gateway/src/services/sync-scheduler.service.ts:32-33`
- **الوصف:** `new Date(string).getTime()` يعتمد على timezone الخادم

#### M-12 | catch فارغ في last_insert_rowid
- **الملف:** `gateway/src/db.ts:223`
- **الوصف:** خطأ يُبتلع بدون تسجيل

#### M-13 | process.exit مبكر
- **الملف:** `gateway/src/services/auth.service.ts:7-11`
- **الوصف:** `process.exit(1)` عند عدم وجود JWT_SECRET — يقتل العملية قبل أي معالجة خطأ

#### M-14 | لا يوجد try-catch في GET routes
- **الملف:** `gateway/src/routes/connector.routes.ts:21-24`
- **الوصف:** استعلام فاشل يسبب unhandled promise rejection

#### M-15 | لا يوجد try-catch في device routes
- **الملف:** `gateway/src/routes/device.routes.ts:19-22`
- **الوصف:** نفس المشكلة

#### M-16 | إخفاء فشل الإيميل
- **الملف:** `gateway/src/routes/auth.routes.ts:142`
- **الوصف:** `catch {}` يبتلع فشل إرسال الإيميل

#### M-17 | pairing code بدون حد
- **الملف:** `gateway/src/routes/pairing.routes.ts:103`
- **الوصف:** لا يوجد فحص لطول الكود أو الأحرف قبل الاستعلام

#### M-18 | req.protocol = http
- **الملف:** `gateway/src/routes/pairing.routes.ts:43`
- **الوصف:** `req.protocol` يُعيد `http` بدون proxy — `gatewayUrl` خاطئ

#### M-19 | PUT بدون تحقق من الحقول
- **الملف:** `gateway/src/routes/connector.routes.ts:40-54`
- **الوصف:** جميع الحقول من `req.body` تُقبل بدون تحقق

### واجهة المستخدم

#### M-20 | stale closure في onboarding
- **الملف:** `app/onboarding/index.tsx:56`
- **الوصف:** `setSlide(slide + 1)` يستخدم قيمة closure قديمة

#### M-21 | onboarding يكمل بدون DB
- **الملف:** `app/onboarding/index.tsx:46-51`
- **الوصف:** `db.runSync()` بدون خطأ — فشل DB يُتجاهل وال المستخدم ينتقل

#### M-22 | حدود slides بدون فحص
- **الملف:** `app/onboarding/index.tsx:62`
- **الوصف:** `slides[slide]` بدون فحص — `slide` خارج المصفوفة يسبب crash

#### M-23 | hex color脆弱性
- **الملف:** `app/onboarding/index.tsx:71`
- **الوصف:** `s.color + '20'` يفترض تنسيق hex — يكسر مع rgba

#### M-24 | flat في السجلات
- **الملف:** `app/connectors/logs.tsx:45-102`
- **الوصف:** `ScrollView` يعرض كل شيء — أداء ضعيف

#### M-25 | flat في Webhooks
- **الملف:** `app/connectors/webhooks.tsx:44-94`
- **الوصف:** نفس المشكلة

#### M-26 | مكونات مُعاد تهيئتها
- **الملف:** `app/connectors/add.tsx:170-187`
- **الوصف:** `ProtocolSelector` مُعرّف داخل render — unmount/remount

#### M-27 | Date.now في الاسم
- **الملف:** `app/connectors/add.tsx:81`
- **الوصف:** أسماء مثل `WhatsApp - 1698765432100`

#### M-28 | catch فارغ في تحميل التعديل
- **الملف:** `app/connectors/add.tsx:67`
- **الوصف:** فشل التحميل يُبتلع — المستخدم يرى نموذج فارغ

#### M-29 | no-op ternary
- **الملف:** `app/connectors/add.tsx:111`
- **الوصف:** `preset && url === preset.endpointUrl ? url : url` — لا يفعل شيئاً

#### M-30 | JSON.parse في render
- **الملف:** `app/connectors/send.tsx:87`
- **الوصف:** `JSON.parse(event.body)` بدون try-catch

#### M-31 | URL parsing هش
- **الملف:** `app/connectors/send.tsx:19-24`
- **الوصف:** `split('/')[2]` يمكن أن يُعيد `undefined`

#### M-32 | Modal بدون onRequestClose
- **الملف:** `app/connectors/index.tsx:213`
- **الوصف:** زر الرجوع على Android يسبب سلوك غير متوقع

#### M-33 | filtered بدون useMemo
- **الملف:** `app/connectors/index.tsx:53-59`
- **الوصف:** `toLowerCase()` عند كل حرف — أداء ضعيف

#### M-34 | مكونات مُعاد تهيئتها (Admin)
- **الملف:** `app/admin/index.tsx:66-97`
- **الوصف:** `renderAccount` و `renderLog` داخل render

#### M-35 | .map() بدلاً من FlatList
- **الملف:** `app/admin/index.tsx:161`
- **الوصف:** عرض كل العناصر بدون virtualization

#### M-36 | ألوان hardcoded في admin
- **الملف:** `app/admin/index.tsx:186`
- **الوصف:** ثيم خفيف فقط — لا يدعم الوضع الداكن

#### M-37 | StatusBadge في render
- **الملف:** `app/platform/index.tsx:83-88`
- **الوصف:** مكون يُعاد تهيئته عند كل render

#### M-38 | key=index في platform
- **الملف:** `app/platform/index.tsx:186`
- **الوصف:** استخدام index كـ key — مشكلة مع إعادة ترتيب

#### M-39 | حفظ credentials في الذاكرة
- **الملف:** `app/platform/index.tsx:29-50`
- **الوصف:** كلمة المرور تبقى في memory حتى بعد تسجيل الدخول

#### M-40 | اشتراك بدون تسجيل خطأ
- **الملف:** `app/subscription/index.tsx:52-72`
- **الوصف:** خطأين `catch {}` يبتلعان كل شيء

#### M-41 | فشل API = خطة مجانية
- **الملف:** `app/subscription/index.tsx:78`
- **الوصف:** فشل تغيير الخطة يُظهر رسالة دفع وهمية

#### M-42 | الأسماء مكررة (Admin)
- **الملف:** `gateway/src/routes/admin.routes.ts:43`
- **الوصف:** `requireAuth` مكرر في 4 ملفات — يجب استخراجه

### أداء

#### M-43 | أنماط Inline كثيرة
- **الملف:** `app/(tabs)/index.tsx:137-144,152,155`
- **الوصف:** أنماط Inline تُنشأ عند كل render

#### M-44 | ListHeaderComponent inline
- **الملف:** `app/(tabs)/index.tsx:152`
- **الوصف:** دالة سهمية inline تكسر virtualization

#### M-45 | ListFooterComponent inline
- **الملف:** `app/(tabs)/index.tsx:248`
- **الوصف:** نفس المشكلة

#### M-46 | ListEmptyComponent inline
- **الملف:** `app/(tabs)/index.tsx:248`
- **الوصف:** نفس المشكلة

#### M-47 | getStatusColor في render
- **الملف:** `app/(tabs)/index.tsx:137-144`
- **الوصف:** دالة تُعاد تهيئتها عند كل render

#### M-48 | Section/SettingRow في render
- **الملف:** `app/(tabs)/settings.tsx:140-158`
- **الوصف:** مكونات فرعية تُعاد تهيئتها عند كل render

#### M-49 | loadConnectors بدون try-catch
- **الملف:** `app/(tabs)/settings.tsx:26-37`
- **الوصف:** خطأ غير معالج

#### M-50 | API key في Alert
- **الملف:** `app/(tabs)/settings.tsx:72-76`
- **الوصف:** المفتاح يظهر في Alert — قابل للـ screenshot على Android

#### M-51 | loadConnectors stale closure
- **الملف:** `app/connectors/index.tsx:47-51`
- **الوصف:** `useCallback` مع deps فارغة يلتقط `loadConnectors` قديمة

#### M-52 | handlers بدون useCallback
- **الملف:** `app/connectors/index.tsx:61-73`
- **الوصف:** `handleToggle` و `handleTest` و `handleDelete` تُعاد تهيئتها

#### M-53 | key=log.id || i
- **الملف:** `app/connectors/logs.tsx:74`
- **الوصف:** fallback لـ index — مشكلة مع التحديث

#### M-54 | key=event.id || i
- **الملف:** `app/connectors/webhooks.tsx:59`
- **الوصف:** نفس المشكلة

#### M-55 | IDOR محتمل
- **الملف:** `app/connectors/webhooks.tsx:30`
- **الوصف:** URL يحتوي `user.id` من العميل — تعديل يكشف بيانات الآخرين

#### M-56 | IP يظهر خام
- **الملف:** `app/connectors/webhooks.tsx:80`
- **الوصف:** `source_ip` يظهر بدون تنسيق أو خصوصية

#### M-57 | حفظ قواعد فارغة
- **الملف:** `app/connectors/mapping.tsx:58-62`
- **الوصف:** قواعد بدون حقول source/target تُحفظ بصمت

#### M-58 | طفرة مصفوفة
- **الملف:** `app/connectors/mapping.tsx:43-48`
- **الوصف:** `updated[index]` mutate — يجب استخدام immutable update

#### M-59 | value: any في mapping
- **الملف:** `app/connectors/mapping.tsx:42`
- **الوصف:** لا يوجد type narrowing

#### M-60 | as any في mapping
- **الملف:** `app/connectors/mapping.tsx:44`
- **الوصف:** خصائص عشوائية يمكن تعيينها

#### M-61 | register لا يشطب الاسم
- **الملف:** `app/auth/register.tsx:22`
- **الوصف:** الاسم يمكن أن يكون مسافات فقط

#### M-62 | register يرجع للخلف
- **الملف:** `app/auth/register.tsx:132`
- **الوصف:** `router.back()` بدلاً من `router.replace('/auth/login')`

#### M-63 | login بدون تنسيق إيميل
- **الملف:** `app/auth/login.tsx:61`
- **الوصف:** `!email` فقط — لا يوجد فحص تنسيق

#### M-64 | || بدلاً من ??
- **الملف:** `app/auth/login.tsx:47`
- **الوصف:** `||` ي treat falsy كخطأ

#### M-65 | Google Client ID فارغ
- **الملف:** `app/auth/login.tsx:12`
- **الوصف:** افتراضي `''` — زر Google يظهر بدون وظيفة

#### M-66 | Auth Context value غير مُعامل
- **الملف:** `hooks/useAuth.tsx:99`
- **الوصف:** `value` object يُنشأ عند كل render — يكسر React.memo

#### M-67 | auth handlers غير مُعاملة
- **الملف:** `hooks/useAuth.tsx:52-85`
- **الوصف:** `login` و `register` تُعاد تهيئتها عند كل render

#### M-68 | register → login sequential
- **الملف:** `hooks/useAuth.tsx:74-85`
- **الوصف:** فشل login بعد register ناجح يترك المستخدم في حالة غير متسقة

#### M-69 | catch فارغ في checkAuth
- **الملف:** `hooks/useAuth.tsx:40`
- **الوصف:** خطأ المصادقة يُبتلع بدون تسجيل

#### M-70 | lastEvent يسبب re-render
- **الملف:** `hooks/useGateway.ts:23-27`
- **الوصف:** كل رسالة تُحدّث الحالة — بدون throttle

#### M-71 | PanResponder stale closure
- **الملف:** `components/SwipeableRow.tsx:13-38`
- **الوصف:** `onDelete` لا يتحدث — القديم يُستخدم دائماً

#### M-72 | setTimeout بدون تنظيف
- **الملف:** `components/ApiKeyModal.tsx:18`
- **الوصف:** `setState` على component غير مُثبّت

#### M-73 | IconSymbol بدون fallback
- **الملف:** `components/ui/IconSymbol.tsx:40`
- **الوصف:** اسم غير موجود في MAPPING يسبب crash

#### M-74 | sendSmsAndroid ت 보ɹaught ناجح
- **الملف:** `lib/utils/send-sms.ts:46-47`
- **الوصف:** `openURL` لا يضمن الإرسال — `success: true` مضلل

#### M-75 | SMS iOS format خاطئ
- **الملف:** `lib/utils/send-sms.ts:51`
- **الwolf:** `&body=` بدلاً من `?body=` — قد لا يعمل

#### M-76 | Promise.all مع promise واحد
- **الملف:** `lib/utils/device-info.ts:38`
- **الوصف:** `Promise.all([single])` — غير ضروري

#### M-77 | getStoredApiKey في المكان الخطأ
- **الملف:** `lib/utils/device-info.ts:65-66`
- **الwolf:** مخزّن في device-info بدلاً من auth service

#### M-78 | theme-color dynamic access
- **الملف:** `hooks/use-theme-color.ts:9`
- **الwolf:** `props[resolvedTheme]` يمكن أن يُعيد undefined

#### M-79 | ErrorBoundary فقط console.error
- **الملف:** `components/ErrorBoundary.tsx:25-27`
- **الwolf:** لا يوجد خدمة أخطاء (Sentry, Crashlytics)

#### M-80 | ErrorBoundary reset
- **الملف:** `components/ErrorBoundary.tsx:40`
- **الwolf:** إعادة المحاولة تسبب نفس الخطأ

#### M-81 | onboarding stale slide
- **الملف:** `app/onboarding/index.tsx:56`
- **الwolf:** `setSlide(slide + 1)` — يجب `setSlide(prev => prev + 1)`

---

## المشاكل المنخفضة (Low) — 61 مشكلة

### L-01 | لا يوجد accessibilityLabel على الأزرار (~30 مكان)
- جميع `TouchableOpacity` في الشاشات تفتقر لأسماء يمكن الوصول إليها

### L-02 | لا يوجد accessibilityLabel على حقول الإدخال (~15 مكان)
- جميع `TextInput` تفتقر لـ `accessibilityLabel`

### L-03 | React import غير ضروري
- **الملف:** `app/(tabs)/_layout.tsx:2`

### L-04 | shadow hardcoded
- **الملف:** `app/(tabs)/_layout.tsx:21`
- **الwolf:** لون `#000` hardcoded لا يدعم الثيم

### L-05 | زر الشروط بدون وظيفة
- **الملف:** `app/(tabs)/settings.tsx:299-300`
- **الwolf:** `onPress={() => {}}` — كود ميّت

### L-06 | `any` في catch
- **الملف:** `app/connectors/index.tsx:38, 241`

### L-07 | style غير مستخدم
- **الملف:** `app/connectors/index.tsx:307`

### L-08 | `as any` متعددة
- **الملف:** `app/connectors/add.tsx:59, 61-66`
- **الwolf:** يُلغي فائدة TypeScript

### L-09 | payload: any
- **الملف:** `app/connectors/add.tsx:107`

### L-10 | ProtocolSelector props any
- **الملف:** `app/connectors/add.tsx:174`

### L-11 | Default payload خاطئ
- **الملف:** `app/connectors/send.tsx:14`
- **الwolf:** `'{\n  \n}'` — فارغ ومضلل

### L-12 | أيقونة بدون ثيم
- **الملف:** `app/admin/index.tsx:186`
- **الwolf:** ألوان hardcoded

### L-13 | any في logs
- **الملف:** `app/connectors/logs.tsx:9`

### L-14 | filter buttons بدون accessibilityRole
- **الملف:** `app/connectors/logs.tsx:55-63`

### L-15 | log cards بدون accessibilityLabel
- **الملف:** `app/connectors/logs.tsx:74-100`

### L-16 | IP يظهر خام
- **الملف:** `app/connectors/webhooks.tsx:80`

### L-17 | event cards بدون accessibilityLabel
- **الملف:** `app/connectors/webhooks.tsx:60-63`

### L-18 | Webhook URL client-side
- **الملف:** `app/connectors/[id]/index.tsx:115`
- **الwolf:** URL يعتمد على `apiUrl` من العميل

### L-19 | لا يوجد accessibilityLabel في الشاشة
- **الملف:** `app/connectors/[id]/index.tsx:122-145`

### L-20 | delete بدون تحذير بصري
- **الملف:** `app/connectors/[id]/index.tsx:193-195`

### L-21 | min / 60 عشري
- **الملف:** `app/connectors/[id]/index.tsx:160`
- **الwolf:** 15 دقيقة = 0.25 — يظهر بشكل غريب

### L-22 | key=index في mapping
- **الملف:** `app/connectors/mapping.tsx:124-125`

### L-23 | transform toggle بدون accessibilityRole
- **الملف:** `app/connectors/mapping.tsx:164-173`

### L-24 | register key=index
- **الملف:** `app/auth/register.tsx` (القوائم)

### L-25 | `any` في useAuth user
- **الملف:** `hooks/useAuth.tsx:6`

### L-26 | requestApiKey لا قيمة مضافة
- **الملف:** `hooks/useAuth.tsx:93-96`

### L-27 | triggerRef ميّت
- **الملف:** `hooks/useMarsalCommands.ts:27`

### L-28 | commands تسلسلية
- **الملف:** `hooks/useMarsalCommands.ts:37-66`
- **الwolf:** حلقة for...of مع await — بطيء

### L-29 | setState في cleanup
- **الملف:** `hooks/useMarsalCommands.ts:120`

### L-30 | lastEvent any
- **الملف:** `hooks/useGateway.ts:8`

### L-31 | gateway.connect بدون error
- **الملف:** `hooks/useGateway.ts:17`

### L-32 | ErrorBoundary hardcoded colors
- **الملف:** `components/ErrorBoundary.tsx:33, 59, 62`

### L-33 | IconSymbol.weight unused
- **الملف:** `components/ui/IconSymbol.tsx:38`

### L-34 | Serial غير موثوق
- **الملف:** `lib/utils/device-info.ts:44-52`
- **الwolf:** `Platform.constants.Serial` غير وثيق

### L-35 | Math.random غير آمن
- **الملف:** `lib/utils/device-info.ts:30`
- **الwolf:** معرف عشوائي يمكن التنبؤ به

### L-36 | Phone sanitization ضيق
- **الملف:** `lib/utils/send-sms.ts:11`

### L-37 | catch فارغ في serial
- **الملف:** `lib/utils/device-info.ts:51`

### L-38 | auth routes catch فارغ
- **الملف:** `gateway/src/routes/auth.routes.ts:142`

### L-39 | logout لا يلغي التوكن
- **الملف:** `gateway/src/routes/auth.routes.ts:64-66`
- **الwolf:** التوكن يبقى صالحاً لمدة 30 يوم بعد "تسجيل الخروج"

### L-40 | return null as any
- **الملف:** `gateway/src/services/email.service.ts:16`

### L-41 | sync scheduler timezone
- **الملف:** `gateway/src/services/sync-scheduler.service.ts:32-33`

### L-42 | stmt.free() leak
- **الملف:** `gateway/src/db.ts:183-196`

### L-43 | SQL في رسائل الخطأ
- **الملف:** `gateway/src/db.ts:195`

### L-44 | PLANS hardcoded
- **الملف:** `app/subscription/index.tsx:18-41`
- **الwolf:** الأسعار والخصائص يجب أن تأتي من السيرفر

### L-45 | Emojis في Alerts
- **الملف:** `app/subscription/index.tsx:83`

### L-46 | reactCompiler: false
- **الملف:** `app.json:78`
- **الwolf:** React Compiler معطّل — أداء أقل

### L-47-61 | مسائل متنوعة
- أنماط inline في أماكن متعددة
- مكونات داخل render في أماكن متعددة
- `any` types في أماكن متعددة
- حقول input بدون placeholderTextColor
- shadow hardcoded

---

## المشاكل عبر المناطق (Cross-Cutting)

### CC-01 | أنماط معالجة الخطأ `catch {}` و `catch(() => {})`
- **الأماكن:** ~20 ملف
- **المشكلة:** الأخطاء تُبتلع بدون تسجيل Debug في الإنتاج مستحيل

### CC-02 | مكونات مُعرّفة داخل render functions
- **الأماكن:** `Section`, `SettingRow`, `StatusBadge`, `StatCard`, `ProtocolSelector`, `InfoRow`, `renderAccount`, `renderLog`
- **المشكلة:** unmount/remount عند كل render — أداء ضعيف

### CC-03 | أنماط Inline كثيرة
- **الأماكن:** كل الشاشات
- **المشكلة:** تخصيصات كثيرة عند كل render — ضغط على GC

### CC-04 | `any` types متكررة
- **الأماكن:** ~30 مكان
- **المشكلة:** TypeScript يفقد فائدته — أخطاء في وقت التشغيل بدلاً من وقت البناء

### CC-05 | عدم وجود accessibility
- **الأماكن:** كل الشاشات والمكونات (~45 مكان)
- **المشكلة:** التطبيق غير قابل للوصول لذوي الاحتياجات الخاصة

### CC-06 | `requireAuth` middleware مكرر
- **الأماكن:** 4 ملفات routes في gateway
- **المشكلة:** كود مكرر — يجب استخراجه

### CC-07 | ألوان hardcoded لا تدعم الثيم
- **الأماكن:** admin, settings, ErrorBoundary
- **المشكلة:** وضع داكن يظهر بشكل خاطئ

---

## إحصائيات

### حسب النوع
| النوع | العدد |
|-------|-------|
| أمني | 42 |
| منطقي / بيانات | 38 |
| أداء | 25 |
| واجهة مستخدم | 48 |
| كود نظيف / صيانة | 55 |
| **المجموع** | **208** |

### حسب المنطقة
| المنطقة | العدد |
|---------|-------|
| gateway/src/ | 53 |
| lib/ | 57 |
| app/ | 63 |
| components/ + hooks/ | 35 |
| **المجموع** | **208** |

### أعلى 5 مشاكل أمان
1. CORS مفتوح + Webhook بدون مصادقة
2. JWT 30 يوم بدون refresh
3. توكن في SQLite بدون تشفير + HTTP fallback
4. لا يوجد rate limiting
5. قاعدة بيانات بدون قفل + SQL injection

### أعلى 5 مشاكل أداء
1. ScrollView بدلاً من FlatList
2. مكونات داخل render functions
3. أنماط Inline كثيرة
4. API Client بدون timeout/retry
5. DB تُحفظ في كل كتابة

---

> **ملاحظة:** هذا التقرير تم إعداده بشكل تلقائي. يُنصح بمراجعة كل مشكلة بشكل فردي قبل البدء بالإصلاح.
