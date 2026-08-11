import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Api } from '../services/api';
import { DisasterAlert } from '../types';
import { OfflineBanner } from '../components/OfflineBanner';

import * as Notifications from 'expo-notifications';
import { useFocusEffect } from '@react-navigation/native';

export const AlertsScreen = () => {
  const [alerts, setAlerts] = useState<DisasterAlert[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seenAlertIds, setSeenAlertIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    React.useCallback(() => {
      loadAlerts();
      const interval = setInterval(() => {
        loadAlerts(false);
      }, 3000);
      return () => clearInterval(interval);
    }, [seenAlertIds])
  );

  const loadAlerts = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await Api.getAlerts();
      const fetchedAlerts = res.data || [];
      setAlerts(fetchedAlerts);
      setIsOffline(res.isOffline);

      // Check for new active alerts to trigger instant Push Notification with sound
      fetchedAlerts.forEach((a: DisasterAlert) => {
        if (!seenAlertIds.has(a.id) && a.status === 'ACTIVE') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: `🚨 ${a.title}`,
              body: `${a.message}\nAction: ${a.recommendedAction}`,
              sound: 'default',
              channelId: 'emergency-alerts',
            },
            trigger: null,
          });
          setSeenAlertIds(prev => new Set(prev).add(a.id));
        }
      });
    } catch {
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <OfflineBanner isOffline={isOffline} />

      <View style={styles.header}>
        <Text style={styles.title}>Official Disaster Alerts Feed</Text>
        <Text style={styles.sub}>MDRRMO Irosin Disaster Response Center</Text>
      </View>

      <ScrollView style={styles.container}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#ef4444" />
            <Text style={styles.loadingText}>Connecting to Emergency Alert Feed...</Text>
          </View>
        ) : alerts.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark-outline" size={32} color="#10b981" />
            </View>
            <Text style={styles.emptyTitle}>All Clear — No Active Alerts</Text>
            <Text style={styles.emptySubText}>There are currently no active emergency bulletins or evacuation orders issued by MDRRMO Admin.</Text>
          </View>
        ) : (
          alerts.map(a => {
            const isEvacuation = a.alertLevel === 'EVACUATION_ORDER';
            return (
              <View
                key={a.id}
                style={[
                  styles.card,
                  isEvacuation && { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }
                ]}
              >
                <View style={styles.row}>
                  <Text style={[styles.badge, isEvacuation ? styles.badgeEvac : styles.badgeNormal]}>
                    {a.alertLevel.replace('_', ' ')}
                  </Text>
                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={12} color="#64748b" />
                    <Text style={styles.date}>{new Date(a.startTime).toLocaleTimeString()}</Text>
                  </View>
                </View>

                {isEvacuation && (
                  <View style={styles.evacHighlight}>
                    <Ionicons name="warning-outline" size={18} color="#ffffff" />
                    <Text style={styles.evacHighlightText}>EVACUATE NOW</Text>
                  </View>
                )}

                <Text style={styles.alertTitle}>{a.title}</Text>
                <Text style={styles.alertMessage}>{a.message}</Text>

                <View style={styles.actionBox}>
                  <Text style={styles.actionHeader}>Recommended Official Action:</Text>
                  <Text style={styles.actionText}>{a.recommendedAction}</Text>
                </View>

                <Text style={styles.authority}>Authority: {a.issuingAuthority}</Text>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  header: { padding: 16, backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '900' },
  sub: { color: '#38bdf8', fontSize: 12, marginTop: 2 },

  container: { flex: 1, padding: 16 },
  card: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badge: { fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeNormal: { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d' },
  badgeEvac: { backgroundColor: '#ef4444', color: '#ffffff' },
  date: { color: '#64748b', fontSize: 11 },

  evacHighlight: { backgroundColor: '#ef4444', padding: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: 8 },
  evacHighlightText: { color: '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },

  alertTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  alertMessage: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginBottom: 12 },

  actionBox: { backgroundColor: '#1e293b', padding: 12, borderRadius: 10, marginBottom: 8 },
  actionHeader: { color: '#38bdf8', fontSize: 11, fontWeight: '800', marginBottom: 2 },
  actionText: { color: '#fcd34d', fontSize: 12, fontWeight: '700' },
  authority: { color: '#64748b', fontSize: 11, fontStyle: 'italic' },

  emptyCard: { padding: 32, alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 20, borderWidth: 1, borderColor: '#1e293b', marginTop: 12 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  emptySubText: { color: '#94a3b8', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { color: '#ef4444', fontSize: 13, fontWeight: '700' }
});
