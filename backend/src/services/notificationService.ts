import { messaging, isFirebaseActive } from '../config/firebase';
import { mockStore } from '../utils/mockStore';
import { NotificationLog } from '../types';

export class NotificationService {
  public static async sendPushNotification(
    tokenOrTopic: string,
    title: string,
    body: string,
    dataPayload?: Record<string, string>,
    alertId?: string
  ): Promise<{ success: boolean; log: NotificationLog }> {
    const timestamp = new Date().toISOString();
    let providerResponse = '';
    let deliveryStatus: 'SENT' | 'FAILED' | 'MOCK_SENT' = 'MOCK_SENT';

    if (isFirebaseActive() && messaging) {
      try {
        const messagePayload: any = {
          notification: { title, body },
          data: dataPayload || {}
        };
        if (tokenOrTopic.startsWith('topic:')) {
          messagePayload.topic = tokenOrTopic.replace('topic:', '');
        } else {
          messagePayload.token = tokenOrTopic;
        }

        const response = await messaging.send(messagePayload);
        providerResponse = response;
        deliveryStatus = 'SENT';
      } catch (err: any) {
        providerResponse = `FCM Error: ${err?.message || 'Failed push message'}`;
        deliveryStatus = 'FAILED';
      }
    } else {
      providerResponse = `[DEMO PUSH LOGGED] SIMULATED PUSH TO ${tokenOrTopic}: "${title} - ${body}"`;
      console.log(`[PUSH SERVICE - MOCK MODE] Destination: ${tokenOrTopic} | Title: ${title} | Body: ${body}`);
    }

    const log: NotificationLog = {
      id: 'push-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      alertId,
      recipientPhoneOrToken: tokenOrTopic,
      channel: 'PUSH',
      message: `${title}: ${body}`,
      providerResponse,
      deliveryStatus,
      timestamp
    };

    mockStore.notificationLogs.unshift(log);

    return {
      success: deliveryStatus === 'SENT' || deliveryStatus === 'MOCK_SENT',
      log
    };
  }
}
