import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] EXPO_PUBLIC_SUPABASE_URL or ANON_KEY is not configured. Marsal features will be unavailable.');
}

class ExpoSecureStoreAdapter {
  async getItem(key: string) {
    return SecureStore.getItemAsync(key);
  }
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  }
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key);
  }
}

export const marsalSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: new ExpoSecureStoreAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
