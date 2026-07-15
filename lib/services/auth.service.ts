import { api } from '../apiClient';
import { collectDeviceInfo } from '../utils/device-info';
import { supabaseIntegrationService } from './supabase-integration.service';
import type { AuthResponse, User } from '../types';

export class AuthService {
  static async login(email: string, password: string): Promise<AuthResponse> {
    let deviceInfo = null;
    try { deviceInfo = await collectDeviceInfo(); } catch (error) { console.debug('Device info collection failed:', error); }

    const data = await api.post<AuthResponse>('/auth/login', { email, password, deviceInfo });

    if (data.token) {
      await api.setToken(data.token);
    }
    if (data.apiKey) {
      await api.setApiKey(data.apiKey);
    }

    try {
      await supabaseIntegrationService.signInAndRegister(email, password);
    } catch (error) {
      console.debug('[Auth] Supabase sync failed (non-critical):', error);
    }

    return data;
  }

  static async googleLogin(idToken: string): Promise<AuthResponse> {
    let deviceInfo = null;
    try { deviceInfo = await collectDeviceInfo(); } catch (error) { console.debug('Device info collection failed:', error); }

    const data = await api.post<AuthResponse>('/auth/google', { idToken, deviceInfo });

    if (data.token) {
      await api.setToken(data.token);
    }
    if (data.apiKey) {
      await api.setApiKey(data.apiKey);
    }

    try {
      await supabaseIntegrationService.registerDevice();
    } catch (error) {
      console.debug('[Auth] Supabase device registration failed (non-critical):', error);
    }

    return data;
  }

  static async register(userData: { email: string; password: string; name: string }): Promise<AuthResponse> {
    let deviceInfo = null;
    try { deviceInfo = await collectDeviceInfo(); } catch (error) { console.debug('Device info collection failed:', error); }

    const data = await api.post<AuthResponse>('/auth/register', { ...userData, deviceInfo });

    if (data.apiKey) {
      await api.setApiKey(data.apiKey);
    }

    try {
      await supabaseIntegrationService.signInAndRegister(userData.email, userData.password);
    } catch {
      // Ignore Supabase registration failures
    }

    return data;
  }

  static async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore — client-side logout is sufficient
    }
    await api.setToken(null);
    await api.setApiKey(null);
  }

  static async getProfile(): Promise<(User & { subscription: any }) | null> {
    try {
      return await api.get<User & { subscription: any }>('/auth/profile');
    } catch (error: any) {
      if (error?.message?.includes('401')) {
        return null;
      }
      throw error;
    }
  }

  static async requestApiKey(): Promise<{ apiKey: string; message: string }> {
    const result = await api.post<{ apiKey: string; message: string }>('/auth/request-api-key', {});
    if (result.apiKey) {
      await api.setApiKey(result.apiKey);
    }
    return result;
  }

  static async getApiKey(): Promise<string | null> {
    try {
      const data = await api.get<{ apiKey: string | null }>('/auth/api-key');
      return data.apiKey || null;
    } catch {
      return null;
    }
  }
}
