import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Api } from '../services/api';
import { DisasterAlert, EvacuationCenter } from '../types';
import { OfflineBanner } from '../components/OfflineBanner';
import { useFocusEffect } from '@react-navigation/native';

export const HomeScreen = ({ navigation }: any) => {
  const [alerts, setAlerts] = useState<DisasterAlert[]>([]);
  const [nearestCenter, setNearestCenter] = useState<EvacuationCenter | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [emergencyStatus] = useState<'NORMAL' | 'ADVISORY' | 'WARNING' | 'EVACUATION ORDER'>('ADVISORY');

  const loadData = async () => {
    try {
      const alertRes = await Api.getAlerts();
      setAlerts(alertRes.data);
      setIsOffline(alertRes.isOffline);

      const centerRes = await Api.getCenters();
      if (centerRes.data.length > 0) {
        setNearestCenter(centerRes.data[0]);
      }
    } catch {
      setIsOffline(true);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
      const interval = setInterval(() => {
        loadData();
      }, 3000);
      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const latestAlert = alerts.length > 0 ? alerts[0] : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NORMAL': return '#10b981';
      case 'ADVISORY': return '#0ea5e9';
      case 'WARNING': return '#f59e0b';
      case 'EVACUATION ORDER': return '#ef4444';
      default: return '#64748b';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <OfflineBanner isOffline={isOffline} />

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>Irosin Disaster Safety</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#38bdf8" />
              <Text style={styles.locationText}>Irosin & Bulusan Sector, Sorsogon</Text>
            </View>
          </View>
          <View style={[styles.demoBadge, { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: 'rgba(16, 185, 129, 0.4)' }]}>
            <Text style={[styles.demoBadgeText, { color: '#34d399' }]}>LIVE SYSTEM</Text>
          </View>
        </View>

        {/* Emergency Status Banner */}
        <View style={[styles.statusBanner, { borderColor: getStatusColor(emergencyStatus) }]}>
          <View style={styles.statusHeaderRow}>
            <Ionicons name="shield-checkmark-outline" size={24} color={getStatusColor(emergencyStatus)} />
            <Text style={styles.statusLabel}>MUNICIPAL EMERGENCY STATUS</Text>
          </View>
          <Text style={[styles.statusText, { color: getStatusColor(emergencyStatus) }]}>
            {emergencyStatus}
          </Text>
          <Text style={styles.statusSubtext}>
            {emergencyStatus === 'EVACUATION ORDER'
              ? '🚨 MANDATORY EVACUATION IN EFFECT FOR HIGH RISK AREAS'
              : 'Preemptive monitoring active for Cadacan River & Bulusan volcano sectors.'}
          </Text>
        </View>

        {/* Quick Action Buttons Grid with Outlined Icons */}
        <Text style={styles.sectionTitle}>Quick Emergency Actions</Text>
        <View style={styles.grid}>
          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: '#0284c7' }]}
            onPress={() => navigation.navigate('Map')}
          >
            <Ionicons name="map-outline" size={26} color="#ffffff" style={styles.iconMargin} />
            <Text style={styles.gridTitle}>Emergency Map</Text>
            <Text style={styles.gridSub}>View centers & hazards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: '#059669' }]}
            onPress={() => navigation.navigate('Map', { focusType: 'centers' })}
          >
            <Ionicons name="business-outline" size={26} color="#ffffff" style={styles.iconMargin} />
            <Text style={styles.gridTitle}>Find Center</Text>
            <Text style={styles.gridSub}>Nearest shelter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: '#d97706' }]}
            onPress={() => navigation.navigate('Route', { routeId: 'route-1' })}
          >
            <Ionicons name="navigate-outline" size={26} color="#ffffff" style={styles.iconMargin} />
            <Text style={styles.gridTitle}>Evacuation Route</Text>
            <Text style={styles.gridSub}>Official safe path</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: '#4f46e5' }]}
            onPress={() => navigation.navigate('Preparedness')}
          >
            <Ionicons name="book-outline" size={26} color="#ffffff" style={styles.iconMargin} />
            <Text style={styles.gridTitle}>Preparedness</Text>
            <Text style={styles.gridSub}>Disaster guides</Text>
          </TouchableOpacity>
        </View>

        {/* Nearest Evacuation Center Card */}
        {nearestCenter && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="home-outline" size={16} color="#94a3b8" />
                <Text style={styles.cardHeaderTitle}>Nearest Designated Shelter</Text>
              </View>
              <Text style={styles.distanceBadge}>1.4 km away</Text>
            </View>
            <Text style={styles.centerName}>{nearestCenter.name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#94a3b8" />
              <Text style={styles.centerAddress}>{nearestCenter.address}</Text>
            </View>

            <View style={styles.occupancyBarContainer}>
              <View
                style={[
                  styles.occupancyBarFill,
                  { width: `${Math.round((nearestCenter.currentOccupancy / nearestCenter.capacity) * 100)}%` }
                ]}
              />
            </View>
            <Text style={styles.occupancyText}>
              Status: <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{nearestCenter.status}</Text> • {nearestCenter.currentOccupancy}/{nearestCenter.capacity} Occupied
            </Text>

            <TouchableOpacity
              style={styles.navigateBtn}
              onPress={() => navigation.navigate('CenterDetails', { centerId: nearestCenter.id })}
            >
              <Text style={styles.navigateBtnText}>View Shelter & Facilities</Text>
              <Ionicons name="chevron-forward-outline" size={16} color="#38bdf8" />
            </TouchableOpacity>
          </View>
        )}

        {/* Latest Alert Card */}
        {latestAlert && (
          <View style={[styles.card, { borderColor: '#f59e0b' }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="megaphone-outline" size={16} color="#f59e0b" />
                <Text style={[styles.cardHeaderTitle, { color: '#f59e0b' }]}>
                  Latest Official Announcement
                </Text>
              </View>
              <Text style={styles.alertLevelBadge}>{latestAlert.alertLevel}</Text>
            </View>
            <Text style={styles.alertTitle}>{latestAlert.title}</Text>
            <Text style={styles.alertMessage}>{latestAlert.message}</Text>
            <View style={styles.actionBox}>
              <Text style={styles.actionText}>
                <Text style={{ fontWeight: 'bold' }}>Action:</Text> {latestAlert.recommendedAction}
              </Text>
            </View>
          </View>
        )}

        {/* Report Citizen Hazard Button */}
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => navigation.navigate('ReportDisaster')}
        >
          <Ionicons name="alert-circle-outline" size={26} color="#38bdf8" />
          <View style={{ flex: 1 }}>
            <Text style={styles.reportBtnTitle}>Report Road Obstruction or Hazard</Text>
            <Text style={styles.reportBtnSub}>Submit ground report to MDRRMO Irosin</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={18} color="#94a3b8" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  appTitle: { color: '#f8fafc', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { color: '#38bdf8', fontSize: 12, fontWeight: '600' },
  demoBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  demoBadgeText: { color: '#fcd34d', fontSize: 10, fontWeight: '800' },

  statusBanner: {
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20
  },
  statusHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  statusText: { fontSize: 24, fontWeight: '900', marginVertical: 4 },
  statusSubtext: { color: '#cbd5e1', fontSize: 12, lineHeight: 16 },

  sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  gridCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    justifyContent: 'center'
  },
  iconMargin: { marginBottom: 6 },
  gridTitle: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  gridSub: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 11, marginTop: 2 },

  card: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardHeaderTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
  distanceBadge: { color: '#38bdf8', fontSize: 11, fontWeight: '700' },
  centerName: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  centerAddress: { color: '#94a3b8', fontSize: 12 },
  occupancyBarContainer: { backgroundColor: '#1e293b', height: 6, borderRadius: 3, marginTop: 12, marginBottom: 8, overflow: 'hidden' },
  occupancyBarFill: { backgroundColor: '#10b981', height: '100%' },
  occupancyText: { color: '#cbd5e1', fontSize: 12, marginBottom: 12 },
  navigateBtn: { backgroundColor: '#1e293b', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justify: 'space-between' },
  navigateBtnText: { color: '#38bdf8', fontSize: 13, fontWeight: '700', flex: 1 },

  alertLevelBadge: { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  alertTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  alertMessage: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginBottom: 8 },
  actionBox: { backgroundColor: '#1e293b', padding: 10, borderRadius: 8 },
  actionText: { color: '#fcd34d', fontSize: 12 },

  reportBtn: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  reportBtnTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '800' },
  reportBtnSub: { color: '#94a3b8', fontSize: 11, marginTop: 2 }
});
