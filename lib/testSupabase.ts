/**
 * ملف اختبار بسيط للتحقق من اتصال Supabase
 * يمكن استيراد هذا الملف في أي مكان في التطبيق للتحقق من الاتصال
 */

import { supabase } from './supabaseClient';

export async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // اختبار بسيط: جلب سجل واحد من جدول sync_event
    const { data, error, status } = await supabase
      .from('sync_event')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection error:', error);
      return { success: false, error, status };
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('Status:', status);
    console.log('Data:', data);
    
    return { success: true, data, status };
  } catch (e) {
    console.error('❌ Supabase connection failed:', e);
    return { success: false, error: e };
  }
}

