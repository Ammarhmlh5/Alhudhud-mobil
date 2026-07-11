import { getDB } from '@/lib/db/init';

const GATEWAY_URL = process.env.EXPO_PUBLIC_GATEWAY_URL || 'http://localhost:4000';
const WS_URL = process.env.EXPO_PUBLIC_WS_URL || GATEWAY_URL.replace('http', 'ws') + '/ws';

type MessageHandler = (message: any) => void;

class GatewayService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectTimer: any = null;
  private isConnected = false;

  get apiUrl() { return GATEWAY_URL; }

  async getToken(): Promise<string | null> {
    const db = getDB();
    if (!db) return null;
    try {
      const row = db.getFirstSync("SELECT value FROM local_settings WHERE key = 'auth_token'") as any;
      return row?.value || null;
    } catch { return null; }
  }

  async connect() {
    const token = await this.getToken();
    if (!token) return;

    this.disconnect();

    try {
      this.ws = new WebSocket(`${WS_URL}?token=${token}`);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit('CONNECTION', { status: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.emit(message.type, message);
          this.emit('*', message);
        } catch {}
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit('CONNECTION', { status: 'disconnected' });
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };
    } catch {}
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    this.isConnected = false;
  }

  send(data: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(JSON.stringify(data));
      return true;
    } catch { return false; }
  }

  on(event: string, handler: MessageHandler) {
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

  private emit(event: string, message: any) {
    const handlers = this.handlers.get(event);
    handlers?.forEach(h => h(message));
  }

  private scheduleReconnect() {
    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
  }

  async sendToConnector(connectorId: string, data: any) {
    const token = await this.getToken();
    if (!token) throw new Error('Not authenticated');

    try {
      const response = await fetch(`${GATEWAY_URL}/api/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ events: [{ connectorId, table: 'direct', operation: 'SEND', data }] }),
      });
      return response.ok ? response.json() : null;
    } catch (error) {
      console.error('[Gateway] Send error:', error);
      return null;
    }
  }

  async getWebhookUrl(connectorId: string): Promise<string> {
    return `${GATEWAY_URL}/api/webhook/${connectorId}`;
  }

  async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getToken();
    const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${GATEWAY_URL}/api${path}`, { ...options, headers });
  }
}

export const gatewayService = new GatewayService();
