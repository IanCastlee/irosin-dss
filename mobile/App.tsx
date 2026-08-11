import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Api } from './src/services/api';

// Set notification handler to show banners and sound
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('emergency-alerts', {
    name: 'Emergency Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF0000',
    sound: 'default',
  });
}

export default function App() {
  useEffect(() => {
    async function requestPermissions() {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch {
        // Ignore permission error
      }
    }
    requestPermissions();

    // Global real-time alert listener for system-wide Push Notifications
    const seenIds = new Set<string>();
    const interval = setInterval(async () => {
      try {
        const res = await Api.getAlerts();
        if (res.data) {
          res.data.forEach((a: any) => {
            if (!seenIds.has(a.id) && a.status === 'ACTIVE') {
              seenIds.add(a.id);
              Notifications.scheduleNotificationAsync({
                content: {
                  title: `🚨 ${a.title}`,
                  body: `${a.message}\nAction: ${a.recommendedAction}`,
                  sound: 'default',
                  channelId: 'emergency-alerts',
                },
                trigger: null,
              });
            }
          });
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <RootNavigator />
    </>
  );
}
