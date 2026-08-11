import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { RootNavigator } from './src/navigation/RootNavigator';

const FIREBASE_REST_BASE =
  'https://firestore.googleapis.com/v1/projects/irosin-disaster-system-e2388/databases/(default)/documents';

// Show banners, sound and badge for any notification received while app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Create Android notification channel for maximum priority alerts
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('emergency-alerts', {
    name: 'Emergency Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF0000',
    sound: 'default',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });
}

/**
 * Register this device's Expo Push Token and save it to Firestore.
 * This token is later used by the backend to send real FCM push notifications.
 */
async function registerPushToken() {
  try {
    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('[Push] Permission not granted — push notifications will not work.');
      return;
    }

    // Get the Expo push token for this device
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      'a055f98d-7d56-47b6-87cc-ed5af96f5e9f'; // EAS project ID from app.json

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    console.log('[Push] Expo Push Token:', token);

    // Save token to Firestore under push_tokens/{token}
    // We use the token itself as the doc ID so it's naturally deduplicated
    const docUrl = `${FIREBASE_REST_BASE}/push_tokens/${encodeURIComponent(token)}`;
    await fetch(docUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          token: { stringValue: token },
          platform: { stringValue: Platform.OS },
          registeredAt: { stringValue: new Date().toISOString() }
        }
      })
    });
    console.log('[Push] Token saved to Firestore successfully.');
  } catch (err) {
    console.error('[Push] Error registering push token:', err);
  }
}

export default function App() {
  useEffect(() => {
    // Register this device for real FCM push notifications
    registerPushToken();

    // Listen for notifications tapped by user (when app is in background/closed)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[Push] Notification tapped:', response.notification.request.content);
      // Future: navigate to alert detail screen based on response.notification.request.content.data
    });

    return () => subscription.remove();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <RootNavigator />
    </>
  );
}
