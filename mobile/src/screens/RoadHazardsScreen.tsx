import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Dimensions,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Api } from "../services/api";
import { OfflineBanner } from "../components/OfflineBanner";
import { LoadingScreen } from "../components/LoadingScreen";
import { OfflineStorage } from "../services/offlineStorage";
import { usePreferences } from "../context/PreferencesContext";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

interface RoadHazardItem {
  id: string;
  type: "OFFICIAL_ADVISORY" | "COMMUNITY_REPORT";
  hazardType: string;
  title: string;
  barangayName: string;
  locationDescription: string;
  status:
    | "PENDING"
    | "VERIFIED"
    | "UNDER_CLEARING"
    | "RESOLVED"
    | "REJECTED"
    | "IMPASSABLE"
    | "CAUTION";
  statusLabel: string;
  statusColor: string;
  description: string;
  photos: string[];
  photoItems?: { uri: string; stage: string; label: string; uploadedBy?: string }[];
  affectedRoute?: string;
  notedCount: number;
  dateReported: string;
  verifiedBy?: string;
  adminNotes?: string;
}

import * as Notifications from "expo-notifications";
import { UnreadTracker } from "../services/unreadTracker";
import { RealtimeSocket } from "../services/socketService";
import { ActivityIndicator } from "react-native";

// Image component with loader indicator for Road Hazard Cards
const HazardImage = ({ uri, style, borderColor }: { uri: string; style?: any; borderColor?: string }) => {
  const [imgLoading, setImgLoading] = useState(false);

  return (
    <View style={[{ overflow: "hidden", position: "relative", justifyContent: "center", alignItems: "center" }, style]}>
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%", borderRadius: style?.borderRadius || 14, borderWidth: borderColor ? 1 : 0, borderColor }}
        resizeMode="cover"
        onLoadStart={() => setImgLoading(true)}
        onLoad={() => setImgLoading(false)}
        onLoadEnd={() => setImgLoading(false)}
        onError={() => setImgLoading(false)}
      />
      {imgLoading && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(15, 23, 42, 0.3)",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 2,
            },
          ]}
        >
          <ActivityIndicator size="small" color="#38bdf8" />
        </View>
      )}
    </View>
  );
};

// Fullscreen Modal Image with Loader
const FullscreenPreviewImage = ({ uri, style }: { uri: string; style?: any }) => {
  const [imgLoading, setImgLoading] = useState(false);

  return (
    <View style={{ width, height, justifyContent: "center", alignItems: "center", position: "relative" }}>
      <Image
        source={{ uri }}
        style={style}
        resizeMode="contain"
        onLoadStart={() => setImgLoading(true)}
        onLoad={() => setImgLoading(false)}
        onLoadEnd={() => setImgLoading(false)}
        onError={() => setImgLoading(false)}
      />
      {imgLoading && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              justifyContent: "center",
              alignItems: "center",
              zIndex: 5,
            },
          ]}
        >
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      )}
    </View>
  );
};

