import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import * as ScreenOrientation from "expo-screen-orientation";
import { Ionicons } from "@expo/vector-icons";
import { Api } from "../services/api";
import { OfflineStorage } from "../services/offlineStorage";
import { EvacuationCenter } from "../types";
import { OfflineBanner } from "../components/OfflineBanner";
import { WebView } from "react-native-webview";
import { LoadingScreen } from "../components/LoadingScreen";
import { usePreferences } from "../context/PreferencesContext";
import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { RealtimeSocket } from "../services/socketService";
import { LinearGradient } from "expo-linear-gradient";
import { RadarPulseLoading } from "../components/RadarPulseLoading";

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

const facilityConfig: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  water: { label: "Tubig", icon: "water-outline" },
  food: { label: "Pagkain", icon: "restaurant-outline" },
  medical: { label: "Medikal", icon: "medkit-outline" },
  restrooms: { label: "Palikuran", icon: "man-outline" },
  electricity: { label: "Kuryente", icon: "flash-outline" },
  sleepingarea: { label: "Tulugan", icon: "bed-outline" },
  pwdaccessible: { label: "PWD Access", icon: "accessibility-outline" },
  generator: { label: "Generator", icon: "hardware-chip-outline" },
  kitchen: { label: "Kusina", icon: "cafe-outline" },
};

