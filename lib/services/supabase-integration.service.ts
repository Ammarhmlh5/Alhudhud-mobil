import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { marsalSupabase } from '../supabase/client';
import { collectDeviceInfo } from '../utils/device-info';

interface RegisterDeviceResponse {
  success?: boolean;
  device_id?: string;
  message?: string;
  error?: string;
}

interface CommandPayload {
  command_id?: string;
  phone?: string;
  message?: string;
  campaign_id?: string;
  device_id?: string;
  commands?: Array<{
    command_id?: string;
    phone?: string;
    message?: string;
  }>;
}

class SupabaseIntegrationService {
  private registeredDeviceId: string | null = null;
  private channel: ReturnType<typeof marsalSupabase.channel> | null = null;
  private listeners = new Set<(payload: CommandPayload) => void>();

  async init(): Promise<void> {
    const stored = await SecureStore.getItemAsync('marsal_registered_device_id');
    if (stored) {
      this.registeredDeviceId = stored;
    }
  }

  async signInAndRegister(email: string, password: string) {
    try {
      const { data, error } = await marsalSupabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session?.access_token) {
        return null;
      }

      return this.registerDevice(data.session.access_token);
    } catch {
      return null;
    }
  }

  async registerDevice(accessToken?: string) {
    try {
      let token = accessToken;
      if (!token) {
        const { data: sessionData } = await marsalSupabase.auth.getSession();
        token = sessionData.session?.access_token ?? undefined;
      }

      if (!token) {
        return null;
      }

      const deviceInfo = await collectDeviceInfo();
      const deviceId = deviceInfo.serialNumber || `mobile_${Date.now()}`;
      const platform = Platform.OS === 'android' ? 'android' : 'ios';
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/register-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          device_id: deviceId,
          hardware_id: deviceInfo.serialNumber,
          device_name: deviceInfo.deviceName,
          platform,
          app_version: deviceInfo.appVersion,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as RegisterDeviceResponse;
      if (data.success && data.device_id) {
        this.registeredDeviceId = data.device_id;
        await SecureStore.setItemAsync('marsal_registered_device_id', data.device_id);
        await this.listenForCommands(data.device_id);
      }

      return data;
    } catch {
      return null;
    }
  }

  private async listenForCommands(deviceId: string) {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }

    const channelName = `sms-commands:${deviceId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    this.channel = marsalSupabase.channel(channelName);
    this.channel.on('broadcast', { event: 'new_commands' }, (payload) => {
      const eventPayload = (payload as { payload?: CommandPayload }).payload;
      if (eventPayload) {
        for (const listener of this.listeners) {
          listener(eventPayload);
        }
      }
    });

    this.channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[Supabase] Channel error, reconnecting in 5s...');
        setTimeout(() => {
          if (this.registeredDeviceId) {
            this.listenForCommands(this.registeredDeviceId);
          }
        }, 5000);
      } else if (status === 'TIMED_OUT') {
        console.error('[Supabase] Channel timed out, reconnecting in 10s...');
        setTimeout(() => {
          if (this.registeredDeviceId) {
            this.listenForCommands(this.registeredDeviceId);
          }
        }, 10000);
      }
    });
  }

  addListener(listener: (payload: CommandPayload) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getRegisteredDeviceId() {
    return this.registeredDeviceId;
  }

  async destroy(): Promise<void> {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

export const supabaseIntegrationService = new SupabaseIntegrationService();
