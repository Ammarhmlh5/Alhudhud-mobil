import { ConnectorConfig } from '../types';

type MessageHandler = (data: any) => void;
type StatusHandler = (status: string) => void;

export class WebSocketEngine {
  private connections: Map<string, { ws: WebSocket; reconnectTimer?: any }> = new Map();

  connect(config: ConnectorConfig, onMessage: MessageHandler, onStatus: StatusHandler): void {
    this.disconnect(config.id);

    try {
      const ws = new WebSocket(config.endpointUrl);

      ws.onopen = () => {
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

      this.connections.set(config.id, { ws });
      } catch {
        onStatus('ERROR');
    }
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

    existing.reconnectTimer = setTimeout(() => {
      this.connect(config, onMessage, onStatus);
    }, 5000);
  }
}

export const webSocketEngine = new WebSocketEngine();
