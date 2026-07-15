import { marsalSupabase } from '../supabase/client';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PLATFORM_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const FUNCTIONS_BASE = `${PLATFORM_URL}/functions/v1`;

const MARSEL_SESSION_KEY = 'marsal_session';
const MARSEL_USER_KEY = 'marsal_user_id';
const MARSEL_DEVICE_KEY = 'marsal_device_id';

export interface MarsalSession {
  access_token: string;
  refresh_token: string;
  user_id: string;
}

export interface SmsCommand {
  command_id: string;
  phone: string;
  message: string;
}

export interface SmsSendResult {
  success: boolean;
  error?: string;
}

class MarsalService {
  private session: MarsalSession | null = null;

  async init(): Promise<boolean> {
    try {
      const stored = await SecureStore.getItemAsync(MARSEL_SESSION_KEY);
      if (stored) {
        this.session = JSON.parse(stored);
        const { data } = await marsalSupabase.auth.getSession();
        if (data.session) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    const { data, error } = await marsalSupabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return false;
    }

    this.session = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user_id: data.user.id,
    };

    await SecureStore.setItemAsync(MARSEL_SESSION_KEY, JSON.stringify(this.session));
    await SecureStore.setItemAsync(MARSEL_USER_KEY, data.user.id);

    return true;
  }

  async logout(): Promise<void> {
    await marsalSupabase.auth.signOut();
    this.session = null;
    await SecureStore.deleteItemAsync(MARSEL_SESSION_KEY);
    await SecureStore.deleteItemAsync(MARSEL_USER_KEY);
  }

  async getAccessToken(): Promise<string | null> {
    const { data } = await marsalSupabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      if (Date.now() >= expiresAt) {
        const { data: refreshed } = await marsalSupabase.auth.refreshSession();
        return refreshed.session?.access_token || null;
      }
    } catch {
      // Token parsing failed — return as-is and let API call fail naturally
    }
    return token;
  }

  async registerDevice(): Promise<string | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    const deviceId = await this.getDeviceId();
    const deviceName = Device.deviceName || 'Unknown';
    const platform = Platform.OS === 'android' ? 'android' : 'ios';

    let pushToken: string | null = null;
    try {
      const Notifications = await import('expo-notifications');
      const { data } = await Notifications.getExpoPushTokenAsync();
      pushToken = data;
    } catch (error) { console.debug('Push token retrieval failed:', error); }

    const response = await fetch(`${FUNCTIONS_BASE}/register-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        device_id: deviceId,
        device_name: deviceName,
        platform,
        push_token: pushToken,
        app_version: Application.nativeApplicationVersion || '1.0.0',
      }),
    });

    if (response.ok) {
      await SecureStore.setItemAsync(MARSEL_DEVICE_KEY, deviceId);
      return deviceId;
    }

    return null;
  }

  async reportSmsStatus(commandId: string, status: 'sent' | 'failed', error?: string): Promise<boolean> {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const token = await this.getAccessToken();
        if (!token) return false;

        const response = await fetch(`${FUNCTIONS_BASE}/report-sms-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({
            command_id: commandId,
            status,
            error,
          }),
        });

        if (response.ok) return true;
        if (response.status < 500) return false;
      } catch {
        // Network error — retry
      }
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
    return false;
  }

  subscribeToCommands(
    deviceId: string,
    onCommands: (commands: SmsCommand[]) => void
  ): () => void {
    const channel = marsalSupabase.channel(`sms-commands:${deviceId}`);

    channel.on('broadcast', { event: 'new_commands' }, (payload) => {
      const commands = (payload.payload as { commands?: SmsCommand[] })?.commands;
      if (commands && Array.isArray(commands)) {
        onCommands(commands);
      }
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }

  private async getDeviceId(): Promise<string> {
    let deviceId = await SecureStore.getItemAsync('device_id');
    if (deviceId) return deviceId;

    if (Platform.OS === 'android') {
      deviceId = Application.getAndroidId() || '';
    } else {
      deviceId = (await Application.getIosIdForVendorAsync()) || '';
    }

    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    }

    await SecureStore.setItemAsync('device_id', deviceId);
    return deviceId;
  }

  async getStoredDeviceId(): Promise<string | null> {
    return SecureStore.getItemAsync('device_id');
  }
}

export const marsalService = new MarsalService();
export default marsalService;
