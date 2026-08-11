import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Api } from '../services/api';
import { EvacuationCenter } from '../types';

export const EvacuationCenterDetailsScreen = ({ route, navigation }: any) => {
  const { centerId } = route.params || {};
  const [center, setCenter] = useState<EvacuationCenter | null>(null);

  useEffect(() => {
    loadCenter();
  }, [centerId]);

  const loadCenter = async () => {
    const res = await Api.getCenters();
    const found = res.data.find(c => c.id === centerId) || res.data[0];
    if (found) setCenter(found);
  };

  if (!center) return null;

  const occupancyPct = Math.round((center.currentOccupancy / center.capacity) * 100);

  const handleCall = () => {
    if (center.contactPhone) {
      Linking.openURL(`tel:${center.contactPhone}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.name}>{center.name}</Text>
          <Text style={styles.barangay}>📍 Barangay {center.barangayName}, Irosin, Sorsogon</Text>
          <Text style={styles.address}>{center.address}</Text>
        </View>

        {/* Status & Capacity Card */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.statusBadge, { color: center.status === 'OPEN' ? '#10b981' : '#f59e0b' }]}>
              {center.status}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Capacity:</Text>
            <Text style={styles.val}>{center.currentOccupancy} / {center.capacity} Persons ({occupancyPct}%)</Text>
          </View>

          <View style={styles.barBackground}>
            <View style={[styles.barFill, { width: `${occupancyPct}%` }]} />
          </View>
        </View>

        {/* Facilities Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Available Shelter Facilities</Text>
          <View style={styles.facilitiesGrid}>
            {[
              ['Water Supply', center.facilities.water, '💧'],
              ['Food Assistance', center.facilities.food, '🍚'],
              ['Medical Station', center.facilities.medical, '🏥'],
              ['Restrooms', center.facilities.restrooms, '🚻'],
              ['Electricity / Gen', center.facilities.electricity, '⚡'],
              ['Sleeping Area', center.facilities.sleepingArea, '🛏️'],
              ['PWD Accessible', center.facilities.pwdAccessible, '♿'],
            ].map(([name, active, emoji]: any) => (
              <View key={name} style={[styles.facilityItem, active ? styles.facActive : styles.facInactive]}>
                <Text style={styles.facEmoji}>{emoji}</Text>
                <Text style={[styles.facName, active ? styles.facTextActive : styles.facTextInactive]}>
                  {name} {active ? '✓' : '✗'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact Person */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Evacuation Center Coordinator</Text>
          <Text style={styles.val}>Contact: {center.contactPerson}</Text>
          <Text style={styles.phoneText}>Phone: {center.contactPhone}</Text>

          <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
            <Text style={styles.callBtnText}>📞 Call Center Hotline ({center.contactPhone})</Text>
          </TouchableOpacity>
        </View>

        {/* Navigation Action */}
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Map', params: { focusCenterId: center.id } })}
        >
          <Text style={styles.navBtnText}>🗺️ View Official Route on Emergency Map</Text>
        </TouchableOpacity>

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
  header: { marginBottom: 20 },
  name: { color: '#f8fafc', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  barangay: { color: '#38bdf8', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  address: { color: '#94a3b8', fontSize: 12 },

  card: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#94a3b8', fontSize: 13 },
  val: { color: '#f8fafc', fontSize: 13, fontWeight: '700' },
  phoneText: { color: '#38bdf8', fontSize: 14, fontWeight: '800', marginTop: 4 },
  statusBadge: { fontSize: 13, fontWeight: '800' },

  barBackground: { backgroundColor: '#1e293b', height: 8, borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  barFill: { backgroundColor: '#10b981', height: '100%' },

  facilitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  facilityItem: { width: '48%', padding: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  facActive: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  facInactive: { backgroundColor: '#1e293b' },
  facEmoji: { fontSize: 16 },
  facName: { fontSize: 11, fontWeight: '700' },
  facTextActive: { color: '#34d399' },
  facTextInactive: { color: '#64748b' },

  callBtn: { backgroundColor: '#059669', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  callBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },

  navBtn: { backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 20 },
  navBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' }
});
