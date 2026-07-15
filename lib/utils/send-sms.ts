import { Platform, Linking } from 'react-native';

export interface SmsSendResult {
  success: boolean;
  error?: string;
  method: 'linking' | 'unavailable';
  confirmed: boolean;
}

const GSM7_REGEX = /^[\x00-\x7F]*$/;
const GSM7_MAX = 160;
const UNICODE_MAX = 70;

export async function sendSms(phone: string, message: string): Promise<SmsSendResult> {
  try {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const cleanMessage = message.trim();

    if (!cleanPhone || cleanPhone.length < 9) {
      return { success: false, error: 'رقم الهاتف غير صالح', method: 'unavailable', confirmed: false };
    }

    if (!cleanMessage) {
      return { success: false, error: 'الرسالة فارغة', method: 'unavailable', confirmed: false };
    }

    const isGsm7 = GSM7_REGEX.test(cleanMessage);
    const charLimit = isGsm7 ? GSM7_MAX : UNICODE_MAX;

    if (cleanMessage.length > charLimit) {
      return {
        success: false,
        error: `الرسالة طويلة جداً (${cleanMessage.length}/${charLimit} حرف)`,
        method: 'unavailable',
        confirmed: false,
      };
    }

    if (Platform.OS === 'android') {
      return await sendSmsAndroid(cleanPhone, cleanMessage);
    } else if (Platform.OS === 'ios') {
      return await sendSmsIOS(cleanPhone, cleanMessage);
    }

    return { success: false, error: 'المنصة غير مدعومة', method: 'unavailable', confirmed: false };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'فشل إرسال الرسالة',
      method: 'unavailable',
      confirmed: false,
    };
  }
}

async function sendSmsAndroid(phone: string, message: string): Promise<SmsSendResult> {
  const url = `sms:${phone}?body=${encodeURIComponent(message)}`;

  const canOpen = await Linking.canOpenURL(url).catch(() => false);
  if (!canOpen) {
    return { success: false, error: 'لا يمكن فتح تطبيق الرسائل', method: 'unavailable', confirmed: false };
  }

  await Linking.openURL(url);
  return { success: true, method: 'linking', confirmed: false };
}

async function sendSmsIOS(phone: string, message: string): Promise<SmsSendResult> {
  const url = `sms:${phone}?body=${encodeURIComponent(message)}`;

  const canOpen = await Linking.canOpenURL(url).catch(() => false);
  if (!canOpen) {
    return { success: false, error: 'لا يمكن فتح تطبيق الرسائل', method: 'unavailable', confirmed: false };
  }

  await Linking.openURL(url);
  return { success: true, method: 'linking', confirmed: false };
}
