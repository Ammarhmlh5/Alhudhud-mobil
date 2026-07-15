import { useEffect, useRef, useState, useCallback } from 'react';
import { marsalService, SmsCommand } from '../lib/services/marsal.service';
import { marsalSupabase } from '../lib/supabase/client';
import { sendSms } from '../lib/utils/send-sms';

interface CommandResult {
  command_id: string;
  phone: string;
  status: 'sent' | 'failed';
  error?: string;
}

interface UseMarsalCommandsReturn {
  connected: boolean;
  processing: boolean;
  lastCommands: SmsCommand[];
  lastResults: CommandResult[];
  processCommands: (commands: SmsCommand[]) => Promise<void>;
}

export function useMarsalCommands(trigger?: number): UseMarsalCommandsReturn {
  const [connected, setConnected] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastCommands, setLastCommands] = useState<SmsCommand[]>([]);
  const [lastResults, setLastResults] = useState<CommandResult[]>([]);
  const processingRef = useRef(false);
  const pendingQueueRef = useRef<SmsCommand[]>([]);
  const triggerRef = useRef(trigger);

  const processCommands = useCallback(async (commands: SmsCommand[]) => {
    if (processingRef.current) {
      pendingQueueRef.current.push(...commands);
      return;
    }
    processingRef.current = true;
    setProcessing(true);
    setLastCommands(commands);

    const results: CommandResult[] = [];

    for (const cmd of commands) {
      if (!cmd.phone || !cmd.message) {
        await marsalService.reportSmsStatus(
          cmd.command_id || 'unknown',
          'failed',
          'بيانات أمر غير مكتملة (رقم الهاتف أو الرسالة مفقودة)'
        );
        results.push({
          command_id: cmd.command_id || 'unknown',
          phone: cmd.phone || 'unknown',
          status: 'failed',
          error: 'بيانات أمر غير مكتملة',
        });
        continue;
      }

      try {
        const result = await sendSms(cmd.phone, cmd.message);

        await marsalService.reportSmsStatus(
          cmd.command_id,
          result.success ? 'sent' : 'failed',
          result.error
        );

        results.push({
          command_id: cmd.command_id,
          phone: cmd.phone,
          status: result.success ? 'sent' : 'failed',
          error: result.error,
        });
      } catch (error) {
        await marsalService.reportSmsStatus(
          cmd.command_id,
          'failed',
          error instanceof Error ? error.message : 'خطأ غير معروف'
        );

        results.push({
          command_id: cmd.command_id,
          phone: cmd.phone,
          status: 'failed',
          error: error instanceof Error ? error.message : 'خطأ غير معروف',
        });
      }
    }

    setLastResults(results);
    processingRef.current = false;

    if (pendingQueueRef.current.length > 0) {
      const nextBatch = pendingQueueRef.current.splice(0);
      processCommands(nextBatch);
    } else {
      setProcessing(false);
    }
  }, []);

  useEffect(() => {
    triggerRef.current = trigger;
  }, [trigger]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let authUnsubscribe: (() => void) | null = null;
    let mounted = true;

    const setup = async () => {
      const initialized = await marsalService.init();
      if (!initialized || !mounted) return;

      const deviceId = await marsalService.getStoredDeviceId();
      if (!deviceId || !mounted) return;

      unsubscribe = marsalService.subscribeToCommands(deviceId, (commands) => {
        processCommands(commands);
      });

      if (mounted) setConnected(true);
    };

    setup();

    authUnsubscribe = marsalSupabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        const deviceId = await marsalService.getStoredDeviceId();
        if (deviceId && mounted) {
          if (unsubscribe) unsubscribe();
          unsubscribe = marsalService.subscribeToCommands(deviceId, (commands) => {
            processCommands(commands);
          });
          if (mounted) setConnected(true);
        }
      } else if (event === 'SIGNED_OUT') {
        if (unsubscribe) unsubscribe();
        unsubscribe = null;
        if (mounted) setConnected(false);
      }
    }).data.subscription.unsubscribe;

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
      if (authUnsubscribe) authUnsubscribe();
    };
  }, [processCommands, trigger]);

  return {
    connected,
    processing,
    lastCommands,
    lastResults,
    processCommands,
  };
}
