import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { authService } from './auth.service';

interface Client {
  ws: WebSocket;
  userId: string;
}

const clients: Map<string, Client[]> = new Map();

let keepaliveTimer: any = null;

export function initWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  if (!keepaliveTimer) {
    keepaliveTimer = setInterval(() => {
      for (const [, userClients] of clients) {
        for (const client of userClients) {
          if (client.ws.readyState === WebSocket.OPEN) {
            try { client.ws.ping(); } catch {}
          }
        }
      }
    }, 30000);
  }

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Token required');
      return;
    }

    const decoded = authService.verifyToken(token);
    if (!decoded) {
      ws.close(4001, 'Invalid token');
      return;
    }

    const userId = decoded.id;
    if (!clients.has(userId)) {
      clients.set(userId, []);
    }
    clients.get(userId)!.push({ ws, userId });

    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'مرحباً بك في Gateway' }));

    ws.on('close', () => {
      const userClients = clients.get(userId);
      if (userClients) {
        const idx = userClients.findIndex(c => c.ws === ws);
        if (idx !== -1) userClients.splice(idx, 1);
        if (userClients.length === 0) clients.delete(userId);
      }
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
        }
      } catch {}
    });
  });

  return wss;
}

export function broadcastToUser(userId: string, message: any) {
  const userClients = clients.get(userId);
  if (!userClients) return;

  const payload = JSON.stringify(message);
  for (const client of userClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

export function broadcastToAll(message: any) {
  const payload = JSON.stringify(message);
  for (const [, userClients] of clients) {
    for (const client of userClients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }
}
