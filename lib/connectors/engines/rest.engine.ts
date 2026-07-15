import { ConnectorConfig } from '../types';
import { oauth2Engine } from './oauth2.engine';

interface RequestOptions {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 1000;

export class RestEngine {
  private async sendWithRetry(config: ConnectorConfig, payload: any, attempt = 0): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const options = await this.buildRequest(config, payload);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      const response = await fetch(config.endpointUrl, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      const responseData = await this.parseResponse(response);

      if (response.ok) {
        return { success: true, data: responseData };
      }

      const isRetryable = response.status >= 500 || response.status === 429;
      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 500);
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
        return this.sendWithRetry(config, payload, attempt + 1);
      }

      return {
        success: false,
        error: responseData?.message || responseData?.error || `HTTP ${response.status}`,
        data: responseData,
      };
    } catch (error: any) {
      const isNetworkError = error.name !== 'AbortError' && !error.message?.includes('timeout');
      if (isNetworkError && attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 500);
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
        return this.sendWithRetry(config, payload, attempt + 1);
      }

      if (error.name === 'AbortError') {
        return { success: false, error: 'Request timed out' };
      }
      const safeMessage = error.message?.replace(/(password|token|key|secret)=?[^&\s]*/gi, '***') || 'Connection failed';
      return { success: false, error: safeMessage };
    }
  }

  async send(config: ConnectorConfig, payload: any): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.sendWithRetry(config, payload);
  }

  async test(config: ConnectorConfig): Promise<{ success: boolean; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      const options = await this.buildRequest(config, null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      const response = await fetch(config.endpointUrl, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      const latency = Date.now() - start;

      if (response.ok) {
        return { success: true, latency };
      }
      return { success: false, error: `HTTP ${response.status}`, latency };
    } catch (error: any) {
      const latency = Date.now() - start;
      if (error.name === 'AbortError') {
        return { success: false, error: 'Request timed out', latency };
      }
      return { success: false, error: error.message, latency };
    }
  }

  private async buildRequest(config: ConnectorConfig, payload: any): Promise<RequestOptions> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(config.headers || {}),
    };

    await this.applyAuth(config, headers);

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
      case 'API_KEY': {
        const headerName = config.auth.apiKeyHeader || 'X-API-Key';
        headers[headerName] = config.auth.apiKey || '';
        break;
      }
      case 'BASIC': {
        const username = config.auth.username || '';
        const password = config.auth.password || '';
        const rawString = `${username}:${password}`;
        const bytes = new TextEncoder().encode(rawString);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        headers['Authorization'] = `Basic ${btoa(binary)}`;
        break;
      }
      case 'BEARER': {
        headers['Authorization'] = `Bearer ${config.auth.token || ''}`;
        break;
      }
      case 'OAUTH2': {
        if (config.auth.clientId && config.auth.tokenUrl) {
          await oauth2Engine.getAccessToken(config);
          const token = oauth2Engine.getAuthHeader(config);
          Object.assign(headers, token);
        }
        break;
      }
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
