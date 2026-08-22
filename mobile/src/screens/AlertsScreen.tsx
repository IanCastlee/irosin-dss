import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { Api } from "../services/api";
import { DisasterAlert } from "../types";
import { OfflineBanner } from "../components/OfflineBanner";
import { UnreadTracker } from "../services/unreadTracker";
import { OfflineStorage } from "../services/offlineStorage";
import { usePreferences } from "../context/PreferencesContext";
import { LinearGradient } from "expo-linear-gradient";

export const AlertsScreen = () => {
  const { colors, language, theme, t } = usePreferences();
  const [alerts, setAlerts] = useState<DisasterAlert[]>([]);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  useEffect(() => {
    // 1. Instant Cache Read (0 ms)
    OfflineStorage.getCache<DisasterAlert[]>("ALERTS").then((cached) => {
      if (cached && cached.length > 0) {
        setAlerts(cached);
        setLoading(false);
      }
    });

    loadAlerts(false);

    // 2. Real-Time Push Notification Listener
    const subscription = Notifications.addNotificationReceivedListener(() => {
      loadAlerts(false);
    });

    return () => subscription.remove();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts(false);
    setRefreshing(false);
  };

  const loadAlerts = async (showLoading = false) => {
    try {
      if (showLoading && alerts.length === 0) setLoading(true);
      const [res, readSet] = await Promise.all([
        Api.getAlerts(undefined, 20),
        UnreadTracker.getViewedIds("alert"),
      ]);
      const items = res.data || [];
      if (items.length > 0) {
        setAlerts(items);
      }
      setViewedIds(readSet);
      setNextCursor(res.nextCursor || null);
      setHasMore(!!res.hasMore);
      setIsOffline(res.isOffline);

      if (items.length > 0) {
        setTimeout(() => {
          const ids = items.map((a) => a.id);
          UnreadTracker.markAllViewed("alert", ids);
          setViewedIds(new Set([...Array.from(readSet), ...ids]));
        }, 1500);
      }
    } catch {
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await Api.getAlerts(nextCursor, 20);
      if (res.data) {
        setAlerts((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const newItems = res.data.filter((a) => !existingIds.has(a.id));
          return [...prev, ...newItems];
        });
        setNextCursor(res.nextCursor || null);
        setHasMore(!!res.hasMore);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingMore(false);
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case "EVACUATION_ORDER":
        return "#ef4444";
      case "WARNING":
        return "#f59e0b";
      case "ADVISORY":
        return "#0ea5e9";
      default:
        return "#10b981";
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
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(239, 68, 68, 0.25)",
          }}
        >
          <Ionicons name="notifications" size={22} color="#ef4444" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("latestAlerts")}
          </Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            {language === "tl"
              ? "Opisyal na babala at abiso mula sa MDRRMO"
              : "Official warnings and advisories from MDRRMO"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryLight}
          />
        }
      >
        {loading && alerts.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {language === "tl"
                ? "Kumukonekta sa MDRRMO..."
                : "Connecting to MDRRMO..."}
            </Text>
          </View>
        ) : alerts.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={48}
              color={colors.success}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {language === "tl"
                ? "Walang Aktibong Emergency Alert"
                : "No Active Emergency Alerts"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {language === "tl"
                ? "Ligtas ang Irosin sa kasalukuyan. Makakatanggap ka ng abiso kapag may nagbabagong panahon."
                : "Irosin is currently safe. You will be notified automatically if weather conditions change."}
            </Text>
          </View>
        ) : (
          alerts.map((alert) => {
            const isUnread = !viewedIds.has(alert.id);
            const alertColor = getAlertColor(alert.alertLevel);

            return (
              <View
                key={alert.id}
                style={[styles.card, { backgroundColor: colors.card }]}
              >
                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.levelBadge,
                      { backgroundColor: colors.primaryBg },
                    ]}
                  >
                    <Text
                      style={[styles.levelText, { color: colors.primaryLight }]}
                    >
                      {alert.alertLevel.replace("_", " ")}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {isUnread && (
                      <View
                        style={[
                          styles.unreadBadge,
                          { backgroundColor: colors.danger },
                        ]}
                      >
                        <Text style={styles.unreadText}>BAGO</Text>
                      </View>
                    )}
                    <Text
                      style={[styles.timestamp, { color: colors.textMuted }]}
                    >
                      {new Date(alert.startTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.alertTitle, { color: colors.text }]}>
                  {alert.title}
                </Text>
                <Text
                  style={[styles.alertMessage, { color: colors.textSecondary }]}
                >
                  {alert.message}
                </Text>

                {alert.recommendedAction ? (
                  <View
                    style={[
                      styles.actionBox,
                      { backgroundColor: colors.inputBg },
                    ]}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={colors.primaryLight}
                    />
                    <Text style={[styles.actionText, { color: colors.text }]}>
                      <Text
                        style={{
                          fontWeight: "800",
                          color: colors.primaryLight,
                        }}
                      >
                        {language === "tl" ? "Aksyon: " : "Action: "}
                      </Text>
                      {alert.recommendedAction}
                    </Text>
                  </View>
                ) : null}

                {alert.affectedBarangayNames &&
                  alert.affectedBarangayNames.length > 0 && (
                    <View style={styles.affectedRow}>
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color={colors.primaryLight}
                      />
                      <Text
                        style={[
                          styles.affectedText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {alert.affectedBarangayNames.join(", ")}
                      </Text>
                    </View>
                  )}

                <View
                  style={[
                    styles.cardFooter,
                    { borderTopColor: colors.cardBorder },
                  ]}
                >
                  <Text
                    style={[styles.authorityText, { color: colors.textMuted }]}
                  >
                    {alert.issuingAuthority ||
                      "MDRRMO Irosin Operations Command"}
                  </Text>
                  <Text style={[styles.dateText, { color: colors.textMuted }]}>
                    {new Date(alert.startTime).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {hasMore && (
          <TouchableOpacity
            style={[
              styles.loadMoreBtn,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.cardBorder,
              },
            ]}
            onPress={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={colors.primaryLight} />
            ) : (
              <Text style={[styles.loadMoreText, { color: colors.text }]}>
                {language === "tl"
                  ? "Mag-load ng Mas Lumang Abiso"
                  : "Load Older Alerts"}
              </Text>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 19, fontWeight: "900" },
  sub: { fontSize: 13, marginTop: 2 },
  container: { flex: 1, padding: 14 },
  loadingBox: { padding: 40, alignItems: "center", gap: 10 },
  loadingText: { fontSize: 13 },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 0,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  card: {
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
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelText: { fontSize: 11, fontWeight: "800" },
  unreadBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unreadText: { color: "#ffffff", fontSize: 10, fontWeight: "900" },
  timestamp: { fontSize: 12 },
  alertTitle: { fontSize: 17, fontWeight: "900", marginBottom: 6 },
  alertMessage: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  actionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 0,
    marginBottom: 8,
  },
  actionText: { fontSize: 13, flex: 1, lineHeight: 19 },
  affectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  affectedText: { fontSize: 12 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 4,
  },
  authorityText: { fontSize: 11 },
  dateText: { fontSize: 11 },
  loadMoreBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 6,
  },
  loadMoreText: { fontSize: 13, fontWeight: "700" },
});
