/**
 * ExpoPushNotificationService
 * Sends real push notifications via the Expo Push API → FCM → User's phone
 * Works even when the app is closed or in the background.
 *
 * Architecture:
 *   createAlert() → sendToAllTokens() → Expo Push API → FCM → 📱 User
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  sound?: 'default';
  priority?: 'high' | 'normal';
  channelId?: string;
  data?: Record<string, any>;
}

export class ExpoPushService {
  /**
   * Send a push notification to a list of Expo push tokens.
   * Automatically chunks requests into batches of 100 (Expo API limit).
   */
  static async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    if (!tokens || tokens.length === 0) {
      console.log('[PushService] No tokens to send to.');
      return;
    }

    // Filter to valid Expo push tokens only
    const validTokens = tokens.filter(
      t => typeof t === 'string' && (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['))
    );

    if (validTokens.length === 0) {
      console.warn('[PushService] No valid Expo push tokens found.');
      return;
    }

    // Chunk into batches of 100
    const chunks: string[][] = [];
    for (let i = 0; i < validTokens.length; i += 100) {
      chunks.push(validTokens.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      const messages: ExpoMessage[] = chunk.map(token => ({
        to: token,
        title,
        body,
        sound: 'default',
        priority: 'high',
        channelId: 'emergency-alerts',
        data: data || {}
      }));

      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messages)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[PushService] Expo Push API error:', response.status, errorText);
        } else {
          const result = await response.json();
          console.log(`[PushService] Sent ${chunk.length} push notifications. Result:`, JSON.stringify(result?.data?.slice(0, 2)));
        }
      } catch (err) {
        console.error('[PushService] Failed to send push batch:', err);
      }
    }
  }
}
