import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { getDB } from '@/lib/db/init';

const GATEWAY_URL = process.env.EXPO_PUBLIC_GATEWAY_URL;
const WS_URL = process.env.EXPO_PUBLIC_WS_URL || (GATEWAY_URL ? GATEWAY_URL.replace('http', 'ws') + '/ws' : '');

if (!GATEWAY_URL) {
  console.error('FATAL: EXPO_PUBLIC_GATEWAY_URL is not configured');
}

type MessageHandler = (message: any) => void;

class GatewayService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private baseDelay = 1000;
  private maxDelay = 60000;
  private isConnected = false;
  private appStateSubscription: { remove: () => void } | null = null;

  get apiUrl() { return GATEWAY_URL || ''; }

  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('auth_token');
    } catch {
      return null;
    }
  }

  async getApiKey(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('api_key');
    } catch {
      return null;
    }
  }

  async connect() {
    const token = await this.getToken();
    if (!token || !WS_URL) return;

    this.disconnect();

    if (!this.appStateSubscription) {
      this.appStateSubscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active' && !this.isConnected) {
          this.connect();
        }
      });
    }

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.ws?.send(JSON.stringify({ type: 'auth', token }));
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('CONNECTION', { status: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'PONG') return;
          this.emit(message.type, message);
          this.emit('*', message);
        } catch {
          console.warn('[Gateway] Failed to parse WebSocket message');
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit('CONNECTION', { status: 'disconnected' });
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[Gateway] WebSocket error:', error);
        this.isConnected = false;
        // onclose will handle reconnection
      };
    } catch (error) {
      console.error('[Gateway] WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    this.isConnected = false;
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  send(data: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  on(event: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: MessageHandler) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) handlers.splice(idx, 1);
    }
  }

  removeAllHandlers() {
    this.handlers.clear();
  }

  private emit(event: string, message: any) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const h of handlers) {
        try { h(message); } catch (e) { console.error('[Gateway] Handler error:', e); }
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Gateway] Max reconnect attempts reached. Giving up.');
      this.emit('CONNECTION', { status: 'failed', reason: 'max_attempts' });
      return;
    }

    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxDelay
    );
    this.reconnectAttempts++;

    console.debug(`[Gateway] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  async sendToConnector(connectorId: string, data: any) {
    const [token, apiKey] = await Promise.all([this.getToken(), this.getApiKey()]);
    if (!token) throw new Error('Not authenticated');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
      if (apiKey) headers['X-Device-Key'] = apiKey;
      const response = await fetch(`${GATEWAY_URL}/api/sync/push`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ events: [{ connectorId, table: 'direct', operation: 'SEND', data }] }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return response.ok ? response.json() : null;
    } catch (error) {
      console.error('[Gateway] Send error:', error);
      return null;
    }
  }

  async getWebhookUrl(connectorId: string): Promise<string> {
    return `${GATEWAY_URL}/api/webhook/${connectorId}`;
  }

  async deleteConnector(connectorId: string): Promise<boolean> {
    try {
      const res = await this.fetch(`/connectors/${connectorId}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const [token, apiKey] = await Promise.all([this.getToken(), this.getApiKey()]);
    const headers: Record<string, string> = { ...((options.headers as Record<string, string>) || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (apiKey) headers['X-Device-Key'] = apiKey;

    const Network = await import('expo-network');
    const netState = await Network.getNetworkStateAsync();
    if (!netState.isConnected || !netState.isInternetReachable) {
      throw new Error('No network connection');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${GATEWAY_URL}/api${path}`, { ...options, headers, signal: controller.signal });
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }
}

export const gatewayService = new GatewayService();
