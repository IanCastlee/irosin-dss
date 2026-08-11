import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Api } from '../services/api';
import { EvacuationRoute } from '../types';

export const EvacuationRouteScreen = ({ route, navigation }: any) => {
  const { routeId } = route.params || {};
  const [routeData, setRouteData] = useState<EvacuationRoute | null>(null);

  useEffect(() => {
    loadRoute();
  }, [routeId]);

  const loadRoute = async () => {
    const res = await Api.getRoutes();
    const found = res.data.find(r => r.id === routeId) || res.data[0];
    if (found) setRouteData(found);
  };

  if (!routeData) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{routeData.routeName}</Text>
        <Text style={styles.sub}>Barangay {routeData.barangayName} • Verified Safe Path</Text>

        {/* Mandatory Policy Warning Box */}
        <View style={styles.policyBox}>
          <Text style={styles.policyTitle}>🛡️ MDRRMO OFFICIAL SAFE ROUTE</Text>
          <Text style={styles.policyText}>
            This route has been inspected and designated by MDRRMO Irosin personnel to avoid high-risk Cadacan River flooding and landslide hazard cuts.
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statVal}>{routeData.distanceKm} km</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Est. Walking Time</Text>
            <Text style={styles.statVal}>{routeData.estimatedMinutes} mins</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={[styles.statVal, { color: '#10b981' }]}>{routeData.status}</Text>
          </View>
        </View>

        {/* Route Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Origin & Destination</Text>
          <Text style={styles.label}>Origin:</Text>
          <Text style={styles.val}>{routeData.originDescription}</Text>

          <Text style={[styles.label, { marginTop: 8 }]}>Destination Shelter:</Text>
          <Text style={styles.val}>{routeData.destinationCenterName}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Official Step-by-Step Instructions</Text>
          <Text style={styles.instructionsText}>{routeData.instructions}</Text>
        </View>

        {routeData.hazardWarnings.length > 0 && (
          <View style={[styles.card, { borderColor: '#f59e0b' }]}>
            <Text style={[styles.cardTitle, { color: '#f59e0b' }]}>⚠️ Route Warnings & Precautions</Text>
            {routeData.hazardWarnings.map((w, idx) => (
              <Text key={idx} style={styles.warningItem}>• {w}</Text>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  container: { flex: 1, padding: 16 },
  backBtn: { marginBottom: 12 },
  backBtnText: { color: '#38bdf8', fontSize: 14, fontWeight: '700' },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '900', marginBottom: 4 },
  sub: { color: '#38bdf8', fontSize: 12, marginBottom: 16 },

  policyBox: { backgroundColor: 'rgba(14, 165, 233, 0.15)', borderColor: 'rgba(14, 165, 233, 0.4)', borderWidth: 1, padding: 14, borderRadius: 14, marginBottom: 16 },
  policyTitle: { color: '#38bdf8', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  policyText: { color: '#bae6fd', fontSize: 12, lineHeight: 16 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#0f172a', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
  statLabel: { color: '#94a3b8', fontSize: 10, uppercase: true },
  statVal: { color: '#f8fafc', fontSize: 14, fontWeight: '800', marginTop: 4 },

  card: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '800', marginBottom: 10 },
  label: { color: '#94a3b8', fontSize: 11 },
  val: { color: '#cbd5e1', fontSize: 13, fontWeight: '700' },
  instructionsText: { color: '#f8fafc', fontSize: 13, lineHeight: 20 },
  warningItem: { color: '#fcd34d', fontSize: 12, marginBottom: 4 }
});
