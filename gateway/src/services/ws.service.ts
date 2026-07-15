import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { authService } from './auth.service';

interface Client {
  ws: WebSocket;
  userId: string;
}

const clients: Map<string, Client[]> = new Map();
let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

const MAX_CONNECTIONS_PER_USER = 5;
const MAX_MESSAGE_SIZE = 64 * 1024; // 64KB

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
    // ── Method 1: Token in query string (legacy, less secure) ──
    const url = new URL(req.url || '', 'http://localhost');
    const tokenFromQuery = url.searchParams.get('token');

    // ── Method 2: Token in first message (preferred) ──
    let authenticated = false;
    let userId = '';

    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        ws.close(4001, 'Authentication timeout (10s)');
      }
    }, 10000);

    // Accept query string token for backward compatibility
    if (tokenFromQuery) {
      const decoded = authService.verifyToken(tokenFromQuery);
      if (decoded) {
        authenticated = true;
        userId = decoded.id;
        clearTimeout(authTimeout);
        registerClient(ws, userId);
      } else {
        ws.close(4002, 'Invalid token');
        clearTimeout(authTimeout);
        return;
      }
    }

    ws.on('message', (data) => {
      try {
        const msgStr = typeof data === 'string' ? data : data.toString();
        if (Buffer.byteLength(msgStr) > MAX_MESSAGE_SIZE) {
          ws.close(4004, 'Message too large');
          return;
        }
        const msg = JSON.parse(msgStr);

        // Handle auth message
        if (msg.type === 'auth' && !authenticated) {
          const decoded = authService.verifyToken(msg.token);
          if (decoded) {
            authenticated = true;
            userId = decoded.id;
            clearTimeout(authTimeout);
            registerClient(ws, userId);
          } else {
            ws.close(4002, 'Invalid token');
          }
          return;
        }

        // Handle ping
        if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
          return;
        }

        // Ignore other messages before auth
        if (!authenticated) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Not authenticated' }));
        }
      } catch {
        // Invalid JSON — ignore
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimeout);
      removeClient(ws, userId);
    });

    ws.on('error', () => {
      clearTimeout(authTimeout);
      removeClient(ws, userId);
    });
  });

  return wss;
}

function registerClient(ws: WebSocket, userId: string) {
  if (!clients.has(userId)) {
    clients.set(userId, []);
  }
  const userClients = clients.get(userId)!;
  if (userClients.length >= MAX_CONNECTIONS_PER_USER) {
    ws.close(4003, 'Max connections reached');
    return;
  }
  userClients.push({ ws, userId });
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'مرحباً بك في Gateway' }));
}

function removeClient(ws: WebSocket, userId: string) {
  if (!userId) return;
  const userClients = clients.get(userId);
  if (userClients) {
    const idx = userClients.findIndex(c => c.ws === ws);
    if (idx !== -1) userClients.splice(idx, 1);
    if (userClients.length === 0) clients.delete(userId);
  }
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

export function closeWebSocket() {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
  }
  for (const [, userClients] of clients) {
    for (const client of userClients) {
      try { client.ws.close(); } catch {}
    }
  }
  clients.clear();
}
