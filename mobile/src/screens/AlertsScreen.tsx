import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Api } from '../services/api';
import { DisasterAlert } from '../types';
import { OfflineBanner } from '../components/OfflineBanner';

import { useFocusEffect } from '@react-navigation/native';

export const AlertsScreen = () => {
  const [alerts, setAlerts] = useState<DisasterAlert[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadAlerts();
      const interval = setInterval(() => {
        loadAlerts();
      }, 3000);
      return () => clearInterval(interval);
    }, [])
  );

  const loadAlerts = async () => {
    try {
      const res = await Api.getAlerts();
      if (res.data && res.data.length > 0) {
        setAlerts(res.data);
      }
      setIsOffline(res.isOffline);
    } catch {
      setIsOffline(true);
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
        {alerts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#10b981" />
            <Text style={styles.emptyText}>No emergency alerts broadcasted at this time.</Text>
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

  emptyCard: { padding: 32, alignItems: 'center', gap: 8 },
  emptyText: { color: '#64748b', fontSize: 13 }
});
