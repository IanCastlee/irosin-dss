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
  const [weather, setWeather] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("irosin");
  const [showWeatherModal, setShowWeatherModal] = useState<boolean>(false);
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

  const handleSelectLocation = async (locKey: string) => {
    setSelectedLocation(locKey);
    try {
      const res = await Api.getWeather(locKey);
      if (res.data) {
        setWeather(res.data);
      }
    } catch (err) {
      console.warn("Error switching weather location:", err);
    }
  };

  const loadData = async (isManualRefresh = false) => {
    // 1. Instant 0ms Local Cache Load
    if (!isManualRefresh) {
      try {
        const [cachedAlerts, cachedWeather] = await Promise.all([
          OfflineStorage.getCache<DisasterAlert[]>("ALERTS"),
          OfflineStorage.getCache<any>("IROSIN_WEATHER"),
        ]);
        if (cachedAlerts && cachedAlerts.length > 0) {
          setAlerts(cachedAlerts);
        }
        if (cachedWeather) {
          setWeather(cachedWeather);
        }
      } catch {}
    }

    // 2. Network Stale-While-Revalidate Sync
    try {
      const [alertRes, counts, weatherRes] = await Promise.all([
        Api.getAlerts(undefined, 5),
        UnreadTracker.getUnreadCounts(),
        Api.getWeather(selectedLocation),
      ]);
      setAlerts(alertRes.data);
      setIsOffline(alertRes.isOffline);
      setUnreadCounts(counts);
      if (weatherRes.data) {
        setWeather(weatherRes.data);
      }
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
            const isCritical = latestAlert.alertLevel === "CRITICAL" || latestAlert.alertLevel === "EVACUATION_ORDER";
            const isWarning = latestAlert.alertLevel === "WARNING";
            
            // Gradient backgrounds inspired by reference announcement banner
            const gradientColors = isCritical
              ? (theme === "dark" ? ["#450a0a", "#1c1917"] : ["#fff1f2", "#ffe4e6"])
              : isWarning
              ? (theme === "dark" ? ["#451a03", "#1c1917"] : ["#fffbeb", "#fef3c7"])
              : (theme === "dark" ? ["#2e1065", "#1e1b4b"] : ["#f5f3ff", "#ede9fe"]);

            const accentColor = isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#8b5cf6";
            const badgeBg = isCritical ? "#dc2626" : isWarning ? "#d97706" : "#7c3aed";

            return (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => navigation.navigate("Alerts")}
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  marginBottom: 16,
                  elevation: 0,
                  shadowOpacity: 0,
                }}
              >
                <LinearGradient
                  colors={gradientColors as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                  }}
                >
                  {/* Top Bar: Megaphone Icon with Sound Waves + Badge */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                      {/* 3D-styled Megaphone Emblem */}
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          backgroundColor: badgeBg,
                          alignItems: "center",
                          justifyContent: "center",
                          shadowColor: badgeBg,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.35,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <Ionicons name="megaphone" size={19} color="#ffffff" />
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                          <View
                            style={{
                              backgroundColor: badgeBg,
                              paddingHorizontal: 7,
                              paddingVertical: 2.5,
                              borderRadius: 5,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: "900", color: "#ffffff", letterSpacing: 0.4, textTransform: "uppercase" }}>
                              {latestAlert.alertLevel.replace("_", " ")}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, fontWeight: "800", color: accentColor, textTransform: "uppercase" }}>
                            • {latestAlert.disasterType}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: "600" }}>
                      {new Date(latestAlert.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>

                  {/* Speech Bubble / Announcement Inner Box */}
                  <View
                    style={{
                      backgroundColor: theme === "dark" ? "rgba(15, 23, 42, 0.75)" : "#ffffff",
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 10,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: theme === "dark" ? 0 : 0.04,
                      shadowRadius: 3,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14.5,
                        fontWeight: "900",
                        color: colors.text,
                        marginBottom: 4,
                        lineHeight: 20,
                      }}
                    >
                      {latestAlert.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12.5,
                        color: colors.textSecondary,
                        lineHeight: 18,
                      }}
                      numberOfLines={2}
                    >
                      {latestAlert.message}
                    </Text>
                  </View>

                  {/* Action Footer */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                      {new Date(latestAlert.startTime).toLocaleDateString()}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        backgroundColor: badgeBg,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: "900", color: "#ffffff" }}>
                        {alerts.length > 1
                          ? (language === "tl" ? `Lahat ng Alerto (${alerts.length})` : `View all Advisories (${alerts.length})`)
                          : (language === "tl" ? "Tingnan ang Alerto" : "View Advisory")}
                      </Text>
                      <Ionicons name="arrow-forward" size={13} color="#ffffff" />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })()
        ) : (
          /* Safe & Peaceful Municipal Status (No Active Alerts - Megaphone Announcement Style) */
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate("Alerts")}
            style={{
              borderRadius: 16,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <LinearGradient
              colors={theme === "dark" ? ["#064e3b", "#022c22"] : ["#ecfdf5", "#d1fae5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                padding: 14,
                borderRadius: 16,
              }}
            >
              {/* Top Bar: Megaphone Icon + All Clear Badge */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  {/* 3D-styled Megaphone Emblem */}
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: "#059669",
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: "#059669",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Ionicons name="megaphone" size={19} color="#ffffff" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <View
                        style={{
                          backgroundColor: "#059669",
                          paddingHorizontal: 7,
                          paddingVertical: 2.5,
                          borderRadius: 5,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: "900", color: "#ffffff", letterSpacing: 0.4, textTransform: "uppercase" }}>
                          {language === "tl" ? "LIGTAS AT NORMAL" : "ALL CLEAR"}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: "#10b981", textTransform: "uppercase" }}>
                        • MDRRMO IROSIN
                      </Text>
                    </View>
                  </View>
                </View>

                <Ionicons name="shield-checkmark" size={18} color="#10b981" />
              </View>

              {/* Speech Bubble / Announcement Inner Box */}
              <View
                style={{
                  backgroundColor: theme === "dark" ? "rgba(15, 23, 42, 0.75)" : "#ffffff",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: theme === "dark" ? 0 : 0.04,
                  shadowRadius: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 14.5,
                    fontWeight: "900",
                    color: colors.text,
                    marginBottom: 4,
                    lineHeight: 20,
                  }}
                >
                  {language === "tl" ? "Walang Aktibong Banta ng Sakuna" : "No Active Disaster Alerts"}
                </Text>
                <Text
                  style={{
                    fontSize: 12.5,
                    color: colors.textSecondary,
                    lineHeight: 18,
                  }}
                  numberOfLines={2}
                >
                  {language === "tl"
                    ? "Normal ang sitwasyon sa buong munisipalidad ng Irosin. Manatiling alerto at handa sa anumang oras."
                    : "Normal situation across Irosin. Stay alert and prepared at all times."}
                </Text>
              </View>

              {/* Action Footer */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    backgroundColor: "#059669",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: "900", color: "#ffffff" }}>
                    {language === "tl" ? "Tingnan ang Alerto" : "View Advisories"}
                  </Text>
                  <Ionicons name="arrow-forward" size={13} color="#ffffff" />
                </View>
              </View>
            </LinearGradient>
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

        {/* 🚨 ACTIVE STORM / TYPHOON / WEATHER WARNING BANNER (Positioned below Quick Actions) */}
        {/* 🌤️ GOOGLE-WEATHER STYLE SHOWCASE CARD OR SKELETON LOADER */}
        {weather?.current ? (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setShowWeatherModal(true)}
            style={[
              styles.googleWeatherCard,
              {
                backgroundColor: theme === "light" ? "#f8fafc" : "rgba(15, 23, 42, 0.75)",
                borderColor: theme === "light" ? "rgba(226, 232, 240, 0.9)" : "rgba(51, 65, 85, 0.6)",
              },
            ]}
          >
            {/* Header: Location & Weather Label */}
            <View style={styles.googleWeatherHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Ionicons name="location-outline" size={14} color={colors.primaryLight} />
                <Text style={[styles.googleWeatherLocation, { color: colors.text }]}>
                  {weather.location?.municipality || "Irosin"}, {weather.location?.province || "Sorsogon"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 11.5, fontWeight: "700", color: colors.primaryLight }}>
                  {language === "tl" ? "Detalyadong Ulat" : "Forecast"}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primaryLight} />
              </View>
            </View>

            {/* Main Temperature & Condition Row (Exact Google Weather Layout) */}
            <View style={styles.googleWeatherMainRow}>
              {/* Left: Now 31° with weather icon */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View>
                  <Text style={[styles.googleWeatherNowLabel, { color: colors.textSecondary }]}>
                    {language === "tl" ? "Ngayon" : "Now"}
                  </Text>
                  <Text style={[styles.googleWeatherMainTemp, { color: colors.text }]}>
                    {weather.current.temperature}°
                  </Text>
                </View>
                <Ionicons
                  name={weather.current.icon || "partly-sunny-outline"}
                  size={42}
                  color="#f59e0b"
                />
              </View>

              {/* Right: Mostly cloudy & Feels like 37° */}
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.googleWeatherConditionText, { color: colors.text }]}>
                  {language === "tl" ? weather.current.conditionLabel : weather.current.conditionEn}
                </Text>
                <Text style={[styles.googleWeatherFeelsText, { color: colors.textMuted }]}>
                  {language === "tl" ? "Pakiramdam: " : "Feels like "}
                  {weather.current.apparentTemperature}°
                </Text>
              </View>
            </View>

            {/* Hourly Forecast Strip (Google Weather Carousel) */}
            {weather.hourlyForecast && weather.hourlyForecast.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.googleHourlyScrollContent}
                style={styles.googleHourlyContainer}
              >
                {weather.hourlyForecast.slice(0, 7).map((item: any, idx: number) => (
                  <View key={idx} style={styles.googleHourlyItem}>
                    <Text style={[styles.googleHourlyTemp, { color: colors.text }]}>
                      {item.temperature}°
                    </Text>
                    <Ionicons
                      name={item.icon || "partly-sunny-outline"}
                      size={20}
                      color={item.icon?.includes("sunny") ? "#f59e0b" : "#60a5fa"}
                      style={{ marginVertical: 4 }}
                    />
                    <Text style={[styles.googleHourlyTime, { color: colors.textSecondary }]}>
                      {idx === 0 ? (language === "tl" ? "Ngayon" : "Now") : item.displayTime}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Quick Metrics Bar: Precipitation • Wind • Humidity */}
            <View
              style={[
                styles.googleMetricsBar,
                { borderTopColor: theme === "light" ? "rgba(226, 232, 240, 0.8)" : "rgba(51, 65, 85, 0.5)" },
              ]}
            >
              <View style={styles.googleMetricCol}>
                <Ionicons name="rainy-outline" size={14} color="#0284c7" />
                <Text style={[styles.googleMetricColText, { color: colors.textSecondary }]}>
                  {language === "tl" ? "Ulan: " : "Precip: "}
                  <Text style={{ fontWeight: "800", color: colors.text }}>
                    {weather.current.precipitationMm || 0} mm
                  </Text>
                </Text>
              </View>

              <View style={styles.googleMetricDivider} />

              <View style={styles.googleMetricCol}>
                <Ionicons name="swap-horizontal-outline" size={14} color="#0284c7" />
                <Text style={[styles.googleMetricColText, { color: colors.textSecondary }]}>
                  {language === "tl" ? "Hangin: " : "Wind: "}
                  <Text style={{ fontWeight: "800", color: colors.text }}>
                    {weather.current.windSpeedKmh || 0} km/h
                  </Text>
                </Text>
              </View>

              <View style={styles.googleMetricDivider} />

              <View style={styles.googleMetricCol}>
                <Ionicons name="water-outline" size={14} color="#0284c7" />
                <Text style={[styles.googleMetricColText, { color: colors.textSecondary }]}>
                  {language === "tl" ? "Halumigmig: " : "Humidity: "}
                  <Text style={{ fontWeight: "800", color: colors.text }}>
                    {weather.current.humidity || 0}%
                  </Text>
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          /* 🌤️ SKELETON LOADER: GOOGLE WEATHER CARD */
          <View
            style={[
              styles.googleWeatherCard,
              {
                backgroundColor: theme === "light" ? "#f8fafc" : "rgba(15, 23, 42, 0.75)",
                borderColor: theme === "light" ? "rgba(226, 232, 240, 0.9)" : "rgba(51, 65, 85, 0.6)",
                padding: 16,
              },
            ]}
          >
            {/* Header row skeleton */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <SkeletonBlock width={14} height={14} borderRadius={7} />
                <SkeletonBlock width={130} height={13} borderRadius={5} />
              </View>
              <SkeletonBlock width={75} height={13} borderRadius={5} />
            </View>

            {/* Main Temp & Condition Row skeleton */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View>
                  <SkeletonBlock width={40} height={10} borderRadius={4} style={{ marginBottom: 4 }} />
                  <SkeletonBlock width={75} height={38} borderRadius={8} />
                </View>
                <SkeletonBlock width={42} height={42} borderRadius={21} />
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <SkeletonBlock width={110} height={14} borderRadius={5} />
                <SkeletonBlock width={85} height={11} borderRadius={4} />
              </View>
            </View>

            {/* Hourly Forecast Carousel skeleton */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14, overflow: "hidden" }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View
                  key={i}
                  style={{
                    width: 50,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: theme === "dark" ? "rgba(30, 41, 59, 0.5)" : "#f1f5f9",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <SkeletonBlock width={26} height={10} borderRadius={4} />
                  <SkeletonBlock width={18} height={18} borderRadius={9} />
                  <SkeletonBlock width={28} height={9} borderRadius={3} />
                </View>
              ))}
            </View>

            {/* Bottom 3 metrics skeleton */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: theme === "light" ? "rgba(226, 232, 240, 0.8)" : "rgba(51, 65, 85, 0.5)",
              }}
            >
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <SkeletonBlock width={14} height={14} borderRadius={7} />
                <SkeletonBlock width={55} height={11} borderRadius={4} />
              </View>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <SkeletonBlock width={14} height={14} borderRadius={7} />
                <SkeletonBlock width={55} height={11} borderRadius={4} />
              </View>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <SkeletonBlock width={14} height={14} borderRadius={7} />
                <SkeletonBlock width={55} height={11} borderRadius={4} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 🌤️ DETAILED WEATHER & TYPHOON MODAL */}
      <Modal
        visible={showWeatherModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWeatherModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.weatherModalContent, { backgroundColor: colors.card }]}>
            {/* Modal Header with drag handle & close */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalDragHandle} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="cloud-outline" size={20} color={colors.primaryLight} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {language === "tl" ? "Ulat Panahon & Bagyo" : "Weather & Storm Report"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowWeatherModal(false)}
                  style={[styles.modalCloseBtn, { backgroundColor: colors.inputBg }]}
                >
                  <Ionicons name="close-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
              {/* Clean Sorsogon Municipalities Switcher (Outlined only, no duplicate emojis) */}
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                {language === "tl" ? "PUMILI NG BAYAN (SORSOGON)" : "SELECT MUNICIPALITY"}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginVertical: 8 }}>
                {[
                  { key: "irosin", name: "Irosin" },
                  { key: "bulusan", name: "Bulusan" },
                  { key: "juban", name: "Juban" },
                  { key: "casiguran", name: "Casiguran" },
                  { key: "bulan", name: "Bulan" },
                  { key: "gubat", name: "Gubat" },
                  { key: "sorsogon_city", name: "Sorsogon City" },
                  { key: "matnog", name: "Matnog" },
                ].map((loc) => {
                  const isSelected = selectedLocation === loc.key;
                  return (
                    <TouchableOpacity
                      key={loc.key}
                      onPress={() => handleSelectLocation(loc.key)}
                      style={[
                        styles.locPill,
                        {
                          backgroundColor: isSelected ? colors.primaryLight : colors.inputBg,
                          borderColor: isSelected ? colors.primaryLight : colors.cardBorder,
                        },
                      ]}
                    >
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color={isSelected ? "#ffffff" : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.locPillText,
                          {
                            color: isSelected ? "#ffffff" : colors.textSecondary,
                            fontWeight: isSelected ? "800" : "600",
                          },
                        ]}
                      >
                        {loc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Main Weather Showcase Banner (Google Weather Style) */}
              <View
                style={[
                  styles.weatherShowcaseBanner,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.showcaseLocation, { color: colors.primaryLight }]}>
                  {weather?.location?.municipality || "Irosin"}, {weather?.location?.province || "Sorsogon"}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  {/* Left: Now 31° + Icon */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textSecondary }}>
                        {language === "tl" ? "Ngayon" : "Now"}
                      </Text>
                      <Text style={[styles.showcaseTemp, { color: colors.text }]}>
                        {weather?.current?.temperature}°
                      </Text>
                    </View>
                    <Ionicons
                      name={weather?.current?.icon || "partly-sunny-outline"}
                      size={46}
                      color="#f59e0b"
                    />
                  </View>

                  {/* Right: Condition + Feels Like */}
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.showcaseCondition, { color: colors.text }]}>
                      {language === "tl"
                        ? weather?.current?.conditionLabel || "Maliwalas"
                        : weather?.current?.conditionEn || "Fair Weather"}
                    </Text>
                    <Text style={[styles.showcaseFeelsLike, { color: colors.textMuted }]}>
                      {language === "tl" ? "Pakiramdam: " : "Feels like "}
                      {weather?.current?.apparentTemperature}°
                    </Text>
                  </View>
                </View>
              </View>

              {/* Hourly Forecast Carousel (Like Google Weather) */}
              {weather?.hourlyForecast && weather.hourlyForecast.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.forecastHeading, { color: colors.textMuted }]}>
                    {language === "tl" ? "ORAS-ORAS NA HULA (HOURLY FORECAST)" : "HOURLY FORECAST"}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 8 }}>
                    {weather.hourlyForecast.map((item: any, idx: number) => (
                      <View
                        key={idx}
                        style={[
                          styles.modalHourlyItem,
                          {
                            backgroundColor: colors.inputBg,
                            borderColor: colors.cardBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.modalHourlyTemp, { color: colors.text }]}>
                          {item.temperature}°
                        </Text>
                        <Ionicons
                          name={item.icon || "partly-sunny-outline"}
                          size={22}
                          color={item.icon?.includes("sunny") ? "#f59e0b" : "#60a5fa"}
                          style={{ marginVertical: 6 }}
                        />
                        <Text style={[styles.modalHourlyTime, { color: colors.textSecondary }]}>
                          {idx === 0 ? (language === "tl" ? "Ngayon" : "Now") : item.displayTime}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* 5-Day Forecast in Modal (Google Weather Style Cards) */}
              {weather?.dailyForecast && weather.dailyForecast.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.forecastHeading, { color: colors.textMuted }]}>
                    {language === "tl" ? "5-ARAW NA HULA SA PANAHON" : "5-DAY EXTENDED FORECAST"}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 8 }}>
                    {weather.dailyForecast.map((day: any, idx: number) => {
                      const d = new Date(day.date);
                      const dayName =
                        idx === 0
                          ? language === "tl" ? "Ngayon" : "Today"
                          : d.toLocaleDateString(language === "tl" ? "fil-PH" : "en-US", { weekday: "short" });

                      return (
                        <View
                          key={idx}
                          style={[
                            styles.forecastDayItem,
                            {
                              backgroundColor: colors.inputBg,
                              borderColor: colors.cardBorder,
                            },
                          ]}
                        >
                          <Text style={[styles.forecastDayText, { color: colors.textSecondary }]}>
                            {dayName}
                          </Text>
                          <Ionicons
                            name={day.icon || "sunny-outline"}
                            size={22}
                            color={day.icon?.includes("sunny") ? "#f59e0b" : "#60a5fa"}
                            style={{ marginVertical: 6 }}
                          />
                          <Text style={[styles.forecastTempText, { color: colors.text }]}>
                            {day.maxTemp}° / {day.minTemp}°
                          </Text>
                          <Text style={[styles.forecastConditionSmall, { color: colors.textMuted }]} numberOfLines={1}>
                            {language === "tl" ? day.conditionTl : day.condition}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Google Weather Style Metrics List (Precipitation, Wind, Humidity, Pressure) */}
              <View style={{ marginTop: 12, marginBottom: 24, gap: 8 }}>
                <Text style={[styles.forecastHeading, { color: colors.textMuted }]}>
                  {language === "tl" ? "MGA KONDISYON AT METRICS" : "WEATHER METRICS"}
                </Text>

                {/* 1. Precipitation */}
                <View style={[styles.googleMetricRowItem, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                  <View style={styles.metricItemLeft}>
                    <Ionicons name="rainy-outline" size={20} color="#0284c7" />
                    <Text style={[styles.metricItemTitle, { color: colors.text }]}>
                      {language === "tl" ? "Pag-ulan (Precipitation)" : "Precipitation"}
                    </Text>
                  </View>
                  <Text style={[styles.metricItemValue, { color: colors.text }]}>
                    {weather?.current?.precipitationMm || 0} mm
                  </Text>
                </View>

                {/* 2. Wind */}
                <View style={[styles.googleMetricRowItem, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                  <View style={styles.metricItemLeft}>
                    <Ionicons name="swap-horizontal-outline" size={20} color="#0284c7" />
                    <Text style={[styles.metricItemTitle, { color: colors.text }]}>
                      {language === "tl" ? "Lakas ng Hangin" : "Wind"}
                    </Text>
                  </View>
                  <Text style={[styles.metricItemValue, { color: colors.text }]}>
                    {weather?.current?.windSpeedKmh || 0} km/h (Bugso: {weather?.current?.windGustsKmh || 0} km/h)
                  </Text>
                </View>

                {/* 3. Humidity */}
                <View style={[styles.googleMetricRowItem, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                  <View style={styles.metricItemLeft}>
                    <Ionicons name="water-outline" size={20} color="#0284c7" />
                    <Text style={[styles.metricItemTitle, { color: colors.text }]}>
                      {language === "tl" ? "Halumigmig (Humidity)" : "Humidity"}
                    </Text>
                  </View>
                  <Text style={[styles.metricItemValue, { color: colors.text }]}>
                    {weather?.current?.humidity || 0}%
                  </Text>
                </View>

                {/* 4. Atmospheric Pressure */}
                <View style={[styles.googleMetricRowItem, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                  <View style={styles.metricItemLeft}>
                    <Ionicons name="speedometer-outline" size={20} color="#0284c7" />
                    <Text style={[styles.metricItemTitle, { color: colors.text }]}>
                      {language === "tl" ? "Presyon ng Hangin" : "Surface Pressure"}
                    </Text>
                  </View>
                  <Text style={[styles.metricItemValue, { color: colors.text }]}>
                    {weather?.current?.pressureHpa || 1012} hPa
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
