import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export const MoreScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>System Profile & Settings</Text>
        <Text style={styles.sub}>Irosin Disaster Safety App v1.0</Text>
      </View>

      <ScrollView style={styles.container}>
        {/* Selected Barangay Profile Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="location-outline" size={18} color="#38bdf8" />
            <Text style={styles.cardHeader}>Selected Barangay Profile</Text>
          </View>
          <Text style={styles.valTitle}>Barangay Monbon</Text>
          <Text style={styles.valSub}>Municipality of Irosin, Province of Sorsogon</Text>
          <Text style={styles.valDetail}>Assigned Evacuation Center: Irosin Central Gym / Monbon Hub</Text>
        </View>

        {/* Offline Cache Status */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="cloud-offline-outline" size={18} color="#10b981" />
            <Text style={styles.cardHeader}>Offline Data Support</Text>
          </View>
          <Text style={styles.valDetail}>✓ Emergency Contacts Cached locally</Text>
          <Text style={styles.valDetail}>✓ Preparedness Guides Cached locally</Text>
          <Text style={styles.valDetail}>✓ Evacuation Center Directory Cached locally</Text>
          <Text style={styles.valDetail}>✓ Official Safe Routes Cached locally</Text>
        </View>

        {/* System Info & Credentials */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#38bdf8" />
            <Text style={styles.cardHeader}>LGU System Credentials</Text>
          </View>
          <Text style={styles.valSub}>Issued by: MDRRMO Irosin Disaster Response Operations</Text>
          <Text style={styles.valSub}>Covered Barangays: Monbon, San Agustin, Gabao, San Julian, Buenavista</Text>
        </View>

        {/* Action Button: Submit Report */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('ReportDisaster')}
        >
          <Ionicons name="megaphone-outline" size={20} color="#ffffff" />
          <Text style={styles.actionBtnText}>Submit Ground Hazard Report</Text>
        </TouchableOpacity>

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
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  cardHeader: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
  valTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  valSub: { color: '#38bdf8', fontSize: 12, marginBottom: 4 },
  valDetail: { color: '#cbd5e1', fontSize: 12, marginTop: 4 },

  actionBtn: { backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  actionBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' }
});
