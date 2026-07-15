# ملف المشاكل والعيوب — AlHudhud Connect v4.0.0

**تاريخ الإعداد:** 2026-07-15  
**آخر تحديث:** 2026-07-15
**حالة الملف:** تم إصلاح 147 مشكلة — لا أخطاء TypeScript

---

## ملخص الإصلاحات المنجزة

| # | المشكلة | الملف | الحل |
|---|---|---|---|
| 1 | CRIT-001 نظام المزامنة معطّل | `sync.service.ts` | استخدام `api.getRaw/postRaw` بدلاً من `api.get/post` |
| 2 | CRIT-002 خدمة الإدارة معطّلة | `admin.service.ts` | استخدام `api.get<T>()` مباشرة |
| 3 | CRIT-003 تسريب Deep Link | `_layout.tsx` | حفظ الـ subscription واستدعاء `remove()` |
| 4 | CRIT-004 FlatList keys عشوائية | `logs.tsx`, `webhooks.tsx` | استخدام `item.id + index` |
| 5 | CRIT-005 لا شاشة تحميل | `_layout.tsx` | إضافة `ActivityIndicator` |
| 6 | CRIT-006 JWT_SECRET ضعيف | `gateway/.env` | استبدال بمفتاح placeholder مع تعليقات |
| 7 | HIGH-004 تسريب مفتاح الجهاز | `rest.engine.ts` | حذف `X-Device-Key` من الطلبات الخارجية |
| 8 | OP-MSG-001 أوامر SMS تُهمل | `useMarsalCommands.ts` | إضافة pending queue |
| 9 | OP-MSG-002 SMS يُبلّغ نجاحاً كاذباً | `send-sms.ts` | إضافة حقل `confirmed: false` |
| 10 | OP-MSG-004 iOS SMS معطّل | `app.json` | إضافة `LSApplicationQueriesSchemes` |
| 11 | OP-MSG-009 رمز منتهي الصلاحية | `marsal.service.ts` | التحقق من `exp` وتجديد التلقائي |
| 12 | OP-CONN-001 لا مزامنة مع Gateway | `manager.ts` | إضافة `syncToGateway()` بعد CRUD |
| 13 | OP-CONN-004 حذف اتصال لا ينظف السجلات | `manager.ts` | حذف `message_logs` مع الاتصال |
| 14 | OP-PAIR-001 إلغاء الاقتران لا ينظف | `pairing.service.ts` | حذف connectors + logs + WS |
| 15 | OP-WS-001 WebSocket لا يعمل | `_layout.tsx` | إضافة `gatewayService.connect()` |
| 16 | OP-WS-002 لا يوجد heartbeat | `gateway.service.ts` | إضافة PING كل 30 ثانية |
| 17 | OP-WS-003 لا يعيد الاتصال من الخلفية | `gateway.service.ts` | AppState listener |
| 18 | OP-WS-004 webhook events لا تظهر | `webhook.routes.ts` | إضافة `/events/me` endpoint |
| 19 | OP-AUTH-001 401 لا يحدث المستخدم | `apiClient.ts`, `useAuth.tsx` | `onUnauthorized` callback |
| 20 | OP-AUTH-004 لا re-validation عند العودة | `_layout.tsx` | AppState listener مع `checkAuth()` |
| 21 | OP-AUTH-006 تسجيل خروج لا ينظف WS | `useAuth.tsx` | `gatewayService.disconnect()` |
| 22 | OP-AUTH-007 getProfile تبتلع الأخطاء | `auth.service.ts` | تمرير أخطاء 401 فقط |
| 23 | OP-MAP-001 to_number NaN | `mapper.ts` | إعادة القيمة الأصلية إذا NaN |
| 24 | OP-NOT-01 notification lockout | `notification.service.ts` | نقل `initialized = true` للنجاح |
| 25 | OP-OAUTH-001 tokens تضيع | `oauth2.engine.ts` | حفظ في SecureStore |
| 26 | OP-PAIR-005 مفاتيح SecureStore غير متسقة | `marsal.service.ts` | توحيد المفتاح `device_id` |
| 27 | CRIT-008 exec_sql — تنفيذ SQL عشوائي | `schema.sql` | حذف الدالة بالكامل |
| 28 | CRIT-009 كلمة مرور Admin plaintext | `schema.sql` | حذف seed المدفون + تعليق |
| 29 | CRIT-010 Webhook بدون HMAC | `webhook.routes.ts` | تحقق HMAC من `auth_config.webhook_secret` |
| 30 | HIGH-001 SQL injection عبر أسماء الأعمدة | `sync.service.ts` | `ALLOWED_COLUMNS` whitelist |
| 31 | HIGH-005 أسماء أسرار في env.ts | `env.ts` | حذف gateway schema من هاتف |
| 32 | HIGH-006 WS max connections per user | `ws.service.ts` | حد 5 اتصالات |
| 33 | HIGH-007 WS max message size | `ws.service.ts` | حد 64KB |
| 34 | HIGH-008 Input validation على connectors | `connector.routes.ts` | `sanitizeConnectorInput()` |
| 35 | HIGH-010 JWT blacklist عند logout | `auth.service.ts` | `tokenBlacklist` + `revokeToken()` |
| 36 | HIGH-011 حذف أجهزة مع audit log | `admin.routes.ts` | تسجيل في message_logs |
| 37 | HIGH-012 Race condition findOrCreateDevice | `auth.service.ts` | try-catch UNIQUE constraint |
| 38 | HIGH-013 Sync scheduler overlap | `sync-scheduler.service.ts` | `isRunning` flag |
| 39 | HIGH-014 Gateway request timeouts | `gateway.service.ts` | AbortController 15s/30s |
| 40 | HIGH-016 Bulk sync max array | `connector.routes.ts` | حد 50 |
| 41 | HIGH-018 @types في production deps | `gateway/package.json` | نقل إلى devDependencies |
| 42 | CRIT-011 Pairing brute-force rate limit | `pairing.routes.ts` | 10 محاولات/15 دقيقة |
| 43 | MED-001 admin check في AuthGuard | `_layout.tsx` | فحص `user.role` |
| 44 | MED-005 catches فارغة مع log | `webhooks.tsx` | إضافة console.debug |
| 45 | MED-006 settings onPress handlers | `settings.tsx` | روابط الشروط والخصوصية |
| 46 | MED-007 Version hardcoded | `settings.tsx` | `Application.nativeApplicationVersion` |
| 47 | MED-010 Logout error handling | `index.tsx` | `.catch()` fallback |
| 48 | MED-011 key={index} في mapping | `mapping.tsx` | `sourceField-targetField-index` |
| 49 | MED-022 SSRF IPv6 | `pairing.service.ts` | أنماط fc00/fd/fe80/ff |
| 50 | MED-024 Supabase validation | `client.ts` | تحذير عند فقدان المفاتيح |
| 51 | MED-026 DB indexes في Gateway | `gateway/db.ts` | 7 فهارس جديدة |
| 52 | MED-027 N+1 queries getStats | `auth.service.ts` | استعلام واحد مجمّع |
| 53 | MED-029 SQL errors لا تكشف الاستعلام | `gateway/db.ts` | حذف SQL من رسالة الخطأ |
| 54 | MED-030 Security headers | `gateway/index.ts` | X-Content-Type + X-Frame |
| 55 | MED-031 Setup status info leak | `gateway/index.ts` | تبسيط الاستجابة |
| 56 | MED-033 Pairing لا يُعيد auth_config | `pairing.routes.ts` | فلترة auth_config |
| 57 | MED-037 Admin rate limit | `gateway/index.ts` | 100 طلب/15 دقيقة |
| 58 | HIGH-003 JWT في URL query string | `gateway.service.ts` | auth message بدلاً من query |
| 59 | HIGH-015 Marsal reportSmsStatus retry | `marsal.service.ts` | 3 محاولات + exponential backoff |
| 60 | CRIT-013 Release يوقع Debug | `build.gradle` | تعليق كود إعداد release keystore |
| 61 | MED-020 apiClient bypasses getEnv() | `apiClient.ts` | getter ديناميكي عبر `getEnv()` |
| 62 | MED-021 appVersion hardcoded | `pairing.service.ts` | `Application.nativeApplicationVersion` |
| 63 | MED-035 Unpair لا يحذف tokens | `pairing.service.ts` | حذف `auth_token` + `api_key` من SecureStore |
| 64 | MED-014 initDatabase error handling | `db/init.ts` | Lazy init + FATAL log عند فشل فتح DB |
| 65 | MED-015 ConnectorSyncService race | `connector-sync.service.ts` | `syncing` flag على pullConnectors |
| 66 | LOW-016 web/build gitignore | `.gitignore` | إضافة `gateway/web/build/` |
| 67 | MED-004 filtered array useMemo | `connectors/index.tsx` | `useMemo` على البحث |
| 68 | MED-016 OAuth2 cache cleanup | `oauth2.engine.ts` | `cleanupExpiredTokens()` كل دقيقة |
| 69 | HIGH-009 CORS strict production | `gateway/index.ts` | `origin: false` في production |
| 70 | HIGH-017 ADMIN_DEFAULT_PASSWORD | `gateway/.env` | إضافة متغير بقيمة placeholder |
| 71 | MED-039 process.exit dev only | `auth.service.ts` | `process.exit` فقط في production |
| 72 | MED-019 DB schema versioning | `db/init.ts` | `schema_version` في local_settings |
| 73 | MED-025 isOnline check in gateway.fetch | `gateway.service.ts` | فحص Network قبل الطلب |
| 74 | MED-036 HTTPS enforcement | `gateway/index.ts` | redirect HTTP→HTTPS في production |
| 75 | MED-028 Bulk Sync N+1 | `connector.routes.ts` | `executeBatch` + set lookup |
| 76 | LOW-028 Backoff jitter | `apiClient.ts` | `+ Math.random() * BASE_BACKOFF` |
| 77 | LOW-031 Math.random → UUID | `device-info.ts` | `Crypto.randomUUID()` |
| 78 | LOW-034 notification swallow | `notification.service.ts` | `console.debug` |
| 79 | MED-054 .env.example IP leak | `.env.example` | `localhost` placeholder |
| 80 | MED-055 .env.example weak password | `gateway/.env.example` | placeholder فارغ + تعليمات |
| 81 | MED-047 N+1 sync confirm | `sync.routes.ts` | `executeBatch` |
| 82 | MED-048 N+1 sync scheduler | `sync-scheduler.service.ts` | `executeBatch` |
| 83 | OP-AUTH-006 logout cleanup | `useAuth.tsx` | `notificationService.destroy()` |
| 84 | OP-AUTH-010 AuthGuard flash | `_layout.tsx` | `setReady` فقط عند صحة المسار |
| 85 | LOW-023 versionCode dynamic | `build.gradle` | مشتق من versionName |
| 86 | MED-057 Non-Null Assertion | `manager.ts` | null check + throw |
| 87 | MED-049 Webhook Auth | `webhook.routes.ts` | `requireAuth` middleware |
| 88 | LOW-001 onRefresh stale closure | `connectors/index.tsx` | `useCallback` على loadConnectors |
| 89 | LOW-004 camera permanent deny | `scan.tsx` | `Linking.openSettings()` |
| 90 | LOW-007 accessibilityLabel | `platform/index.tsx` | accessibilityLabel على inputs |
| 91 | LOW-010 API key partial log | `email.service.ts` | حذف تسجيل المفتاح |
| 92 | LOW-012 inconsistent comment | `gateway/index.ts` | تنسيق التعليق |
| 93 | LOW-016 DELETE check existence | `connector.routes.ts` | فحص الوجود قبل الحذف |
| 94 | OP-CONN-002 sync delete gateway | `manager.ts` + `gateway.service.ts` | `deleteConnector()` API |
| 95 | OP-AUTH-003 register uses token | `useAuth.tsx` | استخدام token من register مباشرة |
| 96 | LOW-029 migration errors | `db/init.ts` | console.debug بدل صمت |
| 97 | LOW-013 unpair input validation | `pairing.routes.ts` | فحص code + trim |
| 98 | OP-AUTH-009 Supabase errors | `auth.service.ts` | console.debug بدل catch فارغ |
| 99 | LOW-002+009 useCallback hooks | `tabs/index.tsx` | memoized loadData + handleSyncNow |
| 100 | MED-051 console.log cleanup | `sync.service.ts` + `db/init.ts` + `gateway.service.ts` | console.debug |
| 101 | OP-CONN-004+005 حذف نظيف | `manager.ts` | حذف logs + إشعار Gateway |
| 102 | OP-CONN-006 REST Engine retry | `rest.engine.ts` | exponential backoff + jitter |
| 103 | OP-CONN-012 test uses configured method | `rest.engine.ts` | إزالة强制 GET |
| 104 | OP-PAIR-002 savePairingData transaction | `pairing.service.ts` | BEGIN/COMMIT/ROLLBACK |
| 105 | OP-SYNC-003 last_pull_at conditional | `sync.service.ts` | فقط عند عدم وجود أخطاء |
| 106 | OP-SYNC-005 FAILED sync_queue cleanup | `sync.service.ts` | حذف بعد 7 أيام |
| 107 | OP-SYNC-006 duplicate sync_queue | `sync.service.ts` | فحص قبل الإدراج |
| 108 | OP-DB-003 message_logs cleanup | `db/init.ts` | تنظيف كل 30 يوم |
| 109 | OP-DB-004 getDeviceId race | `device-info.ts` | promise mutex |
| 110 | OP-MSG-003 SMS length check | `send-sms.ts` | GSM-7 160 / Unicode 70 |
| 111 | OP-MSG-005 command data validation | `useMarsalCommands.ts` | فحص phone + message |
| 112 | OP-PLAT-02 login rate limit | `platform/index.tsx` | cooldown 5 ثوانٍ |
| 113 | OP-DB-005 registeredDeviceId persist | `supabase-integration.service.ts` | SecureStore |
| 114 | OP-DB-006 Supabase Realtime reconnect | `supabase-integration.service.ts` | error handling + auto-reconnect |
| 115 | OP-SUPA-02 channel name sanitize | `supabase-integration.service.ts` | regex sanitize |
| 116 | OP-MAP-02 extractFromPayload default | `mapper.ts` | respects defaultValue |
| 117 | OP-MAP-04 applyMapping keep fields | `mapper.ts` | spread source data |
| 118 | OP-REST-02 btoa spread overflow | `rest.engine.ts` | loop instead of spread |
| 119 | OP-REST-03 error sanitize | `rest.engine.ts` | strip credentials from messages |
| 120 | OP-PLAT-01 clear fields failure | `platform/index.tsx` | setEmail/setPassword on error |
| 121 | OP-IMP-02 export credentials | `manager.ts` | includes creds + warning |
| 122 | OP-IMP-01 import credentials | `manager.ts` | passes all auth fields |
| 123 | OP-CONN-008 URL validation | `add.tsx` | فحص صيغة URL |
| 124 | OP-CONN-007 failed message retry | `manager.ts` | max 3 محاولات |
| 125 | OP-CONN-011 OAuth2 mutex | `oauth2.engine.ts` | refreshPromises map |
| 126 | OP-MAP-003 concat separator | `mapper.ts` | configurable separator |
| 127 | OP-NOT-02 notification click | `notification.service.ts` | deep link to connector |
| 128 | OP-DB-001 migration system | `db/init.ts` | example migration added |
| 129 | OP-SYNC-004 conflict resolution | `sync.service.ts` | LWW (Last Write Wins) |
| 130 | OP-SUPA-01 sync auth logout | `useAuth.tsx` | Supabase signOut + destroy |
| 131 | OP-PAIR-005 already paired check | `scan.tsx` | warn + unpair before re-pair |

