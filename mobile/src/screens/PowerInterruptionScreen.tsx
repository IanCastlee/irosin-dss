import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Api } from "../services/api";
import { UnreadTracker } from "../services/unreadTracker";
import { OfflineBanner } from "../components/OfflineBanner";
import { LoadingScreen } from "../components/LoadingScreen";
import { usePreferences } from "../context/PreferencesContext";
import { LinearGradient } from "expo-linear-gradient";

interface PowerAdvisory {
  id: string;
  title: string;
  affectedBarangays: string[];
  startTime: string;
  endTime: string;
  reason: string;
  status: "SCHEDULED" | "ONGOING" | "RESTORED";
  issuedBy?: string;
  notedCount?: number;
  createdAt: string;
}

export const PowerInterruptionScreen = ({ navigation }: any) => {
  const { colors, language, theme, t } = usePreferences();
  const [advisories, setAdvisories] = useState<PowerAdvisory[]>([]);
  const [activeTab, setActiveTab] = useState<
    "UPCOMING" | "ONGOING" | "RESTORED"
  >("UPCOMING");
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [notedMap, setNotedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    loadData();
    loadNotedStatus();

    const sub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data;
        if (
          data?.type === "POWER_INTERRUPTION" ||
          data?.type === "POWER_RESTORED"
        ) {
          loadData();
        }
      },
    );

    return () => sub.remove();
  }, []);

  const loadNotedStatus = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const notedKeys = keys.filter((k) => k.startsWith("@noted_power_"));
      const map: Record<string, boolean> = {};
      for (const k of notedKeys) {
        map[k.replace("@noted_power_", "")] = true;
      }
      setNotedMap(map);
    } catch {}
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [res, readSet] = await Promise.all([
        Api.getPowerInterruptions(),
        UnreadTracker.getViewedIds("power"),
      ]);

      const items: PowerAdvisory[] = res.data || [];
      setAdvisories(items);
      setViewedIds(readSet);
      setIsOffline(res.isOffline);

      if (items.length > 0) {
        setTimeout(() => {
          const ids = items.map((it) => it.id);
          UnreadTracker.markAllViewed("power", ids);
          setViewedIds(new Set([...Array.from(readSet), ...ids]));
        }, 1500);
      }
    } catch {
      setIsOffline(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleNoted = async (item: PowerAdvisory) => {
    if (notedMap[item.id]) {
      Alert.alert(
        language === "tl" ? "Na-Noted Mo Na 👍" : "Already Noted 👍",
        language === "tl"
          ? "Nai-record na ang iyong pag-acknowledge sa advisory na ito."
          : "You have already acknowledged this advisory.",
      );
      return;
    }

    try {
      const nextMap = { ...notedMap, [item.id]: true };
      setNotedMap(nextMap);
      await AsyncStorage.setItem(`@noted_power_${item.id}`, "true");

      setAdvisories((prev) =>
        prev.map((a) =>
          a.id === item.id ? { ...a, notedCount: (a.notedCount || 0) + 1 } : a,
        ),
      );
    } catch (e) {
      console.warn("[Power] Error noting advisory:", e);
    }
  };

  const filtered = advisories.filter((a) => {
    if (activeTab === "UPCOMING") return a.status === "SCHEDULED";
    if (activeTab === "ONGOING") return a.status === "ONGOING";
    if (activeTab === "RESTORED") return a.status === "RESTORED";
    return true;
  });

  if (loading && !refreshing) {
    return (
      <LoadingScreen
        message="Kinukuha ang Ulat sa Kuryente..."
        subMessage="Loading SORECO II Power Advisories..."
      />
    );
  }

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

      {/* Header */}
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
            backgroundColor: "rgba(245, 158, 11, 0.12)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(245, 158, 11, 0.25)",
          }}
        >
          <Ionicons name="flash" size={22} color="#f59e0b" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("powerTitle")}
          </Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            {t("powerSub")}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: "transparent",
            borderBottomWidth: 0,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === "UPCOMING" && [
              styles.tabBtnActive,
              { borderBottomColor: colors.primaryLight },
            ],
          ]}
          onPress={() => setActiveTab("UPCOMING")}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textMuted },
              activeTab === "UPCOMING" && {
                color: colors.primaryLight,
                fontWeight: "800",
              },
            ]}
          >
            {language === "tl" ? "Nakatakda" : "Scheduled"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === "ONGOING" && [
              styles.tabBtnActive,
              { borderBottomColor: "#f59e0b" },
            ],
          ]}
          onPress={() => setActiveTab("ONGOING")}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textMuted },
              activeTab === "ONGOING" && {
                color: "#f59e0b",
                fontWeight: "800",
              },
            ]}
          >
            {language === "tl" ? "Kasalukuyang Brownout" : "Ongoing Outage"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === "RESTORED" && [
              styles.tabBtnActive,
              { borderBottomColor: "#10b981" },
            ],
          ]}
          onPress={() => setActiveTab("RESTORED")}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textMuted },
              activeTab === "RESTORED" && {
                color: "#10b981",
                fontWeight: "800",
              },
            ]}
          >
            {language === "tl" ? "Naibalik Na" : "Restored"}
          </Text>
        </TouchableOpacity>
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
        {filtered.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Ionicons
              name="flash-outline"
              size={44}
              color={colors.primaryLight}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {language === "tl"
                ? "Walang Naitalang Advisory"
                : "No Power Advisories"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {language === "tl"
                ? "Normal at maayos ang supply ng kuryente sa sektor na ito."
                : "Power supply is normal and stable."}
            </Text>
          </View>
        ) : (
          filtered.map((item) => {
            const isNoted = !!notedMap[item.id];
            const isUnread = !viewedIds.has(item.id);

            return (
              <View
                key={item.id}
                style={[styles.card, { backgroundColor: colors.card }]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          item.status === "RESTORED"
                            ? colors.successBg
                            : colors.accentBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            item.status === "RESTORED"
                              ? colors.success
                              : colors.accent,
                        },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                  <Text
                    style={[styles.timeRange, { color: colors.textSecondary }]}
                  >
                    {new Date(item.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {new Date(item.endTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>

                <Text style={[styles.advisoryTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text
                  style={[
                    styles.advisoryReason,
                    { color: colors.textSecondary },
                  ]}
                >
                  {item.reason}
                </Text>

                {item.affectedBarangays &&
                  item.affectedBarangays.length > 0 && (
                    <View
                      style={[
                        styles.barangayBox,
                        {
                          backgroundColor: colors.primaryBg,
                          borderColor: colors.primaryLight,
                        },
                      ]}
                    >
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color={colors.primaryLight}
                      />
                      <Text
                        style={[styles.barangayText, { color: colors.text }]}
                      >
                        <Text
                          style={{
                            fontWeight: "800",
                            color: colors.primaryLight,
                          }}
                        >
                          {t("affectedBarangays")}{" "}
                        </Text>
                        {item.affectedBarangays.join(", ")}
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
                    style={[styles.issuedByText, { color: colors.textMuted }]}
                  >
                    {item.issuedBy || "SORECO II / LGU Irosin"}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.notedBtn,
                      isNoted
                        ? [
                            styles.notedBtnActive,
                            {
                              backgroundColor: colors.primaryBg,
                              borderColor: colors.primaryLight,
                            },
                          ]
                        : [
                            styles.notedBtnInactive,
                            {
                              backgroundColor: colors.inputBg,
                              borderColor: colors.cardBorder,
                            },
                          ],
                    ]}
                    onPress={() => handleToggleNoted(item)}
                  >
                    <Ionicons
                      name="thumbs-up-outline"
                      size={14}
                      color={isNoted ? colors.primaryLight : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.notedBtnText,
                        isNoted
                          ? { color: colors.primaryLight, fontWeight: "800" }
                          : { color: colors.textMuted },
                      ]}
                    >
                      {isNoted
                        ? `${t("notedBtn")} (${item.notedCount || 1})`
                        : `Noted (${item.notedCount || 0})`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 19, fontWeight: "900" },
  sub: { fontSize: 13, marginTop: 2 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {},
  tabText: { fontSize: 13, fontWeight: "700" },
  container: { flex: 1, padding: 14 },
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
  emptySub: { fontSize: 13, textAlign: "center" },
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { fontSize: 11, fontWeight: "900" },
  timeRange: { fontSize: 12, fontWeight: "700" },
  advisoryTitle: { fontSize: 16, fontWeight: "900", marginBottom: 4 },
  advisoryReason: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  barangayBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  barangayText: { fontSize: 13, flex: 1, lineHeight: 18 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 4,
  },
  issuedByText: { fontSize: 11 },
  notedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  notedBtnInactive: {},
  notedBtnActive: {},
  notedBtnText: { fontSize: 12, fontWeight: "700" },
});
