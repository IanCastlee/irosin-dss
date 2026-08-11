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

import { ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export const EmergencyContactsScreen = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadContacts();
      const interval = setInterval(() => {
        loadContacts(false);
      }, 3000);
      return () => clearInterval(interval);
    }, [])
  );

  const loadContacts = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await Api.getContacts();
      setContacts(res.data || []);
      setIsOffline(res.isOffline);
    } catch {
      setIsOffline(true);
    } finally {
      setLoading(false);
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
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loadingText}>Fetching Emergency Hotlines Directory...</Text>
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="call-outline" size={32} color="#38bdf8" />
            </View>
            <Text style={styles.emptyTitle}>No Emergency Contacts Found</Text>
            <Text style={styles.emptyText}>Official hotlines will appear here once registered by MDRRMO Admin.</Text>
          </View>
        ) : (
          contacts.map(c => (
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
          ))
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  orgHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  orgName: { color: '#f8fafc', fontSize: 16, fontWeight: '800' },
  person: { color: '#94a3b8', fontSize: 12 },
  address: { color: '#64748b', fontSize: 11, marginTop: 2 },
  categoryBadge: { backgroundColor: '#1e293b', color: '#38bdf8', fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  phoneText: { color: '#38bdf8', fontSize: 16, fontWeight: '900', marginVertical: 6 },
  description: { color: '#cbd5e1', fontSize: 12, marginBottom: 12 },

  callBtn: { backgroundColor: '#059669', paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  callBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },

  emptyCard: { padding: 32, alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 20, borderWidth: 1, borderColor: '#1e293b', marginTop: 12 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(56, 189, 248, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  emptyText: { color: '#94a3b8', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { color: '#38bdf8', fontSize: 13, fontWeight: '700' }
});
