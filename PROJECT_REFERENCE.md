# المرجعية الأساسية للمشروع - AlHudhud Mobile

> هذا الملف هو المرجع الأساسي لكل مطور يعمل على المشروع.
> أي قرار أو تغيير يجب أن يتوافق مع ما هو مذكور هنا.

## 🎯 الرؤية (Vision)

تطبيق جوال **عالمي** يعمل كمنصة تكامل موحدة، قادر على الاتصال بأي نظام خارجي (منصة رسائل، برنامج محاسبي، IoT، CRM، أي نظام آخر) **دون الحاجة إلى برمجة مخصصة**، مع سيطرة كاملة على الحسابات والاشتراكات.

## 🚀 المهمة (Mission)

بناء تطبيق جوال يمكن لأي مطور أو شركة ربطه بأنظمتها بسهولة عبر إعدادات بسيطة (Configuration)، مع توفير أدوات مراقبة وتحكم وتحقيق إيرادات عبر الاشتراكات.

## 📌 المبادئ التوجيهية (Guiding Principles)

1. **Zero-Code Integration** - ربط أي نظام بدون كتابة كود
2. **Universal Connectivity** - دعم جميع بروتوكولات الاتصال الممكنة
3. **Full Control** - سيطرة كاملة على كل حساب في أي وقت
4. **Subscription-First** - كل شيء مبني حول نظام الاشتراكات
5. **Platform Independence** - مستقل عن أي منصة حالية، مصمم ليكون منصة بذاته
6. **Developer Friendly** - JavaScript/TypeScript للمطورين الخارجيين

## 🏗️ المفهوم العام

```
┌─────────────────────────────────────────────┐
│              AlHudhud Mobile App              │
│         (Universal Integration Client)        │
│                                               │
│  ┌─────────────┐  ┌──────────────────────┐   │
│  │ Connectors  │  │ Phone Dashboard      │   │
│  │ (إعدادات    │  │ (أرصدة - اشتراكات    │   │
│  │  الاتصال)   │  │  رسائل - إحصائيات)   │   │
│  └──────┬──────┘  └──────────────────────┘   │
└─────────┼─────────────────────────────────────┘
          │ اتصال عبر بروتوكولات متعددة
          ▼
┌──────────────────────────────────────────────┐
│         AlHudhud Integration Gateway           │
│   (مصادقة - ترخيص - اشتراكات - تحكم - مراقبة) │
└──────┬───────────────┬───────────────┬────────┘
       │               │               │
       ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Platform A │ │  Platform B │ │  Platform C │
│ (رسائل)     │ │ (محاسبة)    │ │ (IoT)       │
│ API مطور    │ │ API مطور    │ │ API مطور    │
│ خارجي       │ │ خارجي       │ │ خارجي       │
└─────────────┘ └─────────────┘ └─────────────┘
```

## 🔌 التكامل (Integration)

### بروتوكولات الاتصال المدعومة
- REST API
- Webhook
- WebSocket
- GraphQL
- gRPC
- MQTT
- قواعد بيانات مباشرة
- وأي بروتوكول مستقبلي

### آلية التكامل
- المستخدم يضيف "Connector" جديد من التطبيق
- يحدد: نوع الاتصال، URL، المصادقة، البيانات
- التطبيق يتصل بالمنصة ويرسل/يستقبل البيانات
- لا حاجة لكتابة كود أو إعادة برمجة

## 👥 الجمهور المستهدف

- **المطورون**: JavaScript/TypeScript
- **الشركات**: تحتاج ربط تطبيق جوال بأنظمتها الداخلية
- **المستخدم النهائي**: يستخدم التطبيق المدار من قبل المنصة

## 💰 نموذج الإيرادات

- اشتراكات شهرية/سنوية
- خطط حسب: عدد الاتصالات، حجم البيانات، عدد المستخدمين
- تأسيس نظام الاشتراكات في Backend والتطبيق يعرضها

## 🔐 التحكم والأمان

- قدرة كاملة على إيقاف أي حساب فوراً
- فصل تام بين التطبيق والمنصة عند الحاجة
- جميع الاتصالات مشفرة ومصادق عليها
- سجل كامل لجميع العمليات
- كلمات المرور مشفرة بـ **bcrypt** (12 rounds)
- JWT_SECRET مطلوب من متغيرات البيئة

## 🗄️ قاعدة البيانات

### Mobile (expo-sqlite - `alhudhud_platform.db`)

