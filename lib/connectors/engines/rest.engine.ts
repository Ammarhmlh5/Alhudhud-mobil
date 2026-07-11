import { ConnectorConfig } from '../types';
import { oauth2Engine } from './oauth2.engine';
import { getStoredApiKey } from '../../utils/device-info';

interface RequestOptions {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export class RestEngine {
  async send(config: ConnectorConfig, payload: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const options = await this.buildRequest(config, payload);
      const response = await fetch(config.endpointUrl, options);

      const responseData = await this.parseResponse(response);

      if (!response.ok) {
        return {
          success: false,
          error: responseData?.message || responseData?.error || `HTTP ${response.status}`,
          data: responseData,
        };
      }

      return { success: true, data: responseData };
    } catch (error: any) {
      return { success: false, error: error.message || 'Connection failed' };
    }
  }

  async test(config: ConnectorConfig): Promise<{ success: boolean; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      const options = await this.buildRequest(config, null);
      const response = await fetch(config.endpointUrl, { ...options, method: 'GET' });
      const latency = Date.now() - start;

      if (response.ok) {
        return { success: true, latency };
      }
      return { success: false, error: `HTTP ${response.status}`, latency };
    } catch (error: any) {
      return { success: false, error: error.message, latency: Date.now() - start };
    }
  }

  private async buildRequest(config: ConnectorConfig, payload: any): Promise<RequestOptions> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(config.headers || {}),
    };

    await this.applyAuth(config, headers);

    const deviceKey = await getStoredApiKey().catch(() => null);
    if (deviceKey) {
      headers['X-Device-Key'] = deviceKey;
    }

    const options: RequestOptions = {
      method: payload ? (config.httpMethod || 'POST') : 'GET',
      headers,
    };

    if (payload) {
      options.body = JSON.stringify(payload);
    }

    return options;
  }

  private async applyAuth(config: ConnectorConfig, headers: Record<string, string>): Promise<void> {
    switch (config.auth.type) {
      case 'API_KEY':
        const headerName = config.auth.apiKeyHeader || 'X-API-Key';
        headers[headerName] = config.auth.apiKey || '';
        break;
      case 'BASIC':
        const credentials = btoa(`${config.auth.username || ''}:${config.auth.password || ''}`);
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'BEARER':
        headers['Authorization'] = `Bearer ${config.auth.token || ''}`;
        break;
      case 'OAUTH2':
        if (config.auth.clientId && config.auth.tokenUrl) {
          await oauth2Engine.getAccessToken(config);
          const token = oauth2Engine.getAuthHeader(config);
          Object.assign(headers, token);
        }
        break;
    }
  }

  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }
}

export const restEngine = new RestEngine();
