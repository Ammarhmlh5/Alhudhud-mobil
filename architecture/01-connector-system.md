# نظام الاتصالات (Connector System)

> العمارة النهائية لنظام Connectors في AlHudhud Connect

## المفهوم

Connector هو إعداد (Configuration) يحدد كيفية اتصال التطبيق بمنصة خارجية.
كل Connector يعرّف: بروتوكول الاتصال، عنوان URL، طريقة المصادقة، تعيين البيانات، مزامنة دورية.

## أنواع البروتوكولات المدعومة

| البروتوكول | الحالة | الاستخدام |
|-----------|--------|-----------|
| REST API | 🟢 جاهز | معظم APIs الحديثة |
| Webhook | 🟢 جاهز (عبر Gateway) | استقبال البيانات من المنصات |
| WebSocket | 🟢 جاهز | اتصال ثنائي في الوقت الفعلي |
| GraphQL | 🔴 مستقبلاً | منصات تستخدم GraphQL |
| MQTT | 🔴 مستقبلاً | IoT وأجهزة الاستشعار |

## أنواع المصادقة المدعومة

| النوع | الحالة |
|-------|--------|
| بدون مصادقة | 🟢 جاهز |
| API Key | 🟢 جاهز |
| Basic Auth | 🟢 جاهز |
| Bearer Token | 🟢 جاهز |
| OAuth2 (Client Credentials) | 🟢 جاهز |

## المكونات المنجزة ✅

### جوهر النظام (Core)
| المكون | الملف | الحالة |
|--------|-------|--------|
| **أنواع البيانات** | `lib/connectors/types.ts` | ✅ مكتمل |
| **محرك REST** | `lib/connectors/engines/rest.engine.ts` | ✅ مكتمل |
| **محرك WebSocket** | `lib/connectors/engines/websocket.engine.ts` | ✅ مكتمل |
| **محرك OAuth2** | `lib/connectors/engines/oauth2.engine.ts` | ✅ مكتمل |
| **مدير الاتصالات** | `lib/connectors/manager.ts` | ✅ مكتمل |
| **Data Mapper** | `lib/connectors/mapper.ts` | ✅ مكتمل |
| **قوالب المنصات** | `lib/connectors/presets.ts` | ✅ مكتمل (10 قوالب) |
| **قاعدة البيانات** | `lib/db/init.ts` | ✅ محدث مع sync_interval |

### شاشات التطبيق (Screens)
| الشاشة | الملف | الحالة |
|--------|-------|--------|
| **لوحة التحكم** | `app/(tabs)/index.tsx` | ✅ إحصائيات، حالة Gateway، مزامنة، أزمنة |
| **قائمة الاتصالات** | `app/connectors/index.tsx` | ✅ مع استيراد JSON |
| **إضافة اتصال** | `app/connectors/add.tsx` | ✅ قوالب جاهزة أولاً + إعداد يدوي |
| **تفاصيل الاتصال** | `app/connectors/[id]/index.tsx` | ✅ مزامنة دورية، رابط Webhook، تصدير |
| **إرسال بيانات** | `app/connectors/send.tsx` | ✅ مع تطبيق Data Mapping تلقائي |
| **تعيين البيانات** | `app/connectors/mapping.tsx` | ✅ واجهة بصرية لتعيين الحقول |
| **سجل الرسائل** | `app/connectors/logs.tsx` | ✅ فلترة، سحب للتحديث |
| **أحداث Webhook** | `app/connectors/webhooks.tsx` | ✅ عرض الأحداث الواردة |
| **الاشتراكات** | `app/subscription/index.tsx` | ✅ خطط freemium |
| **لوحة الأدمن** | `app/admin/index.tsx` | ✅ إحصائيات، حسابات، سجلات، Webhooks |
| **سوق المنصات** | `app/marketplace/index.tsx` | ✅ تصفح القوالب حسب الفئة |
| **التعريف (Onboarding)** | `app/onboarding/index.tsx` | ✅ 5 شرائح ترحيبية |

### خدمات (Services)
| الخدمة | الملف | الحالة |
|--------|-------|--------|
| **Gateway WebSocket** | `lib/services/gateway.service.ts` | ✅ auto-reconnect | 
| **الإشعارات** | `lib/services/notification.service.ts` | ✅ webhook + sync notifications |
| **مزامنة الموصلات** | `lib/services/connector-sync.service.ts` | ✅ Push/Pull مع Gateway |
| **الأدمن** | `lib/services/admin.service.ts` | ✅ API Gateway للأدمن |

### Hooks
| الـ Hook | الملف | الحالة |
|----------|-------|--------|
| **حالة Gateway** | `hooks/useGateway.ts` | ✅ اتصال + أحداث |
| **المصادقة** | `hooks/useAuth.ts` | ✅ Auth + Role |

### Gateway (Backend)
| المكون | الملف | الحالة |
|--------|-------|--------|
| **الخادم** | `gateway/src/index.ts` | ✅ Express + CORS |
| **قاعدة البيانات** | `gateway/src/db.ts` | ✅ sql.js مع helpers |
| **المصادقة** | `gateway/src/services/auth.service.ts` | ✅ JWT |
| **WebSocket** | `gateway/src/services/ws.service.ts` | ✅ بث للمستخدمين |
| **مجدول المزامنة** | `gateway/src/services/sync-scheduler.service.ts` | ✅ كل 60 ثانية |
| **المسارات** | `gateway/src/routes/` | ✅ Auth, Webhook, Admin, Sync, Connectors |

## ملخص النظام

```
التطبيق (Expo + SQLite)
  ├── Connectors (مخزنة محلياً)
  ├── Data Mapping (تحويل الحقول)
  ├── Scheduled Sync (مؤقت 60 ثانية)
  └── Gateway Sync (Push/Pull مع الخادم)
        │
        ▼
Gateway (Express + sql.js + WebSocket)
  ├── REST API (مصادقة، إدارة، مزامنة)
  ├── استقبال Webhook من المنصات
  ├── WebSocket (بث فوري للتطبيق)
  └── مجدول (فحص الموصلات المستحقة)
        │
        ▼
منصات خارجية (WhatsApp, Telegram, Slack, ...)
```
