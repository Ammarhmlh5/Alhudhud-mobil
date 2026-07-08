import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// في Expo، يجب استخدام EXPO_PUBLIC_ prefix للمتغيرات البيئية
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || 
                     process.env.EXPO_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL;

const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || 
                          process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
                          process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase environment variables not set: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder-please-set-supabase-url.supabase.co', 
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export default supabase;

