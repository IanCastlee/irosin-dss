/**
 * ExpoPushNotificationService
 * Sends real push notifications via the Expo Push API → FCM → User's phone
 * Works even when the app is closed or in the background.
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

export interface PushResult {
  totalTokens: number;
  validTokensCount: number;
  invalidTokensCount: number;
  expoResponse?: any;
  error?: string;
  tokensUsed?: string[];
}

export class ExpoPushService {
  /**
   * Send a push notification to a list of Expo push tokens.
   * Returns complete diagnostic payload for debugging.
   */
  static async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<PushResult> {
    if (!tokens || tokens.length === 0) {
      console.log('[PushService] No tokens provided.');
      return { totalTokens: 0, validTokensCount: 0, invalidTokensCount: 0, error: 'No tokens in DB' };
    }

    const validTokens = tokens.filter(
      t => typeof t === 'string' && (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['))
    );

    const invalidTokensCount = tokens.length - validTokens.length;

    if (validTokens.length === 0) {
      console.warn(`[PushService] Found ${tokens.length} total tokens, but 0 are valid Expo tokens. Raw tokens:`, tokens);
      return {
        totalTokens: tokens.length,
        validTokensCount: 0,
        invalidTokensCount,
        error: `Found ${tokens.length} tokens, but none match ExponentPushToken[...] format. Raw sample: ${tokens.slice(0, 3).join(', ')}`
      };
    }

    const messages: ExpoMessage[] = validTokens.map(token => ({
      to: token,
      title,
      body,
      sound: 'default',
      priority: 'high',
      channelId: 'emergency-alerts',
      data: data || {}
    }));

    try {
      console.log(`[PushService] Sending to Expo API with ${validTokens.length} tokens:`, validTokens);
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messages)
      });

      const responseText = await response.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = { raw: responseText };
      }

      if (!response.ok) {
        console.error('[PushService] Expo Push API HTTP Error:', response.status, responseText);
        return {
          totalTokens: tokens.length,
          validTokensCount: validTokens.length,
          invalidTokensCount,
          expoResponse: responseJson,
          error: `HTTP ${response.status}: ${responseText}`
        };
      }

      console.log('[PushService] Expo Response:', JSON.stringify(responseJson, null, 2));

      return {
        totalTokens: tokens.length,
        validTokensCount: validTokens.length,
        invalidTokensCount,
        expoResponse: responseJson,
        tokensUsed: validTokens
      };
    } catch (err: any) {
      console.error('[PushService] Exception while sending push batch:', err);
      return {
        totalTokens: tokens.length,
        validTokensCount: validTokens.length,
        invalidTokensCount,
        error: err.message || 'Unknown network failure connecting to Expo Push API'
      };
    }
  }
}
