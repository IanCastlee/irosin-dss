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
 * Register this device's Expo Push Token and save it to Firestore & Backend.
 */
async function registerPushToken() {
  try {
    console.log('[Push] Requesting push notification permissions...');
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

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      'a055f98d-7d56-47b6-87cc-ed5af96f5e9f';

    console.log('[Push] Requesting Expo Push Token with projectId:', projectId);
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    console.log('[Push] Received Expo Push Token:', token);

    const docId = encodeURIComponent(token.replace(/[^a-zA-Z0-9_-]/g, '_'));

    // Method 1: Save directly to Firestore via REST API (POST document with documentId query param)
    const firestoreUrl = `${FIREBASE_REST_BASE}/push_tokens?documentId=${docId}`;
    const payload = {
      fields: {
        token: { stringValue: token },
        platform: { stringValue: Platform.OS },
        registeredAt: { stringValue: new Date().toISOString() }
      }
    };

    try {
      const fsRes = await fetch(firestoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (fsRes.ok) {
        console.log('[Push] Token created in Firestore via REST POST!');
      } else {
        // If document already exists (409 Conflict), update it via PATCH with updateMask
        const patchUrl = `${FIREBASE_REST_BASE}/push_tokens/${docId}?updateMask.fieldPaths=token&updateMask.fieldPaths=platform&updateMask.fieldPaths=registeredAt`;
        const patchRes = await fetch(patchUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        console.log('[Push] Token updated in Firestore via REST PATCH status:', patchRes.status);
      }
    } catch (fsErr) {
      console.warn('[Push] Firestore REST write warning:', fsErr);
    }

    // Method 2: Also send token to backend API if reachable
    try {
      await fetch(`${BACKEND_API_URL}/alerts/push-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, platform: Platform.OS })
      });
      console.log('[Push] Token registered via backend API successfully.');
    } catch (backendErr) {
      console.log('[Push] Backend API unreachable (offline or local server):', backendErr);
    }

  } catch (err) {
    console.error('[Push] Error registering push token:', err);
  }
}

export default function App() {
  useEffect(() => {
    registerPushToken();

    // Listen for incoming notifications when app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Push] Notification received in foreground:', notification.request.content);
    });

    // Handle notification tap (when app is background/closed)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[Push] Notification tapped:', response.notification.request.content);
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
