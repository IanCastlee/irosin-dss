import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PreferencesProvider } from './src/context/PreferencesContext';
import { soundService } from './src/services/soundService';

const FIREBASE_REST_BASE =
  'https://firestore.googleapis.com/v1/projects/irosin-disaster-system-e2388/databases/(default)/documents';

const BACKEND_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api/v1';

// Set notification handling behavior for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => {
    let playSound = true;
    try {
      const soundVal = await AsyncStorage.getItem('@setting_notif_sound');
      if (soundVal !== null) playSound = JSON.parse(soundVal);
    } catch {}

    return {
      shouldShowAlert: true,
      shouldPlaySound: playSound,
      shouldSetBadge: true,
    };
  },
});

// Configure High-Priority Android Notification Channel safely
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('emergency-alerts', {
    name: 'Emergency Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500, 250, 500],
    lightColor: '#FF0000',
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  }).catch(() => {});
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

import { LoadingScreen } from './src/components/LoadingScreen';
import { usePreferences } from './src/context/PreferencesContext';
import { OfflineStorage } from './src/services/offlineStorage';

function MainApp() {
  const { theme, colors } = usePreferences();
  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.bg} />
      <RootNavigator />
    </>
  );
}

function LoadingWrapper() {
  const { theme, colors } = usePreferences();
  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.bg} />
      <LoadingScreen
        message="Irosin Disaster Safety"
        subMessage="Connecting to MDRRMO Emergency Command..."
      />
    </>
  );
}

export default function App() {
  const [isAppReady, setIsAppReady] = React.useState(false);

  useEffect(() => {
    // 0. Mandatory Fresh Install / Reinstall Cache Purge
    OfflineStorage.ensureCleanCacheOnInstallOrUpgrade().catch(e => {
      console.warn('[Cache] Auto-cleanup warning:', e);
    });

    // 1. Run Push Notification & background registrations non-blocking
    registerForPushNotifications().catch(e => {
      console.warn('[Push] Background registration warning:', e);
    });

    // 2. Guaranteed smooth 1.2s splash timer (will never get stuck)
    const timer = setTimeout(() => {
      setIsAppReady(true);
    }, 1200);

    const fgSub = Notifications.addNotificationReceivedListener(async notification => {
      try {
        console.log('[Push] Foreground notification:', notification.request.content);
        // 1. Immediate Vibration First (Reset motor state)
        try {
          const vibVal = await AsyncStorage.getItem('@setting_notif_vibrate');
          const isVib = vibVal !== null ? JSON.parse(vibVal) : true;
          if (isVib) {
            Vibration.cancel();
            setTimeout(() => {
              try {
                Vibration.vibrate([0, 500, 200, 500], false);
              } catch {}
            }, 30);
          }
        } catch {}

        // 2. Play Local Bundled Emergency Audio Chime (Auto-unloads after playing)
        try {
          soundService.playEmergencyAlertSound().catch(() => {});
        } catch {}
      } catch (listenerErr) {
        console.warn('[Push] Foreground listener error handled safely:', listenerErr);
      }
    });

    const bgSub = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[Push] Notification tapped:', response.notification.request.content);
    });

    return () => {
      clearTimeout(timer);
      fgSub.remove();
      bgSub.remove();
    };
  }, []);

  if (!isAppReady) {
    return (
      <SafeAreaProvider>
        <PreferencesProvider>
          <LoadingWrapper />
        </PreferencesProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <MainApp />
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
