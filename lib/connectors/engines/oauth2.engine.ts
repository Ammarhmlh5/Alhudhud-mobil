import { ConnectorConfig } from '../types';

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

  async getAccessToken(config: ConnectorConfig): Promise<string> {
    const cached = this.tokenCache.get(config.id);
    if (cached && cached.expiresAt && cached.expiresAt > Date.now() + 60000) {
      return cached.accessToken;
    }

    if (cached?.refreshToken) {
      return this.refreshToken(config, cached.refreshToken);
    }

    return this.authorize(config);
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
    return this.cacheToken(config.id, data);
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
      return this.cacheToken(config.id, data);
    } catch {
      return this.authorize(config);
    }
  }

  private cacheToken(id: string, data: TokenResponse): string {
    const token: OAuth2Token = {
      accessToken: data.access_token,
      tokenType: data.token_type || 'Bearer',
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
      refreshToken: data.refresh_token || null,
      scope: data.scope || null,
    };
    this.tokenCache.set(id, token);
    return token.accessToken;
  }

  getAuthHeader(config: ConnectorConfig): Record<string, string> {
    const cached = this.tokenCache.get(config.id);
    if (!cached) return {};
    return { 'Authorization': `${cached.tokenType} ${cached.accessToken}` };
  }

  clearCache(configId: string) {
    this.tokenCache.delete(configId);
  }
}

export const oauth2Engine = new OAuth2Engine();