export const RoadHazardsScreen = ({ navigation }: any) => {
  const { colors, language, theme, t } = usePreferences();
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "RESOLVED">("ACTIVE");
  const [items, setItems] = useState<RoadHazardItem[]>([]);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [notedMap, setNotedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewPhotoItems, setPreviewPhotoItems] = useState<{ uri: string; stage?: string; label?: string; uploadedBy?: string }[]>([]);

  const handleOpenPreview = (
    imageList: string[],
    initialIdx: number,
    itemPhotoList?: { uri: string; stage?: string; label?: string; uploadedBy?: string }[]
  ) => {
    setPreviewImages(imageList);
    setPreviewIndex(initialIdx);
    setPreviewImage(imageList[initialIdx] || null);
    setPreviewPhotoItems(itemPhotoList || []);
  };

  useEffect(() => {
    // 1. Instant Cache Read & Viewed IDs (0 ms)
    Promise.all([
      OfflineStorage.getCache<RoadHazardItem[]>("ROAD_HAZARDS"),
      UnreadTracker.getViewedIds("road"),
    ]).then(([cached, readSet]) => {
      if (readSet) setViewedIds(readSet);
      if (cached && cached.length > 0) {
        setItems(cached);
      }
      setLoading(false);
    });

    // 2. Background Revalidate
    loadRoadData();
    loadNotedMap();

    const unsub = UnreadTracker.subscribe(() => {
      UnreadTracker.getViewedIds("road").then(setViewedIds);
    });

    // ⚡ Real-Time WebSocket Event Listeners
    const unsubReports = RealtimeSocket.on("DISASTER_REPORTS_CHANGED", () => {
      console.log("[RoadHazards] Real-time: Disaster reports updated");
      loadRoadData();
    });

    // 🔔 Push notification trigger fallback
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data;
        if (data?.type === "ROAD_HAZARD_UPDATE") {
          loadRoadData();
        }
      },
    );

    return () => {
      unsub();
      unsubReports();
      subscription.remove();
    };
  }, []);

  const loadNotedMap = async () => {
    try {
      const val = await AsyncStorage.getItem("@user_noted_road_items");
      if (val) {
        setNotedMap(JSON.parse(val));
      }
    } catch (e) {
      console.warn("[RoadHazards] Error loading noted map:", e);
    }
  };

  const handleToggleNoted = async (item: RoadHazardItem) => {
    if (notedMap[item.id]) {
      Alert.alert(
        language === "tl" ? "Na-Noted Mo Na 👍" : "Already Noted 👍",
        language === "tl"
          ? "Nai-record na ang iyong pag-acknowledge sa ulat na ito."
          : "You have already acknowledged this report.",
      );
      return;
    }

    try {
      const nextMap = { ...notedMap, [item.id]: true };
      setNotedMap(nextMap);
      await AsyncStorage.setItem(
        "@user_noted_road_items",
        JSON.stringify(nextMap),
      );
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, notedCount: it.notedCount + 1 } : it,
        ),
      );
      Api.toggleNoted(item.id).catch(() => {});
    } catch (e) {
      console.warn("[RoadHazards] Error noting item:", e);
    }
  };

  const loadRoadData = async () => {
    try {
      const verifiedRes = await Api.getVerifiedDisasterReports();
      setIsOffline(verifiedRes.isOffline);

      const combined: RoadHazardItem[] = [];

      // Community Disaster and Road Reports
      if (verifiedRes.data && verifiedRes.data.length > 0) {
        verifiedRes.data.forEach((r: any) => {
          const rawPhotos: string[] = [];
          if (Array.isArray(r.photos)) {
            r.photos.forEach((p: any) => {
              if (p && typeof p === "string" && p.trim()) {
                rawPhotos.push(p.trim());
              }
            });
          }
          if (r.imageUrl && typeof r.imageUrl === "string" && !rawPhotos.includes(r.imageUrl.trim())) {
            rawPhotos.unshift(r.imageUrl.trim());
          }
          if (r.photoUrl && typeof r.photoUrl === "string" && !rawPhotos.includes(r.photoUrl.trim())) {
            rawPhotos.push(r.photoUrl.trim());
          }
          const photoList = Array.from(new Set(rawPhotos));

          let statusLabel =
            language === "tl"
              ? "KUMPIRMADO SA LUGAR"
              : "VERIFIED INCIDENT";
          let statusColor = "#ea580c";

          if (r.status === "PENDING") {
            statusLabel =
              language === "tl"
                ? "HINIHINTAY ANG PAGSUSURI"
                : "PENDING REVIEW";
            statusColor = "#f59e0b";
          } else if (r.status === "VERIFIED") {
            statusLabel =
              language === "tl"
                ? "KUMPIRMADO SA LUGAR"
                : "VERIFIED INCIDENT";
            statusColor = "#ea580c";
          } else if (r.status === "UNDER_CLEARING") {
            statusLabel =
              language === "tl"
                ? "KASALUKUYANG NILILINIS"
                : "CLEARING IN PROGRESS";
            statusColor = "#0284c7";
          } else if (r.status === "RESOLVED") {
            statusLabel =
              language === "tl"
                ? "LIGTAS NA / NA-RESOLBA"
                : "RESOLVED & SAFE";
            statusColor = "#10b981";
          }

          const photoItems: { uri: string; stage: string; label: string; uploadedBy?: string }[] = [];
          if (Array.isArray(r.photoItems) && r.photoItems.length > 0) {
            r.photoItems.forEach((pi: any) => {
              if (pi && pi.uri) {
                let stage = pi.stage || "INCIDENT";
                if (stage === "PENDING" && r.status !== "PENDING") {
                  stage = "INCIDENT";
                }
                let stageLabel = language === "tl" ? "INSIDENTE" : "INCIDENT";
                if (stage === "PENDING") {
                  stageLabel = language === "tl" ? "PENDING" : "PENDING";
                } else if (stage === "INCIDENT") {
                  stageLabel = language === "tl" ? "INSIDENTE" : "INCIDENT";
                } else if (stage === "UNDER_CLEARING") {
                  stageLabel = language === "tl" ? "CLEARING" : "CLEARING";
                } else if (stage === "RESOLVED") {
                  stageLabel = language === "tl" ? "LIGTAS NA" : "RESOLVED";
                }
                photoItems.push({
                  uri: pi.uri,
                  stage,
                  label: stageLabel,
                  uploadedBy: pi.uploadedBy,
                });
              }
            });
          } else {
            const reporterCount = typeof r.reporterPhotoCount === "number" ? r.reporterPhotoCount : (r.status === "PENDING" || r.status === "VERIFIED" ? photoList.length : 2);
            photoList.forEach((uri, idx) => {
              let stageLabel = language === "tl" ? "INSIDENTE" : "INCIDENT";
              let stage = "INCIDENT";
              if (r.status === "PENDING") {
                stageLabel = language === "tl" ? "PENDING" : "PENDING";
                stage = "PENDING";
              } else if (idx >= reporterCount && r.status === "UNDER_CLEARING") {
                stageLabel = language === "tl" ? "CLEARING" : "CLEARING";
                stage = "UNDER_CLEARING";
              } else if (idx >= reporterCount && r.status === "RESOLVED") {
                stageLabel = language === "tl" ? "LIGTAS NA" : "RESOLVED";
                stage = "RESOLVED";
              }
              photoItems.push({ uri, stage, label: stageLabel });
            });
          }

          const stageRank: Record<string, number> = {
            RESOLVED: 3,
            UNDER_CLEARING: 2,
            INCIDENT: 1,
            PENDING: 0,
          };

          // Sort so latest status photo is at the front (unahan)
          photoItems.sort((a, b) => (stageRank[b.stage] || 0) - (stageRank[a.stage] || 0));
          const sortedPhotos = photoItems.length > 0 ? photoItems.map((pi) => pi.uri) : photoList;

          combined.push({
            id: r.id,
            type: "COMMUNITY_REPORT",
            hazardType: r.reportType || "DISASTER_REPORT",
            title: `${r.reportType ? r.reportType.replace(/_/g, " ") : "Road Hazard Report"}`,
            barangayName: r.barangayName || "Irosin",
            locationDescription: r.locationDescription || "Landmark",
            status: r.status,
            statusLabel,
            statusColor,
            description:
              r.description ||
              (language === "tl"
                ? "Ulat mula sa residente na kinumpirma ng MDRRMO."
                : "Citizen report inspected and verified by MDRRMO."),
            photos:
              sortedPhotos.length > 0
                ? sortedPhotos
                : [
                    "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800",
                  ],
            photoItems,
            affectedRoute: r.affectedRoute || undefined,
            notedCount: r.notedCount || 3,
            dateReported: r.createdAt || new Date().toISOString(),
            verifiedBy: r.verifiedBy || undefined,
            adminNotes: r.adminNotes,
          });
        });
      }

      // Sort by date reported (newest first)
      combined.sort(
        (a, b) =>
          new Date(b.dateReported).getTime() -
          new Date(a.dateReported).getTime(),
      );

      console.log(`[RoadHazards] 🛣️ Successfully loaded ${combined.length} items (${verifiedRes.data?.length || 0} road/disaster reports)`);

      const readSet = await UnreadTracker.getViewedIds("road");

      // Always update display — if server returned 0 results (not offline), clear everything
      if (!verifiedRes.isOffline) {
        setItems(combined);
        setViewedIds(readSet);
        if (combined.length > 0) {
          OfflineStorage.saveCache("ROAD_HAZARDS", combined).catch(() => {});
          const ids = combined.map((it) => it.id);
          UnreadTracker.markAllViewed("road", ids);
          setViewedIds(new Set([...Array.from(readSet), ...ids]));
        } else {
          // Server confirmed 0 verified reports — wipe stale cache
          OfflineStorage.saveCache("ROAD_HAZARDS", []).catch(() => {});
          OfflineStorage.saveCache("VERIFIED_REPORTS", []).catch(() => {});
        }
      } else if (combined.length > 0) {
        setItems(combined);
      }
    } catch (err) {
      console.error("[RoadHazards] ❌ Error loading data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRoadData();
  };

  const activeItems = items.filter(
    (i) =>
      i.status === "VERIFIED" ||
      i.status === "UNDER_CLEARING" ||
      i.status === "IMPASSABLE" ||
      i.status === "CAUTION",
  );
  const resolvedItems = items.filter((i) => i.status === "RESOLVED");
  const displayList = activeTab === "ACTIVE" ? activeItems : resolvedItems;

  const getHazardIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    const tStr = type.toUpperCase();
    if (tStr.includes("LANDSLIDE")) return "alert-circle";
    if (tStr.includes("FLOOD")) return "water";
    if (tStr.includes("ROAD") || tStr.includes("BLOCK")) return "construct";
    return "warning";
  };

  if (loading && !refreshing) {
    return (
      <LoadingScreen
        message="Sinusuri ang Kondisyon ng mga Kalsada..."
        subMessage="Loading active road hazards, clearing ops & verified reports..."
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

      {/* Top Header */}
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
          <Ionicons name="warning" size={22} color="#f59e0b" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("roadHazardsTitle")}
          </Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            {t("roadHazardsSub")}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.reportHeaderBtn}
          onPress={() => navigation.navigate("ReportDisaster")}
        >
          <Ionicons name="camera-outline" size={16} color="#ffffff" />
          <Text style={styles.reportHeaderBtnText}>{t("iReportBtn")}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Two-State Tab Switcher */}
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
          style={[styles.tabBtn, activeTab === "ACTIVE" && styles.tabBtnActive]}
          onPress={() => setActiveTab("ACTIVE")}
        >
          <View style={styles.tabTitleRow}>
            <Ionicons
              name="warning-outline"
              size={15}
              color={
                activeTab === "ACTIVE" ? colors.primaryLight : colors.textMuted
              }
            />
            <Text
              style={[
                styles.tabText,
                { color: colors.textMuted },
                activeTab === "ACTIVE" && {
                  color: colors.primaryLight,
                  fontWeight: "800",
                },
              ]}
            >
              {t("activeTab")} ({activeItems.length})
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === "RESOLVED" && styles.tabBtnActive,
          ]}
          onPress={() => setActiveTab("RESOLVED")}
        >
          <View style={styles.tabTitleRow}>
            <Ionicons
              name="checkmark-circle-outline"
              size={15}
              color={activeTab === "RESOLVED" ? "#10b981" : colors.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                { color: colors.textMuted },
                activeTab === "RESOLVED" && {
                  color: "#10b981",
                  fontWeight: "800",
                },
              ]}
            >
              {t("resolvedTab")} ({resolvedItems.length})
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Feed List */}
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
        {displayList.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <View
              style={[
                styles.emptyIconCircle,
                {
                  backgroundColor:
                    activeTab === "ACTIVE"
                      ? colors.successBg
                      : colors.primaryBg,
                },
              ]}
            >
              <Ionicons
                name={
                  activeTab === "ACTIVE"
                    ? "shield-checkmark-outline"
                    : "document-text-outline"
                }
                size={38}
                color={
                  activeTab === "ACTIVE" ? colors.success : colors.textSecondary
                }
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeTab === "ACTIVE"
                ? t("emptySafeRoads")
                : t("emptyResolvedRoads")}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {activeTab === "ACTIVE"
                ? t("emptySafeRoadsSub")
                : t("emptyResolvedRoadsSub")}
            </Text>
          </View>
        ) : (
          displayList.map((item) => {
            const isNoted = !!notedMap[item.id];
            const isUnread = !viewedIds.has(item.id);

            return (
              <View
                key={item.id}
                style={[styles.card, { backgroundColor: colors.card }]}
              >
                {/* Card Top Title & Status */}
                <View style={styles.cardHeader}>
                  <View style={styles.hazardBadgeRow}>
                    <Ionicons
                      name={getHazardIcon(item.hazardType)}
                      size={16}
                      color={colors.primaryLight}
                    />
                    <Text
                      style={[styles.hazardTypeText, { color: colors.text }]}
                    >
                      {item.title}
                    </Text>
                    {isUnread && (
                      <View
                        style={{
                          backgroundColor: colors.danger,
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                          borderRadius: 4,
                          marginLeft: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: "#ffffff",
                            fontSize: 9,
                            fontWeight: "900",
                          }}
                        >
                          BAGO
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Top Card Status Badge */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      borderWidth: 0,
                      backgroundColor:
                        item.status === "UNDER_CLEARING"
                          ? "rgba(2,132,199,0.12)"
                          : item.status === "RESOLVED"
                          ? "rgba(16,185,129,0.12)"
                          : item.status === "IMPASSABLE"
                          ? "rgba(220,38,38,0.12)"
                          : item.status === "PENDING"
                          ? "rgba(245,158,11,0.12)"
                          : "rgba(234,88,12,0.12)",
                    }}
                  >
                    <Ionicons
                      name={
                        item.status === "UNDER_CLEARING"
                          ? "construct-outline"
                          : item.status === "RESOLVED"
                          ? "checkmark-circle-outline"
                          : item.status === "IMPASSABLE"
                          ? "close-circle-outline"
                          : item.status === "PENDING"
                          ? "time-outline"
                          : "alert-circle-outline"
                      }
                      size={12}
                      color={
                        item.status === "UNDER_CLEARING"
                          ? "#0284c7"
                          : item.status === "RESOLVED"
                          ? "#10b981"
                          : item.status === "IMPASSABLE"
                          ? "#dc2626"
                          : item.status === "PENDING"
                          ? "#f59e0b"
                          : "#ea580c"
                      }
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "800",
                        color:
                          item.status === "UNDER_CLEARING"
                            ? "#0284c7"
                            : item.status === "RESOLVED"
                            ? "#10b981"
                            : item.status === "IMPASSABLE"
                            ? "#dc2626"
                            : item.status === "PENDING"
                            ? "#f59e0b"
                            : "#ea580c",
                      }}
                    >
                      {item.status === "UNDER_CLEARING"
                        ? language === "tl" ? "Clearing / Inaayos" : "Clearing"
                        : item.status === "RESOLVED"
                        ? language === "tl" ? "Ligtas Na" : "Resolved"
                        : item.status === "IMPASSABLE"
                        ? language === "tl" ? "Sarado / Di Madaanan" : "Blocked"
                        : item.status === "PENDING"
                        ? language === "tl" ? "Pending / Bago" : "Pending"
                        : language === "tl" ? "Hindi Pa Inaayos" : "Incident"}
                    </Text>
                  </View>
                </View>

                {/* Location */}
                <View style={styles.locRow}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={colors.primaryLight}
                  />
                  <Text style={[styles.locText, { color: colors.text }]}>
                    {(() => {
                      const loc = item.locationDescription || "";
                      if (loc) {
                        if (
                          loc.toLowerCase().includes("brgy") ||
                          loc.toLowerCase().includes("barangay") ||
                          (item.barangayName &&
                            loc
                              .toLowerCase()
                              .includes(item.barangayName.toLowerCase()))
                        ) {
                          return loc;
                        }
                        if (
                          item.barangayName &&
                          item.barangayName.toLowerCase() !== "irosin"
                        ) {
                          return `Brgy. ${item.barangayName} • ${loc}`;
                        }
                        return loc;
                      }
                      return item.barangayName &&
                        item.barangayName.toLowerCase() !== "irosin"
                        ? `Brgy. ${item.barangayName}`
                        : "Irosin";
                    })()}
                  </Text>
                </View>

                {/* Photos Horizontal Gallery */}
                {item.photos && item.photos.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    {item.photos.length > 1 && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 }}>
                        <Ionicons name="images-outline" size={13} color={colors.primaryLight} />
                        <Text style={{ fontSize: 11, fontWeight: "800", color: colors.primaryLight }}>
                          {language === "tl"
                            ? `${item.photos.length} Litrato (I-swipe pakanan)`
                            : `${item.photos.length} Photos (Swipe right)`}
                        </Text>
                      </View>
                    )}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.photoRow}
                    >
                      {item.photos.map((imgUri, idx) => {
                        const photoMeta = item.photoItems?.[idx];
                        const photoStage = photoMeta?.stage || (idx === 0 ? "INCIDENT" : item.status);
                        const isPhotoResolved = photoStage === "RESOLVED";
                        const isPhotoClearing = photoStage === "UNDER_CLEARING";
                        const isPhotoImpassable = photoStage === "IMPASSABLE";
                        const isPhotoPending = photoStage === "PENDING";

                        const badgeColor = isPhotoResolved
                          ? "#10b981"
                          : isPhotoClearing
                          ? "#0284c7"
                          : isPhotoImpassable
                          ? "#dc2626"
                          : isPhotoPending
                          ? "#f59e0b"
                          : "#ea580c";

                        const badgeText = photoMeta?.label || (
                          isPhotoPending
                            ? language === "tl" ? "PENDING" : "PENDING"
                            : isPhotoClearing
                            ? language === "tl" ? "CLEARING" : "CLEARING"
                            : isPhotoResolved
                            ? language === "tl" ? "LIGTAS NA" : "RESOLVED"
                            : isPhotoImpassable
                            ? language === "tl" ? "SARADO" : "BLOCKED"
                            : language === "tl" ? "INSIDENTE" : "INCIDENT"
                        );

                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => handleOpenPreview(item.photos, idx, item.photoItems)}
                            style={{ position: "relative" }}
                          >
                            <HazardImage
                              uri={imgUri}
                              style={styles.hazardThumb}
                              borderColor={colors.cardBorder}
                            />
                            {/* Individual Photo Stage Badge */}
                            <View
                              style={{
                                position: "absolute",
                                top: 8,
                                left: 8,
                                backgroundColor: badgeColor,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 6,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.3,
                                shadowRadius: 2,
                                elevation: 3,
                              }}
                            >
                              <Ionicons
                                name={
                                  isPhotoResolved
                                    ? "checkmark-circle"
                                    : isPhotoClearing
                                    ? "construct"
                                    : isPhotoImpassable
                                    ? "close-circle"
                                    : isPhotoPending
                                    ? "time"
                                    : "alert-circle"
                                }
                                size={11}
                                color="#ffffff"
                              />
                              <Text
                                style={{
                                  color: "#ffffff",
                                  fontSize: 9.5,
                                  fontWeight: "900",
                                  letterSpacing: 0.3,
                                }}
                              >
                                {badgeText}
                              </Text>
                            </View>

                            {item.photos.length > 1 && (
                              <View
                                style={{
                                  position: "absolute",
                                  top: 8,
                                  right: 18,
                                  backgroundColor: "rgba(15, 23, 42, 0.85)",
                                  paddingHorizontal: 7,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "800" }}>
                                  {idx + 1}/{item.photos.length}
                                </Text>
                              </View>
                            )}
                            <View style={styles.zoomPill}>
                              <Ionicons
                                name="scan-outline"
                                size={12}
                                color="#ffffff"
                              />
                              <Text style={styles.zoomText}>
                                {language === "tl" ? "Pindutin para lumaki" : "Tap to zoom"}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Description */}
                <Text
                  style={[styles.descText, { color: colors.textSecondary }]}
                >
                  {item.description}
                </Text>

                {/* Apektadong Rota Box (Dynamic when Resolved) */}
                {item.status === "RESOLVED" ? (
                  <View
                    style={[
                      styles.routeBox,
                      {
                        backgroundColor: theme === "dark" ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)",
                        borderWidth: 0,
                      },
                    ]}
                  >
                    <View style={styles.routeRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#10b981"
                      />
                      <Text style={[styles.routeText, { color: colors.text }]}>
                        <Text style={{ fontWeight: "800", color: "#10b981" }}>
                          {language === "tl" ? "Katayuan ng Rota: " : "Route Status: "}
                        </Text>
                        {language === "tl"
                          ? `Ligtas at normal nang madaanan • Wala nang perwisyo sa daan ${item.affectedRoute ? `(${item.affectedRoute})` : ""}`
                          : `Normal and passable • Hazard resolved ${item.affectedRoute ? `(${item.affectedRoute})` : ""}`}
                      </Text>
                    </View>
                  </View>
                ) : item.affectedRoute ? (
                  <View style={[styles.routeBox, { backgroundColor: theme === "dark" ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.08)", borderWidth: 0 }]}>
                    <View style={styles.routeRow}>
                      <Ionicons
                        name="navigate-circle-outline"
                        size={16}
                        color="#d97706"
                      />
                      <Text style={styles.routeText}>
                        <Text style={{ fontWeight: "800", color: "#d97706" }}>
                          {t("affectedRouteLabel")}{" "}
                        </Text>
                        {item.affectedRoute}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Unified Responder & Admin Action Box */}
                {(item.verifiedBy || item.adminNotes) && (
                  <View
                    style={{
                      marginVertical: 6,
                      backgroundColor:
                        item.status === "RESOLVED"
                          ? (theme === "dark" ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)")
                          : item.status === "UNDER_CLEARING"
                          ? (theme === "dark" ? "rgba(2,132,199,0.12)" : "rgba(2,132,199,0.08)")
                          : (theme === "dark" ? "rgba(234,88,12,0.12)" : "rgba(234,88,12,0.08)"),
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 0,
                    }}
                  >
                    {/* Action by */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <Ionicons
                        name="shield-checkmark"
                        size={16}
                        color={
                          item.status === "RESOLVED"
                            ? "#10b981"
                            : item.status === "UNDER_CLEARING"
                            ? "#0284c7"
                            : "#ea580c"
                        }
                      />
                      <Text
                        style={{
                          fontSize: 12.5,
                          fontWeight: "800",
                          color: colors.text,
                        }}
                      >
                        {language === "tl" ? "Action by: " : "Action by: "}
                        <Text
                          style={{
                            color:
                              item.status === "RESOLVED"
                                ? "#10b981"
                                : item.status === "UNDER_CLEARING"
                                ? "#0284c7"
                                : "#ea580c",
                            fontWeight: "900",
                          }}
                        >
                          {item.verifiedBy || "MDRRMO Quick Response Team"}
                        </Text>
                      </Text>
                    </View>

                    {/* Status / Caption */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: item.adminNotes ? 6 : 0,
                      }}
                    >
                      <Ionicons
                        name={
                          item.status === "RESOLVED"
                            ? "checkmark-circle"
                            : item.status === "UNDER_CLEARING"
                            ? "construct"
                            : "alert-circle"
                        }
                        size={13}
                        color={item.statusColor}
                      />
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: "800",
                          color: item.statusColor,
                        }}
                      >
                        {item.statusLabel}
                      </Text>
                    </View>

                    {/* Notes / Detalye ng Aksyon */}
                    {item.adminNotes ? (
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                          marginTop: 2,
                          lineHeight: 17,
                        }}
                      >
                        <Text style={{ fontWeight: "700", color: colors.text }}>
                          {language === "tl"
                            ? "Detalye ng Aksyon: "
                            : "Action Details: "}
                        </Text>
                        {item.adminNotes}
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Card Footer: Timestamp & Noted Action Button */}
                <View
                  style={[
                    styles.cardFooter,
                    { borderTopColor: colors.cardBorder },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                    <Text
                      style={[styles.footerTime, { color: colors.textMuted }]}
                    >
                      {new Date(item.dateReported).toLocaleDateString()} •{" "}
                      {new Date(item.dateReported).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>

                  {/* 1 Action per Device Noted Button */}
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
                        ? `${t("notedBtn")} (${item.notedCount})`
                        : `Noted (${item.notedCount})`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Enlarged Photo Modal with Multi-Photo Navigation */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.modalBg}>
          {/* Top Bar with Counter and Close Button */}
          <View
            style={{
              position: "absolute",
              top: 44,
              left: 20,
              right: 20,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {previewImages.length > 1 && (
                <View
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.85)",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.2)",
                  }}
                >
                  <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "800" }}>
                    {language === "tl" ? "Litrato" : "Photo"} {previewIndex + 1} / {previewImages.length}
                  </Text>
                </View>
              )}

              {/* Photo Stage Signature Badge in Fullscreen */}
              {previewPhotoItems[previewIndex] && (
                <View
                  style={{
                    backgroundColor:
                      previewPhotoItems[previewIndex]?.stage === "RESOLVED"
                        ? "#10b981"
                        : previewPhotoItems[previewIndex]?.stage === "UNDER_CLEARING"
                        ? "#0284c7"
                        : previewPhotoItems[previewIndex]?.stage === "IMPASSABLE"
                        ? "#dc2626"
                        : previewPhotoItems[previewIndex]?.stage === "PENDING"
                        ? "#f59e0b"
                        : "#ea580c",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.25)",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Ionicons
                    name={
                      previewPhotoItems[previewIndex]?.stage === "RESOLVED"
                        ? "checkmark-circle"
                        : previewPhotoItems[previewIndex]?.stage === "UNDER_CLEARING"
                        ? "construct"
                        : "alert-circle"
                    }
                    size={13}
                    color="#ffffff"
                  />
                  <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900" }}>
                    {previewPhotoItems[previewIndex]?.label || "INSIDENTE"}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.85)",
                padding: 8,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.2)",
              }}
              onPress={() => {
                setPreviewImage(null);
                setPreviewImages([]);
                setPreviewPhotoItems([]);
              }}
            >
              <Ionicons name="close-outline" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {previewImage && (
            <FullscreenPreviewImage
              uri={previewImage}
              style={styles.fullscreenImg}
            />
          )}

          {/* Bottom Prev / Next Navigation */}
          {previewImages.length > 1 && (
            <View
              style={{
                position: "absolute",
                bottom: 40,
                left: 24,
                right: 24,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                zIndex: 20,
              }}
            >
              <TouchableOpacity
                disabled={previewIndex === 0}
                onPress={() => {
                  const prev = previewIndex - 1;
                  if (prev >= 0) {
                    setPreviewIndex(prev);
                    setPreviewImage(previewImages[prev]);
                  }
                }}
                style={{
                  backgroundColor: previewIndex === 0 ? "rgba(15, 23, 42, 0.4)" : "rgba(15, 23, 42, 0.9)",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: previewIndex === 0 ? "transparent" : "rgba(255,255,255,0.2)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Ionicons name="chevron-back" size={18} color={previewIndex === 0 ? "#64748b" : "#ffffff"} />
                <Text style={{ color: previewIndex === 0 ? "#64748b" : "#ffffff", fontWeight: "800", fontSize: 12 }}>
                  {language === "tl" ? "Bumalik" : "Previous"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={previewIndex === previewImages.length - 1}
                onPress={() => {
                  const next = previewIndex + 1;
                  if (next < previewImages.length) {
                    setPreviewIndex(next);
                    setPreviewImage(previewImages[next]);
                  }
                }}
                style={{
                  backgroundColor: previewIndex === previewImages.length - 1 ? "rgba(15, 23, 42, 0.4)" : "rgba(15, 23, 42, 0.9)",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: previewIndex === previewImages.length - 1 ? "transparent" : "rgba(255,255,255,0.2)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Text style={{ color: previewIndex === previewImages.length - 1 ? "#64748b" : "#ffffff", fontWeight: "800", fontSize: 12 }}>
                  {language === "tl" ? "Susunod" : "Next"}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={previewIndex === previewImages.length - 1 ? "#64748b" : "#ffffff"} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 18, fontWeight: "900" },
  sub: { fontSize: 11, marginTop: 2 },
  reportHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0284c7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeaderBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "900" },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomColor: "#38bdf8",
  },
  tabTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tabText: { fontSize: 14, fontWeight: "700" },

  container: { flex: 1, padding: 16 },
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
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  hazardBadgeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    flex: 1,
    flexShrink: 1,
    marginRight: 6,
  },
  hazardTypeText: {
    fontSize: 16,
    fontWeight: "800",
    textTransform: "capitalize",
    flex: 1,
    flexWrap: "wrap",
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "900" },

  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  locText: { fontSize: 13, fontWeight: "700" },

  photoRow: { flexDirection: "row", marginBottom: 12 },
  hazardThumb: {
    width: width * 0.7,
    height: 160,
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 0,
  },
  zoomPill: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  zoomText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },

  descText: { fontSize: 14, lineHeight: 20, marginBottom: 10 },

  routeBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 0,
  },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  routeText: { color: "#d97706", fontSize: 13, flex: 1, lineHeight: 18 },

  adminNoteBox: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 0,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  adminNoteText: { color: "#059669", fontSize: 13, flex: 1 },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  footerTime: { fontSize: 12 },

  notedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  notedBtnInactive: {},
  notedBtnActive: {},
  notedBtnText: { fontSize: 12, fontWeight: "700" },

  emptyCard: {
    borderRadius: 12,
    borderWidth: 0,
    padding: 24,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
    textAlign: "center",
  },
  emptySub: { fontSize: 12, textAlign: "center", lineHeight: 18 },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeModalBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 8,
    borderRadius: 20,
  },
  fullscreenImg: {
    width: width * 0.95,
    height: height * 0.75,
  },
});
