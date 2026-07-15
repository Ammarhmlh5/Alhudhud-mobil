# خطة إصلاح المشاكل - AlHudhud Connect v4.0.0

> تاريخ الإعداد: 2026-07-15
> المدة المقدرة: 8-12 أسبوع
> المرجع: [ISSUES_REPORT.md](./ISSUES_REPORT.md)

---

## الفهرس

1. [المبادئ التوجيهية](#المبادئ-التوجيهية)
2. [المراحل](#المراحل)
3. [الأسبوع 1-2: الأمان الأساسي (P0)](#الأسبوع-12-الأمان-الأساسي-p0)
4. [الأسبوع 3-4: إصلاحات الخادم الحرجة (P0)](#الأسبوع-34-إصلاحات-الخادم-الحرجة-p0)
5. [الأسبوع 5-6: تحسين واجهة المستخدم والأمان (P1)](#الأسبوع-56-تحسين-واجهة-المستخدم-والأمان-p1)
6. [الأسبوع 7-8: تحسين الأداء (P1)](#الأسبوع-78-تحسين-الأداء-p1)
7. [الأسبوع 9-10: صيانة الكود والـ Accessibility (P2)](#الأسبوع-910-صيانة-الكود-والـ-accessibility-p2)
8. [الأسبوع 11-12: التحسينات المتبقية والاختبار (P2)](#الأسبوع-1112-التحسينات-المتبقية-والاختبار-p2)
9. [التحقق النهائي](#التحقق-النهائي)
10. [أولويات الإصلاح](#أولويات-الإصلاح)

---

## المبادئ التوجيهية

1. **الأمان أولاً** — جميع إصلاحات الأمان لها أعلى أولوية
2. **عدم كسر الوظائف** — كل إصلاح يُختبر بشكل منفصل
3. **التراجع السريع** — commits صغيرة وواضحة يمكن التراجع عنها
4. **التوثيق** — كل تغيير يُوثّق في CHANGELOG
5. **المراجعة** — لا يُدمج أي تغيير بدون مراجعة

---

## المراحل

```
الأسبوع 1-2  ███░░░░░░░░░  الأمان الأساسي (P0) — 20 مشكلة
الأسبوع 3-4  █████░░░░░░░  إصلاحات الخادم الحرجة (P0) — 15 مشكلة
الأسبوع 5-6  ████████░░░░  تحسين واجهة المستخدم والأمان (P1) — 25 مشكلة
الأسبوع 7-8  ██████████░░  تحسين الأداء (P1) — 20 مشكلة
الأسبوع 9-10 ████████████  صيانة الكود والـ Accessibility (P2) — 30 مشكلة
الأسبوع 11-12 ████████████  التحسينات المتبقية والاختبار (P2) —remaining
```

---

## الأسبوع 1-2: الأمان الأساسي (P0)

> الهدف: إزالة الثغرات الأمنية الخطيرة
> المشاكل المستهدفة: C-01 إلى C-15, H-01 إلى H-14

### 1.1 تقييد CORS [C-01]

**الملف:** `gateway/src/index.ts`

```typescript
// قبل
app.use(cors());

// بعد
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

**متطلبات:**
- إضافة `CORS_ORIGINS` إلى `.env`
- تحديث `.env.example`

---

### 1.2 إضافة Rate Limiting [C-07, C-14, C-15]

**الملف:** `gateway/src/index.ts`

```typescript
import rateLimit from 'express-rate-limit';

// Rate limiting عام
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

// Rate limiting للمصادقة (أكثر صرامة)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 محاولات فقط
  message: { error: 'Too many authentication attempts' },
});

// Rate limiting للـ Webhook
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // دقيقة
  max: 30,
  message: { error: 'Webhook rate limit exceeded' },
});

app.use(globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/webhook', webhookLimiter);
```

**متطلبات:**
- `npm install express-rate-limit @types/express-rate-limit`

---

### 1.3 حماية Webhook [C-02, C-03]

**الملف:** `gateway/src/routes/webhook.routes.ts`

```typescript
// إضافة HMAC verification
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// middleware للتحقق
function requireWebhookAuth(req, res, next) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const signature = req.headers['x-webhook-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  const rawBody = req.rawBody;
  if (!verifyWebhookAuth(rawBody, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

// حماية endpoint الأحداث
router.get('/events/:userId', requireAuth, async (req, res) => {
  // التحقق من أن المستخدم يطلب أحداثه فقط
  if (req.user.id !== req.params.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // ... باقي الكود
});
```

---

### 1.4 تقليل صلاحية JWT [C-04]

**الملف:** `gateway/src/services/auth.service.ts`

```typescript
// قبل
const JWT_EXPIRES = '30d';

// بعد
const JWT_EXPIRES = '1h';
const REFRESH_EXPIRES = '7d';

// إضافة دالة refresh token
export function generateRefreshToken(userId: string): string {
  return jwt.sign({ id: userId }, JWT_SECRET!, {
    expiresIn: REFRESH_EXPIRES,
  });
}

// تحديث register() و login() لإرجاع refresh token
// إضافة route جديد: POST /auth/refresh
```

---

### 1.5 نقل كلمة مرور Admin من الكود [C-05]

**الملف:** `gateway/src/seed.ts`

```typescript
// قبل
const adminPassword = 'AlHudhud@Admin#2024';

// بعد
const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
if (!adminPassword) {
  console.error('ADMIN_DEFAULT_PASSWORD not set in environment');
  process.exit(1);
}
// لا تطبع كلمة المرور أبداً
```

---

### 1.6 إزالة طباعة المفاتيح [C-06]

**الملف:** `gateway/src/services/email.service.ts`

```typescript
// قبل
console.log('SMTP API Key:', apiKey);

// بعد
console.log('SMTP configured:', !!apiKey);
// أو
if (process.env.NODE_ENV === 'development') {
  console.log('SMTP API Key:', apiKey?.substring(0, 8) + '...');
}
```

---

### 1.7 فرض HTTPS [C-08]

**الملف:** `lib/apiClient.ts`

```typescript
// قبل
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

// بعد
const API_BASE = process.env.EXPO_PUBLIC_API_URL;
if (!API_BASE) {
  throw new Error('EXPO_PUBLIC_API_URL is not configured');
}
if (API_BASE.startsWith('http://') && !__DEV__) {
  console.warn('WARNING: Using HTTP in production is insecure');
}
```

**الملف:** `gateway/src/index.ts`

```typescript
// إضافة redirect إلى HTTPS في الإنتاج
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}
```

---

### 1.8 نقل التوكن إلى SecureStore [C-09]

**الملف:** `lib/apiClient.ts`

```typescript
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const API_KEY_KEY = 'api_key';

export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// نفس الشيئ لـ API_KEY
```

**الملف:** `lib/db/init.ts`
- حذف جدول `local_settings` أو ترحيل البيانات إلى SecureStore

---

### 1.9 إضافة timeout و AbortController [H-15]

**الملف:** `lib/apiClient.ts`

```typescript
const DEFAULT_TIMEOUT = 30000; // 30 ثانية

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

### 1.10 إضافة Retry Logic [H-16]

**الملف:** `lib/apiClient.ts`

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = 3,
  backoff: number = 1000
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (error) {
      if (i === retries - 1) throw error;
      if (error.name === 'AbortError') {
        throw error; // Timeout — لا إعادة محاولة
      }
      await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

### 1.11 حماية SQL من حقن الأسماء [C-11, H-10]

**الملف:** `lib/services/sync.service.ts`

```typescript
const ALLOWED_TABLES = ['tasks', 'contacts', 'messages', 'notes'];
const ALLOWED_COLUMNS: Record<string, string[]> = {
  tasks: ['id', 'title', 'description', 'status', 'created_at'],
  contacts: ['id', 'name', 'email', 'phone'],
  // ...
};

function validateTableName(table: string): string {
  if (!ALLOWED_TABLES.includes(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
  return table;
}

function validateColumns(table: string, columns: string[]): string[] {
  const allowed = ALLOWED_COLUMNS[table] || [];
  return columns.filter(col => allowed.includes(col));
}
```

---

### 1.12 تفعيل التحقق من SSL [C-12]

**الملف:** `gateway/src/setup-supabase.ts`

```typescript
// قبل
ssl: { rejectUnauthorized: false }

// بعد
ssl: process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: true }
  : { rejectUnauthorized: false }
```

---

### 1.13 حماية JSON.parse في العرض [C-13]

**الملف:** `app/connectors/webhooks.tsx`

```typescript
// قبل
{JSON.stringify(JSON.parse(event.body), null, 2)}

// بعد
{(() => {
  try {
    const parsed = JSON.parse(event.body);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return event.body || 'Invalid JSON';
  }
})()}
```

---

### 1.14 تقييد JSON limit [H-02]

**الملف:** `gateway/src/index.ts`

```typescript
// قبل
app.use(express.json({ limit: '10mb' }));

// بعد
app.use(express.json({ limit: '1mb' }));
```

---

### 1.15 حماية SSRF [H-04]

**الملف:** `lib/services/pairing.service.ts`

```typescript
function isPrivateIP(hostname: string): boolean {
  // فحص IPs خاصة
  const privateRanges = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^::1$/,
    /^localhost$/i,
  ];
  return privateRanges.some(range => range.test(hostname));
}

function validateGatewayUrl(urlStr: string): URL {
  const url = new URL(urlStr);
  if (isPrivateIP(url.hostname)) {
    throw new Error('Private/internal URLs are not allowed');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP/HTTPS protocols are allowed');
  }
  return url;
}
```

---

### 1.16 حماية التوكن في WebSocket [H-06]

**الملف:** `gateway/src/services/ws.service.ts`

```typescript
// بدلاً من تمرير التوكن في query string
// استخدام authentication عبر message الأولى
wss.on('connection', (ws, req) => {
  let authenticated = false;
  const timeout = setTimeout(() => {
    if (!authenticated) {
      ws.close(4001, 'Authentication timeout');
    }
  }, 10000);

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'auth') {
      try {
        const user = jwt.verify(msg.token, JWT_SECRET);
        authenticated = true;
        clearTimeout(timeout);
        ws.userId = user.id;
        ws.send(JSON.stringify({ type: 'authenticated' }));
      } catch {
        ws.close(4002, 'Invalid token');
      }
    }
  });
});
```

---

## الأسبوع 3-4: إصلاحات الخادم الحرجة (P0)

> الهدف: تحسين أمان وأداء الخادم
> المشاكل المستهدفة: H-42 إلى H-51, M-01 إلى M-19

### 2.1 إضافة قفل لقاعدة البيانات

**الملف:** `gateway/src/db.ts`

```typescript
// استخدام mutex بسيط
class DatabaseLock {
  private locked = false;
  private queue: (() => void)[] = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }
}

const dbLock = new DatabaseLock();

// استخدام في كل عملية كتابة
export async function executeWithLock(sql: string, params?: any[]) {
  await dbLock.acquire();
  try {
    const result = execute(sql, params);
    saveDb(); // حفظ بعد كل عملية
    return result;
  } finally {
    dbLock.release();
  }
}
```

### 2.2 تحسين حفظ قاعدة البيانات

```typescript
// بدلاً من الحفظ في كل كتابة — حفظ مُجدول
let saveTimeout: NodeJS.Timeout | null = null;

function scheduleSave() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveDb();
    saveTimeout = null;
  }, 100); // حفظ بعد 100ms من آخر كتابة
}

// استخدام transactions
export function executeBatch(queries: Array<{ sql: string; params?: any[] }>) {
  execute('BEGIN TRANSACTION');
  try {
    for (const query of queries) {
      execute(query.sql, query.params);
    }
    execute('COMMIT');
    scheduleSave();
  } catch (error) {
    execute('ROLLBACK');
    throw error;
  }
}
```

### 2.3 فحص صحة الإدخال في الخادم

**الملف:** `gateway/src/routes/auth.routes.ts`

```typescript
import { z } from 'zod';

const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// استخدام في الـ routes
router.post('/register', async (req, res) => {
  const result = RegisterSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten() });
  }
  // ... باقي الكود
});
```

**متطلبات:**
- `npm install zod`

### 2.4 تقييد limit في admin routes

**الملف:** `gateway/src/routes/admin.routes.ts`

```typescript
function validateLimit(limit: any): number {
  const parsed = parseInt(limit) || 50;
  return Math.min(Math.max(parsed, 1), 100); // بين 1 و 100
}

router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  const limit = validateLimit(req.query.limit);
  // استخدام limit المُتحقق منه
});
```

### 2.5 إصلاح sync_interval = 0

**الملف:** `gateway/src/routes/connector.routes.ts`

```typescript
// قبل
c.sync_interval || null

// بعد
c.sync_interval !== undefined ? c.sync_interval : null
```

### 2.6 إضافة معالجة أخطاء للـ routes

**الملف:** `gateway/src/routes/connector.routes.ts`

```typescript
// middleware لمعالجة الأخطاء
function asyncHandler(fn: Function) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  // ... الكود
}));

// معالج أخطاء عام في index.ts
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

### 2.7 استخراج requireAuth middleware

**الملف:** `gateway/src/middleware/auth.ts` (جديد)

```typescript
import jwt from 'jsonwebtoken';
import { getDB } from '../db';

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
```

### 2.8 إصلاح parseHeaders

**الملف:** `lib/connectors/manager.ts`

```typescript
// قبل
const [key, value] = line.split(':');

// بعد
const colonIndex = line.indexOf(':');
if (colonIndex === -1) continue;
const key = line.substring(0, colonIndex).trim();
const value = line.substring(colonIndex + 1).trim();
```

### 2.9 إصلاح toSqlite

**الملف:** `gateway/src/db.ts`

```typescript
// بدلاً من regex عامة — استخدام parameterized queries فقط
// وإزالة toSqlite() بالكامل
// استخدام: WHERE is_active = ? مع القيمة 1
```

### 2.10 تحسين saveDb مع transaction

```typescript
export function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (error) {
    console.error('Failed to save database:', error);
    // محاولة إنشاء نسخة احتياطية
    try {
      const backupPath = `${DB_PATH}.backup.${Date.now()}`;
      fs.copyFileSync(DB_PATH, backupPath);
    } catch {}
  }
}
```

---

## الأسبوع 5-6: تحسين واجهة المستخدم والأمان (P1)

> الهدف: تحسين أمان العميل وتجربة المستخدم
> المشاكل المستهدفة: H-29 إلى H-41, M-20 إلى M-81

### 3.1 إصلاح ApiKeyModal

**الملف:** `app/(tabs)/settings.tsx`

```typescript
const [currentApiKey, setCurrentApiKey] = useState<string | null>(null);

useEffect(() => {
  loadApiKey();
}, []);

async function loadApiKey() {
  try {
    const key = await getStoredApiKey();
    setCurrentApiKey(key);
  } catch (error) {
    console.error('Failed to load API key:', error);
  }
}
```

### 3.2 إضافة secureTextEntry

**الملف:** `app/connectors/add.tsx`

```typescript
// لجميع حقول المفاتيح والtokens
<TextInput
  secureTextEntry={!showKey}
  // ... باقي الخصائص
/>
```

### 3.3 تحسين كلمة المرور

**الملف:** `app/auth/register.tsx`

```typescript
function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 8) errors.push('8 أحرف على الأقل');
  if (!/[A-Z]/.test(password)) errors.push('حرف كبير واحد على الأقل');
  if (!/[0-9]/.test(password)) errors.push('رقم واحد على الأقل');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('رمز خاص واحد على الأقل');
  return errors;
}
```

### 3.4 تفعيل زر نسيت كلمة المرور

**الملف:** `app/auth/login.tsx`

```typescript
<TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
  <Text>نسيت كلمة المرور؟</Text>
</TouchableOpacity>
```

**ملف جديد:** `app/auth/forgot-password.tsx`

### 3.5 إصلاح中文混合

**الملف:** `app/subscription/index.tsx`

```typescript
// قبل
description: 'دعم فني优先'

// بعد
description: 'دعم فني ذو أولوية'
```

### 3.6 استبدال ScrollView بـ FlatList

**الملف:** `app/connectors/logs.tsx`

```typescript
// قبل
<ScrollView>
  {logs.map((log, i) => (
    <LogCard key={log.id || i} log={log} />
  ))}
</ScrollView>

// بعد
<FlatList
  data={logs}
  keyExtractor={(item) => item.id || String(Math.random())}
  renderItem={({ item }) => <LogCard log={item} />}
  initialNumToRender={20}
  maxToRenderPerBatch={10}
  windowSize={5}
/>
```

### 3.7 استخراج المكونات من render

**الملف:** `app/(tabs)/settings.tsx`

```typescript
// قبل (داخل المكون)
function SettingsScreen() {
  function Section({ title, children }) { /* ... */ }
  function SettingRow({ label, value, onPress }) { /* ... */ }
  // ...
}

// بعد (خارج المكون)
function Section({ title, children }: SectionProps) { /* ... */ }
function SettingRow({ label, value, onPress }: SettingRowProps) { /* ... */ }

function SettingsScreen() {
  // ...
}
```

### 3.8 إضافة try-catch لجميع العمليات

**الملف:** `app/connectors/[id]/index.tsx`

```typescript
async function load() {
  try {
    const c = await connectorManager.getById(id as string);
    if (c) {
      setConnector(c);
      const logs = await connectorManager.getMessageLogs(c.id, 10);
      setLogs(logs);
    }
  } catch (error) {
    console.error('Failed to load connector:', error);
    Alert.alert('خطأ', 'فشل تحميل البيانات');
    router.back();
  } finally {
    setLoading(false);
  }
}
```

### 3.9 تحسين onError في Gateway

**الملف:** `lib/services/gateway.service.ts`

```typescript
// قبل
onerror: () => {
  isConnected = false;
};

// بعد
onerror: (event) => {
  console.error('WebSocket error:', event);
  isConnected = false;
  // onclose سيتولى إعادة الاتصال
};
```

### 3.10 حماية IDOR في Webhooks

**الملف:** `app/connectors/webhooks.tsx`

```typescript
// قبل
const response = await api.get(`/webhook/events/${user.id}`);

// بعد
const response = await api.get('/webhook/events/me');
// أو استخدام endpoint لا يحتاج userId
```

### 3.11 تحسين PanResponder

**الملف:** `components/SwipeableRow.tsx`

```typescript
// استخدام ref للـ onDelete
const onDeleteRef = useRef(onDelete);
onDeleteRef.current = onDelete;

const panResponder = useRef(
  PanResponder.create({
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx < -100) {
        onDeleteRef.current();
      }
    },
  })
).current;
```

### 3.12 تنظيف setTimeout

**الملف:** `components/ApiKeyModal.tsx`

```typescript
useEffect(() => {
  if (copied) {
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }
}, [copied]);
```

### 3.13 إضافة fallback لـ IconSymbol

**الملف:** `components/ui/IconSymbol.tsx`

```typescript
const iconName = MAPPING[name] || 'help-outline';
```

---

## الأسبوع 7-8: تحسين الأداء (P1)

> الهدف: تحسين أداء التطبيق بشكل ملحوظ
> المشاكل المستهدفة: M-43 إلى M-56, H-23 إلى H-28

### 4.1 تحسين API Client

**الملف:** `lib/apiClient.ts` — إعادة هيكلة كاملة

```typescript
class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.timeout = 30000;
    this.maxRetries = 3;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = await getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.timeout
        );

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          await this.handleErrorResponse(response);
        }

        return await response.json();
      } catch (error) {
        if (attempt === this.maxRetries) throw error;
        if (error.name === 'AbortError') throw error;
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    throw new Error('Max retries exceeded');
  }

  private async handleErrorResponse(response: Response) {
    if (response.status === 401) {
      await removeToken();
      // إعادة توجيه لصفحة تسجيل الدخول
    }
    if (response.status === 403) {
      throw new Error('Access denied');
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(process.env.EXPO_PUBLIC_API_URL!);
```

### 4.2 تحسين WebSocket Engine

**الملف:** `lib/connectors/engines/websocket.engine.ts`

```typescript
class WebSocketEngine {
  private maxReconnectAttempts = 10;
  private baseDelay = 1000;
  private maxDelay = 30000;

  async connect(config: ConnectorConfig): Promise<void> {
    let attempts = 0;

    const attemptConnect = async () => {
      try {
        const ws = new WebSocket(config.endpointUrl);
        this.connections.set(config.id, { ws, attempts: 0 });

        ws.onopen = () => {
          attempts = 0;
          this.onStatus(config.id, 'CONNECTED');
        };

        ws.onclose = () => {
          if (attempts < this.maxReconnectAttempts) {
            const delay = Math.min(
              this.baseDelay * Math.pow(2, attempts),
              this.maxDelay
            );
            attempts++;
            setTimeout(attemptConnect, delay);
          } else {
            this.onStatus(config.id, 'DISCONNECTED');
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      } catch (error) {
        console.error('WebSocket connection failed:', error);
      }
    };

    await attemptConnect();
  }
}
```

### 4.3 تحسين Gateway Service

**الملف:** `lib/services/gateway.service.ts`

```typescript
class GatewayService {
  private maxReconnectAttempts = 20;
  private baseDelay = 1000;
  private maxDelay = 60000;
  private reconnectAttempts = 0;

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.onStatus('DISCONNECTED');
      return;
    }

    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxDelay
    );
    this.reconnectAttempts++;

    setTimeout(() => this.connect(), delay);
  }

  // تنظيف المستمعين
  disconnect() {
    this.handlers.clear();
    if (this.ws) {
      this.ws.close();
    }
  }
}
```

### 4.4 تحسين queries في manager.ts

**الملف:** `lib/connectors/manager.ts`

```typescript
// قبل — تحميل الكل ثم filter
async getDueSyncs(): Promise<ConnectorConfig[]> {
  const all = await this.getAll();
  return all.filter(c => /* ... */);
}

// بعد — filter في SQL
async getDueSyncs(): Promise<ConnectorConfig[]> {
  const db = getDB();
  return db.getAllSync(
    `SELECT * FROM connectors
     WHERE is_active = 1
     AND last_synced_at IS NULL
     OR last_synced_at < datetime('now', '-' || sync_interval || ' minutes')
     ORDER BY last_synced_at ASC`
  );
}

// قبل — عد الكل في JS
async getStatusCounts() {
  const all = await this.getAll();
  return {
    active: all.filter(c => c.is_active).length,
    inactive: all.filter(c => !c.is_active).length,
  };
}

// بعد — count في SQL
async getStatusCounts() {
  const db = getDB();
  return db.getFirstSync(
    `SELECT
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive
     FROM connectors`
  );
}
```

### 4.5 تحسين useMemo في الشاشات

**الملف:** `app/(tabs)/index.tsx`

```typescript
// قبل
const filtered = connectors.filter(c =>
  c.name.toLowerCase().includes(search.toLowerCase())
);

// بعد
const filtered = useMemo(() =>
  connectors.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  ),
  [connectors, search]
);
```

### 4.6 تحسين useCallback

**الملف:** `app/(tabs)/index.tsx`

```typescript
// قبل
async function handleToggle(id: string) {
  await connectorManager.toggleActive(id);
  loadConnectors();
}

// بعد
const handleToggle = useCallback(async (id: string) => {
  await connectorManager.toggleActive(id);
  loadConnectors();
}, [loadConnectors]);
```

### 4.7 تحسين ListHeaderComponent

**الملف:** `app/(tabs)/index.tsx`

```typescript
// قبل
<FlatList
  ListHeaderComponent={() => <Header />}
/>

// بعد
const ListHeader = useCallback(() => <Header />, []);

<FlatList
  ListHeaderComponent={ListHeader}
/>
```

### 4.8 تحسين Auth Context

**الملف:** `hooks/useAuth.tsx`

```typescript
const authValue = useMemo(() => ({
  user,
  apiKey,
  loading,
  login,
  googleLogin,
  register,
  logout,
  requestApiKey,
}), [user, apiKey, loading]);

return (
  <AuthContext.Provider value={authValue}>
    {children}
  </AuthContext.Provider>
);
```

### 4.9 تحسين Notification Service

**الملف:** `lib/services/notification.service.ts`

```typescript
class NotificationService {
  private cleanupFns: Array<() => void> = [];

  init() {
    // تسجيل المستمعين مع حفظ دوال التنظيف
    const unsub1 = gatewayService.on('notification', this.handleNotification);
    this.cleanupFns.push(unsub1);
  }

  destroy() {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
  }
}
```

---

## الأسبوع 9-10: صيانة الكود والـ Accessibility (P2)

> الهدف: تحسين جودة الكود والوصولية
> المشاكل المستهدفة: L-01 إلى L-46, CC-01 إلى CC-07

### 5.1 إضافة Accessibility Labels

**ملف إرشادي:** `docs/accessibility.md`

```typescript
// قالب لجميع الأزرار
<TouchableOpacity
  accessibilityLabel="حذف الموصل"
  accessibilityHint="اضغط لحذف هذا الموصل نهائياً"
  accessibilityRole="button"
  onPress={handleDelete}
>
  <Text>حذف</Text>
</TouchableOpacity>

// قالب لجميع حقول الإدخال
<TextInput
  accessibilityLabel="بريد إلكتروني"
  accessibilityHint="أدخل بريدك الإلكتروني لتسجيل الدخول"
  placeholderTextColor={colors.textSecondary}
  // ...
/>
```

### 5.2 إضافة Error Reporting

**الملف:** `components/ErrorBoundary.tsx`

```typescript
// تكريب مع Sentry أو Crashlytics
import * as Sentry from '@sentry/react-native';

class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.reset} />;
    }
    return this.props.children;
  }
}
```

### 5.3 إصلاح ErrorBoundary reset

```typescript
// قبل
reset() {
  this.setState({ hasError: false });
}

