import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  ActivityIndicator,
  Modal,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Api } from "../services/api";
import { OfflineStorage } from "../services/offlineStorage";
import { DisasterAlert, EvacuationCenter } from "../types";
import { OfflineBanner } from "../components/OfflineBanner";
import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import { usePreferences } from "../context/PreferencesContext";
import { UnreadTracker } from "../services/unreadTracker";
import { RealtimeSocket } from "../services/socketService";
import { LinearGradient } from "expo-linear-gradient";

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const HomeScreen = ({ navigation }: any) => {
  const { colors, language, appConfig, theme, t } = usePreferences();
  const [alerts, setAlerts] = useState<DisasterAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ✨ Smooth Pulsing Animation for Skeleton Loaders
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  const SkeletonBlock = ({ width, height, borderRadius = 6, style }: any) => (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme === "dark" ? "rgba(71, 85, 105, 0.6)" : "rgba(203, 213, 225, 0.85)",
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
  const [unreadCounts, setUnreadCounts] = useState({
    power: 0,
    alerts: 0,
    road: 0,
    total: 0,
  });

  const loadData = async (isManualRefresh = false) => {
    // 1. Instant 0ms Local Cache Load
    if (!isManualRefresh) {
      try {
        const cachedAlerts = await OfflineStorage.getCache<DisasterAlert[]>("ALERTS");
        if (cachedAlerts && cachedAlerts.length > 0) {
          setAlerts(cachedAlerts);
        }
      } catch {}
    }

    // 2. Network Stale-While-Revalidate Sync
    try {
      const [alertRes, counts] = await Promise.all([
        Api.getAlerts(undefined, 5),
        UnreadTracker.getUnreadCounts(),
      ]);
      setAlerts(alertRes.data);
      setIsOffline(alertRes.isOffline);
      setUnreadCounts(counts);
    } catch {
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, []),
  );

  useEffect(() => {
    const unsub = UnreadTracker.subscribe(() => {
      UnreadTracker.getUnreadCounts().then(setUnreadCounts);
    });
    return unsub;
  }, []);

  useEffect(() => {
    // ⚡ Real-Time WebSocket Event Listeners for 0ms Live Updates
    const unsubCenters = RealtimeSocket.on("EVACUATION_CENTERS_CHANGED", () => {
      console.log("[HomeScreen] Real-time: Evacuation centers updated");
      loadData();
    });

    const unsubAlerts = RealtimeSocket.on("ALERT_CREATED", () => {
      console.log("[HomeScreen] Real-time: Alert created");
      loadData();
    });

    const unsubAnnounce = RealtimeSocket.on("ANNOUNCEMENTS_CHANGED", () => {
      loadData();
    });

    // 🔔 Push notification fallback
    const notifSub = Notifications.addNotificationReceivedListener(() => {
      loadData();
    });

    return () => {
      unsubCenters();
      unsubAlerts();
      unsubAnnounce();
      notifSub.remove();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const alertRank: Record<string, number> = {
    EVACUATION_ORDER: 4,
    CRITICAL: 4,
    WARNING: 3,
    ADVISORY: 2,
    INFORMATION: 1,
  };

  const sortedAlerts = [...alerts].sort((a, b) => {
    const rankA = alertRank[a.alertLevel] || 0;
    const rankB = alertRank[b.alertLevel] || 0;
    if (rankB !== rankA) return rankB - rankA;
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });

  const latestAlert = sortedAlerts.length > 0 ? sortedAlerts[0] : null;

  const getAlertLevelConfig = (level: string) => {
    switch (level) {
      case "EVACUATION_ORDER":
        return {
          color: "#ef4444",
          bg: "rgba(239, 68, 68, 0.16)",
          icon: "alert-circle" as const,
          label: language === "tl" ? "EVACUATION ORDER" : "EVACUATION ORDER",
        };
      case "WARNING":
        return {
          color: "#f59e0b",
          bg: "rgba(245, 158, 11, 0.16)",
          icon: "warning" as const,
          label: language === "tl" ? "BABALA (WARNING)" : "WARNING",
        };
      case "ADVISORY":
        return {
          color: "#0284c7",
          bg: "rgba(2, 132, 199, 0.16)",
          icon: "information-circle" as const,
          label: language === "tl" ? "PAUNA (ADVISORY)" : "ADVISORY",
        };
      default:
        return {
          color: "#6366f1",
          bg: "rgba(99, 102, 241, 0.16)",
          icon: "megaphone" as const,
          label: language === "tl" ? "IMPORMASYON" : "INFORMATION",
        };
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {/* Aesthetic Minimal Top Header Gradient (Light/White Mode TikTok Inspired with Action Button Color) */}
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

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryLight}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image
              source={require("../../assets/icon.png")}
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                marginRight: 10,
                borderWidth: 1.5,
                borderColor: colors.primaryLight,
              }}
            />
            <View>
              <Text style={[styles.appTitle, { color: colors.text }]}>
                Irosin Disaster Safety
              </Text>
              <View style={styles.locationRow}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={colors.primaryLight}
                />
                <Text
                  style={[styles.locationText, { color: colors.primaryLight }]}
                >
                  Irosin, Sorsogon
                </Text>
              </View>
            </View>
          </View>
          {/* 🚨 Prominent Report Disaster Header Shortcut */}
          <TouchableOpacity
            style={[
              styles.reportTopBtn,
              { backgroundColor: colors.primaryLight, shadowColor: colors.primaryLight },
            ]}
            onPress={() => navigation.navigate("ReportDisaster")}
            activeOpacity={0.85}
          >
            <Ionicons name="megaphone-outline" size={15} color="#ffffff" />
            <Text style={styles.reportTopBtnText}>
              {language === "tl" ? "Mag-ulat" : "Report"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 🚨 PROMINENT EMERGENCY ALERT / MUNICIPAL STATUS (At Top for Maximum Visibility) */}
        {loading && !refreshing && alerts.length === 0 ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(2, 132, 199, 0.05)",
                borderWidth: 0,
                padding: 16,
                marginBottom: 16,
              },
            ]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <SkeletonBlock width={130} height={18} borderRadius={6} />
              <SkeletonBlock width={48} height={18} borderRadius={9} />
            </View>
            <SkeletonBlock width="85%" height={16} borderRadius={6} style={{ marginBottom: 6 }} />
            <SkeletonBlock width="100%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
            <SkeletonBlock width="65%" height={12} borderRadius={4} />
          </View>
        ) : latestAlert ? (
          (() => {
            const cfg = getAlertLevelConfig(latestAlert.alertLevel);
            return (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => navigation.navigate("Alerts")}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    borderWidth: 0,
                    padding: 0,
                    marginBottom: 16,
                    overflow: "hidden",
                    flexDirection: "row",
                    alignItems: "center",
                    minHeight: 90,
                  },
                ]}
              >
                {/* 🔵 Left Curved Dome / Arch Container (Light Blue) */}
                <View
                  style={{
                    width: 92,
                    alignSelf: "stretch",
                    backgroundColor: theme === "dark" ? "rgba(2, 132, 199, 0.22)" : "#e0f2fe",
                    borderTopRightRadius: 58,
                    borderBottomRightRadius: 58,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingRight: 6,
                  }}
                >
                  <Ionicons name="megaphone" size={32} color={theme === "dark" ? "#38bdf8" : "#0284c7"} />
                </View>

                {/* 📝 Right Content Area */}
                <View style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 14, justifyContent: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 }}>
                    <View
                      style={{
                        backgroundColor: cfg.bg,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 9.5, fontWeight: "900", color: cfg.color, textTransform: "uppercase" }}>
                        {cfg.label}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10.5, fontWeight: "800", color: colors.textSecondary, textTransform: "uppercase" }} numberOfLines={1}>
                      • {latestAlert.disasterType}
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontSize: 14.5,
                      fontWeight: "800",
                      color: colors.text,
                      marginBottom: 2,
                      lineHeight: 19,
                    }}
                    numberOfLines={1}
                  >
                    {latestAlert.title}
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      lineHeight: 16,
                    }}
                    numberOfLines={2}
                  >
                    {latestAlert.message}
                  </Text>
                </View>

                {/* ➡️ Right Chevron Arrow */}
                <View style={{ paddingRight: 14 }}>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            );
          })()
        ) : (
          /* Safe & Peaceful Municipal Status (No Active Alerts) */
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate("Alerts")}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderRadius: 16,
                borderWidth: 0,
                padding: 0,
                marginBottom: 16,
                overflow: "hidden",
                flexDirection: "row",
                alignItems: "center",
                minHeight: 88,
              },
            ]}
          >
            {/* 🔵 Left Curved Dome / Arch Container (Light Blue) */}
            <View
              style={{
                width: 92,
                alignSelf: "stretch",
                backgroundColor: theme === "dark" ? "rgba(2, 132, 199, 0.22)" : "#e0f2fe",
                borderTopRightRadius: 58,
                borderBottomRightRadius: 58,
                alignItems: "center",
                justifyContent: "center",
                paddingRight: 6,
              }}
            >
              <Ionicons name="megaphone" size={32} color={theme === "dark" ? "#38bdf8" : "#0284c7"} />
            </View>

            {/* 📝 Right Content Area */}
            <View style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 14, justifyContent: "center" }}>
              <Text
                style={{
                  fontSize: 14.5,
                  fontWeight: "800",
                  color: colors.text,
                  marginBottom: 3,
                }}
              >
                {language === "tl" ? "Ligtas at Normal ang Bayan" : "Municipal Status: All Clear"}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  lineHeight: 16,
                }}
                numberOfLines={2}
              >
                {language === "tl"
                  ? "Walang aktibong banta ng sakuna sa Irosin. Manatiling ligtas at handa."
                  : "No active disaster alerts in Irosin. Stay safe and prepared."}
              </Text>
            </View>

            {/* ➡️ Right Chevron Arrow */}
            <View style={{ paddingRight: 14 }}>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Action Buttons Grid — 2-Column Style (4 Cards) */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("quickActions")}
        </Text>
        <View style={styles.grid}>
          {/* 🗺️ COLUMN 1: EMERGENCY MAP */}
          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: "#0284c7" }]}
            onPress={() => navigation.navigate("Map", { initialTab: "MAP" })}
            activeOpacity={0.85}
          >
            <Ionicons
              name="map-outline"
              size={26}
              color="#ffffff"
              style={styles.iconMargin}
            />
            <Text style={styles.gridTitle}>
              {language === "tl" ? "Mapa ng Sakuna" : "Emergency Map"}
            </Text>
            <Text style={styles.gridSub} numberOfLines={1}>
              {language === "tl" ? "Mga sentro at hazard" : "Centers & hazards"}
            </Text>
          </TouchableOpacity>

          {/* 🏛️ COLUMN 2: EVACUATION CENTERS */}
          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: "#059669" }]}
            onPress={() => navigation.navigate("Map", { initialTab: "CENTERS" })}
            activeOpacity={0.85}
          >
            <Ionicons
              name="business-outline"
              size={26}
              color="#ffffff"
              style={styles.iconMargin}
            />
            <Text style={styles.gridTitle}>
              {language === "tl" ? "Evacuation Center" : "Find Center"}
            </Text>
            <Text style={styles.gridSub} numberOfLines={1}>
              {language === "tl" ? "Pinakamalapit na ligtas" : "Nearest shelter"}
            </Text>
          </TouchableOpacity>

          {/* ⚠️ COLUMN 3: ROAD HAZARDS */}
          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: "#d97706" }]}
            onPress={() => navigation.navigate("RoadHazards")}
            activeOpacity={0.85}
          >
            {unreadCounts.road > 0 && (
              <View style={styles.gridBadge}>
                <Text style={styles.gridBadgeText}>
                  {unreadCounts.road > 9 ? "9+" : unreadCounts.road} BAGO
                </Text>
              </View>
            )}
            <Ionicons
              name="warning-outline"
              size={26}
              color="#ffffff"
              style={styles.iconMargin}
            />
            <Text style={styles.gridTitle}>
              {language === "tl" ? "Hazard at Kondisyon ng Kalsada" : "Hazard & Road Conditions"}
            </Text>
            <Text style={styles.gridSub} numberOfLines={1}>
              {language === "tl" ? "Baha, guho, clearing ops" : "Floods, landslides & clearing"}
            </Text>
          </TouchableOpacity>

          {/* 📢 COLUMN 4: BULLETINS & ANNOUNCEMENTS */}
          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: "#7c3aed" }]}
            onPress={() => navigation.navigate("Announcements")}
            activeOpacity={0.85}
          >
            {unreadCounts.power > 0 && (
              <View style={styles.gridBadge}>
                <Text style={styles.gridBadgeText}>
                  {unreadCounts.power > 9 ? "9+" : unreadCounts.power} BAGO
                </Text>
              </View>
            )}
            <Ionicons
              name="megaphone-outline"
              size={26}
              color="#ffffff"
              style={styles.iconMargin}
            />
            <Text style={styles.gridTitle}>
              {language === "tl" ? "Mga Anunsyo" : "Bulletins"}
            </Text>
            <Text style={styles.gridSub} numberOfLines={1}>
              {language === "tl" ? "Kuryente, klase, ayuda" : "Power, classes, relief"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 16 },
  scrollContent: { paddingBottom: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  appTitle: { fontSize: 19, fontWeight: "900" },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: { fontSize: 13, fontWeight: "700" },
  reportTopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  reportTopBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  statusCard: {
    borderRadius: 12,
    borderWidth: 0,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 14,
    lineHeight: 20,
  },

  // 🌪️ Storm Alert Banner
  stormAlertBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  stormAlertTitle: {
    fontSize: 13.5,
    fontWeight: "900",
  },
  windSignalBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  windSignalBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#ffffff",
  },
  weatherPillSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  weatherPillSmallText: {
    fontSize: 10,
    fontWeight: "900",
  },
  stormAlertDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  stormBannerActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  stormBannerActionText: {
    fontSize: 12,
    fontWeight: "800",
  },

  // 🎛️ Quick Actions Grid (2-Column Style)
  sectionTitle: { fontSize: 17, fontWeight: "900", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  gridCard: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 0,
    padding: 14,
    minHeight: 112,
    justifyContent: "flex-end",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  gridBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gridBadgeText: { color: "#ffffff", fontSize: 10, fontWeight: "900" },
  iconMargin: { marginBottom: 8 },
  gridTitle: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  gridSub: { color: "rgba(255, 255, 255, 0.85)", fontSize: 12, marginTop: 2 },

  // Location Pills
  locPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  locPillText: {
    fontSize: 12,
  },

  // 🌤️ Weather Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  weatherModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeaderRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.15)",
    paddingBottom: 12,
  },
  modalDragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(150, 150, 150, 0.4)",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 10,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 6,
  },

  // 🌤️ Google Weather Style Card on HomeScreen
  googleWeatherCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  googleWeatherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  googleWeatherLocation: {
    fontSize: 13,
    fontWeight: "800",
  },
  googleWeatherMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  googleWeatherNowLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  googleWeatherMainTemp: {
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
  },
  googleWeatherConditionText: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  googleWeatherFeelsText: {
    fontSize: 12,
    fontWeight: "600",
  },
  googleHourlyContainer: {
    marginBottom: 12,
  },
  googleHourlyScrollContent: {
    gap: 12,
    paddingVertical: 2,
  },
  googleHourlyItem: {
    alignItems: "center",
    minWidth: 46,
  },
  googleHourlyTemp: {
    fontSize: 13,
    fontWeight: "800",
  },
  googleHourlyTime: {
    fontSize: 11,
    fontWeight: "600",
  },
  googleMetricsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  googleMetricCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  googleMetricColText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  googleMetricDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(150, 150, 150, 0.2)",
  },

  // Modal weather styles
  weatherShowcaseBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 4,
  },
  showcaseLocation: {
    fontSize: 13,
    fontWeight: "800",
  },
  showcaseTemp: {
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
  },
  showcaseCondition: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  showcaseFeelsLike: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalHourlyItem: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 58,
  },
  modalHourlyTemp: {
    fontSize: 13,
    fontWeight: "800",
  },
  modalHourlyTime: {
    fontSize: 11,
    fontWeight: "600",
  },
  forecastHeading: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  forecastDayItem: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 70,
  },
  forecastDayText: {
    fontSize: 12,
    fontWeight: "800",
  },
  forecastTempText: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  forecastConditionSmall: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  googleMetricRowItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricItemTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  metricItemValue: {
    fontSize: 13,
    fontWeight: "800",
  },

  // Cards
  card: {
    borderRadius: 14,
    borderWidth: 0,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardHeaderTitle: { fontSize: 13, fontWeight: "800" },
  distanceBadge: { fontSize: 12, color: "#38bdf8", fontWeight: "800" },
  centerName: { fontSize: 17, fontWeight: "900", marginBottom: 4 },
  centerAddress: { fontSize: 13, lineHeight: 18 },
  centerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  occupancyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  occupancyText: { fontSize: 13, fontWeight: "700" },
  navigateBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  navigateBtnText: { color: "#38bdf8", fontSize: 13, fontWeight: "800" },
  timeBadge: { fontSize: 12, color: "#64748b", fontWeight: "700" },
  alertTitle: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  alertMessage: { fontSize: 14, lineHeight: 20 },
  viewAlertBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  viewAlertText: { color: "#38bdf8", fontSize: 13, fontWeight: "800" },
});
