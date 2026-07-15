import * as SecureStore from 'expo-secure-store';
import { getEnv } from './env';

const TOKEN_KEY = 'auth_token';
const API_KEY_KEY = 'api_key';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const BASE_BACKOFF = 1000; // 1 second

class ApiClient {
  private get apiUrl() {
    try {
      return getEnv().EXPO_PUBLIC_API_URL;
    } catch {
      console.error('FATAL: EXPO_PUBLIC_API_URL is not configured');
      return '';
    }
  }
  private onUnauthorizedCallback: (() => void) | null = null;

  onUnauthorized(callback: () => void) {
    this.onUnauthorizedCallback = callback;
  }

  // ─── Token Management (via SecureStore) ─────────────────

  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  async setToken(token: string | null): Promise<void> {
    try {
      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Failed to store/remove token:', error);
    }
  }

  async getApiKey(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(API_KEY_KEY);
    } catch {
      return null;
    }
  }

  async setApiKey(apiKey: string | null): Promise<void> {
    try {
      if (apiKey) {
        await SecureStore.setItemAsync(API_KEY_KEY, apiKey);
      } else {
        await SecureStore.deleteItemAsync(API_KEY_KEY);
      }
    } catch (error) {
      console.error('Failed to store/remove API key:', error);
    }
  }

  // ─── Core Request Method ────────────────────────────────

  async request(path: string, options: RequestInit = {}): Promise<Response> {
    if (!this.apiUrl) {
      throw new Error('API URL is not configured');
    }

    const [token, apiKey] = await Promise.all([this.getToken(), this.getApiKey()]);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(apiKey ? { 'X-Device-Key': apiKey } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      try {
        const response = await fetch(`${this.apiUrl}${path}`, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle auth errors — clear token and notify
        if (response.status === 401) {
          await this.setToken(null);
          this.onUnauthorizedCallback?.();
        }

        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        lastError = error;

        // Don't retry on abort (timeout) — fail immediately
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please check your connection.');
        }

        // Don't retry on the last attempt
        if (attempt >= MAX_RETRIES) {
          break;
        }

        // Exponential backoff with jitter
        const delay = BASE_BACKOFF * Math.pow(2, attempt) + Math.random() * BASE_BACKOFF;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Request failed after multiple attempts');
  }

  // ─── HTTP Methods ───────────────────────────────────────

  async get<T = any>(path: string): Promise<T> {
    const response = await this.request(path, { method: 'GET' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async post<T = any>(path: string, data?: any): Promise<T> {
    const response = await this.request(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async put<T = any>(path: string, data?: any): Promise<T> {
    const response = await this.request(path, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async delete<T = any>(path: string): Promise<T> {
    const response = await this.request(path, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  // ─── Raw Response Methods (for callers that need status) ─

  async getRaw(path: string): Promise<Response> {
    return this.request(path, { method: 'GET' });
  }

  async postRaw(path: string, data?: any): Promise<Response> {
    return this.request(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async putRaw(path: string, data?: any): Promise<Response> {
    return this.request(path, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async deleteRaw(path: string): Promise<Response> {
    return this.request(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
export default api;