// بعد
reset() {
  this.setState({ hasError: false, error: null });
  // المستخدم يختار إعادة المحاولة بعد فهم المشكلة
}
```

### 5.4 استبدال any بـ interfaces

**ملف جديد:** `lib/types.ts`

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface LogEntry {
  id: string;
  connector_id: string;
  direction: 'inbound' | 'outbound';
  status: 'success' | 'error';
  message: string;
  created_at: string;
}

export interface WebhookEvent {
  id: string;
  connector_id: string;
  source_ip: string;
  body: string;
  created_at: string;
}

// استخدام في جميع الملفات
```

### 5.5 توحيد ألوان الثيم

**الملف:** `constants/Colors.ts`

```typescript
export const Colors = {
  light: {
    background: '#FFFFFF',
    card: '#F5F5F5',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E0E0E0',
    primary: '#007AFF',
    danger: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
  },
  dark: {
    background: '#000000',
    card: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#999999',
    border: '#38383A',
    primary: '#0A84FF',
    danger: '#FF453A',
    success: '#30D158',
    warning: '#FF9F0A',
  },
};
```

### 5.6 إصلاح SMS format

**الملف:** `lib/utils/send-sms.ts`

```typescript
// قبل (iOS)
const url = `sms:${phone}&body=${encodeURIComponent(message)}`;

// بعد
const url = `sms:${phone}?body=${encodeURIComponent(message)}`;
```

