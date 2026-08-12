import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';

const FIREBASE_REST_BASE =
  'https://firestore.googleapis.com/v1/projects/irosin-disaster-system-e2388/databases/(default)/documents';

const BACKEND_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api/v1';

// Set notification handling behavior for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Configure High-Priority Android Notification Channel
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
 * Register device for Expo Push Notifications
 */
async function registerForPushNotifications() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Push] Permission not granted on device.');
      return;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      'a055f98d-7d56-47b6-87cc-ed5af96f5e9f';

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    console.log('[Push] Device Push Token:', token);

    const docId = encodeURIComponent(token.replace(/[^a-zA-Z0-9_-]/g, '_'));

    // 1. Store in Firestore via REST API
    try {
      await fetch(`${FIREBASE_REST_BASE}/push_tokens?documentId=${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            token: { stringValue: token },
            platform: { stringValue: Platform.OS },
            registeredAt: { stringValue: new Date().toISOString() }
          }
        })
      });
      console.log('[Push] Token registered to Firestore REST API');
    } catch (fsErr) {
      console.warn('[Push] Firestore REST write warning:', fsErr);
    }

    // 2. Store in Backend API if reachable
    try {
      await fetch(`${BACKEND_API_URL}/alerts/push-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, platform: Platform.OS })
      });
      console.log('[Push] Token registered to Backend API');
    } catch (apiErr) {
      console.warn('[Push] Backend API write warning:', apiErr);
    }
  } catch (err) {
    console.error('[Push] Token registration failed:', err);
  }
}

export default function App() {
  useEffect(() => {
    registerForPushNotifications();

    const fgSub = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Push] Foreground notification:', notification.request.content);
    });

    const bgSub = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[Push] Notification tapped:', response.notification.request.content);
    });

    return () => {
      fgSub.remove();
      bgSub.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
