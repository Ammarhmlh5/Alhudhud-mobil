# AlHudhud Connect - Universal Integration Platform

منصة تكامل عالمية (Zero-Code) - تطبيق جوال يتصل بأي نظام خارجي بدون برمجة.

🔗 **الملف المرجعي:** [PROJECT_REFERENCE.md](PROJECT_REFERENCE.md)

## البدء السريع

### Mobile App
```bash
npm install
npx expo start
```

### Gateway (Backend)
```bash
cd gateway
npm install
cp .env.example .env   # عدّل JWT_SECRET
npm run seed            # إنشاء حساب الأدمن
npm run dev             # تشغيل البوابة
```

## هيكل المشروع

```
alhudhud-connect/
├── app/                         # Expo Router screens
│   ├── (tabs)/                  # Tab navigator (Dashboard)
│   ├── auth/                    # تسجيل الدخول والتسجيل
│   ├── connectors/              # إدارة الاتصالات
│   │   ├── add.tsx              # إضافة اتصال
│   │   ├── send.tsx             # إرسال بيانات
│   │   ├── logs.tsx             # سجل الرسائل
│   │   ├── mapping.tsx          # تعيين البيانات
│   │   ├── webhooks.tsx         # أحداث Webhook
│   │   └── [id]/                # تفاصيل الاتصال
│   ├── subscription/            # الاشتراكات
│   ├── admin/                   # لوحة الأدمن
│   ├── marketplace/             # سوق المنصات
│   └── onboarding/              # شاشة الترحيب
├── components/                  # مكونات واجهة المستخدم
├── lib/
│   ├── connectors/              # نظام الاتصالات
│   │   ├── types.ts             # تعريفات البيانات
│   │   ├── manager.ts           # مدير الاتصالات (CRUD)
│   │   ├── mapper.ts            # تعيين البيانات
│   │   ├── presets.ts           # قوالب المنصات
│   │   └── engines/             # محركات البروتوكولات
│   ├── services/                # الخدمات
│   │   ├── auth.service.ts      # المصادقة
│   │   ├── gateway.service.ts   # اتصال Gateway (WebSocket)
│   │   ├── admin.service.ts     # API الأدمن
│   │   ├── sync.service.ts      # المزامنة
│   │   └── notification.service.ts
│   ├── db/init.ts               # قاعدة البيانات المحلية (SQLite)
│   ├── apiClient.ts             # عميل HTTP
│   └── supabaseClient.ts        # Supabase (placeholder)
├── hooks/                       # React Hooks
├── gateway/                     # Backend Server
│   └── src/
│       ├── db.ts                # قاعدة البيانات (sql.js)
│       ├── seed.ts              # إنشاء بيانات أولية
│       ├── routes/              # Express routes
│       └── services/            # خدمات Gateway
├── architecture/                # وثائق العمارة الفنية
├── discussion/                  # مناقشات التطوير
└── archive/                     # ملفات مؤرشفة
```

## التكنولوجيا

### Mobile
- Expo SDK 54 + React 19 + TypeScript
- SQLite (expo-sqlite) للتخزين المحلي
- Expo Router للتنقل

### Gateway
- Node.js + Express + TypeScript
- SQLite (sql.js) للتخزين
- WebSocket للاتصال الفوري
- JWT للمصادقة + bcrypt لكلمات المرور

## قاعدة البيانات

### Mobile (`alhudhud_platform.db`)
- `connectors` - إعدادات الاتصال بالمنصات
- `sync_queue` - طابور المزامنة
- `message_logs` - سجل الرسائل
- `subscription_info` / `local_settings` - معلومات مخزنة محلياً

### Gateway (`gateway.db`)
- `users` - حسابات المستخدمين
- `connectors` - اتصالات المستخدمين
- `webhook_events` - أحداث Webhook
- `message_logs` - سجل الرسائل
- `subscriptions` - اشتراكات المستخدمين
- `sync_queue` - طابور المزامنة

## للمطورين

قبل كتابة أي كود، اقرأ [PROJECT_REFERENCE.md](PROJECT_REFERENCE.md) و [architecture/](architecture/) أولاً.
