import * as Device from 'expo-device';
import * as Network from 'expo-network';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'device_id';

export interface DeviceInfo {
  serialNumber: string;
  ipAddress: string;
  deviceName: string;
  deviceModel: string;
  osName: string;
  osVersion: string;
  appVersion: string;
}

let deviceIdPromise: Promise<string> | null = null;

async function getDeviceId(): Promise<string> {
  if (deviceIdPromise) return deviceIdPromise;
  deviceIdPromise = getDeviceIdInternal();
  const result = await deviceIdPromise;
  deviceIdPromise = null;
  return result;
}

async function getDeviceIdInternal(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (deviceId) return deviceId;

  if (Platform.OS === 'android') {
    deviceId = Application.getAndroidId() || '';
  } else {
    deviceId = (await Application.getIosIdForVendorAsync()) || '';
  }

  if (!deviceId) {
    deviceId = `device_${Crypto.randomUUID()}`;
  }

  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

export async function collectDeviceInfo(): Promise<DeviceInfo> {
  const [ipAddress] = await Promise.all([
    Network.getIpAddressAsync().catch(() => '0.0.0.0'),
  ]);

  const deviceId = await getDeviceId();

  let serialNumber = deviceId;
  if (Platform.OS === 'android') {
    try {
      const constants = Platform.constants as any;
      if (constants?.Serial && constants.Serial !== 'unknown') {
        serialNumber = constants.Serial;
      }
    } catch (error) {
      console.error('Failed to get device serial:', error);
    }
  }

  return {
    serialNumber,
    ipAddress: ipAddress || '0.0.0.0',
    deviceName: Device.deviceName || 'Unknown Device',
    deviceModel: Device.modelName || (Platform.constants as any)?.Model || 'Unknown',
    osName: Device.osName || Platform.OS,
    osVersion: Device.osVersion || String(Platform.Version),
    appVersion: Application.nativeApplicationVersion || '1.0.0',
  };
}

export async function getStoredApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync('api_key');
}

export async function storeApiKey(apiKey: string): Promise<void> {
  await SecureStore.setItemAsync('api_key', apiKey);
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync('api_key');
}
