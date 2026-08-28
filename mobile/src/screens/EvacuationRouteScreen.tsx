import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Api } from '../services/api';
import { EvacuationRoute } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { usePreferences } from '../context/PreferencesContext';
import { LinearGradient } from 'expo-linear-gradient';

export const EvacuationRouteScreen = ({ route, navigation }: any) => {
  const { colors, language, theme } = usePreferences();
  const { routeId, barangayName } = route.params || {};
  const [allRoutes, setAllRoutes] = useState<EvacuationRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<EvacuationRoute | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadRoutes();
    }, [routeId, barangayName])
  );

  const loadRoutes = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await Api.getRoutes();
      if (res.data && res.data.length > 0) {
        setAllRoutes(res.data);
        let found = res.data.find(r => r.id === routeId);
        if (!found && barangayName) {
          found = res.data.find(r =>
            String(r.barangayName || '').toLowerCase().includes(String(barangayName).toLowerCase())
          );
        }
        setSelectedRoute(found || res.data[0]);
      } else {
        setAllRoutes([]);
        setSelectedRoute(null);
      }
    } catch {
      setAllRoutes([]);
      setSelectedRoute(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
          <Text style={[styles.loadingText, { color: colors.primaryLight }]}>
            {language === 'tl' ? 'Kinukuha ang Opisyal na Ruta ng Paglikas...' : 'Loading Official Evacuation Route...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedRoute) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={[styles.backBtnText, { color: colors.primaryLight }]}>
              {language === 'tl' ? '← Bumalik' : '← Back'}
            </Text>
          </TouchableOpacity>
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="navigate-outline" size={32} color={colors.primaryLight} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {language === 'tl' ? 'Walang Nakatalang Ruta ng Paglikas' : 'No Official Evacuation Route Found'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {language === 'tl'
                ? 'Ang mga opisyal na ligtas na ruta ay lalabas dito kapag itinalaga na ng MDRRMO Admin.'
                : 'Official safe routes for this sector will appear here once designated by MDRRMO Admin.'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const routeData = selectedRoute;

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
              <Ionicons name="walk" size={22} color="#10b981" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>{routeData.routeName}</Text>
              <Text style={[styles.sub, { color: colors.textSecondary }]}>Brgy. {routeData.barangayName} • Verified Safe Path</Text>
            </View>
          </View>
        </View>

        {/* Multiple Routes Selector (If more than 1 route exists) */}
        {allRoutes.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
            style={{ marginBottom: 4 }}
          >
            {allRoutes.map((r, idx) => {
              const isSelected = r.id === selectedRoute.id;
              return (
                <TouchableOpacity
                  key={r.id || idx}
                  onPress={() => setSelectedRoute(r)}
                  style={{
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.cardBorder,
                    borderWidth: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Ionicons
                    name="navigate-circle"
                    size={16}
                    color={isSelected ? "#ffffff" : colors.primaryLight}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: isSelected ? "900" : "700",
                      color: isSelected ? "#ffffff" : colors.text,
                    }}
                  >
                    {r.routeName || `Ruta ${idx + 1}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Mandatory Policy Warning Box */}
        <View style={[styles.policyBox, { backgroundColor: colors.primaryBg, borderColor: colors.primaryLight }]}>
          <Text style={[styles.policyTitle, { color: colors.primaryLight }]}>🛡️ MDRRMO OFFICIAL SAFE ROUTE</Text>
          <Text style={[styles.policyText, { color: colors.textSecondary }]}>
            This route has been inspected and designated by MDRRMO Irosin personnel to avoid high-risk Cadacan River flooding and landslide hazard cuts.
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Distance</Text>
            <Text style={[styles.statVal, { color: colors.text }]}>{routeData.distanceKm ? `${routeData.distanceKm} km` : ((routeData as any).distance || '1.5 km')}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Est. Walking Time</Text>
            <Text style={[styles.statVal, { color: colors.text }]}>{routeData.estimatedMinutes ? `${routeData.estimatedMinutes} mins` : ((routeData as any).estimatedTime || '15 mins')}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Status</Text>
            <Text style={[styles.statVal, { color: '#10b981' }]}>{routeData.status || 'ACTIVE'}</Text>
          </View>
        </View>

        {/* Route Details */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Origin & Destination</Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>Origin:</Text>
          <Text style={[styles.val, { color: colors.text }]}>{routeData.originDescription || 'Barangay Center'}</Text>

          <Text style={[styles.label, { color: colors.textMuted, marginTop: 8 }]}>Destination Shelter:</Text>
          <Text style={[styles.val, { color: colors.text }]}>{routeData.destinationCenterName || 'Designated Evacuation Shelter'}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Official Step-by-Step Instructions</Text>
          <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>{routeData.instructions || 'Follow official road directional signs and municipal safety markers.'}</Text>
        </View>

        {Array.isArray(routeData.hazardWarnings) && routeData.hazardWarnings.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: '#f59e0b' }]}>⚠️ Road Hazard Precautions</Text>
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
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 16 },
  backBtn: { marginBottom: 12 },
  backBtnText: { fontSize: 14, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  sub: { fontSize: 13, marginBottom: 16 },

  policyBox: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  policyTitle: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  policyText: { fontSize: 13, lineHeight: 18 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  statLabel: { fontSize: 10, textTransform: 'uppercase' },
  statVal: { fontSize: 14, fontWeight: '800', marginTop: 4 },

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
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  label: { fontSize: 12 },
  val: { fontSize: 14, fontWeight: '700' },
  instructionsText: { fontSize: 14, lineHeight: 20 },
  warningItem: { color: '#f59e0b', fontSize: 13, marginBottom: 4 },

  emptyCard: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 0,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  iconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  loadingBox: { flex: 1, padding: 40, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '700' }
});
