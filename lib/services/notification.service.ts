import { Platform, Linking } from 'react-native';
import { gatewayService } from './gateway.service';

let Notifications: typeof import('expo-notifications') | null = null;

function getNotifications() {
  if (!Notifications) {
    try {
      Notifications = require('expo-notifications');
    } catch {
      return null;
    }
  }
  return Notifications;
}

class NotificationService {
  private initialized = false;
  private cleanupFns: Array<() => void> = [];

  async init() {
    if (this.initialized) return;

    const N = getNotifications();
    if (!N) return;

    try {
      N.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (error) {
      console.debug('[Notification] Handler setup failed:', error);
    }

    try {
      const { status } = await N.requestPermissionsAsync();
      if (status !== 'granted') return;

      if (Platform.OS === 'android') {
        await N.setNotificationChannelAsync('webhook-events', {
          name: 'أحداث Webhook',
          importance: N.AndroidImportance.HIGH,
          vibrationPattern: [0, 100, 50, 100],
        });
        await N.setNotificationChannelAsync('sync', {
          name: 'المزامنة',
          importance: N.AndroidImportance.DEFAULT,
        });
      }

      // Register event listeners with cleanup tracking
      const unsub1 = gatewayService.on('WEBHOOK_EVENT', async (msg: any) => {
        let body = msg.connectorId?.slice(0, 8) || '';
        if (msg.connectorName) body = msg.connectorName;
        await this.scheduleLocalNotification({
          title: 'حدث Webhook وارد',
          body: `${body} (${msg.method || 'POST'})`,
          data: msg,
          channelId: 'webhook-events',
        });
      });

      const unsub2 = gatewayService.on('SCHEDULED_SYNC', async (msg: any) => {
        if (msg.connectorName) {
          await this.scheduleLocalNotification({
            title: 'مزامنة تلقائية',
            body: `تمت مزامنة ${msg.connectorName}`,
            data: msg,
            channelId: 'sync',
          });
        }
      });

      this.cleanupFns.push(unsub1, unsub2);

      const responseListener = N.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.connectorId) {
          Linking.openURL(`alhudhud://connectors/${data.connectorId}`).catch(() => {});
        }
      });
      this.cleanupFns.push(() => responseListener.remove());

      this.initialized = true;
    } catch {
      // Permission or channel setup failed
    }
  }

  destroy() {
    for (const fn of this.cleanupFns) {
      try { fn(); } catch {}
    }
    this.cleanupFns = [];
    this.initialized = false;
  }

  private async scheduleLocalNotification({
    title, body, data, channelId,
  }: {
    title: string;
    body: string;
    data?: any;
    channelId?: string;
  }) {
    try {
      const N = getNotifications();
      if (!N) return;
      await N.scheduleNotificationAsync({
        content: { title, body, data, ...(channelId ? { channelId } : {}) },
        trigger: null,
      });
    } catch {
      // Notification scheduling failed
    }
  }
}

export const notificationService = new NotificationService();