function generateMapHtml(
  centers: EvacuationCenter[],
  userCoords: { latitude: number; longitude: number } | null,
  language: string,
  targetIncident?: { latitude: number; longitude: number; title: string; locationDescription?: string } | null,
): string {
  const userLat = userCoords ? userCoords.latitude : 12.7042;
  const userLng = userCoords ? userCoords.longitude : 124.0371;

  const userMarkerCode = userCoords
    ? `var userPersonIcon = L.divIcon({
        className: 'custom-scallop-pin',
        html: '<div class="pin-wrap"><div class="user-glow-ring"></div><div class="pin-circle" style="background:#0284c7;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div><div class="pin-tip"></div></div>',
        iconSize: [42, 50],
        iconAnchor: [21, 50]
      });
      window.userMarkerInstance = L.marker([${userCoords.latitude}, ${userCoords.longitude}], { icon: userPersonIcon });
      featureGroup.addLayer(window.userMarkerInstance);`
    : "";

  const incidentMarkerCode =
    targetIncident && targetIncident.latitude && targetIncident.longitude
      ? `(function() {
          var incidentIcon = L.divIcon({
            className: 'custom-scallop-pin',
            html: '<div class="pin-wrap"><div class="pin-circle" style="background:#ef4444;"><svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z"/></svg></div><div class="pin-tip" style="border-top-color:#ef4444;"></div></div>',
            iconSize: [42, 50],
            iconAnchor: [21, 50]
          });
          var incMarker = L.marker([${targetIncident.latitude}, ${targetIncident.longitude}], { icon: incidentIcon });
          featureGroup.addLayer(incMarker);
          setTimeout(function() {
            window.drawRouteTo(${userLat}, ${userLng}, ${targetIncident.latitude}, ${targetIncident.longitude}, '${(targetIncident.title || "Incident").replace(/'/g, "\\'")}');
          }, 600);
        })();`
      : "";

  // When viewing road route to an incident, hide all evacuation center markers to prevent visual clutter
  // Filter active evacuation centers: Only OPEN and FULL centers appear on the emergency live map; CLOSED/INACTIVE centers are excluded
  const activeCenters = targetIncident
    ? []
    : (centers || []).filter((c) => {
        const s = (c.status || "OPEN").toUpperCase();
        return s === "OPEN" || s === "FULL";
      });

  const centerMarkersCode = activeCenters
    .map((c) => {
      const cLat = c.latitude || 12.7042;
      const cLng = c.longitude || 124.0371;
      const dist = userCoords ? calculateDistance(userCoords.latitude, userCoords.longitude, cLat, cLng) : 0;
      const distText = userCoords ? (dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`) : "N/A";
      const walkTime = userCoords ? Math.round((dist / 4.5) * 60) : 0;
      const driveTime = userCoords ? Math.max(1, Math.round((dist / 30) * 60)) : 0;
      const escapedName = c.name.replace(/'/g, "\\'");
      const isFull = (c.status || "").toUpperCase() === "FULL";
      const pinColor = isFull ? "#ea580c" : "#059669";
      const glowRing = isFull
        ? `<div class="evac-glow-ring" style="background:rgba(234,88,12,0.35);border-color:#ea580c;"></div>`
        : `<div class="evac-glow-ring" style="background:rgba(16,185,129,0.35);border-color:#10b981;"></div>`;

      return `(function() {
        var shelterIcon = L.divIcon({
          className: 'custom-scallop-pin',
          html: '<div class="pin-wrap">${glowRing}<div class="pin-circle" style="background:${pinColor};"><svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 2.84L18 11v7H6v-7l6-5.16zM10 13h4v5h-4v-5z"/></svg></div><div class="pin-tip" style="border-top-color:${pinColor};"></div></div>',
          iconSize: [42, 50],
          iconAnchor: [21, 50]
        });

        var m = L.marker([${cLat}, ${cLng}], { icon: shelterIcon });
        m.on('click', function(e) {
          if (e && e.originalEvent) {
            L.DomEvent.stopPropagation(e);
          }
          window.selectEvacCenter(${JSON.stringify(c)}, ${dist}, '${distText}', ${walkTime}, ${driveTime});
          window.drawRouteTo(${userLat}, ${userLng}, ${cLat}, ${cLng}, '${escapedName}');
        });
        featureGroup.addLayer(m);
      })();`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html { margin:0; padding:0; height:100%; width:100%; background: #0f172a; }
    #map { height:100%; width:100%; }
    .custom-scallop-pin { background: transparent; border: none; }
    .pin-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.5));
    }
    .evac-glow-ring {
      position: absolute;
      top: -3px;
      left: 50%;
      transform: translateX(-50%);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.35);
      border: 2px solid #10b981;
      animation: evacPulse 2s infinite ease-in-out;
      pointer-events: none;
      z-index: -1;
    }
    @keyframes evacPulse {
      0% { transform: translateX(-50%) scale(0.85); opacity: 0.95; box-shadow: 0 0 10px rgba(16, 185, 129, 0.9); }
      50% { transform: translateX(-50%) scale(1.4); opacity: 0.2; box-shadow: 0 0 22px rgba(16, 185, 129, 0.5); }
      100% { transform: translateX(-50%) scale(0.85); opacity: 0.95; box-shadow: 0 0 10px rgba(16, 185, 129, 0.9); }
    }
    .user-glow-ring {
      position: absolute;
      top: -3px;
      left: 50%;
      transform: translateX(-50%);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(2, 132, 199, 0.35);
      border: 2px solid #38bdf8;
      animation: userPulse 1.8s infinite ease-in-out;
      pointer-events: none;
      z-index: -1;
    }
    @keyframes userPulse {
      0% { transform: translateX(-50%) scale(0.85); opacity: 0.95; box-shadow: 0 0 10px rgba(56, 189, 248, 0.9); }
      50% { transform: translateX(-50%) scale(1.45); opacity: 0.2; box-shadow: 0 0 22px rgba(56, 189, 248, 0.5); }
      100% { transform: translateX(-50%) scale(0.85); opacity: 0.95; box-shadow: 0 0 10px rgba(56, 189, 248, 0.9); }
    }
    .pin-circle {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }
    .pin-tip {
      width: 0;
      height: 0;
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-top: 8px solid #ffffff;
      margin-top: -2px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([12.7042, 124.0371], 13);

    // Google Maps Standard Layers
    var googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps'
    });

    var googleTerrain = L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps'
    });

    var googleStreets = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps'
    });

    // Google Maps Clean Layers (Hides ONLY place/store icons, preserves all location & road names)
    var googleHybridNoPoi = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&apistyle=s.t:poi|s.e:i|p.v:off', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps'
    });

    var googleTerrainNoPoi = L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&apistyle=s.t:poi|s.e:i|p.v:off', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps'
    });

    var googleStreetsNoPoi = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&apistyle=s.t:poi|s.e:i|p.v:off', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps'
    });

    var isHidePoi = false;
    var currentBaseType = 'hybrid';
    var currentTileLayer = googleHybrid.addTo(map);

    function applyActiveLayer() {
      if (currentTileLayer) map.removeLayer(currentTileLayer);
      if (currentBaseType === 'terrain') {
        currentTileLayer = (isHidePoi ? googleTerrainNoPoi : googleTerrain).addTo(map);
      } else if (currentBaseType === 'streets') {
        currentTileLayer = (isHidePoi ? googleStreetsNoPoi : googleStreets).addTo(map);
      } else {
        currentTileLayer = (isHidePoi ? googleHybridNoPoi : googleHybrid).addTo(map);
      }
    }

    window.setMapLayer = function(layerType) {
      currentBaseType = layerType;
      applyActiveLayer();
    };

    window.toggleHidePoi = function(hide) {
      isHidePoi = hide;
      applyActiveLayer();
    };

    var featureGroup = L.featureGroup().addTo(map);
    var activeRouteGroup = L.featureGroup().addTo(map);

    ${userMarkerCode}
    ${centerMarkersCode}
    ${incidentMarkerCode}

    if (featureGroup.getLayers().length > 0) {
      map.fitBounds(featureGroup.getBounds().pad(0.15));
    }

    // Tapping outside of any pin dismisses the active route and modal
    map.on('click', function() {
      activeRouteGroup.clearLayers();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'DESELECT_CENTER'
        }));
      }
    });

    window.selectEvacCenter = function(centerObj, distKm, distFormatted, walkMins, driveMins) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SELECT_CENTER',
          center: centerObj,
          distKm: distKm,
          distFormatted: distFormatted,
          walkMins: walkMins,
          driveMins: driveMins
        }));
      }
    };

    window.drawRouteTo = function(uLat, uLng, dLat, dLng, destName) {
      activeRouteGroup.clearLayers();

      // Immediate direct preview
      var tempGlow = L.polyline([[uLat, uLng], [dLat, dLng]], { color: '#0284c7', weight: 8, opacity: 0.35 });
      var tempLine = L.polyline([[uLat, uLng], [dLat, dLng]], { color: '#38bdf8', weight: 4, dashArray: '8, 8', opacity: 0.8 });
      activeRouteGroup.addLayer(tempGlow);
      activeRouteGroup.addLayer(tempLine);

      // Fetch actual turn-by-turn road network geometry from OpenStreetMap OSRM
      var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + uLng + ',' + uLat + ';' + dLng + ',' + dLat + '?overview=full&geometries=geojson';

      fetch(osrmUrl)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data && data.routes && data.routes.length > 0) {
            activeRouteGroup.clearLayers();
            var coords = data.routes[0].geometry.coordinates.map(function(pt) {
              return [pt[1], pt[0]];
            });

            // Road outer glow casing
            var casing = L.polyline(coords, {
              color: '#0369a1',
              weight: 9,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round'
            });
            activeRouteGroup.addLayer(casing);

            // Bright blue navigation line
            var roadLine = L.polyline(coords, {
              color: '#38bdf8',
              weight: 5,
              opacity: 1.0,
              lineCap: 'round',
              lineJoin: 'round'
            });
            activeRouteGroup.addLayer(roadLine);

            var bounds = L.latLngBounds(coords);
            map.fitBounds(bounds.pad(0.32), { animate: true, duration: 1.0 });
          } else {
            fallbackDirectRoute(uLat, uLng, dLat, dLng);
          }
        })
        .catch(function() {
          fallbackDirectRoute(uLat, uLng, dLat, dLng);
        });
    };

    function fallbackDirectRoute(uLat, uLng, dLat, dLng) {
      activeRouteGroup.clearLayers();
      var glow = L.polyline([[uLat, uLng], [dLat, dLng]], { color: '#0284c7', weight: 8, opacity: 0.4 });
      var line = L.polyline([[uLat, uLng], [dLat, dLng]], { color: '#38bdf8', weight: 4, dashArray: '10, 10', opacity: 0.95 });
      activeRouteGroup.addLayer(glow);
      activeRouteGroup.addLayer(line);
      map.fitBounds(L.latLngBounds([[uLat, uLng], [dLat, dLng]]).pad(0.32), { animate: true });
    }

    window.clearActiveRoute = function() {
      activeRouteGroup.clearLayers();
      if (featureGroup.getLayers().length > 0) {
        map.fitBounds(featureGroup.getBounds().pad(0.15), { animate: true });
      }
    };
    window.updateUserLocation = function(lat, lng) {
      if (lat && lng) {
        if (window.userMarkerInstance) {
          window.userMarkerInstance.setLatLng([lat, lng]);
        } else {
          var userPersonIcon = L.divIcon({
            className: 'custom-scallop-pin',
            html: '<div class="pin-wrap"><div class="user-glow-ring"></div><div class="pin-circle" style="background:#0284c7;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div><div class="pin-tip"></div></div>',
            iconSize: [42, 50],
            iconAnchor: [21, 50]
          });
          window.userMarkerInstance = L.marker([lat, lng], { icon: userPersonIcon });
          featureGroup.addLayer(window.userMarkerInstance);
        }
      }
    };

    window.recenterToUser = function(lat, lng) {
      if (lat && lng) {
        map.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
      }
    };
  </script>
</body>
</html>`;
}

function MapLoadingView({ colors, language }: { colors: any; language: string }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(0.85)).current;
  const ringOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulsing icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Radar pulse ring
    Animated.loop(
      Animated.parallel([
        Animated.timing(ringScale, {
          toValue: 1.85,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(ringOpacity, {
            toValue: 0.25,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.mapLoadingContainer, { backgroundColor: colors.bg }]}>
      <View style={styles.mapLoadingIconWrapper}>
        <Animated.View
          style={[
            styles.mapLoadingRadarRing,
            {
              borderColor: colors.primaryLight,
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.mapLoadingIconCircle,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Ionicons name="map-outline" size={42} color={colors.primaryLight} />
        </Animated.View>
      </View>

      <ActivityIndicator size="small" color={colors.primaryLight} style={{ marginTop: 24, marginBottom: 8 }} />

      <Text style={[styles.mapLoadingTitle, { color: colors.text }]}>
        {language === "tl" ? "Ikinakarga ang Emergency Map..." : "Loading Emergency Map..."}
      </Text>
      <Text style={[styles.mapLoadingSub, { color: colors.textSecondary }]}>
        {language === "tl"
          ? "Kinukuha ang mga ligtas na evacuation centers at ruta..."
          : "Fetching safe evacuation centers and routes..."}
      </Text>
    </View>
  );
}

export const MapScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { colors, language, theme } = usePreferences();
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"MAP" | "CENTERS">(
    route?.params?.initialTab || (route?.params?.focusType === "centers" ? "CENTERS" : "MAP"),
  );

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    } else if (route?.params?.focusType === "centers") {
      setActiveTab("CENTERS");
    }
  }, [route?.params]);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [selectedCenterInfo, setSelectedCenterInfo] = useState<{
    center: EvacuationCenter;
    distFormatted: string;
    walkMins: number;
    driveMins: number;
  } | null>(null);
  const [isSliderExpanded, setIsSliderExpanded] = useState(false);
  const [currentMapLayer, setCurrentMapLayer] = useState<"hybrid" | "terrain" | "streets">("hybrid");
  const [isHidePoi, setIsHidePoi] = useState(false);
  const [centerFilter, setCenterFilter] = useState<"ALL" | "NEAR_ME">("ALL");
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const handleLocateNearestCenter = async () => {
    setIsLocatingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc?.coords) {
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setUserCoords(coords);
          setCenterFilter("NEAR_ME");
        }
      } else {
        Alert.alert(
          language === "tl" ? "Pahintulot sa GPS" : "Location Permission",
          language === "tl" ? "Kailangan ang GPS permission upang mahanap ang pinakamalapit na sentro." : "Location permission is required to find the nearest center."
        );
      }
    } catch (e) {
      console.warn("GPS locator error:", e);
    } finally {
      setIsLocatingGps(false);
    }
  };

  const sortedAndFilteredCenters = React.useMemo(() => {
    if (centerFilter === "NEAR_ME" && userCoords) {
      return [...centers].sort((a, b) => {
        const distA = calculateDistance(userCoords.latitude, userCoords.longitude, a.latitude || 12.7042, a.longitude || 124.0371);
        const distB = calculateDistance(userCoords.latitude, userCoords.longitude, b.latitude || 12.7042, b.longitude || 124.0371);
        return distA - distB;
      });
    }
    return centers;
  }, [centers, centerFilter, userCoords]);

  const toggleMapLayer = () => {
    const next = currentMapLayer === "hybrid" ? "terrain" : currentMapLayer === "terrain" ? "streets" : "hybrid";
    setCurrentMapLayer(next);
    webViewRef.current?.injectJavaScript(`if (window.setMapLayer) { window.setMapLayer('${next}'); } true;`);
  };

  const toggleHidePoi = () => {
    const next = !isHidePoi;
    setIsHidePoi(next);
    webViewRef.current?.injectJavaScript(`if (window.toggleHidePoi) { window.toggleHidePoi(${next}); } true;`);
  };

  const showFullscreenUi = isFullscreen || isLandscape;

  // Dynamically hide Bottom Tab Bar in Fullscreen / Landscape mode
  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: showFullscreenUi
          ? { display: "none" }
          : {
              backgroundColor: colors.card,
              borderTopColor: colors.cardBorder,
              borderTopWidth: 1,
              height: 62 + Math.max(insets.bottom, 10),
              paddingBottom: Math.max(insets.bottom, 10),
              paddingTop: 8,
            },
      });
    }

    return () => {
      if (parent) {
        parent.setOptions({
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.cardBorder,
            borderTopWidth: 1,
            height: 62 + Math.max(insets.bottom, 10),
            paddingBottom: Math.max(insets.bottom, 10),
            paddingTop: 8,
          },
        });
      }
    };
  }, [showFullscreenUi, colors, insets]);

  // Enable orientation changes, sync active tab, and refresh fresh map data when entering MapScreen
  useFocusEffect(
    React.useCallback(() => {
      if (route?.params?.initialTab) {
        setActiveTab(route.params.initialTab);
      }

      // Always ensure fresh data on screen focus
      loadMapData(true);
      fetchUserLocation();

      ScreenOrientation.unlockAsync().catch(() => {});

      const sub = ScreenOrientation.addOrientationChangeListener((evt) => {
        const orientation = evt.orientationInfo.orientation;
        const isLand =
          orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
          orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
        setIsLandscape(isLand);
      });

      return () => {
        sub.remove();
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        ).catch(() => {});
      };
    }, [route?.params?.initialTab]),
  );

  useEffect(() => {
    loadMapData();
    fetchUserLocation();

    // ⚡ Real-Time WebSocket Event Listener: Instant 0ms Occupant/Status Sync
    const unsubUpdate = RealtimeSocket.on("EVACUATION_CENTER_UPDATED", (updatedCenter: any) => {
      if (!updatedCenter || !updatedCenter.id) return;
      console.log(`[MapScreen] Real-time live update received for center: ${updatedCenter.name}`);

      setCenters((prevCenters) =>
        prevCenters.map((c) => (c.id === updatedCenter.id ? { ...c, ...updatedCenter } : c)),
      );

      // If user has the bottom modal slider open for this center, update it immediately live
      setSelectedCenterInfo((prev) => {
        if (!prev || prev.center.id !== updatedCenter.id) return prev;
        return {
          ...prev,
          center: { ...prev.center, ...updatedCenter },
        };
      });
    });

    // ⚡ Real-Time WebSocket Event Listener: Center Created / Deleted
    const unsubChanged = RealtimeSocket.on("EVACUATION_CENTERS_CHANGED", () => {
      loadMapData(true);
    });

    // 🔔 Push notification fallback
    const notifSub = Notifications.addNotificationReceivedListener(() => {
      loadMapData(true);
    });

    return () => {
      unsubUpdate();
      unsubChanged();
      notifSub.remove();
    };
  }, []);

  const fetchUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (loc?.coords) {
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setUserCoords(coords);
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(
              `if (window.updateUserLocation) { window.updateUserLocation(${coords.latitude}, ${coords.longitude}); } true;`
            );
          }
        }
      }
    } catch {
      // Fallback
    }
  };

  const loadMapData = async (isSilent: boolean = false) => {
    // 1. Instant Cache Hydration (0ms load)
    if (!isSilent) {
      try {
        const cachedCenters = await OfflineStorage.getCache<EvacuationCenter[]>("CENTERS");
        if (cachedCenters && cachedCenters.length > 0) {
          setCenters(cachedCenters);
          setLoading(false);
        }
      } catch {}
    }

    // 2. Network Stale-While-Revalidate Real-Time Sync
    try {
      const centerRes = await Api.getCenters();
      const freshCenters = centerRes.data || [];

      setCenters(freshCenters);
      setIsOffline(centerRes.isOffline);

      // ⚡ Real-Time Live Occupant/Status Sync: If user has an open center drawer, update it live!
      setSelectedCenterInfo((prev) => {
        if (!prev) return null;
        const updated = freshCenters.find((c) => c.id === prev.center.id);
        if (updated) {
          return {
            ...prev,
            center: updated,
          };
        }
        return prev;
      });
    } catch {
      setIsOffline(true);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  const toggleOrientation = async () => {
    try {
      if (isLandscape) {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        );
        setIsLandscape(false);
      } else {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
        );
        setIsLandscape(true);
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn("[MapScreen] Orientation toggle warning:", err);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const handleRecenter = () => {
    if (userCoords && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `if (window.recenterToUser) { window.recenterToUser(${userCoords.latitude}, ${userCoords.longitude}); } true;`,
      );
    } else {
      fetchUserLocation();
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "SELECT_CENTER" && data.center) {
        setSelectedCenterInfo({
          center: data.center,
          distFormatted: data.distFormatted || "N/A",
          walkMins: data.walkMins || 0,
          driveMins: data.driveMins || 0,
        });
        setIsSliderExpanded(true);
      } else if (data.type === "DESELECT_CENTER") {
        setSelectedCenterInfo(null);
        setIsSliderExpanded(false);
      }
    } catch {}
  };

  const handleDrawRoute = (c: EvacuationCenter) => {
    if (userCoords && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.drawRouteTo(${userCoords.latitude}, ${userCoords.longitude}, ${c.latitude || 12.7042}, ${c.longitude || 124.0371}, '${c.name.replace(/'/g, "\\'")}'); true;`,
      );
    }
  };

  const handleClearRoute = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.clearActiveRoute(); true;`);
    }
    setSelectedCenterInfo(null);
    setIsSliderExpanded(false);
  };

  const handleOpenStreetView = (c?: EvacuationCenter) => {
    const target = c || selectedCenterInfo?.center;
    if (!target) {
      Alert.alert(
        language === "tl" ? "Pumili ng Sentro" : "Select a Center",
        language === "tl"
          ? "Pumili o pumindot muna ng evacuation center sa mapa para makita ang 360° Street View nito."
          : "Please tap an evacuation center on the map first to view its 360° Street View.",
      );
      return;
    }
    const lat = target.latitude || 12.7042;
    const lng = target.longitude || 124.0371;
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Street View", "Hindi mabuksan ang Street View para sa lokasyong ito.");
    });
  };

  const handleOpenGoogleNavigation = async (c?: EvacuationCenter) => {
    const target = c || selectedCenterInfo?.center;
    if (!target) {
      Alert.alert(
        language === "tl" ? "Pumili ng Sentro" : "Select a Center",
        language === "tl"
          ? "Pumili o pumindot muna ng evacuation center sa mapa upang masimulan ang Google Navigation."
          : "Please tap an evacuation center on the map first to start turn-by-turn navigation.",
      );
      return;
    }

    setIsNavigating(true);

    try {
      const lat = target.latitude || 12.7042;
      const lng = target.longitude || 124.0371;

      // Get live fresh GPS location if possible
      let currentLat = userCoords?.latitude;
      let currentLng = userCoords?.longitude;

      try {
        const freshLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (freshLoc?.coords) {
          currentLat = freshLoc.coords.latitude;
          currentLng = freshLoc.coords.longitude;
          setUserCoords({ latitude: currentLat, longitude: currentLng });
        }
      } catch {
        // Fallback to cached userCoords
      }

      // 1. Android Direct Turn-by-Turn GPS Navigation Intent (from live GPS location to destination)
      const androidNavIntent = `google.navigation:q=${lat},${lng}&mode=d`;
      // 2. Google Maps Navigation Route (from current GPS to evacuation center)
      const googleMapsDirUrl = currentLat && currentLng
        ? `https://www.google.com/maps/dir/?api=1&origin=${currentLat},${currentLng}&destination=${lat},${lng}&travelmode=driving`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

      if (Platform.OS === "android") {
        try {
          const canOpen = await Linking.canOpenURL(androidNavIntent);
          if (canOpen) {
            await Linking.openURL(androidNavIntent);
            return;
          }
        } catch {}
      }

      await Linking.openURL(googleMapsDirUrl);
    } catch {
      Alert.alert(
        "Navigation",
        language === "tl"
          ? "Hindi mabuksan ang Google Maps application."
          : "Could not open Google Maps app.",
      );
    } finally {
      setTimeout(() => setIsNavigating(false), 2200);
    }
  };

  if (loading && centers.length === 0) {
    return (
      <RadarPulseLoading
        title={language === "tl" ? "Ikinakarga ang Emergency Map..." : "Loading Emergency Map..."}
        subtitle={
          language === "tl"
            ? "Kinukuha ang pinakasariwang evacuation centers at live GPS..."
            : "Fetching latest evacuation shelters and live GPS..."
        }
      />
    );
  }

  const targetIncident =
    route?.params?.targetIncident
      ? route.params.targetIncident
      : route?.params?.incidentLat && route?.params?.incidentLng
      ? {
          latitude: route.params.incidentLat,
          longitude: route.params.incidentLng,
          title: route.params.incidentTitle || "Incident Location",
          locationDescription: route.params.incidentLocation,
        }
      : null;

  const mapHtml = generateMapHtml(centers, userCoords, language, targetIncident);

  return (
    <SafeAreaView
      edges={showFullscreenUi ? [] : ["top", "left", "right"]}
      style={[
        styles.safeArea,
        { backgroundColor: colors.bg },
        showFullscreenUi && { paddingTop: 0 },
      ]}
    >
      <StatusBar
        hidden={showFullscreenUi}
        barStyle={
          showFullscreenUi || theme === "dark"
            ? "light-content"
            : "dark-content"
        }
        backgroundColor={showFullscreenUi ? "#0f172a" : colors.bg}
      />

      {/* Aesthetic Minimal Top Header Gradient */}
      {!showFullscreenUi && (
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
      )}

      {!showFullscreenUi && <OfflineBanner isOffline={isOffline} />}

      {/* Standard Header (Hidden in Fullscreen / Landscape) */}
      {!showFullscreenUi && (
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
          {navigation.canGoBack() ? (
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: colors.card,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : (
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
              <Ionicons name="map" size={22} color="#0284c7" />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {language === "tl"
                ? "Mapa ng Kaligtasan sa Sakuna"
                : "Irosin Emergency Map"}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {language === "tl"
                ? "Pindutin ang Pin para sa ruta at evacuation"
                : "Tap Pin for Turn-by-Turn Route & Details"}
            </Text>
          </View>
        </View>
      )}

      {/* Sub Tabs (Hidden in Fullscreen / Landscape) */}
      {!showFullscreenUi && (
        <View
          style={[
            styles.tabsRow,
            {
              backgroundColor: "transparent",
              borderBottomWidth: 0,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === "MAP" && [
                styles.tabItemActive,
                { borderBottomColor: colors.primaryLight },
              ],
            ]}
            onPress={() => setActiveTab("MAP")}
          >
            <Ionicons
              name="map-outline"
              size={16}
              color={activeTab === "MAP" ? colors.primaryLight : colors.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                { color: colors.textMuted },
                activeTab === "MAP" && {
                  color: colors.primaryLight,
                  fontWeight: "800",
                },
              ]}
            >
              {language === "tl" ? "Live Mapa" : "Live Map"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === "CENTERS" && [
                styles.tabItemActive,
                { borderBottomColor: colors.primaryLight },
              ],
            ]}
            onPress={() => setActiveTab("CENTERS")}
          >
            <Ionicons
              name="business-outline"
              size={16}
              color={
                activeTab === "CENTERS" ? colors.primaryLight : colors.textMuted
              }
            />
            <Text
              style={[
                styles.tabText,
                { color: colors.textMuted },
                activeTab === "CENTERS" && {
                  color: colors.primaryLight,
                  fontWeight: "800",
                },
              ]}
            >
              {language === "tl" ? "Mga Sentro" : "Centers"} ({centers.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* View Contents */}
      {(activeTab === "MAP" || showFullscreenUi) && (
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            originWhitelist={["*"]}
            source={{ html: mapHtml }}
            style={styles.webview}
            onMessage={handleWebViewMessage}
          />

          {/* Floating Back Button (Top-Left of Map when navigated from another screen) */}
          {navigation.canGoBack() && (
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                zIndex: 999,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: colors.card,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 5,
              }}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: "800" }}>
                {language === "tl" ? "Bumalik" : "Back"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Floating Controls (Top-Right View & Map Tools) */}
          <View style={styles.topControlDock}>
            {/* Fullscreen Toggle */}
            <TouchableOpacity
              style={[
                styles.dockBtn,
                showFullscreenUi && styles.dockBtnActive,
              ]}
              onPress={toggleFullscreen}
              activeOpacity={0.8}
            >
              <Ionicons
                name={showFullscreenUi ? "contract-outline" : "scan-outline"}
                size={20}
                color="#ffffff"
              />
            </TouchableOpacity>

            {/* Landscape / Portrait Orientation Toggle */}
            <TouchableOpacity
              style={[
                styles.dockBtn,
                isLandscape && styles.dockBtnActive,
              ]}
              onPress={toggleOrientation}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isLandscape ? "phone-portrait-outline" : "phone-landscape-outline"}
                size={20}
                color="#ffffff"
              />
            </TouchableOpacity>

            {/* Refresh Data */}
            <TouchableOpacity
              style={styles.dockBtn}
              onPress={() => loadMapData()}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={20} color="#10b981" />
            </TouchableOpacity>

            {/* Google Maps Layer Switcher (Satellite Hybrid / Topo Terrain / Streets) */}
            <TouchableOpacity
              style={[
                styles.dockBtn,
                currentMapLayer === "hybrid" && { borderColor: "#38bdf8" },
              ]}
              onPress={toggleMapLayer}
              activeOpacity={0.8}
            >
              <Ionicons
                name={
                  currentMapLayer === "hybrid"
                    ? "earth-outline"
                    : currentMapLayer === "terrain"
                    ? "triangle-outline"
                    : "map-outline"
                }
                size={20}
                color={currentMapLayer === "hybrid" ? "#38bdf8" : "#fbbf24"}
              />
            </TouchableOpacity>

            {/* Hide POI / Focus Mode Toggle (Hide commercial places/shops, keep only emergency pins) */}
            <TouchableOpacity
              style={[
                styles.dockBtn,
                isHidePoi && { borderColor: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.25)" },
              ]}
              onPress={toggleHidePoi}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isHidePoi ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={isHidePoi ? "#10b981" : "#ffffff"}
              />
            </TouchableOpacity>

            {/* Recenter to User GPS */}
            <TouchableOpacity
              style={styles.dockBtn}
              onPress={handleRecenter}
              activeOpacity={0.8}
            >
              <Ionicons name="locate-outline" size={20} color="#38bdf8" />
            </TouchableOpacity>
          </View>

          {/* FULL-WIDTH FLUSH BOTTOM MODAL (Theme-Aware, Top-Rounded Only) */}
          {selectedCenterInfo && (
            <View
              style={[
                styles.fullWidthBottomModal,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  paddingBottom: Math.max(insets.bottom, 14),
                },
                isSliderExpanded ? styles.modalExpanded : styles.modalCollapsed,
              ]}
            >
              {/* Centered Top Drag Handle Bar (Tap to Expand / Collapse) */}
              <TouchableOpacity
                style={styles.centeredHandleArea}
                onPress={() => setIsSliderExpanded((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.dragHandleBar,
                    { backgroundColor: colors.cardBorder || "rgba(148, 163, 184, 0.4)" },
                  ]}
                />
              </TouchableOpacity>

              {/* Spacious Header Summary Row */}
              <TouchableOpacity
                style={styles.modalHeaderRow}
                onPress={() => setIsSliderExpanded((prev) => !prev)}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <Ionicons name="business-outline" size={17} color={colors.primaryLight} />
                    <Text
                      style={[styles.modalCenterTitle, { color: colors.text, marginBottom: 0 }]}
                      numberOfLines={1}
                    >
                      {selectedCenterInfo.center.name}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                    <Ionicons name="location-outline" size={13} color={colors.primaryLight} />
                    <Text style={[styles.modalDistanceText, { color: colors.primaryLight }]}>
                      {selectedCenterInfo.distFormatted}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>•</Text>
                    <Ionicons name="walk-outline" size={13} color={colors.primaryLight} />
                    <Text style={[styles.modalDistanceText, { color: colors.primaryLight }]}>
                      ~{selectedCenterInfo.walkMins} mins
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>•</Text>
                    <Ionicons name="car-outline" size={13} color={colors.primaryLight} />
                    <Text style={[styles.modalDistanceText, { color: colors.primaryLight }]}>
                      ~{selectedCenterInfo.driveMins} mins
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Expanded Detailed Content (Visible when Drawer is Tapped/Opened) */}
              {isSliderExpanded && (
                <ScrollView
                  style={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View
                    style={[
                      styles.modalBody,
                      { borderTopColor: colors.cardBorder },
                    ]}
                  >
                    {/* Barangay & Status Badge */}
                    <View style={styles.badgeRow}>
                      <Text style={[styles.modalBrgyText, { color: colors.textSecondary }]}>
                        Brgy. {selectedCenterInfo.center.barangayName || "Irosin"}
                      </Text>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>
                          {selectedCenterInfo.center.status || "OPEN"}
                        </Text>
                      </View>
                    </View>

                    {/* Address */}
                    {selectedCenterInfo.center.address ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 }}>
                        <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.modalAddressText, { color: colors.textSecondary, marginBottom: 0 }]}>
                          {selectedCenterInfo.center.address}
                        </Text>
                      </View>
                    ) : null}

                    {/* Capacity & Occupancy Bar */}
                    <View
                      style={[
                        styles.occupancyBox,
                        { backgroundColor: colors.inputBg },
                      ]}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                        <Text style={[styles.occupancyLabel, { color: colors.textSecondary }]}>
                          Kapasidad & Kasalukuyang Occupancy:
                        </Text>
                        <Text style={[styles.occupancyValue, { color: colors.primaryLight }]}>
                          {selectedCenterInfo.center.currentOccupancy || 0} / {selectedCenterInfo.center.capacity || 100} katao
                        </Text>
                      </View>
                      <View style={styles.occupancyProgressBarBg}>
                        <View
                          style={[
                            styles.occupancyProgressBarFill,
                            {
                              width: `${Math.min(
                                100,
                                Math.round(
                                  ((selectedCenterInfo.center.currentOccupancy || 0) /
                                    (selectedCenterInfo.center.capacity || 100)) *
                                    100,
                                ),
                              )}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Facilities List with Outlined Icons */}
                    {selectedCenterInfo.center.facilities && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
                          Pasilidad sa Sentro:
                        </Text>
                        <View style={styles.facilitiesRow}>
                          {typeof selectedCenterInfo.center.facilities === "object" &&
                          !Array.isArray(selectedCenterInfo.center.facilities)
                            ? Object.entries(selectedCenterInfo.center.facilities)
                                .filter(([_, val]) => val)
                                .map(([key]) => {
                                  const k = key.toLowerCase();
                                  const conf = facilityConfig[k] || { label: key, icon: "checkmark-circle-outline" as const };
                                  return (
                                    <View
                                      key={key}
                                      style={[
                                        styles.facilityChip,
                                        {
                                          backgroundColor: colors.inputBg,
                                          borderColor: colors.cardBorder,
                                        },
                                      ]}
                                    >
                                      <Ionicons name={conf.icon} size={14} color={colors.primaryLight} />
                                      <Text style={[styles.facilityChipText, { color: colors.text }]}>
                                        {conf.label}
                                      </Text>
                                    </View>
                                  );
                                })
                            : Array.isArray(selectedCenterInfo.center.facilities)
                            ? (selectedCenterInfo.center.facilities as string[]).map((f, i) => {
                                const k = f.toLowerCase();
                                const conf = facilityConfig[k] || { label: f, icon: "checkmark-circle-outline" as const };
                                return (
                                  <View
                                    key={i}
                                    style={[
                                      styles.facilityChip,
                                      {
                                        backgroundColor: colors.inputBg,
                                        borderColor: colors.cardBorder,
                                      },
                                    ]}
                                  >
                                    <Ionicons name={conf.icon} size={14} color={colors.primaryLight} />
                                    <Text style={[styles.facilityChipText, { color: colors.text }]}>
                                      {conf.label}
                                    </Text>
                                  </View>
                                );
                              })
                            : null}
                        </View>
                      </View>
                    )}

                    {/* Camp Manager Contact with Wrapped Multi-line Safety */}
                    {selectedCenterInfo.center.contactPerson ? (
                      <View
                        style={[
                          styles.contactRow,
                          { backgroundColor: colors.inputBg },
                        ]}
                      >
                        <Ionicons name="call-outline" size={18} color={colors.primaryLight} style={{ marginTop: 3 }} />
                        <View style={{ flex: 1, flexWrap: "wrap" }}>
                          <Text style={[styles.contactNameText, { color: colors.text }]}>
                            {selectedCenterInfo.center.contactPerson}
                          </Text>
                          <Text style={[styles.contactPhoneText, { color: colors.primaryLight }]}>
                            {selectedCenterInfo.center.contactPhone || "Walang contact number"}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    {/* Big Navigation & Street View Action Buttons */}
                    <View style={styles.modalActionsRow}>
                      <TouchableOpacity
                        style={[styles.bigActionBtn, { backgroundColor: "#059669" }]}
                        onPress={() => !isNavigating && handleOpenGoogleNavigation()}
                        activeOpacity={0.85}
                        disabled={isNavigating}
                      >
                        {isNavigating ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Ionicons name="navigate-outline" size={18} color="#ffffff" />
                        )}
                        <Text style={styles.bigActionBtnText}>
                          {isNavigating
                            ? (language === "tl" ? "Inihahanda ang GPS..." : "Connecting GPS...")
                            : (language === "tl" ? "Simulan ang Navigation" : "Start Navigation")}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.bigActionBtn, { backgroundColor: "#334155" }]}
                        onPress={() => handleOpenStreetView()}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="eye-outline" size={18} color="#ffffff" />
                        <Text style={styles.bigActionBtnText}>360° Street View</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              )}
            </View>
          )}
        </View>
      )}

      {activeTab === "CENTERS" && !showFullscreenUi && (
        <ScrollView style={styles.listContainer}>
          {/* Top Segmented Filter: All Centers vs Near Me */}
          <View style={{ marginBottom: 14 }}>
            <View
              style={{
                flexDirection: "row",
                backgroundColor: colors.inputBg,
                padding: 4,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                marginBottom: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => setCenterFilter("ALL")}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: centerFilter === "ALL" ? colors.card : "transparent",
                  borderWidth: centerFilter === "ALL" ? 1 : 0,
                  borderColor: colors.cardBorder,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "800",
                    color: centerFilter === "ALL" ? colors.primaryLight : colors.textSecondary,
                  }}
                >
                  🏢 {language === "tl" ? "Lahat ng Sentro" : "All Centers"} ({centers.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (!userCoords) {
                    handleLocateNearestCenter();
                  } else {
                    setCenterFilter("NEAR_ME");
                  }
                }}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: centerFilter === "NEAR_ME" ? "#059669" : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "900",
                    color: centerFilter === "NEAR_ME" ? "#ffffff" : colors.textSecondary,
                  }}
                >
                  📍 {language === "tl" ? "Pinakamalapit sa Akin" : "Nearest to Me"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* GPS Locator Quick Action Bar */}
            <TouchableOpacity
              onPress={handleLocateNearestCenter}
              disabled={isLocatingGps}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: "rgba(2, 132, 199, 0.1)",
                borderWidth: 1,
                borderColor: "rgba(2, 132, 199, 0.3)",
                paddingVertical: 10,
                borderRadius: 12,
              }}
            >
              {isLocatingGps ? (
                <ActivityIndicator size="small" color="#0284c7" />
              ) : (
                <Ionicons name="navigate-circle-outline" size={18} color="#0284c7" />
              )}
              <Text style={{ color: "#0284c7", fontWeight: "900", fontSize: 12.5 }}>
                {isLocatingGps
                  ? language === "tl" ? "Kinukuha ang GPS location..." : "Finding GPS position..."
                  : language === "tl" ? "Hanapin ang Pinakamalapit na Sentro (Live GPS)" : "Find Nearest Evacuation Center (Live GPS)"}
              </Text>
            </TouchableOpacity>
          </View>

          {sortedAndFilteredCenters.map((c, index) => {
            const dist = userCoords
              ? calculateDistance(
                  userCoords.latitude,
                  userCoords.longitude,
                  c.latitude || 12.7042,
                  c.longitude || 124.0371,
                )
              : null;
            const distText = dist !== null ? (dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`) : null;
            const walkTime = dist !== null ? Math.round((dist / 4.5) * 60) : 0;
            const driveTime = dist !== null ? Math.max(1, Math.round((dist / 30) * 60)) : 0;
            const isTopNearest = centerFilter === "NEAR_ME" && index === 0 && userCoords;

            return (
              <View
                key={c.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.card },
                  isTopNearest && {
                    borderColor: "#10b981",
                    borderWidth: 1.5,
                    shadowColor: "#10b981",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 3,
                  },
                ]}
              >
                {isTopNearest && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      marginBottom: 10,
                      alignSelf: "flex-start",
                      borderWidth: 1,
                      borderColor: "rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    <Ionicons name="star" size={13} color="#10b981" />
                    <Text style={{ fontSize: 11, fontWeight: "900", color: "#10b981", letterSpacing: 0.3 }}>
                      {language === "tl" ? "PINAKAMALAPIT NA SENTRO" : "NEAREST EVACUATION SHELTER"}
                    </Text>
                  </View>
                )}

                <View style={styles.cardHeaderRow}>
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={colors.success}
                    style={{ marginTop: 2 }}
                  />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {c.name}
                  </Text>
                </View>
                <Text style={[styles.cardSub, { color: colors.primaryLight }]}>
                  Brgy. {c.barangayName} • Status:{" "}
                  <Text style={{ fontWeight: "bold" }}>{c.status}</Text>
                  {distText && (
                    <Text style={{ color: "#38bdf8", fontWeight: "bold" }}>
                      {" "}• 📍 {distText}
                    </Text>
                  )}
                </Text>

                {distText && (
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>
                    🚶 ~{walkTime} mins lakad • 🚗 ~{driveTime} mins biyahe
                  </Text>
                )}

                <Text
                  style={[styles.cardDetail, { color: colors.textSecondary, marginBottom: 10 }]}
                >
                  {language === "tl" ? "Kapasidad: " : "Capacity: "}
                  {c.currentOccupancy}/{c.capacity}{" "}
                  {language === "tl" ? "residente" : "occupants"}
                </Text>

                {/* Quick Action Buttons on Center Card (Right-Aligned with Top Margin & Divider) */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 16,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: colors.cardBorder || "rgba(148, 163, 184, 0.15)",
                  }}
                >
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#475569" }]}
                    onPress={() => handleOpenStreetView(c)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="eye-outline" size={14} color="#ffffff" />
                    <Text style={styles.actionBtnText}>360° Street View</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#0284c7" }]}
                    onPress={() => {
                      setSelectedCenterInfo({
                        center: c,
                        distFormatted: distText || "N/A",
                        walkMins: walkTime,
                        driveMins: driveTime,
                      });
                      setIsSliderExpanded(true);
                      setActiveTab("MAP");
                      setTimeout(() => {
                        handleDrawRoute(c);
                      }, 400);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="map-outline" size={14} color="#ffffff" />
                    <Text style={styles.actionBtnText}>
                      {language === "tl" ? "Ipakita sa Mapa" : "View on Map"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* GPS Location Finder with Accuracy Reminder Modal */}
      <Modal
        visible={isLocatingGps}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLocatingGps(false)}
      >
        <View style={styles.gpsModalBackdrop}>
          <View style={[styles.gpsModalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.gpsModalIconCircle, { backgroundColor: colors.primaryBg, borderColor: colors.primaryLight }]}>
              <Ionicons name="navigate" size={30} color={colors.primaryLight} />
            </View>

            <ActivityIndicator size="small" color={colors.primaryLight} style={{ marginVertical: 12 }} />

            <Text style={[styles.gpsModalTitle, { color: colors.text }]}>
              {language === "tl" ? "Hinahanap ang Pinakamalapit na Sentro..." : "Finding Nearest Evacuation Center..."}
            </Text>

            <Text style={[styles.gpsModalSubtitle, { color: colors.textSecondary }]}>
              {language === "tl"
                ? "Kinukuha ang iyong GPS lokasyon upang kalkulahin ang pinakamalapit na sentro..."
                : "Acquiring your GPS location to calculate the nearest safe center..."}
            </Text>

            {/* Paalala Tip Box */}
            <View style={[styles.gpsModalTipBox, { backgroundColor: "rgba(234, 88, 12, 0.08)", borderColor: "rgba(234, 88, 12, 0.25)" }]}>
              <Ionicons name="information-circle-outline" size={19} color="#ea580c" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.gpsModalTipTitle}>
                  {language === "tl" ? "Paalala para sa Accurate na GPS:" : "Tip for Accurate GPS:"}
                </Text>
                <Text style={[styles.gpsModalTipText, { color: colors.textSecondary }]}>
                  {language === "tl"
                    ? "Siguraduhing nasa bukas na lugar (hindi sa loob ng saradong bahay o ilalim ng makakapal na puno) upang maging tumpak ang distansya patungo sa evacuation center."
                    : "Make sure you are in an open area (not inside a closed house or under thick trees) to calculate the most accurate route and distance."}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 19, fontWeight: "900" },
  headerSub: { fontSize: 12, marginTop: 2 },

  tabsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {},
  tabText: { fontSize: 13, fontWeight: "700" },

  mapContainer: { flex: 1, position: "relative" },
  webview: { flex: 1 },

  // Floating Controls (Top-Right View & Map Tools)
  topControlDock: {
    position: "absolute",
    right: 14,
    top: 14,
    gap: 10,
    alignItems: "center",
    zIndex: 20,
  },

  dockBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15, 23, 42, 0.90)",
    borderWidth: 1.5,
    borderColor: "rgba(56, 189, 248, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  dockBtnActive: {
    backgroundColor: "#0284c7",
    borderColor: "#38bdf8",
  },

  // FULL-WIDTH FLUSH BOTTOM MODAL (Theme-Aware, Top-Rounded Only)
  fullWidthBottomModal: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 16,
    zIndex: 30,
  },
  modalCollapsed: {
    maxHeight: 115,
  },
  modalExpanded: {
    maxHeight: "80%",
  },

  centeredHandleArea: {
    width: "100%",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  dragHandleBar: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
  },

  modalHeaderRow: {
    paddingLeft: 18,
    paddingRight: 24,
    paddingBottom: 10,
  },
  modalCenterTitle: {
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
    paddingRight: 16,
  },
  modalDistanceText: {
    fontSize: 13,
    fontWeight: "700",
  },

  modalScrollContent: {
    maxHeight: 460,
  },
  modalBody: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalBrgyText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  statusBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#10b981",
  },
  modalAddressText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },

  occupancyBox: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  occupancyLabel: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  occupancyValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  occupancyProgressBarBg: {
    width: "100%",
    height: 7,
    backgroundColor: "rgba(15, 23, 42, 0.2)",
    borderRadius: 3.5,
    overflow: "hidden",
  },
  occupancyProgressBarFill: {
    height: "100%",
    backgroundColor: "#10b981",
    borderRadius: 3.5,
  },

  sectionHeading: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6,
  },
  facilitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  facilityChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  facilityChipText: {
    fontSize: 12,
    fontWeight: "700",
  },

  contactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  contactNameText: {
    fontSize: 13.5,
    fontWeight: "800",
    marginBottom: 2,
  },
  contactPhoneText: {
    fontSize: 13,
    fontWeight: "700",
  },

  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  bigActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bigActionBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#ffffff",
  },

  listContainer: { flex: 1, padding: 16 },
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
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
    width: "100%",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  cardSub: { fontSize: 13, marginBottom: 4 },
  cardDetail: { fontSize: 13 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "800",
  },

  // Animated Map Loading View Styles
  mapLoadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  mapLoadingIconWrapper: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  mapLoadingRadarRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  mapLoadingIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  mapLoadingTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  mapLoadingSub: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 17,
  },

  // GPS Accuracy Loader Modal Styles
  gpsModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  gpsModalCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  gpsModalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  gpsModalTitle: {
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 4,
  },
  gpsModalSubtitle: {
    fontSize: 12.5,
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 17,
  },
  gpsModalTipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
  },
  gpsModalTipTitle: {
    color: "#ea580c",
    fontSize: 11.5,
    fontWeight: "800",
    marginBottom: 2,
  },
  gpsModalTipText: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "500",
  },
});