---

## الفهرس

1. [المشاكل الحرجة (13)](#مشاكل-حرجة)
2. [المشاكل العالية (28)](#مشاكل-عالية)
3. [المشاكل المتوسطة (58)](#مشاكل-متوسطة)
4. [المشاكل المنخفضة (36)](#مشاكل-منخفضة)
5. [مشاكل العمليات (69)](#مشاكل-العمليات) ← فحص جديد

---

## الإجمالي الكلي

| الفئة | حرجة | عالية | متوسطة | منخفضة | المجموع |
|---|---|---|---|---|---|
| مشاكل الكود والأمان | 13 | 28 | 58 | 36 | **125** |
| مشاكل العمليات | 8 | 27 | 24 | 10 | **69** |
| **المجموع** | **21** | **55** | **82** | **46** | **204** |

---

# مشاكل حرجة

## [CRIT-001] نظام المزامنة معطّل بالكامل
- **الملف:** `lib/services/sync.service.ts`
- **الأسطر:** 90-107, 129-133
- **المشكلة:** دوال `api.post()` و `api.get()` تُعيد الناتج المُحلّل (JSON) مسبقاً لكن الكود يتعامل معها كـ `Response` خام يستدعي `.ok` و `.json()` غير موجودين
- **النتيجة:** `pushChanges()` لا تدفع البيانات أبداً لأن `.ok` دائماً `undefined`، و `pullChanges()` تفشل دائماً لأن `!undefined` دائماً `true`
- **التأثير:** لا توجد مزامنة حقيقية بين الهاتف والخادم — المعادلة الأساسية لتطبيقك مكسورة
- **الأولوية:** فورية

---

## [CRIT-002] خدمة الإدارة (Admin) معطّلة بالكامل
- **الملف:** `lib/services/admin.service.ts`
- **الأسطر:** 47-77
- **المشكلة:** نفس خطأ CRIT-001 — كل دالة (`getStats`, `getUsers`, `toggleUserStatus`, `getLogs`, `getWebhookEvents`) تستخدم `api.get()` لكن تتعامل مع الناتج كـ `Response`
- **النتيجة:** كل استدعاء يرمي خطأ فوراً لأن `.ok` غير موجود
- **التأثير:** لوحة الإدارة بالكامل لا تعمل — لا إحصائيات، لا إدارة مستخدمين، لا سجلات
- **الأولوية:** فورية

---

## [CRIT-003] تسريب ذاكرة — Deep Link Listener لا يتم تنظيفه
- **الملف:** `app/_layout.tsx`
- **السطر:** 44-56
- **المشكلة:** `Linking.addEventListener('url', handleDeepLink)` يُرجع كائن اشتراك لكنه لا يتم استدعاء `.remove()` عليه. الـ `useEffect` يُعاد تشغيله عند تغيير `[user, ready, router]` فيضيف مستمعاً جديداً كل مرة
- **النتيجة:** تراكم مستمعات لا نهائية — تسريب ذاكرة يزداد مع كل إعادة عرض
- **التأثير:** تدهور أداء تدريجي وربما تعطل التطبيق بعد استخدام طويل
- **الأولوية:** فورية

---

## [CRIT-004] مُستخرج المفاتيح يستخدم Math.random() — ت FlatList
- **الملف:** `app/connectors/logs.tsx` و `app/connectors/webhooks.tsx`
- **الأسطر:** 76 و 86 على التوالي
- **المشكلة:** `keyExtractor` يستخدم `String(Math.random())`作为 fallback. هذا يُولّد مفتاحاً عشوائياً جديداً في كل إعادة عرض
- **النتيجة:** FlatList لا يمكنها إعادة استخدام العناصر — كل عنصر يُزال ويُعاد تركيبه في كل مرة. حفظ التمرير يُفقد، والأداء ينهار مع القوائم الطويلة
- **الأولوية:** فورية

---

## [CRIT-005] لا يوجد شاشة تحميل — شاشة بيضاء فارغة
- **الملف:** `app/_layout.tsx`
- **الأسطر:** 59-65
- **المشكلة:** كلتا الحالتين `loading` و `!ready` تُعيد `null` بدون أي مؤشر بصرية
- **النتيجة:** المستخدم يرى شاشة بيضاء فارغة أثناء تهيئة قاعدة البيانات والتحقق من الهوية وتحميل الثيم
- **التأثير:** انطباع سيء — المستخدم قد يظن أن التطبيق تعطّل ويُغلقه
- **الأولوية:** فورية

---

## [CRIT-006] كلمة سر JWT مكتوبة ب hardcoded وضعيفة
- **الملف:** `gateway/.env`
- **السطر:** 2
- **المشكلة:** `JWT_SECRET=alhudhud-dev-secret-change-in-production` — كلمة سر يسهل تخمينها
- **النتيجة:** أي مهاجم يعرف الكلمة يمكنه تزوير أي رمز JWT والتنكّر بالمستخدمين أو المدير
- **التأثير:** انتهاك أمني كامل — الوصول غير المصرح به لجميع حسابات المستخدمين
- **الأولوية:** فورية — تدوير الكلمة فوراً

---

## [CRIT-007] مفتاح Supabase Service Role مكشوف
- **الملف:** `gateway/.env`
- **السطر:** 10
- **المشكلة:** `SUPABASE_SERVICE_KEY` هو مفتاح `service_role` بامتيازات كاملة يتجاوز Row Level Security
- **النتيجة:** أي شخص يملك هذا المفتاح يمكنه قراءة وحذف وتعديل أي سجل في أي جدول
- **التأثير:** وصول غير محدود لقاعدة البيانات السحابية
- **الأولوية:** فورية — تدوير المفتاح وتحديثه

---

## [CRIT-008] دالة exec_sql — تنفيذ SQL عشوائي (ثغرة RCE)
- **الملف:** `gateway/supabase/schema.sql`
- **الأسطر:** 120-125
- **المشكلة:** دالة `SECURITY DEFINER` تسمح بتنفيذ أي SQL يُمرّر كمعامل. لا يوجد تقييد على نوع العملية
- **النتيجة:** يمكن استخدامها لـ `DROP TABLE` أو `ALTER ROLE admin` أو سرقة كل البيانات أو تعطيل قاعدة البيانات
- **التأثير:** ثغرة تنفيذ كود عن بعد على مستوى قاعدة البيانات — أخطر مشكلة أمنية ممكنة
- **الأولوية:** فورية — حذف الدالة أو حمايتها

---

## [CRIT-009] كلمة مرور المدير مكتوبة في ملف Schema
- **الملف:** `gateway/supabase/schema.sql`
- **الأسطر:** 127-137
- **المشكلة:** كلمة المرور `AlHudhud@Admin#2024` مكتوبة كنص عادي في ملف SQL alongside bcrypt hash
- **النتيجة:** أي شخص لديه وصول للمستودع يعرف كلمة مرور المدير — المساهمين، CI logs، أي نسخة احتياطية
- **التأثير:** امتلاك كلمة المرور ي granting صلاحيات مدير كاملة
- **الأولوية:** فورية

---

## [CRIT-010] Webhook بدون توثيق — حقن أحداث عشوائية
- **الملف:** `gateway/src/routes/webhook.routes.ts`
- **الأسطر:** 8-12
- **المشكلة:** `router.all('/:connectorId')` يقبل طلبات من أي شخص بدون تحقق من الهوية. التعليقات تذكر أن التحقق HMAC مفقود
- **النتيجة:** مهاجم يعرف UUID الاتصال (يسهل تخمينه أو اكتشافه) يمكنه إدراج أي أحداث ويب هوك في حساب أي مستخدم
- **التأثير:** تزييف بيانات، تشويه المزامنة، تعطيل الاتصالات
- **الأولوية:** فورية

---

## [CRIT-011] كود الاقتران قابل للهجوم بالقوة الغاشمة
- **الملف:** `gateway/src/routes/pairing.routes.ts`
- **السطر:** 81
- **المشكلة:** نقطة `/scan` لا يوجد فيها تقييد لمعدل الطلبات. أكواد الاقتران 6 حروف من 31 رمزاً (~887 مليون组合)
- **النتيجة:** هجوم القوة الغاشمة ممكن — مهاجم يمكنه تجربة أكواد بالسرعة الكاملة
- **التأثير:** اقتران غير مصرح به بأي جهاز — استلام API key وبيانات المستخدم
- **الأولوية:** فورية

---

## [CRIT-012] مفتاحان Supabase مختلفان — مشروعان منفصلان
- **الملف:** `.env` (الجذر) vs `gateway/.env`
- **السطر:** .env:16 vs gateway/.env:5
- **المشكلة:** الملف الجذر يشير إلى مشروع `jqilueudbhgcgskvkvhe` والخادم إلى `rdkqvmvctucyxxfifvpe`
- **النتيجة:** الهاتف يكتب في قاعدة بيانات والخادم في أخرى — المزامنة تفشل بصمت والبيانات تتشتت
- **التأثير:** فقدان بيانات أو بيانات متناقضة بين الأجهزة
- **الأولوية:** فورية

---

## [CRIT-013] وضع Release يستخدم توقيع Debug
- **الملف:** `android/app/build.gradle`
- **السطر:** 115
- **المشكلة:** نوع البناء `release` يستخدم `signingConfigs.debug` — توقيع Debug بكلمة مرور معروفة (`android`)
- **النتيجة:** أي شخص يمكنه توقيع تحديث ضار لنفس الحزمة
- **التأثير:** هجمات التسلل عبر التحديثات — تثبيت نسخة ضارة بدلاً من الأصلية
- **الأولوية:** فورية

---

# مشاكل عالية

## [HIGH-001] حقن SQL عبر أسماء الأعمدة من بيانات الخادم
- **الملف:** `lib/services/sync.service.ts`
- **الأسطر:** 158-164
- **المشكلة:** أسماء الأعمدة من بيانات `payload` تُدمج مباشرة في SQL بدون تحقق من صلاحيتها
  ```typescript
  const keys = Object.keys(payload); // من بيانات الخادم
  db.runSync(`INSERT OR REPLACE INTO ${table_name} (${keys.join(', ')}) VALUES (...)`);
  ```
- **التأثير:** خادم مخترق أو ضار يمكنه حقن SQL عبر أسماء الأعمدة

---

## [HIGH-002] أسرار الاتصال مخزنة كنص عادي في SQLite
- **الملف:** `lib/connectors/manager.ts`
- **الأسطر:** 68-79, 108-119
- **المشكلة:** مفاتيح API، كلمات مرور، رموز OAuth، أسرار العميل — كلها مخزنة كـ JSON عادي في `auth_config`
- **التأثير:** على الأجهزة المتجذرة (rooted/jailbroken) يمكن قراءة كل أسرار الاتصالات

---

## [HIGH-003] رمز JWT يُمرّر في عنوان URL
- **الملف:** `lib/services/gateway.service.ts`
- **السطر:** 40
- **المشكلة:** `new WebSocket(\`${WS_URL}?token=${token}\`)`
- **التأثير:** الرموز تُسجّل في سجلات الخادم والوسيطات وسجل المتصفح — يمكن لأي شخص في مسار الشبكة رؤيتها

---

## [HIGH-004] مفتاح الجهاز يُرسل للخدمات الخارجية
- **الملف:** `lib/connectors/engines/rest.engine.ts`
- **الأسطر:** 79-82
- **المشكلة:** `headers['X-Device-Key'] = deviceKey` يُرفق بكل طلب صادر لأي خدمة خارجية (Slack, Telegram, Twilio...)
- **التأثير:** تسريب مفتاح الجهاز لطرف ثالث — أي خدمة تتلقى المفتاح قد تسيء استخدامه

---

## [HIGH-005] أسماء أسرار Gateway مكشوفة في حزمة الهاتف
- **الملف:** `lib/env.ts`
- **الأسطر:** 49-62
- **المشكلة:** مخطط البيئة يُعرّف أسماء متغيرات `JWT_SECRET`, `ADMIN_DEFAULT_PASSWORD`, `SMTP_PASS` — يمكن استخراجه من ملفات الحزمة
- **التأثير:** المهاجم يعرف أسماء الأسرار التي يجب البحث عنها في الخادم

---

## [HIGH-006] لا يوجد حد أقصى لاتصالات WebSocket لكل مستخدم
- **الملف:** `gateway/src/services/ws.service.ts`
- **الأسطر:** 105-110
- **المشكلة:** `registerClient` يُضيف لـ `unbounded array` — لا يوجد حد لكل مستخدم
- **التأثير:** مستخدم واحد (أو مهاجم برمز صالح) يمكنه فتح آلاف الاتصالات واستنزاف ذاكرة الخادم

---

## [HIGH-007] WebSocket بدون حد أقصى لحجم الرسالة
- **الملف:** `gateway/src/services/ws.service.ts`
- **السطر:** 58
- **المشكلة:** `ws.on('message', ...)` يعالج رسائل بحجم عشوائي بدون حد
- **التأثير:** هجمات استنزاف الذاكرة ممكنة عبر إرسال رسائل عملاقة

---

## [HIGH-008] PUT /connector بدون تحقق من المدخلات
- **الملف:** `gateway/src/routes/connector.routes.ts`
- **الأسطر:** 27-58
- **المشكلة:** لا يوجد مخطط Zod أو تحقق من نوع — `req.body` يُقبل كما هو
- **التأثير:** أي مستخدم يمكنه تعديل `auth_config` أو `endpoint_url` أو أي حقل لقيمة عشوائية

---

## [HIGH-009] CORS مفتوح في الإنتاج
- **الملف:** `gateway/src/index.ts`
- **الأسطر:** 36-41
- **المشكلة:** عند عدم تعيين `CORS_ORIGINS` و `NODE_ENV=production`، CORS يسمح لكل الأصول
- **التأثير:** أي موقع ويب يمكنه عمل طلبات مصادق للخادم — هجمات CSRF ممكنة

---

## [HIGH-010] تسجيل الخروج وهمي — JWT لا يُبطل
- **الملف:** `gateway/src/services/auth.service.ts`
- **الأسطر:** 87-108
- **المشكلة:** نقطة تسجيل الخروج تُعيد النجاح لكن لا تُبطل JWT. لا توجد قائمة سوداء
- **التأثير:** الرموز المخترقة تبقى صالحة لمدة 7 أيام (للتجديد) أو ساعة (للوصول)

---

## [HIGH-011] المدير يمكنه حذف أي جهاز بدون تدقيق
- **الملف:** `gateway/src/routes/admin.routes.ts`
- **الأسطر:** 105-108
- **المشكلة:** `DELETE /devices/:id` يحذف أي جهاز عالمياً بدون تحقق من الملكية أو تسجيل العملية
- **التأثير:** حذف عرضي أو متعمد لأجهزة المستخدمين بدون أثر

---

## [HIGH-012] سباق في findOrCreateDevice
- **الملف:** `gateway/src/services/auth.service.ts`
- **الأسطر:** 244-268
- **المشكلة:** مكالمتان متزامنتان بنفس `serialNumber` قد تنشئ جهازين مكررين
- **التأثير:** تضارب بيانات وسجلات مزدوجة

---

## [HIGH-013] مجدول المزامنة — تراكب callbacks
- **الملف:** `gateway/src/services/sync-scheduler.service.ts`
- **الأسطر:** 18-61
- **المشكلة:** `setInterval` مع `async` callback — إذا استغرق تنفيذ واحد أطول من 60 ثانية، يتشابك مع التالي
- **التأثير:** مزامنة مزدوجة و_update متزامن لـ `last_synced_at`

---

## [HIGH-014] لا يوجد timeout على طلبات Gateway
- **الملف:** `lib/services/gateway.service.ts`
- **الأسطر:** 150-171
- **المشكلة:** `sendToConnector` و `gatewayService.fetch` بدون `AbortController` أو timeout
- **التأثير:** الطلبات قد تعلق إلى الأبد عند فقدان الاتصال

---

## [HIGH-015] لا يوجد retry على استدعاءات Marsal
- **الملف:** `lib/services/marsal.service.ts`
- **الأسطر:** 102-144
- **المشكلة:** `registerDevice()` و `reportSmsStatus()` بدون timeout أو retry
- **التأثير:** تقارير SMS قد تضيع عند أعطال مؤقتة

---

## [HIGH-016] Bulk Sync بدون حد أقصى لحجم المصفوفة
- **الملف:** `gateway/src/routes/connector.routes.ts`
- **الأسطر:** 60-117
- **المشكلة:** `POST /sync` يقبل مصفوفة كائنات بدون حد لحجمها أو تحقق من البنية
- **التأثير:** مهاجم يمكنه إرسال مصفوفة عملاقة لاستنزاف الذاكرة وعمليات قاعدة البيانات

---

## [HIGH-017] كلمة مرور Admin افتراضية غير مُعرّفة
- **الملف:** `gateway/.env` (مفقود)
- **المشكلة:** `ADMIN_DEFAULT_PASSWORD` غير مُعيّن في `.env` — قد يكون فارغاً أو افتراضياً ضعيفاً
- **التأثير:** حساب المدير قد يكون قابل للاختراق

---

## [HIGH-018] @types في التبعيات الإنتاجية
- **الملف:** `gateway/package.json`
- **الأسطر:** 13-16
- **المشكلة:** `@types/bcryptjs`, `@types/express-rate-limit` إلخ في `dependencies` بدلاً من `devDependencies`
- **التأثير:** زيادة سطح الهجوم — حزمة مصابة يمكنها الوصول للإنتاج

---

# مشاكل متوسطة

## [MED-001] فحص دور المدير يحدث من العميل فقط
- **الملف:** `app/admin/index.tsx:41-48`
- **المشكلة:** الشاشة تُعرض للحظة ثم تظهر "رفض الوصول" — يجب أن يكون فحص في AuthGuard

## [MED-002] مكونات مُعرّفة داخل جسم العرض
- **الملف:** `app/admin/index.tsx:51-145`, `app/connectors/add.tsx:170-187`, `app/platform/index.tsx:83-88`, `app/connectors/[id]/index.tsx:102-115`
- **المشكلة:** StatCard, ProtocolSelector, StatusBadge, InfoRow تُعاد تهيئتها في كل عرض

## [MED-003] ListHeader/Footer/Empty كأسهم Inline
- **الملف:** `app/(tabs)/index.tsx:152,248,257`, `app/connectors/index.tsx:145,226`
- **المشكلة:** كل واحد يُنشئ مرجع دالة جديداً — FlatList تُعيد عرض القائمة بالكامل

## [MED-004] مصفوفة filtered غير محفوظة بالذاكرة
- **الملف:** `app/connectors/index.tsx:53-59`
- **المشكلة:** إعادة حساب في كل عرض — يجب استخدام `useMemo`

## [MED-005] أخطاء مبتلعة بصمت في catches فارغة
- **الملف:** `app/connectors/add.tsx:67`, `app/connectors/webhooks.tsx:28-29`, `app/_layout.tsx:76`
- **المشكلة:** `catch { /* */ }` — المستخدم لا يعرف أن الشيء فشل

## [MED-006] صفوف إعدادات بدون معالج حدث
- **الملف:** `app/(tabs)/settings.tsx:318-319`
- **المشكلة:** "الشروط والأحكام" و"سياسة الخصوصية" تبدو تفاعلية لكن لا تفعل شيئاً

## [MED-007] نسخة التطبيق hardcoded في الإعدادات
- **الملف:** `app/(tabs)/settings.tsx:317`
- **المشكلة:** `value="1.0.0"` بينما الإصدار الفعلي 4.0.0

## [MED-008] استخدام any بشكل مفرط
- **الملف:** `app/connectors/[id]/index.tsx:14,213`, `app/connectors/mapping.tsx:42,44`, `app/admin/index.tsx:32,97`, `hooks/useAuth.tsx:30`
- **المشكلة:** `any` يُلغي فائدة TypeScript في التحقق من الأخطاء

## [MED-009] أرقام سحرية لفواصل المزامنة
- **الملف:** `app/connectors/[id]/index.tsx:183`
- **المشكلة:** `[0, 1, 5, 15, 30, 60, 360, 1440]` بدون تعريف في ثابت

## [MED-010] تسجيل الخروج بدون معالجة فشل التنقل
- **الملف:** `app/(tabs)/index.tsx:191`
- **المشكلة:** `logout().then(() => router.replace(...))` بدون `.catch()` — المستخدم يعلق إذا فشل

## [MED-011] key={index} لقواعد المapped
- **الملف:** `app/connectors/mapping.tsx:125`
- **المشكلة:** استخدام فهرس المصفوفة كمفتاح — يسبب سلوكيات خطأ عند إعادة الترتيب

## [MED-012] لا يوجد نظام i18n
- **جميع ملفات app/**
- **المشكلة:** كل النصوص hardcoded بالعربية — أي لغة جديدة تتطلب تعديل كل الملفات

## [MED-013] renderItem غير محفوظ في FlatLists
- **الملف:** `app/(tabs)/index.tsx:224`, `app/connectors/index.tsx:173`
- **المشكلة:** أسهم Inline تُعاد تهيئتها في كل عرض

## [MED-014] initDatabase بدون معالجة أخطاء
- **الملف:** `app/_layout.tsx:75`
- **المشكلة:** إذا فشلت التهيئة، يستمر التطبيق في حالة مكسورة بدون إشارة

## [MED-015] سباق في ConnectorSyncService
- **الملف:** `lib/services/connector-sync.service.ts:5-9`
- **المشكلة:** علامة `syncing` ليست ذرّية — مكالمتان سريعتان قد تُسببان مزامنة مزدوجة

## [MED-016] خزّن OAuth2 ينمو بلا حد
- **الملف:** `lib/connectors/engines/oauth2.engine.ts:20`
- **المشكلة:** Map بدون آليات تنظيف — الرموز القديمة تتراكم في الذاكرة

## [MED-017] خدمة Supabase لا تُنظّف المستمعين
- **الملف:** `lib/services/supabase-integration.service.ts:28`
- **المشكلة:** `listeners` Set لا يتم مسحه عند إلغاء التهيئة

## [MED-018] useGateway يعيد الاتصال عند كل إعادة عرض لـ user
- **الملف:** `hooks/useGateway.ts:34`
- **المشكلة:** `useEffect` يعتمد على `user` (مرجع كائن) — تغيير المرجع يقطع WebSocket

## [MED-019] قاعدة البيانات بدون ترقيم إصدارات
- **الملف:** `lib/db/init.ts:16-41`
- **المشكلة:** لا يوجد `ALTER TABLE ADD COLUMN` — أعمدة جديدة لن تصل للبيانات الحالية

## [MED-020] apiClient يتجاوز التحقق من getEnv()
- **الملف:** `lib/apiClient.ts:3`
- **المشكلة:** يقرأ `process.env` مباشرة بدلاً من `getEnv()` مع Zod validation

## [MED-021] رقم الإصدار hardcoded في الاقتران
- **الملف:** `lib/services/pairing.service.ts:125`
- **المشكلة:** `appVersion: '4.0.0'` بدلاً من `Application.nativeApplicationVersion`

## [MED-022] SSRF لا يغطي IPv6 الخاص
- **الملف:** `lib/services/pairing.service.ts:8-17`
- **المشكلة:** الأنماط لا تشمل `fc00::/7`, `fe80::/10`, `fd00::/8`

## [MED-023] Number() يُعيد NaN بدون حماية
- **الملف:** `lib/connectors/mapper.ts:89`
- **المشكلة:** `Number("abc")` → `NaN` ينتشر بصمت عبر التحويلات

## [MED-024] Supabase client يُنشأ بسكريت فارغ
- **الملف:** `lib/supabase/client.ts:4-5,19`
- **المشكلة:** عند فقدان المتغيرات، يُنشئ عميل غير صالح يعمل بصمت

## [MED-025] فحص isOnline غير متسق
- **الملف:** `lib/services/sync.service.ts:12-15` vs `gateway.service.ts`
- **المشكلة:** فقط sync.service يتحقق — الخدمات الأخرى تفشل عند عدم الاتصال

## [MED-026] عدم وجود فهارس قاعدة البيانات
- **الملف:** `gateway/src/db.ts`
- **المشكلة:** لا فهارس على `connectors.user_id`, `webhook_events.user_id`, `message_logs.user_id`, `sync_queue.status`

## [MED-027] استعلامات N+1 في getStats
- **الملف:** `gateway/src/services/auth.service.ts:194-209`
- **المشكلة:** 6 استعلامات `SELECT COUNT(*)` منفصلة بدلاً من واحدة مجمّعة

## [MED-028] تحديثات N+1 في Bulk Sync
- **الملف:** `gateway/src/routes/connector.routes.ts:69-114`
- **المشكلة:** كل اتصال يُستعلم ويُحدّث بشكل منفصل

## [MED-029] أخطاء SQL تكشف نص الاستعلام
- **الملف:** `gateway/src/db.ts:245,282`
- **المشكلة:** رسائل الخطأ تتضمن SQL الكامل — كشف أسماء الجداول والأعمدة

## [MED-030] لا يوجد helmet لرؤوس الأمان
- **الملف:** `gateway/src/index.ts`
- **المشكلة:** لا يوجد `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`

## [MED-031] نقطة إعداد الحالة تكشف معلومات التكوين
- **الملف:** `gateway/src/index.ts:97-103`
- **المشكلة:** `/api/setup/status` عامة تكشف نوع قاعدة البيانات وحالة Supabase

## [MED-032] رمز JWT في query string يُسجّل
- **الملف:** `gateway/src/services/ws.service.ts:31`
- **المشكلة:** الرموز تظهر في سجلات الخادم والوسيطات وسجل المتصفح

## [MED-033] الاقتران يُعيد كل البيانات بعد الاقتران
- **الملف:** `gateway/src/routes/pairing.routes.ts:125-128`
- **المشكلة:** البيانات تشمل `auth_config` الذي قد يحتوي مفاتيح API

## [MED-034] مفتاح API يتسرب في استجابة البديل
- **الملف:** `gateway/src/routes/auth.routes.ts:171`
- **المشكلة:** عند فشل البريد، يُرجع المفتاح الخام في جسم الاستجابة

## [MED-035] إلغاء الاقتران يحذف كل الرموز
- **الملف:** `gateway/src/routes/pairing.routes.ts:169-172`
- **المشكلة:** `DELETE FROM pairing_tokens WHERE user_id = ?` يحذف كل الرموز للمستخدم

## [MED-036] لا يوجد فرض HTTPS
- **الملف:** `gateway/src/index.ts`
- **المشكلة:** لا يوجد middleware لإعادة توجيه HTTP إلى HTTPS

## [MED-037] نقاط الإدارة بدون تقييد معدل
- **الملف:** `gateway/src/index.ts:90`
- **المشكلة:** `/api/admin` بدون rate limiter — هجمات brute-force ممكنة

## [MED-038] تغيير الخطة بدون دفع
- **الملف:** `gateway/src/routes/auth.routes.ts:126-147`
- **المشكلة:** الترقية إلى `starter` متاحة مجاناً بدون بوابة دفع

## [MED-039] process.exit في خدمة المصادقة
- **الملف:** `gateway/src/services/auth.service.ts:10`
- **المشكلة:** استيراد الملف يقتل العملية إذا `JWT_SECRET` غير مُعرّف — غير قابل للاختبار

## [MED-040] قاعدة البيانات مخزنة كنص عادي
- **الملف:** `gateway/src/db.ts:5`
- **المشكلة:** SQLite يحتوي كلمات مرور ورموز كنص على القرص بدون تشفير

## [MED-041] لا يوجد دعم دفع حقيقي
- **الملف:** `app/subscription/index.tsx:101`
- **المشكلة:** اختيار الخطة المدفوعة يُظهر Alert فقط — لا توجد بوابة دفع

## [MED-042] لا يوجد إطار اختبارات
- **الملف:** `package.json` (الجذر + gateway)
- **المشكلة:** لا يوجد jest أو vitest أو أي إعداد اختبارات

## [MED-043] Gateway يعمل بـ tsx بدون تجميع
- **الملف:** `gateway/package.json:7`
- **المشكلة:** `start` يشغّل TypeScript مباشرة بدون tree-shaking أو minification

## [MED-044] @types في التبعيات الإنتاجية
- **الملف:** `gateway/package.json:13-16`
- **المشكلة:** حزم الأنواع يجب أن تكون devDependencies

## [MED-045] عدم وجود مخطط Zod ل bulk sync
- **الملف:** `gateway/src/routes/connector.routes.ts:60-117`
- **المشكلة:** لا تحقق من بنية البيانات المُرسلة

## [MED-046] SQL Error Messages Leak Query Text
- **الملف:** `gateway/src/db.ts:245,282`
- **المشكلة:** رسائل الخطأ تتضمن SQL الكامل

## [MED-047] N+1 Updates in Pull/Confirm
- **الملف:** `gateway/src/routes/sync.routes.ts:75-77`
- **المشكلة:** كل `id` في المصفوفة يُحدّث ب UPDATE منفصل

## [MED-048] N+1 Updates in Sync Scheduler
- **الملف:** `gateway/src/services/sync-scheduler.service.ts:39-48`
- **المشكلة:** كل اتصال مستحق يُحدّث بشكل منفصل

## [MED-049] Webhook Events Auth غير متسق
- **الملف:** `gateway/src/routes/webhook.routes.ts:59-73`
- **المشكلة:** يتحقق يدوياً بدلاً من استخدام `requireAuth` middleware

## [MED-050] DB File Plaintext
- **الملف:** `gateway/src/db.ts:5`
- **المشكلة:** كلمة المرور المشفرة والبيانات الحساسة كنص على القرص

## [MED-051] console.log بكثرة في الكود
- **الملف:** ملفات متعددة في lib/ و gateway/src/
- **المشكلة:** ~49 استدعاء console تكشف معلومات داخلية في سجلات الأجهزة

## [MED-052] sql.js و pg معاً
- **الملف:** `gateway/package.json:26`
- **المشكلة:** كلا المكتبتين موجودتان — تضارب حول أي قاعدة هي المصدر

## [MED-053] Gateway start لا يستخدم dist
- **الملف:** `gateway/package.json:7`
- **المشكلة:** `tsx src/index.ts` بدلاً من `node dist/index.js`

## [MED-054] .env.example يحتوي IP خاص
- **الملف:** `.env.example:4,7,10`
- **المشكلة:** `http://192.168.8.136:4000` — معلومات تطوير متسربة

## [MED-055] gateway .env.example ب كلمة سر ضعيفة
- **الملف:** `gateway/.env.example:2`
- **المشكلة:** `your-secret-key-change-in-production` — نمط يشبه كلمة السر الفعلية

## [MED-056] لا يوجد CORS_ORIGINS في gateway
- **الملف:** `gateway/.env` (مفقود)
- **المشكلة:** CORS مفتوح بشكل افتراضي

## [MED-057] Non-Null Assertion on create() Return
- **الملف:** `lib/connectors/manager.ts:90`
- **المشكلة:** `as Promise<ConnectorConfig>` يلغي فحص null

## [MED-058] Base64 Encoding على مدخلات كبيرة
- **الملف:** `lib/connectors/engines/rest.engine.ts:109-111`
- **المشكلة:** spread operator على مصفوفة كبيرة قد يتجاوز حد استدعاء الدالة

---

# مشاكل منخفضة

## [LOW-001] onRefresh مع إغلاق قديم
- **الملف:** `app/connectors/index.tsx:47-51`

## [LOW-002] دوال مساعدة تُعاد تهيئتها
- **الملف:** `app/(tabs)/index.tsx:137-144`, `app/(tabs)/settings.tsx:124-132`

## [LOW-003] handleSyncNow غير محفوظ
- **الملف:** `app/(tabs)/index.tsx:60-72`

## [LOW-004] أزرار كاميرا لا تعمل عند الرفض الدائم
- **الملف:** `app/connectors/scan.tsx:110-126`

## [LOW-005] اسم المسبحة بـ Date.now()
- **الملف:** `app/connectors/add.tsx:81`

## [LOW-006] مكونات Inline في بعض الشاشات
- **الملف:** `app/connectors/webhooks.tsx:49-84`

## [LOW-007] accessibilityLabel مفقود في منصة تسجيل الدخول
- **الملف:** `app/platform/index.tsx:119-132`

## [LOW-008] استيراد غير مستخدم
- **الملف:** `app/connectors/send.tsx:9`

## [LOW-009] استخدام useEffect غير موثوق
- **الملف:** `app/(tabs)/index.tsx:87-89`

## [LOW-010] تسجيل جزء من مفتاح API في التطوير
- **الملف:** `gateway/src/services/email.service.ts:66-67`

## [LOW-011] استيراد ديناميكي غير ضروري
- **الملف:** `gateway/src/routes/device.routes.ts:9,15,23`

## [LOW-012] تعليق غير متطابق
- **الملف:** `gateway/src/index.ts:82`

## [LOW-013] نقطة إلغاء بدون تحقق من المدخلات
- **الملف:** `gateway/src/routes/pairing.routes.ts:151-160`

## [LOW-014] أسماء مسارات مربكة
- **الملف:** `connector.routes.ts:60` vs `sync.routes.ts:82`

## [LOW-015] لا يوجد حد لجسم Webhook غير JSON
- **الملف:** `gateway/src/routes/webhook.routes.ts:12`

## [LOW-016] DELETE لا يتحقق من الوجود
- **الملف:** `gateway/src/routes/connector.routes.ts:119-125`

## [LOW-017] مجلد types/ فارغ
- **الملف:** `gateway/src/types/`

## [LOW-018] Nodemailer لا يُغلق الاتصال
- **الملف:** `gateway/src/services/email.service.ts`

## [LOW-019] تنسيقات أخطاء غير متسقة
- **ملفات متعددة في gateway/src/routes/**

## [LOW-020] تعليق metro.config.js قديم
- **الملف:** `metro.config.js:9`

## [LOW-021] ESLint يتجاهل gateway
- **الملف:** `eslint.config.js:8`

## [LOW-022] gradle.properties deprecated
- **الملف:** `android/gradle.properties:64-65`

## [LOW-023] versionCode دائماً 1
- **الملف:** `android/app/build.gradle:95`

## [LOW-024] API Key Storage مزدوج
- **الملف:** `lib/apiClient.ts:9-10,38-56` vs `lib/utils/device-info.ts:67-77`

## [LOW-025] ConnectorConfig مزدوج
- **الملف:** `lib/types.ts:95-109` vs `lib/connectors/types.ts:30-47`

## [LOW-026] WSEvent بتوقيع فرعي
- **الملف:** `lib/types.ts:231-233`

## [LOW-027] دوال SMS متطابقة
- **الملف:** `lib/utils/send-sms.ts:38-59`

## [LOW-028] Exponential Backoff بدون Jitter
- **الملف:** `lib/apiClient.ts:110`

## [LOW-029] أخطاء الترحيل تبتلع بصمت
- **الملف:** `lib/db/init.ts:37-39`

## [LOW-030] unpair لا يمسح رمز JWT
- **الملف:** `lib/services/pairing.service.ts:274-303`

## [LOW-031] معرّفات أجهزة بـ Math.random()
- **الملف:** `lib/utils/device-info.ts:30`

## [LOW-032] register() يستدعي login بشكل منفصل
- **الملف:** `hooks/useAuth.tsx:75-92`

## [LOW-033] gateway fetch() بدون timeout
- **الملف:** `lib/services/gateway.service.ts:166-171`

## [LOW-034] معالج الإشعارات أخطاء تبتلع بصمت
- **الملف:** `lib/services/notification.service.ts:38-39`

## [LOW-035] Dispatch Unpair لا يحذف كل الأزواج
- **الملف:** `gateway/src/routes/pairing.routes.ts:169-172`

## [LOW-036] استيراد ديناميكي غير ضروري
- **الملف:** `gateway/src/routes/device.routes.ts:9,15,23`

---

## ملخص الإحصائيات

| الحالة | العدد |
|---|---|
| حرجة | 13 |
| عالية | 18 |
| متوسطة | 58 |
| منخفضة | 36 |
| **المجموع** | **125** |

## أكثر المناطق تأثراً

| المنطقة | عدد المشاكل |
|---|---|
| نظام المزامنة (sync) | 8 |
| الأمان والتوثيق | 15 |
| أداء FlatList/React | 10 |
| قاعدة البيانات | 9 |
| WebSocket | 4 |
| واجهة المستخدم | 8 |
| API والخادم | 12 |
| الإعدادات | 7 |

---

# مشاكل العمليات

> فحص عميق لعمليات تطبيق الهاتف — المصادقة، الاتصالات، المزامنة، الرسائل، قاعدة البيانات

---

## عمليات المصادقة والتوثيق

### [OP-AUTH-001] كود 401 يمسح الرمز لكن لا يحدث حالة المستخدم في React
- **الملف:** `lib/apiClient.ts:90-92`
- **العمليات المتأثرة:** أي استدعاء API يتلقى 401
- **المشكلة:** عند استجابة 401، يتم مسح الرمز من SecureStore لكن `user` state في React لا يتحدث إلا إذا كان الاستدعاء من `checkAuth()`. المستخدم يرى واجهة "مسجّل الدخول" لكن كل الاستدعاءات تفشل بصمت
- **النتيجة:** المستخدم عالق في حالة "مسجّل الدخول لكن لا يعمل شيئاً" حتى يُغلق التطبيق بالقوة
- **الشدة:** حرجة

### [OP-AUTH-002] لا يوجد آلية لتجديد الرمز (Token Refresh)
- **الملف:** `lib/apiClient.ts` + `lib/types.ts:21`
- **المشكلة:** حقل `refreshToken` مُعرّف في النوع لكن لا يُقرأ أو يُخزّن أو يُستخدم في أي مكان. لا يوجد endpoint للتجديد ولا منطق له
- **النتيجة:** انتهاء صلاحية الجلسة = تعطيل كامل حتى إعادة تسجيل الدخول يدوياً
- **الشدة:** حرجة

### [OP-AUTH-003] التسجيل يُلغي الرمز ويعتمد على تسجيل دخول ثانوي قد يفشل
- **الملف:** `lib/services/auth.service.ts:51-68`
- **المشكلة:** `register()` يُخزّن `apiKey` لكن يتجاهل `data.token`. ثم `useAuth.register()` يستدعي `login()` بشكل منفصل. إذا فشل تسجيل الدخول الثاني (بطء الشبكة، rate limiting)، المستخدم يرى "تم إنشاء الحساب" لكنه غير مسجّل الدخول فعلياً
- **النتيجة:** المستخدم يرى مودال API Key ثم يُعاد توجيهه لشاشة تسجيل الدخول
- **الشدة:** حرجة

### [OP-AUTH-004] لا يوجد إعادة تحقق للجلسة عند العودة من الخلفية
- **الملف:** `app/_layout.tsx` (جميع الأسطر)
- **المشكلة:** `AuthGuard` يتحقق من الهوية مرة واحدة عند التحميل. لا يوجد `AppState` listener. عند خلفية طويلة (ساعات) + انتهاء صلاحية JWT، المستخدم يعود للتطبيق ويرى حالة مسجّل الدخول لكن لا يعمل
- **النتيجة:** فشل صامت بعد الخلفية — لا يوجد معالجة لانتهاء الجلسة
- **الشدة:** عالية

### [OP-AUTH-005] فشل تسجيل الدخول التلقائي بعد التسجيل يترك المستخدم في حالة مكسورة
- **الملف:** `hooks/useAuth.tsx:75-92`
- **المشكلة:** إذا فشل `login()` بعد `register()`, `checkAuth()` يستدعي `GET /auth/profile` بدون رمز مخزّن → يفشل → `setUser(null)`. المستخدم يرى مودال API Key لكنه غير مسجّل الدخول
- **النتيجة:** المستخدم يُسجّل حساباً جديداً ثم يُطلب منه تسجيل الدخول فوراً
- **الشدة:** عالية

### [OP-AUTH-006] تسجيل الخروج لا ينظّف اتصالات WebSocket والإشعارات
- **الملف:** `hooks/useAuth.tsx:94-98`
- **المشكلة:** `logout()` يمسح المستخدم والـ API key فقط. لا يوجد `notificationService.cleanup()`, لا `gatewayService.disconnect()`, لا إزالة مستمعات. الاتصالات تبقى نشطة للجلسة القديمة
- **النتيجة:** بعد الخروج، الإشعارات والـ WebSocket قد تتلقى بيانات للجلسة المنتهية
- **الشدة:** عالية

### [OP-AUTH-007] getProfile() تبتلع كل الأخطاء بصمت
- **الملف:** `lib/services/auth.service.ts:80-86`
- **المشكلة:** `catch { return null; }` — لا تفريق بين "غير مصادق" و"خطأ في الخادم". خطأ مؤقت في الخادم = إعادة إجبارية لتسجيل الدخول
- **النتيجة:** أي اضطراب مؤقت في الخادم يجبر كل المستخدمين على إعادة تسجيل الدخول
- **الشدة:** عالية

### [OP-AUTH-008] زر تسجيل الدخول لا يحمي من الإرسال المزدوج
- **الملف:** `app/auth/login.tsx:60-81`
- **المشكلة:** لا يوجد حماية من الضغط السريع المتكرر. الضغط السريع قد يُسبب طلبات تسجيل دخول مزدوجة
- **النتيجة:** كتابة رمز مزدوجة، تسجيل دخول Supabase مزدوج
- **الشدة:** متوسطة

### [OP-AUTH-009] أخطاء Supabase تبتلع بصمت
- **الملف:** `lib/services/auth.service.ts:20-24, 42-46, 61-65`
- **المشكلة:** كل `try { await supabaseIntegrationService.signInAndRegister() } catch {}` — فشل Supabase لا يؤثر على واجهة المستخدم لكن الميزات اللاحقة (real-time sync) تفشل بصمت
- **النتيجة:** حالة مصادقة جزئية — بعض الميزات تعمل وبعضها لا
- **الشدة:** متوسطة

### [OP-AUTH-010] AuthGuard يُظهر محتوى محمي للحظة قبل إعادة التوجيه
- **الملف:** `app/_layout.tsx:25-38`
- **المشكلة:** `setReady(true)` يُستدعى بعد `router.replace()` بشكل متزامن. المحتوى المحمي يُعرض للحظة قبل اكتمال إعادة التوجيه
- **النتيجة:** وميض سريع للمحتوى المحمي لل مستخدم غير المسجّل
- **الشدة:** متوسطة

---

## عمليات الاتصالات (Connectors)

### [OP-CONN-001] لا يوجد مزامنة للبوابة عند إنشاء اتصال جديد
- **الملف:** `lib/connectors/manager.ts:61-91` + `app/connectors/add.tsx:130-134`
- **المشكلة:** `create()` يُخزّن في SQLite المحلي فقط. لا يوجد استدعاء لـ `pushConnectors()` أو أي API للبوابة. الاتصال غير معروف للخادم حتى تتم المزامنة الكاملة during الاقتران فقط
- **النتيجة:** إذا أنشأ المستخدم 10 اتصالات ثم اقترن بجهاز جديد، لا يوجد منها أي شيء على الخادم
- **الشدة:** حرجة

### [OP-CONN-002] لا يوجد مزامنة للبوابة عند حذف اتصال
- **الملف:** `lib/connectors/manager.ts:158-162`
- **المشكلة:** `delete()` يحذف الصف المحلي فقط. لا يوجد إشعار للبوابة. الاتصال المُحذَف يبقى إلى الأبد على الخادم
- **النتيجة:** اتصالات مُحذَفة ظلّية على الخادم
- **الشدة:** عالية

### [OP-CONN-003] لا يوجد مزامنة لأي تعديل على الاتصال
- **الملف:** جميع دوال manager: `update()`, `toggleActive()`, `updateMapping()`, `updateSchedule()`
- **المشكلة:** لا دالة منها تُبلغ Gateway. Gateway دائماً غير متزامن مع قاعدة البيانات المحلية
- **النتيجة:** Gateway يبقى بأقدم نسخة من الاتصالات دائماً
- **الشدة:** عالية

### [OP-CONN-004] حذف الاتصال لا ينظّف السجلات المرتبطة
- **الملف:** `lib/connectors/manager.ts:158-162`
- **المشكلة:** `DELETE FROM connectors WHERE id = ?` فقط — `message_logs` لا يتم حذفها. السجلات المُحذَفة تبقى وتُثقل قاعدة البيانات وتظهر في عرض السجلات العامة
- **النتيجة:** تسرب تخزين — سجلات اتصالات مُحذَفة تراكم للأبد
- **الشدة:** متوسطة

### [OP-CONN-005] حذف الاتصال لا يقطع اتصال WebSocket النشط
- **الملف:** `lib/connectors/manager.ts:158-162`
- **المشكلة:** إذا كان WebSocket نشطاً للاتصال المُحذَف، `webSocketEngine.disconnect(id)` لا يُستدعى. خريطة الاتصالات تسرّب العناصر
- **النتيجة:** اتصال WebSocket معلّق يستهلك الذاكرة
- **الشدة:** متوسطة

### [OP-CONN-006] لا يوجد إعادة محاولة لإرسال البيانات الفاشلة (REST Engine)
- **الملف:** `lib/connectors/engines/rest.engine.ts:15-42`
- **المشكلة:** عند أي فشل (timeout, 4xx, 5xx, خطأ شبكة)، النتيجة تُرجع فوراً `success: false`. لا إعادة محاولة تلقائية، لا queue للإعادة، لا backoff
- **النتيجة:** انقطاع مؤقت في الشبكة = فقدان دائم للرسالة تلك
- **الشدة:** عالية

### [OP-CONN-007] الرسائل الفاشلة تُسجّل لكن لا تُعاد أبداً
- **الملف:** `lib/connectors/manager.ts:206-222`
- **المشكلة:** `sendData()` يُسجّل FAILED في `message_logs`. لا يوجد dead-letter queue، لا retry queue، لا جدولة لإعادة المحاولة. الرسائل الفاشلة تبقى سجلات ميتة
- **النتيجة:** فقدان دائم للبيانات الفاشلة — لا طريق للإعادة
- **الشدة:** عالية

### [OP-CONN-008] لا يوجد تحقق من صحة المدخلات عند إنشاء الاتصال
- **الملف:** `app/connectors/add.tsx:100-102`
- **المشكلة:** فحص فقط `name.trim()` و `endpointUrl.trim()` غير فارغين. لا تحقق من صيغة URL، لا تحقق من البروتوكول (WebSocket مع `http://`)، لا تحقق من اتساق حقول المصادقة
- **النتيجة:** اتصالات بصيغ URL خاطئة أو إعدادات غير متسقة تُخزّن في قاعدة البيانات
- **الشدة:** متوسطة

### [OP-CONN-009] WebSocket Engine لا يُخزّن الرسائل أثناء عدم الاتصال
- **الملف:** `lib/connectors/engines/websocket.engine.ts:69-80`
- **المشكلة:** `send()` يُرجع `false` فوراً إذا WebSocket غير `OPEN`. لا internal buffer، لا queue، لا إرسال تلقائي عند إعادة الاتصال
- **النتيجة:** الرسائل المُرسلة أثناء انقطاع مؤقت تضيع نهائياً
- **الشدة:** عالية

### [OP-CONN-010] OAuth2 لا يُخزّن الرموز بشكل دائم
- **الملف:** `lib/connectors/engines/oauth2.engine.ts:20`
- **المشكلة:** `tokenCache = new Map()` — في الذاكرة فقط. إعادة تشغيل التطبيق = فقدان كل رموز OAuth2. كل اتصال يحتاج إعادة تفويض
- **النتيجة:** إعادة تفويض شاملة عند كل تشغيل — استهلاك غير ضروري لـ API
- **الشدة:** عالية

### [OP-CONN-011] OAuth2 لا يوجد mutex — سباق عند تجديد الرمز المتزامن
- **الملف:** `lib/connectors/engines/oauth2.engine.ts:22-33`
- **المشكلة:** طلبان REST متزامنان لنفس الاتصال يرون الرمز منتهياً وكتلاهما يُحدّثان. `refresh_token` قد يُلغى بعد التجديد الأول
- **النتيجة:** فقدان السياق الأصلي للاختيار — تحول صامت إلى `client_credentials`
- **الشدة:** متوسطة

### [OP-CONN-012] اختبار الاتصال يستخدم دائماً GET
- **الملف:** `lib/connectors/engines/rest.engine.ts:52`
- **المشكلة:** `test()` يُثبّت `method: 'GET'` دائماً. للpoints التي تقبل POST فقط (مثل Twilio)، الاختبار يفشل دائماً بخطأ م误导
- **النتيجة:** اختبار خاطئ لاتصالات POST-only — المستخدم يظن أن الاتصال معطّل
- **الشدة:** منخفضة

### [OP-CONN-013] فشل خدمة Supabase يمنع التسجيل في Marsal
- **الملف:** `lib/services/auth.service.ts:20-24`
- **المشكلة:** تسجيل الدخول الرئيسي ناجح لكن تسجيل Supabase يفشل. الخطأ يبتلع بصمت. ميزات Marsal تعتمد على Supabase تفشل لاحقاً
- **النتيجة:** المستخدم مسجّل دخول لكن ميزات Marsal (أوامر SMS) لا تعمل بدون سبب واضح
- **الشدة:** متوسطة

---

## عمليات المزامنة

### [OP-SYNC-001] push() يفشل دائماً بسبب خطأ في نوع الإرجاع
- **الملف:** `lib/services/sync.service.ts:90-107`
- **المشكلة:** `api.post()` تُعيد JSON مُحلّل لكن الكود يستدعي `.ok` و `.json()` غير موجودين
- **النتيجة:** `pushChanges()` لا تدفع البيانات أبداً — `response.ok` دائماً `undefined`
- **الشدة:** حرجة

### [OP-SYNC-002] pull() يفشل دائماً بنفس السبب
- **الملف:** `lib/services/sync.service.ts:129-133`
- **المشكلة:** `api.get()` تُعيد JSON لكن الكود يتحقق من `!response.ok` → دائماً `true` → يدخل فرع الخطأ
- **النتيجة:** `pullChanges()` لا تسحب أي تغييرات — الجهاز دائماً قديم
- **الشدة:** حرجة

### [OP-SYNC-003] last_pull_at يُحدّث حتى عند فشل جزئي
- **الملف:** `lib/services/sync.service.ts:189-190`
- **المشكلة:** الطابع الزمني يُحدّث دائماً بغض النظر عن نجاح تطبيق التغييرات. التغييرات الفاشلة تُحذف من الخادم وتضيع نهائياً في السحب التالي
- **النتيجة:** فقدان دائم للبيانات عند الفشل الجزئي
- **الشدة:** عالية

### [OP-SYNC-004] لا يوجد حل تعارضات — INSERT OR REPLACE يمحو التغييرات المحلية
- **الملف:** `lib/services/sync.service.ts:162-163`
- **المشكلة:** `INSERT OR REPLACE` يحذف الصف القديم ويُ inserting الجديد. إذا عدّل المستخدم سجلاً محلياً والخادم لديه نسخة مختلفة، التغييرات المحلية تُمحى بصمت
- **النتيجة:** فقدان تغييرات المستخدم بدون أي تنبيه
- **الشدة:** عالية

### [OP-SYNC-005] عناصر sync_queue الفاشلة لا تُعاد ولا تُنظف
- **الملف:** `lib/services/sync.service.ts:70`
- **المشكلة:** فقط العناصر `PENDING` تُقرأ. العناصر `FAILED` تُهمل إلى الأبد. لا retry، لا backoff، لا تنظيف
- **النتيجة:** sync_queue ينمو بلا حد بعناصر FAILED قديمة
- **الشدة:** متوسطة

### [OP-SYNC-006] لا يوجد فصل تكراري في sync_queue
- **الملف:** `lib/db/init.ts:79-89`
- **المشكلة:** لا يوجد قيد `UNIQUE` على `(table_name, row_id, operation)`. استدعاء `queueChange()` عدة مرات لنفس السجل = عناصر مكررة
- **النتيجة:** دفع مزدوج للبيانات — معالجة غير ضرورية على الخادم
- **الشدة:** متوسطة

---

## عمليات الاقتران (Pairing)

### [OP-PAIR-001] إلغاء الاقتران لا يحذف الاتصالات والمفتاح
- **الملف:** `lib/services/pairing.service.ts:274-303`
- **المشكلة:** `unpair()` يحذف `paired_device_id`, `gateway_url` فقط. لا يوجد:
  - `DELETE FROM connectors` — الاتصالات تبقى
  - `DELETE FROM sync_queue` — عناصر المزامنة تبقى
  - `DELETE FROM message_logs` — السجلات تبقى
  - `SecureStore.deleteItemAsync('api_key')` — المفتاح يبقى
  - `SecureStore.deleteItemAsync('auth_token')` — الرمز يبقى
- **النتيجة:** بعد إلغاء الاقتران، بيانات قديمة ورموز تبقى مخزّنة — خطأ أمني
- **الشدة:** عالية

### [OP-PAIR-002] savePairingData() بدون transaction
- **الملف:** `lib/services/pairing.service.ts:147-222`
- **المشكلة:** 4+ عمليات كتابة DB + مزامنة. إذا فشل أي خطء في المنتصف: gateway URL مُخزّن لكن device ID غير مُخزّن → `isPaired()` يُرجع `false` حتى أن gateway مُعدّ
- **النتيجة:** حالة مكسورة — الاقتران نصف مكتمل
- **الشدة:** عالية

### [OP-PAIR-003] رمز auth يُرسل لـ gateway غير موثوق
- **الملف:** `lib/services/pairing.service.ts:113-117`
- **المشكلة:** `exchangeCode()` يُرسل `Authorization: Bearer ${token}` لأي URL في رمز QR. حماية SSRF تحجب الشبكات الداخلية لكن لا تتحقق من هوية البوابة
- **النتيجة:** QR ضار يمكنه استلام رمز مصادقة المستخدم
- **الشدة:** عالية

### [OP-PAIR-004] رقم التسلسلي مُفبرَك
- **الملف:** `lib/services/pairing.service.ts:107`
- **المشكلة:** `serialNumber = \`qr_${Date.now()}\`` — رقم مبني على الوقت لا يمثل رقم الجهاز الحقيقي
- **النتيجة:** عند إعادة الاقتران، رقم جديد يُنشأ → الجهاز القديم يبقى مسجّلاً كجهاز orphan على البوابة
- **الشدة:** منخفضة

### [OP-PAIR-005] لا يوجد فحص لجهاز مُقترن مسبقاً
- **الملف:** `app/connectors/scan.tsx:84-86`
- **المشكلة:** `savePairingData()` يستخدم `INSERT OR REPLACE`. لا فحص إذا كان الجهاز مُقترناً بالفعل. `unpair()` لا يُستدعى قبل إعادة الاقتران
- **النتيجة:** أجهزة orphan على البوابة — سجلات مزدوجة
- **الشدة:** متوسطة

---

## عمليات قاعدة البيانات

### [OP-DB-001] نظام الترحيل فارغ — لا دعم لترقية المخطط
- **الملف:** `lib/db/init.ts:16`
- **المشكلة:** `const migrations: Migration[] = []` — المصفوفة فارغة. لا يوجد `ALTER TABLE ADD COLUMN`. المستخدمون الحاليون لن يحصلوا على أعمدة جديدة
- **النتيجة:** أي ترقية للمخطط = تعطيل التطبيق للمستخدمين الحاليين
- **الشدة:** عالية

### [OP-DB-002] لا يوجد فصل تكراري لجمع الأعمدة (SQL Injection)
- **الملف:** `lib/services/sync.service.ts:159-164`
- **المشكلة:** أسماء الأعمدة من `Object.keys(payload)` تُدمج مباشرة في SQL بدون تحقق. خادم مخترق يمكنه حقن SQL عبر أسماء الأعمدة
- **النتيجة:** ثغرة SQL Injection عبر أسماء الأعمدة من بيانات الخادم
- **الشدة:** عالية

### [OP-DB-003] قاعدة البيانات تنمو بلا حد (message_logs)
- **الملف:** `lib/connectors/manager.ts:216-219` + `lib/db/init.ts:91-100`
- **المشكلة:** لا يوجد حذف أو تنظيف لـ `message_logs`. على جهاز موبايل بمساحة محدودة، هذا تسرب تخزين
- **النتيجة:** نمو غير محدود لقاعدة البيانات
- **الشدة:** متوسطة

### [OP-DB-004] getDeviceId() يعاني من سباق concurrency
- **الملف:** `lib/utils/device-info.ts:19-35`
- **المشكلة:** مكالمتان متزامنتان تقرآن `null` من SecureStore → كلاهما يولّد معرّفاً مختلفاً → الثاني يكتب فوق الأول → المُستدعى الأول يُرجع معرّفاً غير موجود في SecureStore
- **النتيجة:** عدم اتساق في معرّف الجهاز
- **الشدة:** متوسطة

### [OP-DB-005] Supabase registeredDeviceId في الذاكرة فقط
- **الملف:** `lib/services/supabase-integration.service.ts:26`
- **المشكلة:** `registeredDeviceId: string | null = null` — يُفقد عند إعادة التشغيل. الجهاز يُسجل مرة أخرى → سجلات مزدوجة
- **النتيجة:** تسجيل مزدوج للأجهزة في Supabase
- **الشدة:** متوسطة

### [OP-DB-006] لا يوجد إعادة اتصال لـ Supabase Realtime
- **الملف:** `lib/services/supabase-integration.service.ts:111`
- **المشكلة:** `this.channel.subscribe()` بدون error handling أو reconnection logic. انقطاع الاتصال = توقف أوامر SMS بصمت
- **النتيجة:** فقدان صامت لاستقبال الأوامر
- **الشدة:** عالية

---

## عمليات الرسائل (Marsal)

### [OP-MSG-001] أوامر SMS تُ dropping بصمت أثناء المعالجة
- **الملف:** `hooks/useMarsalCommands.ts:30`
- **المشكلة:** `if (processingRef.current) return;` — إذا وصلت أوامر جديدة أثناء معالجة سابقة، تُهمل بدون تنبيه أو queue
- **النتيجة:** أوامر SMS تضيع نهائياً — المنصة لا تعرف أنها وصلت
- **الشدة:** حرجة

### [OP-MSG-002] إرسال SMS يُبلّغ "ناجح" عند فتح شاشة الكتابة فقط
- **الملف:** `lib/utils/send-sms.ts:46-47`
- **المشكلة:** `Linking.openURL(url)` يفتح شاشة كتابة SMS فقط. لا ينتظر إرسال المستخدم للرسالة. يُرجع `success: true` فوراً
- **النتيجة:** المنصة تعتقد أن SMS أُرسل فعلاً، لكن المستخدم قد يلغي أو يُعدّل الرسالة أو لا يضغط "إرسال"
- **الشدة:** حرجة

### [OP-MSG-003] لا يوجد فحص لطول رسالة SMS
- **الملف:** `lib/utils/send-sms.ts:9-36`
- **المشكلة:** SMS يحتوي 160 حرف (GSM-7) أو 70 حرف (Unicode). المحتوى العربي يستخدم Unicode = 70 حرف فقط. لا يوجد تحذير أو تقسيم
- **النتيجة:** رسائل SMS طويلة تُقسم بواسطة الحامل لكن بتكلفة إضافية — المستخدم لا يعرف
- **الشدة:** عالية

### [OP-MSG-004] iOS لا يفتح تطبيق SMS بدون `LSApplicationQueriesSchemes`
- **الملف:** `lib/utils/send-sms.ts:53`
- **المشكلة:** `canOpenURL` يُرجع `false` على iOS إذا لم يكن `sms` مُعرّف في `Info.plist` → كل محاولات SMS على iOS تفشل
- **النتيجة:** تعطيل كامل لإرسال SMS على iOS
- **الشدة:** عالية

### [OP-MSG-005] معالجة الأوامر لا تتحقق من شكل البيانات
- **الملف:** `hooks/useMarsalCommands.ts:29-33`
- **المشكلة:** `payload.payload as { commands?: SmsCommand[] }` — casting بدون تحقق. بيانات مشوهة (بدون `phone` أو `message`) تمر لـ `sendSms` مع قيم `undefined`
- **النتيجة:** SMS بعناصر "undefined" كنص حرفي
- **الشدة:** متوسطة

### [OP-MSG-006] المعالجة التسلسلية تكبل كل الدفعة
- **الملف:** `hooks/useMarsalCommands.ts:37-67`
- **المشكلة:** `for...of` مع `await` — رمز SMS بطيء يكبل باقي القائمة. لا توازي، لا timeout لكل أمر
- **النتيجة:** أوامر SMS بطيئة تعطل معالجة كل الأوامر المتبقية
- **الشدة:** متوسطة

### [OP-MSG-007] لا يوجد آلية إعادة معالجة الأوامر الفاشلة
- **الملف:** `hooks/useMarsalCommands.ts:29-71`
- **المشكلة:** لا يوجد queue للأوامر الفاشلة، لا إعادة محاولة، لا سجل بالأخطاء
- **النتيجة:** أوامر SMS فاشلة تضيع بدون أثر
- **الشدة:** عالية

### [OP-MSG-008] إعادة اشتراك Marsal عند كل تغيير trigger
- **الملف:** `hooks/useMarsalCommands.ts:121`
- **المشكلة:** `useEffect` يعتمد على `trigger`. كل `checkConnection` يزيد trigger → إنهاء و إعادة اشتراك → نافذة فقدان أوامر
- **النتيجة:** أوامر تصل أثناء إعادة الاتصال تضيع
- **الشدة:** متوسطة

### [OP-MSG-009] getAccessToken يُرجع رمز منتهي الصلاحية
- **الملف:** `lib/services/marsal.service.ts:79-85`
- **المشكلة:** يُرجع `this.session.access_token` بدون فحص الصلاحية. لا يوجد `refreshSession()` تلقائي
- **النتيجة:** استدعاءات API برمز منتهي → 401 → فشل صامت
- **الشدة:** عالية

### [OP-MSG-010] مفتاح SecureStore غير متسق بين الدوال
- **الملف:** `lib/services/marsal.service.ts:168` vs `:186`
- **المشكلة:** `getDeviceId()` يستخدم مفتاح `'device_id'` لكن `getStoredDeviceId()` يستخدم `'marsal_device_id'` — مفتاحان مختلفان
- **النتيجة:** `getStoredDeviceId()` يُرجع `null` حتى لو يوجد device ID مُخزّن بالمفتاح الآخر
- **الشدة:** عالية

---

## عمليات الإشعارات

### [OP-NOT-01] `initialized` يمنع إعادة التهيئة بعد منح الأذن
- **الملف:** `lib/services/notification.service.ts:21-23`
- **المشكلة:** إذا رفض المستخدم الأذن في البداية، `initialized` يصبح `true`. عند منح الأذن لاحقاً من الإعدادات، `init()` لا يفعل شيئاً
- **النتيجة:** الإشعارات معطّلة إلى إعادة تشغيل التطبيق
- **الشدة:** عالية

### [OP-NOT-02] لا يوجد معالجة نقر على الإشعار
- **الملف:** `lib/services/notification.service.ts:59-79`
- **المشكلة:** لا يوجد `addNotificationResponseReceivedListener`. المستخدم ينقر على إشعار webhook — لا شيء يحدث، لا تنقل، لا رابط عميق
- **النتيجة:** الإشعارات معلوماتية فقط — غير قابلة للتفاعل
- **الشدة:** متوسطة

### [OP-NOT-03] الإشعارات تعتمد على اتصال WebSocket غير مضمون
- **الملف:** `lib/services/notification.service.ts:59`
- **المشكلة:** `gatewayService.on(...)` يُستخدم لكن `gatewayService.connect()` لا يُستدعى من هذه الخدمة. إذا لم يكن الاتصال مُ inaugurado، الأحداث لا تصل
- **النتيجة:** إشعارات webhook لا تصل إذا لم يكن WebSocket متصلاً
- **الشدة:** عالية

---

## عمليات تسجيل الدخول للمنصة

### [OP-PLAT-01] بيانات الدخول تبقى في الحقول عند الفشل
- **الملف:** `app/platform/index.tsx:37-51`
- **المشكلة:** عند نجاح تسجيل الدخول، `setEmail('')` و `setPassword('')`. عند الفشل، البيانات تبقى في الحقول. عند التنقل والعودة، `showLogin` يُعاد لكن البيانات في الحالة تتبع
- **النتيجة:** حقول بها بيانات قديمة بعد التنقل
- **الشدة:** منخفضة

### [OP-PLAT-02] لا يوجد تقييد معدل على محاولات تسجيل الدخول
- **الملف:** `app/platform/index.tsx:29-51`
- **المشكلة:** لا يوجد debounce أو cooldown أو عدّاد محاولات. ضغط سريع متكرر يُمكن أن يتجاوز حدود Supabase
- **النتيجة:** حظر Supabase بسبب الطلبات المفرطة
- **الشدة:** متوسطة

---

## عمليات تحويل البيانات (Mapper)

### [OP-MAP-01] to_number يُعيد NaN بصمت
- **الملف:** `lib/connectors/mapper.ts:89`
- **المشكلة:** `Number("hello")` → `NaN`. `JSON.stringify({x: NaN})` → `{"x":null}`. الخطأ يُبتلع بصمت
- **النتيجة:** بيانات مُتحوّلة بشكل خاطئ — null بدلاً من خطأ واضح
- **الشدة:** عالية

### [OP-MAP-02] الحقول غير المُعرّفة في القالب تُنتج undefined
- **الملف:** `lib/connectors/mapper.ts:44`
- **المشكلة:** `getNestedValue(data, field)` يُرجع `undefined` للحقول غير الموجودة. `undefined` لا يظهر في JSON → الحقل ينقص عن الجسم
- **النتيجة:** API يتلقى طلباً بحقول مفقودة — فشل على الخادم
- **الشدة:** متوسطة

### [OP-MAP-03] extractFromPayload يتجاهل defaultValue
- **الملف:** `lib/connectors/mapper.ts:26-37`
- **المشكلة:** `extractFromPayload()` لا يتحقق من `rule.defaultValue` عندما يكون القيمة `undefined`. فقط `applyMapping()` يفعل ذلك
- **النتيجة:** القيمة الافتراضية لا تعمل في وضع الاستخراج
- **الشدة:** منخفضة

### [OP-MAP-04] applyMapping يحذف الحقول غير المُعرّفة
- **الملف:** `lib/connectors/mapper.ts:14-23`
- **المشكلة:** المحرك يبني كائناً جديداً بالحقول المُعرّفة فقط في القواعد. أي حقل في الأصل غير مُعرّف في القواعد يُحذف
- **النتيجة:** API يتلقى طلباً بحقول مفقودة — قد يفشل إذا كان يحتاج حقولاً إضافية
- **الشدة:** متوسطة

### [OP-MAP-05] concat يستخدم فاصل ثابت (مسافة)
- **الملف:** `lib/connectors/mapper.ts:58-61`
- **المشكلة:** `join(' ')` — لا يمكن تغيير الفاصل. حقول مفقودة تُحذف → فواصل مزدوجة (مثلاً `"John  Doe"`)
- **النتيجة:** نتائج اتصال غير متوقعة — فواصل مزدوجة أو ناقصة
- **الشدة:** منخفضة

---

## عمليات الاتصال الخارجي (REST Engine)

### [OP-REST-01] Content-Type يُثبّت application/json دائماً
- **الملف:** `lib/connectors/engines/rest.engine.ts:71-72`
- **المشكلة:** الهيدر الافتراضي `application/json` يُضبط قبل هيدرات المستخدم. إذا أرسل المستخدم form-data، المُسلسل يفعل `JSON.stringify` دائماً بغض النظر عن Content-Type
- **النتيجة:** إرسال JSON لـ API يتوقع form-data — فشل على الخادم
- **الشدة:** متوسطة

### [OP-REST-02] btoa مع String.fromCharCode يتعطل على مدخلات كبيرة
- **الملف:** `lib/connectors/engines/rest.engine.ts:109-110`
- **المشكلة:** `String.fromCharCode(...array)` يستخدم spread على مصفوفة كبيرة → تجاوز حد استدعاء الدالة
- **النتيجة:** خطأ runtime مع بيانات اعتماد كبيرة جداً
- **الشدة:** منخفضة

### [OP-REST-03] أخطاء الاتصال تكشف بيانات حساسة
- **الملف:** `lib/connectors/engines/rest.engine.ts:40`
- **المشكلة:** `error.message` يُرجع كما هو. إذا تضمن URL params أو body بها بيانات اعتماد، تتسرب للواجهة
- **النتيجة:** بيانات اعتماد مكشوفة في أخطاء الاتصال
- **الشدة:** منخفضة

---

## عمليات WebSocket للبوابة

### [OP-WS-01] الاتصال لا يُستدعى أبداً — كود ميّت
- **الملف:** `lib/services/gateway.service.ts`
- **المشكلة:** `gatewayService.connect()` لا يُستدعى من أي مكان في التطبيق. نظام WebSocket بالكامل غير نشط
- **النتيجة:** لا أوامر gateway تصل — المزامنة الفورية غير ممكنة
- **الشدة:** عالية

### [OP-WS-02] لا يوجد heartbeat / keepalive
- **الملف:** `lib/services/gateway.service.ts:33-73`
- **المشكلة:** لا ping/pong، لا keepalive. شبكات الموبايل بها انقطاعات صامتة (NAT timeout). الاتصال يصبح "نصف مفتوح" — العميل متصل لكن الخادم أغلق
- **النتيجة:** رسائل تُرسل على اتصال ميّت — فشل صامت
- **الشدة:** عالية

### [OP-WS-03] لا يوجد إعادة اتصال عند تغيير حالة التطبيق
- **الملف:** `lib/services/gateway.service.ts`
- **المشكلة:** لا `AppState.addEventListener`. عند الخلفية، نظام iOS/Android يقطع WebSocket. لا آلية لإعادة الاتصال عند العودة
- **النتيجة:** WebSocket يتقطع في الخلفية ولا يعود أبداً
- **الشدة:** عالية

### [OP-WS-04] لا يوجد تنظيف للمستمعين عند إعادة الاتصال
- **الملف:** `lib/services/gateway.service.ts:75-85`
- **المشكلة:** `disconnect()` يغلق WebSocket لكن لا يمسح خريطة `handlers`. عند إعادة الاتصال، المستمعات القديمة تبقى وتتراكم
- **النتيجة:** تسرب ذاكرة — مستمعات تتراكم مع كل إعادة اتصال
- **الشدة:** متوسطة

---

## عمليات Supabase المزدوجة

### [OP-SUPA-01] نظاما مصادقة مستقلان بدون تزامن
- **الملف:** ملفات متعددة
- **المشكلة:** هناك نظامان مستقلان:
  1. مصادقة البوابة (auth_token + api_key) عبر `apiClient.ts`
  2. مصادقة Supabase عبر `supabase/client.ts`
  تسجيل الخروج في أحدهما لا يؤثر على الآخر
- **النتيجة:** حالة مصادقة غير متسقة — المستخدم مسجّل في أحدهما فقط
- **الشدة:** متوسطة

### [OP-SUPA-02] اسم القناة قد يتلوث برموز خاصة
- **الملف:** `lib/services/supabase-integration.service.ts:101`
- **المشكلة:** `channel(\`sms-commands:${deviceId}\`)` — إذا تضمن `deviceId` رموز خاصة، اسم القناة قد يصبح غير صالح
- **النتيجة:** اشتراك غير صالح — أوامر SMS لا تصل
- **الشدة:** منخفضة

---

## عمليات استيراد/تصدير الاتصالات

### [OP-IMP-01] الاستيراد لا يحفظ بيانات الاعتماد
- **الملف:** `lib/connectors/manager.ts:291-314`
- **المشكلة:** `importConfig()` لا يُمرّر `apiKey`, `username`, `password`, `token` لـ `create()`. فقط نوع المصادقة والبيانات الوصفية تُحفظ
- **النتيجة:** الاتصال المستورد يعمل فقط بعد إعادة إدخال بيانات الاعتماد يدوياً
- **الشدة:** متوسطة

### [OP-IMP-02] التصدير يُزيل بيانات الاعتماد بدون تنبيه
- **الملف:** `lib/connectors/manager.ts:267-289`
- **المشكلة:** `exportConfig()` يحذف `apiKey`, `token`, `password` بصمت. المستخدم قد يتوقع تصدير كامل
- **النتيجة:** ملف تصدير بدون بيانات اعتماد — الاتصال لا يعمل عند الاستيراد
- **الشدة:** منخفضة

---

## ملخص العمليات المُفحَصة

| الفئة | حرجة | عالية | متوسطة | منخفضة | المجموع |
|---|---|---|---|---|---|
| المصادقة والتوثيق | 3 | 4 | 3 | 0 | **10** |
| الاتصالات (Connectors) | 1 | 5 | 5 | 2 | **13** |
| المزامنة | 2 | 3 | 2 | 0 | **7** |
| الاقتران (Pairing) | 0 | 3 | 1 | 1 | **5** |
| قاعدة البيانات | 0 | 2 | 3 | 0 | **5** |
| الرسائل (Marsal) | 2 | 4 | 3 | 0 | **9** |
| الإشعارات | 0 | 2 | 1 | 0 | **3** |
| منصة تسجيل الدخول | 0 | 0 | 1 | 1 | **2** |
| تحويل البيانات (Mapper) | 0 | 1 | 2 | 2 | **5** |
| REST Engine | 0 | 0 | 1 | 2 | **3** |
| WebSocket للبوابة | 0 | 3 | 1 | 0 | **4** |
| Supabase | 0 | 0 | 1 | 1 | **2** |
| الاستيراد/التصدير | 0 | 0 | 1 | 1 | **2** |
| **المجموع** | **8** | **27** | **24** | **10** | **69** |

---

## الإجمالي النهائي للمشروع

| الفئة | حرجة | عالية | متوسطة | منخفضة | المجموع |
|---|---|---|---|---|---|
| المشاكل הקודمة (كود + أمان + إعدادات) | 13 | 28 | 58 | 36 | **125** |
| مشاكل العمليات (فحص جديد) | 8 | 27 | 24 | 10 | **69** |
| **المجموع الكلي** | **21** | **55** | **82** | **46** | **204** |

### أكثر المشاكل خطورة في العمليات

| # | المشكلة | الشدة |
|---|---|---|
| 1 | أوامر SMS تُ dropping أثناء المعالجة | حرجة |
| 2 | إرسال SMS يُبلّغ "ناجح" عند فتح الشاشة فقط | حرجة |
| 3 | المزامنة (push/pull) لا تعمل بسبب خطأ نوع الإرجاع | حرجة |
| 4 | التسجيل يُلغي الرمز ويُعتمد على login ثانوي | حرجة |
| 5 | لا يوجد token refresh — انتهاء الجلسة = تعطيل | حرجة |
| 6 | لا يوجد مزامنة لأي تعديل على الاتصالات مع Gateway | عالية |
| 7 | WebSocket للبوابة لا يُستدعى أبداً (كود ميّت) | عالية |
| 8 | إلغاء الاقتران لا ينظّف البيانات | عالية |
| 9 | لا يوجد حل تعارضات في المزامنة | عالية |
| 10 | SMS على iOS معطّل بدون Info.plist | عالية |

---

*تم إعداد هذا التقرير بواسطة فحص عمليات شاملة لتطبيق الهاتف على مستوى كل دالة وعملية. يُنصح بمعالجة المشاكل الحرجة أولاً ثم العالية حسب الترتيب المُhỏن أعلاه.*
