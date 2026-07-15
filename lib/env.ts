import { z } from 'zod';

// ─── Mobile App Environment ─────────────────────────────────

const mobileEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url('EXPO_PUBLIC_API_URL must be a valid URL'),
  EXPO_PUBLIC_GATEWAY_URL: z.string().url('EXPO_PUBLIC_GATEWAY_URL must be a valid URL'),
  EXPO_PUBLIC_WS_URL: z.string().url().optional(),
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_SUPABASE_URL: z.string().url('EXPO_PUBLIC_SUPABASE_URL must be a valid URL'),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'EXPO_PUBLIC_SUPABASE_ANON_KEY is required'),
});

function validateMobileEnv() {
  const raw = {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_GATEWAY_URL: process.env.EXPO_PUBLIC_GATEWAY_URL,
    EXPO_PUBLIC_WS_URL: process.env.EXPO_PUBLIC_WS_URL,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };

  const result = mobileEnvSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    console.warn('[ENV] Environment validation warnings:', errors);
    if (__DEV__) {
      return raw as z.infer<typeof mobileEnvSchema>;
    }
    throw new Error(`Environment validation failed:\n${JSON.stringify(errors, null, 2)}`);
  }
  return result.data;
}

let _env: z.infer<typeof mobileEnvSchema> | null = null;

export function getEnv() {
  if (!_env) {
    _env = validateMobileEnv();
  }
  return _env;
}