| الجدول | الوصف |
|--------|-------|
| `connectors` | إعدادات الاتصال بالمنصات |
| `platforms` | أنواع المنصات المدعومة |
| `sync_queue` | طابور المزامنة (`table_name`, `row_id`, `data`, `status`) |
| `message_logs` | سجل الرسائل (`payload`, `status`, `direction`) |
| `subscription_info` | معلومات الاشتراك المحلية (key-value) |
| `local_settings` | الإعدادات المحلية including auth token (key-value) |

### Gateway (sql.js - `gateway.db`)

| الجدول | الوصف |
|--------|-------|
| `users` | حسابات المستخدمين |
| `connectors` | اتصالات المستخدمين (مع `sync_interval`, `last_synced_at`) |
| `webhook_events` | أحداث Webhook الواردة |
| `message_logs` | سجل الرسائل (مع `user_id`, `payload`) |
| `subscriptions` | اشتراكات المستخدمين |
| `sync_queue` | طابور المزامنة (مع `user_id`, `table_name`, `row_id`) |

## 🛣️ الطريق إلى الأمام

1. ✅ **تحديث الملفات المرجعية** (تم)
2. ✅ **تنظيف المشروع** (أرشفة الملفات القديمة، تحديث الهوية)
3. ✅ **بناء Connector System** (قلب التطبيق الجديد)
4. ✅ **بناء Integration Gateway** (الخلفية)
5. ✅ **بناء Phone Dashboard** (واجهة المراقبة)
6. ✅ **نظام الاشتراكات**
7. ✅ **لوحة تحكم الأدمن** (إدارة الحسابات والإحصائيات)
8. ✅ **قوالب المنصات الجاهزة** (Platform Presets)
9. ⏳ **التوثيق للمطورين الخارجيين**
10. ⏳ **الإطلاق**

## 📂 هيكل المشروع

```
alhudhud-connect/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout
│   ├── (tabs)/             # Tab navigator
│   │   ├── _layout.tsx
│   │   └── index.tsx       # لوحة التحكم الرئيسية
│   ├── auth/               # Authentication screens
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── connectors/         # Connector management
│   │   ├── index.tsx       # قائمة الاتصالات
│   │   ├── add.tsx         # إضافة اتصال (مع قوالب جاهزة)
│   │   ├── send.tsx        # إرسال بيانات
│   │   ├── logs.tsx        # سجل الرسائل
│   │   ├── mapping.tsx     # تعيين البيانات
│   │   ├── webhooks.tsx    # أحداث Webhook
│   │   └── [id]/
│   │       └── index.tsx   # تفاصيل الاتصال
│   ├── subscription/
│   │   └── index.tsx       # الاشتراكات
│   └── admin/
│       └── index.tsx       # لوحة الأدمن
├── components/             # UI components (عامة)
├── lib/                    # Core libraries
│   ├── connectors/         # Connector system
│   │   ├── types.ts
│   │   ├── manager.ts
│   │   ├── mapper.ts
│   │   ├── presets.ts      # Platform presets
│   │   └── engines/
│   │       ├── rest.engine.ts
│   │       └── websocket.engine.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── gateway.service.ts  # WebSocket client
│   │   ├── admin.service.ts    # Admin API
│   │   ├── sync.service.ts
│   │   └── notification.service.ts
│   ├── db/init.ts          # Platform database (expo-sqlite)
│   ├── apiClient.ts        # HTTP client
│   └── supabaseClient.ts   # Supabase client (placeholder)
├── hooks/
│   ├── useAuth.ts
│   ├── useGateway.ts       # Gateway connection status
│   └── use-color-scheme.ts
├── gateway/                # Backend server
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                # Environment variables
│   └── src/
│       ├── index.ts
│       ├── db.ts           # SQLite (sql.js)
│       ├── seed.ts         # Admin seed script
│       ├── routes/         # Express routes
│       │   ├── auth.routes.ts
│       │   ├── webhook.routes.ts
│       │   ├── admin.routes.ts
│       │   └── sync.routes.ts
│       └── services/
│           ├── auth.service.ts
│           ├── ws.service.ts          # WebSocket server
│           └── sync-scheduler.service.ts  # Scheduled sync
├── architecture/
│   └── 01-connector-system.md
├── discussion/
│   ├── 01-رؤية-التطبيق-العالمي.md
│   └── 02-تقرير-الفجوات-والعيوب.md
├── archive/                # Archived old files
├── PROJECT_REFERENCE.md    # هذا الملف
└── README.md               # README
```

## ⚠️ مهم لكل مطور

- قبل كتابة أي كود، ارجع إلى هذا الملف
- أي ميزة جديدة يجب أن تتوافق مع الرؤية أعلاه
- إذا كان هناك تعارض، ناقشه أولاً
- هذا الملف مرجعي وسيتم تحديثه مع تطور المشروع
