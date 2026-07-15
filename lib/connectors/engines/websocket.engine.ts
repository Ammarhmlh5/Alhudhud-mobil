import { ConnectorConfig } from '../types';

type MessageHandler = (data: any) => void;
type StatusHandler = (status: string) => void;

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

export class WebSocketEngine {
  private connections: Map<string, {
    ws: WebSocket;
    reconnectTimer?: ReturnType<typeof setTimeout>;
    attempts: number;
  }> = new Map();

  connect(config: ConnectorConfig, onMessage: MessageHandler, onStatus: StatusHandler): void {
    this.disconnect(config.id);

    const attemptConnect = () => {
      try {
        const ws = new WebSocket(config.endpointUrl);

        ws.onopen = () => {
          const conn = this.connections.get(config.id);
          if (conn) conn.attempts = 0;
          onStatus('ONLINE');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch {
            onMessage(event.data);
          }
        };

        ws.onerror = () => {
          onStatus('ERROR');
        };

        ws.onclose = () => {
          onStatus('OFFLINE');
          this.scheduleReconnect(config, onMessage, onStatus);
        };

        this.connections.set(config.id, { ws, attempts: 0 });
      } catch {
        onStatus('ERROR');
        this.scheduleReconnect(config, onMessage, onStatus);
      }
    };

    attemptConnect();
  }

  disconnect(connectorId: string): void {
    const existing = this.connections.get(connectorId);
    if (existing) {
      if (existing.reconnectTimer) {
        clearTimeout(existing.reconnectTimer);
      }
      try { existing.ws.close(); } catch {}
      this.connections.delete(connectorId);
    }
  }

  send(connectorId: string, data: any): boolean {
    const existing = this.connections.get(connectorId);
    if (!existing || existing.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      existing.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  isConnected(connectorId: string): boolean {
    const existing = this.connections.get(connectorId);
    return !!existing && existing.ws.readyState === WebSocket.OPEN;
  }

  disconnectAll(): void {
    Array.from(this.connections.keys()).forEach(id => this.disconnect(id));
  }

  private scheduleReconnect(config: ConnectorConfig, onMessage: MessageHandler, onStatus: StatusHandler): void {
    const existing = this.connections.get(config.id);
    if (!existing) return;

    if (existing.attempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn(`[WS] Max reconnect attempts reached for ${config.id}`);
      return;
    }

    const delay = Math.min(BASE_DELAY * Math.pow(2, existing.attempts), MAX_DELAY);
    existing.attempts++;

    existing.reconnectTimer = setTimeout(() => {
      existing.reconnectTimer = undefined;
      this.connect(config, onMessage, onStatus);
    }, delay);
  }
}

export const webSocketEngine = new WebSocketEngine();
