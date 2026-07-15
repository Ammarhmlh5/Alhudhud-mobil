import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { marsalService } from '../services/marsal.service';
import { useMarsalCommands } from '../../hooks/useMarsalCommands';

interface MarsalContextValue {
  connected: boolean;
  deviceRegistered: boolean;
  processing: boolean;
  lastCommands: any[];
  lastResults: any[];
  loginToMarsal: (email: string, password: string) => Promise<boolean>;
  registerDevice: () => Promise<boolean>;
  logoutFromMarsal: () => Promise<void>;
  checkConnection: () => Promise<void>;
}

const MarsalContext = createContext<MarsalContextValue>({
  connected: false,
  deviceRegistered: false,
  processing: false,
  lastCommands: [],
  lastResults: [],
  loginToMarsal: async () => false,
  registerDevice: async () => false,
  logoutFromMarsal: async () => {},
  checkConnection: async () => {},
});

export function MarsalProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [trigger, setTrigger] = useState(0);
  const { processing, lastCommands, lastResults } = useMarsalCommands(trigger);

  const checkConnection = useCallback(async () => {
    const initialized = await marsalService.init();
    setConnected(initialized);

    if (initialized) {
      const deviceId = await marsalService.getStoredDeviceId();
      setDeviceRegistered(!!deviceId);
      setTrigger(prev => prev + 1);
    } else {
      setDeviceRegistered(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const loginToMarsal = useCallback(async (email: string, password: string): Promise<boolean> => {
    const result = await marsalService.login(email, password);
    if (result) {
      setConnected(true);
      setTrigger(prev => prev + 1);
    }
    return result;
  }, []);

  const registerDevice = useCallback(async (): Promise<boolean> => {
    const deviceId = await marsalService.registerDevice();
    if (deviceId) {
      setDeviceRegistered(true);
      setTrigger(prev => prev + 1);
      return true;
    }
    return false;
  }, []);

  const logoutFromMarsal = useCallback(async () => {
    await marsalService.logout();
    setConnected(false);
    setDeviceRegistered(false);
    setTrigger(prev => prev + 1);
  }, []);

  return (
    <MarsalContext.Provider value={{
      connected,
      deviceRegistered,
      processing,
      lastCommands,
      lastResults,
      loginToMarsal,
      registerDevice,
      logoutFromMarsal,
      checkConnection,
    }}>
      {children}
    </MarsalContext.Provider>
  );
}

export function useMarsal() {
  return useContext(MarsalContext);
}
