import { ENV } from '../config/env';
import { mockStore } from '../utils/mockStore';
import { NotificationLog } from '../types';

export class SMSService {
  public static async sendSMS(recipientPhone: string, message: string, alertId?: string): Promise<{ success: boolean; log: NotificationLog }> {
    const timestamp = new Date().toISOString();
    let providerResponse = '';
    let deliveryStatus: 'SENT' | 'FAILED' | 'MOCK_SENT' = 'MOCK_SENT';

    if (ENV.SMS_API_KEY && ENV.SMS_API_KEY.trim() !== '') {
      try {
        // Integrate with Semaphore API endpoint
        const response = await fetch(ENV.SMS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            apikey: ENV.SMS_API_KEY,
            number: recipientPhone,
            message: message,
            sendername: ENV.SMS_SENDER_NAME
          })
        });

        const data = await response.json();
        providerResponse = JSON.stringify(data);

        if (response.ok) {
          deliveryStatus = 'SENT';
        } else {
          deliveryStatus = 'FAILED';
        }
      } catch (err: any) {
        providerResponse = `HTTP Error: ${err?.message || 'Failed to dispatch SMS'}`;
        deliveryStatus = 'FAILED';
      }
    } else {
      // Mock Mode Logging
      providerResponse = `[DEMO SMS LOGGED] SIMULATED DISPATCH TO ${recipientPhone}: "${message}"`;
      console.log(`[SMS SERVICE - MOCK MODE] Sending to ${recipientPhone}: ${message}`);
    }

    const log: NotificationLog = {
      id: 'sms-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      alertId,
      recipientPhoneOrToken: recipientPhone,
      channel: 'SMS',
      message,
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

  public static async broadcastSMS(phones: string[], message: string, alertId?: string) {
    const results: { success: boolean; log: NotificationLog }[] = [];
    for (const phone of phones) {
      const res = await this.sendSMS(phone, message, alertId);
      results.push(res);
    }
    return results;
  }
}
