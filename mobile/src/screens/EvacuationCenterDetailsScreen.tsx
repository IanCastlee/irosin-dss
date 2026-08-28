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
import { EvacuationCenter } from '../types';
import { LoadingScreen } from '../components/LoadingScreen';
import { usePreferences } from '../context/PreferencesContext';
import { LinearGradient } from 'expo-linear-gradient';

export const EvacuationCenterDetailsScreen = ({ route, navigation }: any) => {
  const { colors, language, theme } = usePreferences();
  const { centerId } = route.params || {};
  const [center, setCenter] = useState<EvacuationCenter | null>(null);

  useEffect(() => {
    loadCenter();
  }, [centerId]);

  const loadCenter = async () => {
    try {
      const res = await Api.getCenters();
      const found = res.data.find(c => c.id === centerId) || res.data[0];
      if (found) setCenter(found);
    } catch {
      // Ignore
    }
  };

  if (!center) {
    return <LoadingScreen message="Kinukuha ang Detalye ng Evacuation Center..." subMessage="Fetching capacity & available facilities..." />;
  }

  const occupancyPct = Math.round((center.currentOccupancy / center.capacity) * 100);

  const handleCall = () => {
    if (center.contactPhone) {
      Linking.openURL(`tel:${center.contactPhone}`);
    }
  };

  const rawFac = center.facilities;
  const isArr = Array.isArray(rawFac);
  const facList: string[] = isArr ? (rawFac as string[]).map(s => s.toLowerCase()) : [];

  const hasFac = (key: string, matchArr: string[]) => {
    if (!rawFac) return true;
    if (isArr) {
      return matchArr.some(m => facList.some(item => item.includes(m)));
    }
    return (rawFac as any)[key] ?? true;
  };

  const fac = {
    water: hasFac('water', ['water', 'tubig']),
    food: hasFac('food', ['food', 'kitchen', 'pagkain', 'relief']),
    medical: hasFac('medical', ['medical', 'clinic', 'first aid', 'aid', 'gamot']),
    restrooms: hasFac('restrooms', ['restroom', 'toilet', 'cr', 'comfort']),
    electricity: hasFac('electricity', ['electricity', 'power', 'generator', 'ilaw']),
    sleepingArea: hasFac('sleepingArea', ['sleeping', 'bed', 'mat']),
    pwdAccessible: hasFac('pwdAccessible', ['pwd', 'accessible', 'ramp', 'wheelchair']),
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

      <ScrollView style={styles.container}>
        {/* Top Header */}
        <View
          style={{
            paddingBottom: 8,
            borderBottomWidth: 0,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>

            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(16, 185, 129, 0.25)",
              }}
            >
              <Ionicons name="business" size={22} color="#10b981" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{center.name}</Text>
              <Text style={[styles.barangay, { color: colors.textSecondary }]} numberOfLines={1}>📍 Brgy. {center.barangayName}, Irosin</Text>
            </View>
          </View>
        </View>

        {/* Status & Capacity Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{language === 'tl' ? 'Katayuan:' : 'Status:'}</Text>
            <Text style={[styles.statusBadge, { color: center.status === 'OPEN' ? colors.success : colors.accent }]}>
              {center.status}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{language === 'tl' ? 'Kapasidad:' : 'Capacity:'}</Text>
            <Text style={[styles.val, { color: colors.text }]}>
              {center.currentOccupancy} / {center.capacity} {language === 'tl' ? 'Tao' : 'Persons'} ({occupancyPct}%)
            </Text>
          </View>

          <View style={[styles.barBackground, { backgroundColor: colors.inputBg }]}>
            <View style={[styles.barFill, { width: `${Math.min(occupancyPct, 100)}%`, backgroundColor: occupancyPct > 80 ? colors.danger : colors.primary }]} />
          </View>
        </View>

        {/* Facilities Section */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {language === 'tl' ? 'Pasilidad at Kagamitan' : 'Shelter Facilities'}
          </Text>
          <View style={styles.facGrid}>
            <View style={styles.facItem}>
              <Ionicons name={fac.water ? "water" : "water-outline"} size={16} color={fac.water ? colors.primaryLight : colors.textMuted} />
              <Text style={[styles.facText, { color: fac.water ? colors.text : colors.textMuted }]}>
                {language === 'tl' ? 'Malinis na Tubig' : 'Clean Water'}
              </Text>
            </View>
            <View style={styles.facItem}>
              <Ionicons name={fac.electricity ? "flash" : "flash-outline"} size={16} color={fac.electricity ? colors.accent : colors.textMuted} />
              <Text style={[styles.facText, { color: fac.electricity ? colors.text : colors.textMuted }]}>
                {language === 'tl' ? 'Kuryente / Generator' : 'Power / Generator'}
              </Text>
            </View>
            <View style={styles.facItem}>
              <Ionicons name={fac.medical ? "medkit" : "medkit-outline"} size={16} color={fac.medical ? colors.danger : colors.textMuted} />
              <Text style={[styles.facText, { color: fac.medical ? colors.text : colors.textMuted }]}>
                {language === 'tl' ? 'Medical Station' : 'Medical Station'}
              </Text>
            </View>
            <View style={styles.facItem}>
              <Ionicons name={fac.food ? "restaurant" : "restaurant-outline"} size={16} color={fac.food ? colors.success : colors.textMuted} />
              <Text style={[styles.facText, { color: fac.food ? colors.text : colors.textMuted }]}>
                {language === 'tl' ? 'Kusina / Relief' : 'Community Kitchen'}
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Hotline */}
        {center.contactPhone && (
          <TouchableOpacity style={[styles.callBtn, { backgroundColor: colors.success }]} onPress={handleCall}>
            <Ionicons name="call-outline" size={18} color="#ffffff" />
            <Text style={styles.callBtnText}>
              {language === 'tl' ? `Tawagan ang Center Head (${center.contactPhone})` : `Call Center Manager (${center.contactPhone})`}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backBtnText: { fontSize: 14, fontWeight: '700' },
  header: { marginBottom: 16 },
  name: { fontSize: 21, fontWeight: '900', marginBottom: 4 },
  barangay: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  address: { fontSize: 13 },
  card: {
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '700' },
  statusBadge: { fontSize: 14, fontWeight: '900' },
  val: { fontSize: 14, fontWeight: '800' },
  barBackground: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '900', marginBottom: 12 },
  facGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  facItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  facText: { fontSize: 13, fontWeight: '600' },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  callBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' }
});
