/**
 * ExpoPushService
 * Reliable Expo Push Notification Dispatcher
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface ExpoPushResult {
  success: boolean;
  totalTokens: number;
  validTokensCount: number;
  tokens: string[];
  expoResponse?: any;
  error?: string;
}

export class ExpoPushService {
  /**
   * Send push notifications to a list of Expo push tokens.
   */
  static async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, any> = {}
  ): Promise<ExpoPushResult> {
    if (!tokens || tokens.length === 0) {
      return {
        success: false,
        totalTokens: 0,
        validTokensCount: 0,
        tokens: [],
        error: 'No push tokens provided to send'
      };
    }

    // Filter valid tokens
    const validTokens = Array.from(
      new Set(
        tokens.filter(
          t => typeof t === 'string' && (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['))
        )
      )
    );

    if (validTokens.length === 0) {
      return {
        success: false,
        totalTokens: tokens.length,
        validTokensCount: 0,
        tokens,
        error: `Received ${tokens.length} token(s), but 0 matched ExponentPushToken[...] format`
      };
    }

    const messages = validTokens.map(token => ({
      to: token,
      title,
      body,
      sound: 'default',
      priority: 'high',
      channelId: 'emergency-alerts',
      data
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

      const responseText = await response.text();
      let responseJson: any;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = { rawText: responseText };
      }

      if (!response.ok) {
        return {
          success: false,
          totalTokens: tokens.length,
          validTokensCount: validTokens.length,
          tokens: validTokens,
          expoResponse: responseJson,
          error: `Expo Push API responded with HTTP ${response.status}`
        };
      }

      return {
        success: true,
        totalTokens: tokens.length,
        validTokensCount: validTokens.length,
        tokens: validTokens,
        expoResponse: responseJson
      };
    } catch (err: any) {
      return {
        success: false,
        totalTokens: tokens.length,
        validTokensCount: validTokens.length,
        tokens: validTokens,
        error: err.message || 'Network request failed'
      };
    }
  }
}
