import * as SecureStore from 'expo-secure-store';
import { ConnectorConfig } from '../types';

const TOKEN_CACHE_KEY = 'oauth2_token_cache_';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

interface OAuth2Token {
  accessToken: string;
  tokenType: string;
  expiresAt: number | null;
  refreshToken: string | null;
  scope: string | null;
}

export class OAuth2Engine {
  private tokenCache = new Map<string, OAuth2Token>();
  private refreshPromises = new Map<string, Promise<string>>();
  private lastCleanup = 0;
  private static CLEANUP_INTERVAL = 60000;

  private cleanupExpiredTokens(): void {
    const now = Date.now();
    if (now - this.lastCleanup < OAuth2Engine.CLEANUP_INTERVAL) return;
    this.lastCleanup = now;
    for (const [key, token] of this.tokenCache) {
      if (token.expiresAt && token.expiresAt < now) {
        this.tokenCache.delete(key);
      }
    }
  }

  async getAccessToken(config: ConnectorConfig): Promise<string> {
    this.cleanupExpiredTokens();
    let cached = this.tokenCache.get(config.id);

    if (!cached) {
      const stored = await SecureStore.getItemAsync(TOKEN_CACHE_KEY + config.id);
      if (stored) {
        try {
          const parsed: OAuth2Token = JSON.parse(stored);
          cached = parsed;
          this.tokenCache.set(config.id, parsed);
        } catch {
          await SecureStore.deleteItemAsync(TOKEN_CACHE_KEY + config.id);
        }
      }
    }

    if (cached && cached.expiresAt && cached.expiresAt > Date.now() + 60000) {
      return cached.accessToken;
    }

    if (this.refreshPromises.has(config.id)) {
      return this.refreshPromises.get(config.id)!;
    }

    let promise: Promise<string>;
    if (cached?.refreshToken) {
      promise = this.refreshToken(config, cached.refreshToken).finally(() => {
        this.refreshPromises.delete(config.id);
      });
    } else {
      promise = this.authorize(config).finally(() => {
        this.refreshPromises.delete(config.id);
      });
    }

    this.refreshPromises.set(config.id, promise);
    return promise;
  }

  private async authorize(config: ConnectorConfig): Promise<string> {
    const tokenUrl = config.auth.tokenUrl || config.endpointUrl;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.auth.clientId || '',
      client_secret: config.auth.clientSecret || '',
      scope: config.auth.scope || '',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OAuth2 authorization failed: ${err}`);
    }

    const data: TokenResponse = await response.json();
    return await this.cacheToken(config.id, data);
  }

  private async refreshToken(config: ConnectorConfig, refreshToken: string): Promise<string> {
    try {
      const tokenUrl = config.auth.tokenUrl || config.endpointUrl;
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.auth.clientId || '',
        client_secret: config.auth.clientSecret || '',
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!response.ok) throw new Error('Refresh failed');

      const data: TokenResponse = await response.json();
      return await this.cacheToken(config.id, data);
    } catch {
      return await this.authorize(config);
    }
  }

  private async cacheToken(id: string, data: TokenResponse): Promise<string> {
    const token: OAuth2Token = {
      accessToken: data.access_token,
      tokenType: data.token_type || 'Bearer',
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
      refreshToken: data.refresh_token || null,
      scope: data.scope || null,
    };
    this.tokenCache.set(id, token);
    try {
      await SecureStore.setItemAsync(TOKEN_CACHE_KEY + id, JSON.stringify(token));
    } catch {}
    return token.accessToken;
  }

  getAuthHeader(config: ConnectorConfig): Record<string, string> {
    const cached = this.tokenCache.get(config.id);
    if (!cached) return {};
    return { 'Authorization': `${cached.tokenType} ${cached.accessToken}` };
  }

  async clearCache(configId: string) {
    this.tokenCache.delete(configId);
    try { await SecureStore.deleteItemAsync(TOKEN_CACHE_KEY + configId); } catch {}
  }
}

export const oauth2Engine = new OAuth2Engine();
