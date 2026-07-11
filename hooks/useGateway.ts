import { useEffect, useState, useCallback } from 'react';
import { gatewayService } from '@/lib/services/gateway.service';
import { useAuth } from './useAuth';

export function useGateway() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      gatewayService.disconnect();
      setConnected(false);
      return;
    }

    gatewayService.connect();

    const unsubConn = gatewayService.on('CONNECTION', (msg) => {
      setConnected(msg.status === 'connected');
    });

    const unsubAll = gatewayService.on('*', (msg) => {
      if (msg.type !== 'PONG' && msg.type !== 'CONNECTED') {
        setLastEvent(msg);
      }
    });

    return () => {
      unsubConn();
      unsubAll();
      gatewayService.disconnect();
    };
  }, [user]);

  const sendMessage = useCallback((type: string, data?: any) => {
    return gatewayService.send({ type, ...data });
  }, []);

  return { connected, lastEvent, sendMessage };
}
