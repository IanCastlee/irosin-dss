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
import { Ionicons } from '@expo/vector-icons';
import { Api } from '../services/api';
import { EmergencyContact } from '../types';
import { OfflineBanner } from '../components/OfflineBanner';

export const EmergencyContactsScreen = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const res = await Api.getContacts();
      setContacts(res.data);
      setIsOffline(res.isOffline);
    } catch {
      setIsOffline(true);
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'MDRRMO': return 'shield-checkmark-outline';
      case 'POLICE': return 'shield-outline';
      case 'FIRE_STATION': return 'flame-outline';
      case 'HOSPITAL': return 'medical-outline';
      default: return 'call-outline';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <OfflineBanner isOffline={isOffline} />

      <View style={styles.header}>
        <Text style={styles.title}>Emergency Contacts Directory</Text>
        <Text style={styles.sub}>Official LGU & Emergency Hotlines — Irosin, Sorsogon</Text>
      </View>

      <ScrollView style={styles.container}>
        {contacts.map(c => (
          <View key={c.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.orgHeaderRow}>
                <Ionicons name={getCategoryIcon(c.category)} size={24} color="#38bdf8" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.orgName}>{c.organization}</Text>
                  <Text style={styles.person}>{c.contactPerson}</Text>
                  <Text style={styles.address}>📍 {c.address}</Text>
                </View>
              </View>
              <Text style={styles.categoryBadge}>{c.category.replace('_', ' ')}</Text>
            </View>

            <Text style={styles.phoneText}>{c.phone}</Text>
            <Text style={styles.description}>{c.description}</Text>

            <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(c.phone)}>
              <Ionicons name="call-outline" size={18} color="#ffffff" />
              <Text style={styles.callBtnText}>Tap to Call ({c.phone})</Text>
            </TouchableOpacity>
          </View>
        ))}

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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  orgHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  orgName: { color: '#f8fafc', fontSize: 16, fontWeight: '800' },
  person: { color: '#94a3b8', fontSize: 12 },
  address: { color: '#64748b', fontSize: 11, marginTop: 2 },
  categoryBadge: { backgroundColor: '#1e293b', color: '#38bdf8', fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  phoneText: { color: '#38bdf8', fontSize: 16, fontWeight: '900', marginVertical: 6 },
  description: { color: '#cbd5e1', fontSize: 12, marginBottom: 12 },

  callBtn: { backgroundColor: '#059669', paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  callBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' }
});