### 5.7 تحسين معرف الجهاز

**الملف:** `lib/utils/device-info.ts`

```typescript
// قبل
const id = `device_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

// بعد
const id = `device_${Date.now()}_${crypto.randomUUID()}`;
```

### 5.8 تحسين onboarding

**الملف:** `app/onboarding/index.tsx`

```typescript
// قبل
setSlide(slide + 1);

// بعد
setSlide(prev => Math.min(prev + 1, slides.length - 1));
```

### 5.9 تحسين register → login flow

**الملف:** `hooks/useAuth.tsx`

```typescript
const register = useCallback(async (data) => {
  try {
    await AuthService.register(data);
    await login({ email: data.email, password: data.password });
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}, [login]);
```

---

## الأسبوع 11-12: التحسينات المتبقية والاختبار (P2)

> الهدف: إنهاء التحسينات المتبقية واختبار شامل
> المشاكل المتبقية: L-47 إلى L-61, CC-01 إلى CC-07

### 6.1 إضافة اختبارات

```typescript
// اختبارات أمنية
describe('Authentication', () => {
  it('should reject login with invalid credentials', async () => {});
  it('should rate limit login attempts', async () => {});
  it('should validate email format', async () => {});
  it('should enforce password complexity', async () => {});
});

// اختبارات API
describe('API Client', () => {
  it('should timeout after configured duration', async () => {});
  it('should retry on network errors', async () => {});
  it('should handle 401 by clearing token', async () => {});
});

// اختبارات واجهة المستخدم
describe('Connectors', () => {
  it('should handle empty state', () => {});
  it('should display error messages', () => {});
  it('should validate URL format', () => {});
});
```

### 6.2 إضافة linting rules

**الملف:** `eslint.config.js`

```javascript
module.exports = {
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

### 6.3 إضافة environment validation

**ملف جديد:** `lib/env.ts`

```typescript
import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
  EXPO_PUBLIC_GATEWAY_URL: z.string().url(),
  EXPO_PUBLIC_WS_URL: z.string().url().optional(),
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
```

### 6.4 إضافة CHANGELOG

**ملف جديد:** `CHANGELOG.md`

```markdown
# Changelog

## [4.1.0] - 2026-XX-XX

### Security
- Added CORS restrictions
- Added rate limiting to auth endpoints
- Added HMAC verification for webhooks
- Reduced JWT expiry to 1 hour
- Moved auth tokens to SecureStore
- Enforced HTTPS in production
- Added SSRF protection

### Fixed
- Fixed SQL injection via table names
- Fixed JSON.parse crashes in webhooks
- Fixed memory leaks in WebSocket connections
- Fixed stale closures in SwipeableRow
- Fixed iOS SMS URL format
- Fixed ApiKeyModal always empty

### Changed
- Replaced ScrollView with FlatList for better performance
- Extracted components from render functions
- Added accessibility labels to all interactive elements
- Improved error handling throughout

### Added
- Added retry logic to API client
- Added timeout to all fetch requests
- Added comprehensive TypeScript interfaces
- Added environment validation
```

---

## التحقق النهائي

### قائمة التحقق قبل الإصدار

- [ ] **الأمان**
  - [ ] CORS مقيّد
  - [ ] Rate limiting مفعّل
  - [ ] Webhook protected
  - [ ] JWT expiry < 24 ساعة
  - [ ] Admin password من Environment
  - [ ] HTTPS مفعّل
  - [ ] Tokens في SecureStore
  - [ ] SQL injection مُعالَج

- [ ] **الأداء**
  - [ ] FlatList في جميع القوائم
  - [ ] المكونات خارج render
  - [ ] useMemo/useCallback مُستخدم
  - [ ] DB lock مُفعّل
  - [ ] API timeout + retry

- [ ] **الاستقرار**
  - [ ] try-catch في جميع العمليات
  - [ ] Error reporting مُفعّل
  - [ ] Memory leaks مُعالَجة
  - [ ] WebSocket reconnection يعمل

- [ ] **تجربة المستخدم**
  - [ ] Accessibility labels
  - [ ] جميع الأزرار تعمل
  - [ ] الثيم الداكن يعمل
  - [ ] رسائل خطأ واضحة

- [ ] **الصيانة**
  - [ ] No `any` types
  - [ ] Lint passes
  - [ ] TypeScript strict
  - [ ] Documentation مُحدّثة

---

## أولويات الإصلاح

### فوري (هذا الأسبوع)
1. CORS restrictions
2. Rate limiting
3. Webhook auth
4. JWT expiry reduction
5. Admin password externalization

### قريب (خلال أسبوعين)
6. Token to SecureStore
7. HTTPS enforcement
8. SQL injection fixes
9. DB locking
10. API timeout/retry

### متوسط (خلال شهر)
11. ScrollView → FlatList
12. Component extraction
13. Error handling
14. Memory leak fixes
15. WebSocket improvements

### طويل (خلال شهرين)
16. Accessibility
17. Type safety
18. Testing
19. Documentation
20. Performance optimization

---

> **ملاحظة:** هذه الخطة مرنة وقابلة للتعديل حسب الأولويات والموارد المتاحة. يُنصح بمراجعة تقدمها أسبوعياً.
