import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Api } from '../services/api';
import { EmergencyContact } from '../types';
import { OfflineBanner } from '../components/OfflineBanner';
import { OfflineStorage } from '../services/offlineStorage';
import { usePreferences } from '../context/PreferencesContext';
import { LinearGradient } from 'expo-linear-gradient';

export const EmergencyContactsScreen = () => {
  const { colors, language, theme, t } = usePreferences();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    OfflineStorage.getCache<EmergencyContact[]>('CONTACTS').then(cached => {
      if (cached && cached.length > 0) {
        setContacts(cached);
        setLoading(false);
      }
    });

    loadContacts(false);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContacts(false);
    setRefreshing(false);
  };

  const loadContacts = async (showLoading = false) => {
    try {
      if (showLoading && contacts.length === 0) setLoading(true);
      const res = await Api.getContacts();
      const items = res.data || [];
      if (items.length > 0) {
        setContacts(items);
      }
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {/* Aesthetic Minimal Top Header Gradient */}
      <LinearGradient
        colors={
          theme === "light"
            ? ["#bae6fd", "#e0f2fe", "#f0f9ff", colors.bg]
            : ["rgba(2, 132, 199, 0.18)", "rgba(56, 189, 248, 0.05)", colors.bg]
        }
        locations={[0, 0.35, 0.7, 1]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 280,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
        pointerEvents="none"
      />

      <OfflineBanner isOffline={isOffline} />

      <View
        style={[
          styles.header,
          {
            backgroundColor: "transparent",
            borderBottomWidth: 0,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          },
        ]}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: "rgba(2, 132, 199, 0.12)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(2, 132, 199, 0.25)",
          }}
        >
          <Ionicons name="call" size={22} color="#0284c7" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t('contactsTitle')}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>{t('contactsSub')}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} colors={[colors.primaryLight]} />
        }
      >
        {loading && contacts.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Kinukuha ang direktoryo ng mga numero...' : 'Fetching Emergency Hotlines Directory...'}
            </Text>
          </View>
        ) : contacts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="call-outline" size={32} color={colors.primaryLight} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {language === 'tl' ? 'Walang Nakitang Numero' : 'No Emergency Contacts Found'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Lalabas dito ang mga opisyal na numero mula sa MDRRMO.' : 'Official hotlines will appear here once registered by MDRRMO Admin.'}
            </Text>
          </View>
        ) : (
          contacts.map(contact => (
            <View key={contact.id} style={[styles.contactCard, { backgroundColor: colors.card }]}>
              <View style={styles.contactInfo}>
                <View style={[styles.categoryIconCircle, { backgroundColor: colors.primaryBg }]}>
                  <Ionicons name={getCategoryIcon(contact.category)} size={20} color={colors.primaryLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactName, { color: colors.text }]}>{contact.organization || contact.contactPerson}</Text>
                  <Text style={[styles.contactRole, { color: colors.primaryLight }]}>{contact.description || contact.contactPerson || contact.category}</Text>
                  <Text style={[styles.contactAddress, { color: colors.textMuted }]}>{contact.address}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.callBtn, { backgroundColor: colors.success }]}
                onPress={() => handleCall(contact.phone)}
              >
                <Ionicons name="call-outline" size={16} color="#ffffff" />
                <Text style={styles.callBtnText}>{contact.phone}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 19, fontWeight: '900' },
  sub: { fontSize: 13, marginTop: 2 },
  container: { flex: 1, padding: 14 },
  loadingBox: { padding: 40, alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13 },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 0,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  iconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '900', marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  contactCard: {
    borderRadius: 12,
    borderWidth: 0,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  contactInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  categoryIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  contactName: { fontSize: 16, fontWeight: '900', marginBottom: 2 },
  contactRole: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  contactAddress: { fontSize: 12 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12
  },
  callBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '900' }
});
