import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Image,
  Dimensions,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { usePreferences } from '../context/PreferencesContext';
import { Api } from '../services/api';
import { OfflineStorage } from '../services/offlineStorage';
import { RealtimeSocket } from '../services/socketService';
import { OfflineBanner } from '../components/OfflineBanner';
import { useFocusEffect } from '@react-navigation/native';
import { RadarPulseLoading } from '../components/RadarPulseLoading';

const { width, height } = Dimensions.get('window');

interface IncidentItem {
  id: string;
  hazardType: string;
  title: string;
  barangayName: string;
  locationDescription: string;
  latitude: number;
  longitude: number;
  status: 'PENDING' | 'VERIFIED' | 'UNDER_CLEARING' | 'RESOLVED' | 'IMPASSABLE' | 'CAUTION';
  beforePhoto?: string | null;
  afterPhoto?: string | null;
  description: string;
  photos: string[];
  photoItems?: { uri: string; stage: string; label: string; uploadedBy?: string }[];
  affectedRoute?: string;
  alternateRoute?: string;
  createdAt: string;
  distanceKm?: number;
  distanceText?: string;
}

// ─── Haversine Distance Helper ────────────────────────────────────────────────
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
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

function formatDistance(distKm: number): string {
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)} m`;
  }
  return `${distKm.toFixed(1)} km`;
}

function formatIncidentDate(iso: string, language: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));

  if (diffMinutes < 1) return language === 'tl' ? 'Kani-kanina lang' : 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} ${language === 'tl' ? 'minuto ang nakalipas' : 'mins ago'}`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ${language === 'tl' ? 'oras ang nakalipas' : 'hours ago'}`;

  return d.toLocaleDateString('fil-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getHazardDisplayName(type: string, language: string): { label: string; icon: keyof typeof Ionicons.glyphMap } {
  const t = (type || '').toLowerCase();
  if (t.includes('flood') || t.includes('baha')) {
    return { label: language === 'tl' ? 'Baha (Flooding)' : 'Flood Incident', icon: 'water-outline' };
  }
  if (t.includes('landslide') || t.includes('guho')) {
    return { label: language === 'tl' ? 'Landslide (Pagguho ng Lupa)' : 'Landslide', icon: 'warning-outline' };
  }
  if (t.includes('block') || t.includes('harang') || t.includes('road')) {
    return { label: language === 'tl' ? 'Harang sa Daan' : 'Road Blockage', icon: 'alert-circle-outline' };
  }
  if (t.includes('vehic') || t.includes('aksidente') || t.includes('accident')) {
    return { label: language === 'tl' ? 'Aksidente sa Kalsada' : 'Vehicular Accident', icon: 'car-outline' };
  }
  if (t.includes('fire') || t.includes('sunog')) {
    return { label: language === 'tl' ? 'Sunog' : 'Fire Incident', icon: 'flame-outline' };
  }
  if (t.includes('bridge') || t.includes('tulay')) {
    return { label: language === 'tl' ? 'Kondisyon sa Tulay' : 'Bridge Damage', icon: 'git-commit-outline' };
  }
  if (t.includes('tree') || t.includes('puno')) {
    return { label: language === 'tl' ? 'Natumbang Puno' : 'Fallen Tree', icon: 'warning-outline' };
  }
  return {
    label: type && type !== 'OTHER' ? type : (language === 'tl' ? 'Ulat ng Sakuna' : 'Disaster Incident'),
    icon: 'alert-circle-outline',
  };
}

function getStatusBadgeProps(status: string, language: string) {
  switch (status) {
    case 'VERIFIED':
    case 'IMPASSABLE':
      return {
        label: language === 'tl' ? 'Aktibong Insidente' : 'Active Incident',
        color: '#dc2626',
        bgColor: 'rgba(220, 38, 38, 0.12)',
        borderColor: 'rgba(220, 38, 38, 0.3)',
      };
    case 'UNDER_CLEARING':
      return {
        label: language === 'tl' ? 'Kasalukuyang Inaayos (Clearing)' : 'Clearing in Progress',
        color: '#d97706',
        bgColor: 'rgba(217, 119, 6, 0.12)',
        borderColor: 'rgba(217, 119, 6, 0.3)',
      };
    case 'RESOLVED':
      return {
        label: language === 'tl' ? 'Lutas Na / Na-clear Na' : 'Resolved / Cleared',
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.12)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
      };
    case 'PENDING':
    default:
      return {
        label: language === 'tl' ? 'Bago / Sinusuri' : 'Under Review',
        color: '#ea580c',
        bgColor: 'rgba(234, 88, 12, 0.12)',
        borderColor: 'rgba(234, 88, 12, 0.3)',
      };
  }
}

export const NearbyIncidentsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, theme, language } = usePreferences();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  const [rawReports, setRawReports] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userPlaceName, setUserPlaceName] = useState<string>('');
  const [isGpsRefreshing, setIsGpsRefreshing] = useState(false);

  // Selected Incident for Full Info Sheet
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Modals for Lists (Zero external redirects)
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isRoadsModalOpen, setIsRoadsModalOpen] = useState(false);

  // Reverse geocode coords into human-readable place name
  const resolvePlaceName = useCallback(async (lat: number, lng: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results && results.length > 0) {
        const item = results[0];
        const brgy = item.district || item.street || item.subregion || '';
        const town = item.city || item.region || 'Irosin';
        if (brgy && town) {
          setUserPlaceName(`${brgy}, ${town}`);
        } else if (town) {
          setUserPlaceName(town);
        } else {
          setUserPlaceName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      }
    } catch {
      setUserPlaceName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  }, []);

  // 1. High-Accuracy Request GPS User Location (Manual or Focus)
  const requestLocation = useCallback(async (forceRecenter = false) => {
    try {
      if (forceRecenter) setIsGpsRefreshing(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsGpsRefreshing(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (pos?.coords) {
        const newCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setUserCoords(newCoords);
        resolvePlaceName(newCoords.latitude, newCoords.longitude);

        // Inject update to Leaflet map smoothly with NO webpage reload
        const js = `
          if (window.updateUserLocation) {
            window.updateUserLocation(${newCoords.latitude}, ${newCoords.longitude});
          }
          ${forceRecenter ? `if (window.map) { window.map.flyTo([${newCoords.latitude}, ${newCoords.longitude}], 16, { duration: 1.0 }); }` : ''}
        `;
        webViewRef.current?.injectJavaScript(js);
      }
    } catch (err: any) {
      console.warn('[NearbyIncidents] Location error:', err);
    } finally {
      setIsGpsRefreshing(false);
    }
  }, [resolvePlaceName]);

  // 2. Continuous Real-Time GPS Movement Watcher (Filtered for Real Movement)
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    async function startWatchingLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        // Immediate position fix on mount
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (isMounted && current?.coords) {
          const c = {
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          };
          setUserCoords(c);
          resolvePlaceName(c.latitude, c.longitude);
        }

        // Real-time location stream on movement — only triggers when moved > 15m
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 12000,
            distanceInterval: 15,
          },
          (newLocation) => {
            if (isMounted && newLocation?.coords) {
              const lat = newLocation.coords.latitude;
              const lng = newLocation.coords.longitude;

              setUserCoords(prev => {
                // Ignore small GPS jitter under 10 meters
                if (prev) {
                  const d = calculateDistance(prev.latitude, prev.longitude, lat, lng);
                  if (d < 0.01) return prev;
                }
                resolvePlaceName(lat, lng);
                // Move Leaflet user pin smoothly with 0 reloading
                webViewRef.current?.injectJavaScript(`if (window.updateUserLocation) { window.updateUserLocation(${lat}, ${lng}); }`);
                return { latitude: lat, longitude: lng };
              });
            }
          }
        );
      } catch (err) {
        console.warn('[NearbyIncidents] Watch location error:', err);
      }
    }

    startWatchingLocation();

    return () => {
      isMounted = false;
      if (subscription) subscription.remove();
    };
  }, [resolvePlaceName]);

  // Process and filter reports (STRICTLY ACTIVE HAZARDS: VERIFIED, UNDER_CLEARING, IMPASSABLE, CAUTION; EXCLUDE RESOLVED, PENDING, AND REJECTED)
  const processRawReports = useCallback((rawList: any[], coords: { latitude: number; longitude: number } | null): IncidentItem[] => {
    const activeStatuses = ['VERIFIED', 'UNDER_CLEARING', 'IMPASSABLE', 'CAUTION'];
    return (rawList || [])
      .filter((r: any) => r && activeStatuses.includes(r.status) && r.status !== 'RESOLVED' && r.status !== 'PENDING' && r.status !== 'REJECTED')
      .map((r: any) => {
        const lat = Number(r.latitude) || 12.7042;
        const lng = Number(r.longitude) || 124.0371;

        const rawPhotos: string[] = [];
        if (Array.isArray(r.photos)) {
          r.photos.forEach((p: any) => {
            if (p && typeof p === 'string' && p.trim()) rawPhotos.push(p.trim());
          });
        }
        if (r.imageUrl && typeof r.imageUrl === 'string' && !rawPhotos.includes(r.imageUrl.trim())) {
          rawPhotos.unshift(r.imageUrl.trim());
        }
        if (r.photoUrl && typeof r.photoUrl === 'string' && !rawPhotos.includes(r.photoUrl.trim())) {
          rawPhotos.push(r.photoUrl.trim());
        }

        let distKm: number | undefined;
        let distText: string | undefined;
        if (coords) {
          distKm = calculateDistance(coords.latitude, coords.longitude, lat, lng);
          distText = formatDistance(distKm);
        }

        const cleanPhotos = Array.from(new Set(rawPhotos));
        const beforePhoto = r.beforePhoto || r.imageUrl || (cleanPhotos.length > 0 ? cleanPhotos[0] : null);
        const afterPhoto = r.afterPhoto || (r.status === 'RESOLVED' && cleanPhotos.length > 1 ? cleanPhotos[cleanPhotos.length - 1] : null);

        return {
          id: r.id || `rep-${Math.random()}`,
          hazardType: r.hazardType || r.reportType || 'Insidente',
          title: r.title || r.hazardType || r.locationDescription || 'Ulat ng Sakuna',
          barangayName: r.barangayName || 'Irosin',
          locationDescription: r.locationDescription || r.streetLocation || '',
          latitude: lat,
          longitude: lng,
          status: r.status || 'VERIFIED',
          beforePhoto,
          afterPhoto,
          description: r.description || '',
          photos: cleanPhotos,
          photoItems: r.photoItems || [],
          affectedRoute: r.affectedRoute,
          alternateRoute: r.alternateRoute,
          createdAt: r.createdAt || new Date().toISOString(),
          distanceKm: distKm,
          distanceText: distText,
        };
      })
      .sort((a, b) => {
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, []);

  // 3. Fetch Incidents Data
  const loadIncidents = useCallback(async (isInitial = false) => {
    try {
      if (isInitial && incidents.length === 0) {
        setLoading(true);
      }

      // Always fetch live data first — do NOT show stale cache as primary source
      const res = await Api.getVerifiedDisasterReports();
      setIsOffline(res.isOffline);

      if (res.data && res.data.length > 0) {
        setRawReports(res.data);
        const processed = processRawReports(res.data, userCoords);
        setIncidents(processed);
      } else if (!res.isOffline) {
        setRawReports([]);
        setIncidents([]);
        await OfflineStorage.saveCache('VERIFIED_REPORTS', []);
      } else {
        const cached = await OfflineStorage.getCache<any[]>('VERIFIED_REPORTS');
        if (cached && cached.length > 0) {
          setRawReports(cached);
          const initial = processRawReports(cached, userCoords);
          setIncidents(initial);
        } else {
          setRawReports([]);
          setIncidents([]);
        }
      }
    } catch (err) {
      console.warn('[NearbyIncidents] Load error:', err);
      setIsOffline(true);
      const cached = await OfflineStorage.getCache<any[]>('VERIFIED_REPORTS');
      if (cached && cached.length > 0) {
        setRawReports(cached);
        const initial = processRawReports(cached, userCoords);
        setIncidents(initial);
      }
    } finally {
      setLoading(false);
    }
  }, [userCoords, processRawReports, incidents.length]);

  // Extract all Impassable / Blocked Roads from Incidents
  const impassableRoads = useMemo(() => {
    return incidents.filter(item => {
      const ht = (item.hazardType || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      const loc = (item.locationDescription || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();

      return (
        item.status === 'IMPASSABLE' ||
        item.status === 'CAUTION' ||
        !!item.affectedRoute ||
        !!item.alternateRoute ||
        ht.includes('road') ||
        ht.includes('harang') ||
        ht.includes('block') ||
        ht.includes('landslide') ||
        ht.includes('guho') ||
        ht.includes('baha') ||
        ht.includes('flood') ||
        ht.includes('bridge') ||
        ht.includes('tulay') ||
        ht.includes('puno') ||
        ht.includes('tree') ||
        title.includes('daan') ||
        title.includes('kalsada') ||
        title.includes('harang') ||
        title.includes('sarado') ||
        loc.includes('daan') ||
        loc.includes('kalsada') ||
        loc.includes('highway') ||
        desc.includes('bawal daanan') ||
        desc.includes('sarado') ||
        desc.includes('hindi madaanan') ||
        desc.includes('impassable') ||
        desc.includes('lubog')
      );
    });
  }, [incidents]);

  // Refresh data whenever screen gains focus (silent background sync)
  useFocusEffect(
    useCallback(() => {
      requestLocation();
      loadIncidents(false);
    }, [requestLocation, loadIncidents])
  );

  // Real-time WebSocket Listeners
  useEffect(() => {
    const unsubCreated = RealtimeSocket.on('REPORT_CREATED', () => loadIncidents(false));
    const unsubNewReport = RealtimeSocket.on('new_disaster_report', () => loadIncidents(false));
    const unsubUpdated = RealtimeSocket.on('REPORT_UPDATED', () => loadIncidents(false));
    const unsubStatus = RealtimeSocket.on('report_status_updated', () => loadIncidents(false));
    const unsubAction = RealtimeSocket.on('RESPONDER_ACTION_LOGGED', () => loadIncidents(false));
    return () => {
      unsubCreated();
      unsubNewReport();
      unsubUpdated();
      unsubStatus();
      unsubAction();
    };
  }, [loadIncidents]);

  // Recenter Map to User Location
  const handleRecenter = () => {
    requestLocation(true);
  };

  // Select incident from list and fly map to it
  const handleSelectFromList = (item: IncidentItem) => {
    setIsListModalOpen(false);
    setIsRoadsModalOpen(false);
    const js = `if (window.map) { window.map.flyTo([${item.latitude}, ${item.longitude}], 16, { duration: 1.0 }); }`;
    webViewRef.current?.injectJavaScript(js);
    setTimeout(() => {
      setSelectedIncident(item);
    }, 400);
  };

  // Stable incident hash to prevent unnecessary map reloads
  const incidentsHash = useMemo(() => {
    return incidents.map(i => `${i.id}-${i.status}-${i.latitude}-${i.longitude}`).join('|');
  }, [incidents]);

  // ─── Generate Dynamic Leaflet HTML for WebView ──────────────────────────────
  const mapHtml = useMemo(() => {
    const defaultCenterLat = userCoords?.latitude || 12.7042;
    const defaultCenterLng = userCoords?.longitude || 124.0371;

    const incidentMarkersJs = incidents
      .map(item => {
        let pinColor = '#dc2626'; // Verified/Active Red
        let statusBadgeText = 'AKTIBO';
        if (item.status === 'UNDER_CLEARING') {
          pinColor = '#d97706'; // Amber/Clearing
          statusBadgeText = 'INAAYOS';
        } else if (item.status === 'RESOLVED') {
          pinColor = '#10b981'; // Green/Resolved
          statusBadgeText = 'LUTAS NA';
        } else if (item.status === 'PENDING') {
          pinColor = '#ea580c';
          statusBadgeText = 'BAGO';
        }

        const hazardInfo = getHazardDisplayName(item.hazardType, 'tl');
        const escapedHazard = hazardInfo.label.replace(/'/g, "\\'").replace(/"/g, '\\"');
        const escapedTitle = (item.title || item.locationDescription || item.barangayName).replace(/'/g, "\\'").replace(/"/g, '\\"');
        const escapedBrgy = item.barangayName.replace(/'/g, "\\'").replace(/"/g, '\\"');
        const distStr = item.distanceText ? `Brgy. ${escapedBrgy} • ${item.distanceText}` : `Brgy. ${escapedBrgy}`;

        return `(function() {
          var icon = L.divIcon({
            className: 'custom-incident-pin',
            html: '<div class="pin-wrap"><div class="pin-card" style="background:${pinColor};"><div class="pin-status-row"><span class="pin-hazard-name">${escapedHazard}</span><span class="pin-status-badge">${statusBadgeText}</span></div><div class="pin-title">${escapedTitle}</div><div class="pin-dist">${distStr}</div></div><div class="pin-tip" style="border-top-color:${pinColor};"></div><div class="pin-pulse-ring" style="border-color:${pinColor}; background:${pinColor}33;"></div></div>',
            iconSize: [180, 74],
            iconAnchor: [90, 74]
          });

          var marker = L.marker([${item.latitude}, ${item.longitude}], { icon: icon });
          marker.on('click', function(e) {
            if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SELECT_INCIDENT',
              id: '${item.id}'
            }));
          });
          incidentGroup.addLayer(marker);
        })();`;
      })
      .join('\n');

    // User Marker with Location Pin
    const userMarkerJs = userCoords
      ? `(function() {
          var userIcon = L.divIcon({
            className: 'custom-user-pin',
            html: '<div class="user-pulse-outer"><div class="user-body-circle"><svg width="15" height="15" viewBox="0 0 512 512" fill="#ffffff"><path d="M256 128a64 64 0 10-64-64 64 64 0 0064 64zm0 64c-61.86 0-112 50.14-112 112v128a16 16 0 0016 16h32a16 16 0 0016-16V304h16v176a32 32 0 0032 32h0a32 32 0 0032-32V304h16v128a16 16 0 0016 16h32a16 16 0 0016-16V304c0-61.86-50.14-112-112-112z"/></svg></div></div>',
            iconSize: [36, 36],
            iconAnchor: [18, 18]
          });
          window.userMarker = L.marker([${userCoords.latitude}, ${userCoords.longitude}], { icon: userIcon, zIndexOffset: 1000 });
          window.userMarker.bindTooltip("Kasalukuyang Lokasyon", { direction: 'top', offset: [0, -14] });
          map.addLayer(window.userMarker);
        })();`
      : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html { margin:0; padding:0; height:100%; width:100%; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #map { height:100%; width:100%; }
    .custom-incident-pin { background: transparent; border: none; }
    .pin-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      filter: drop-shadow(0px 3px 8px rgba(0,0,0,0.45));
      cursor: pointer;
      transform-origin: bottom center;
      transition: transform 0.15s ease-out;
    }
    .pin-wrap:active {
      transform: scale(1.06);
    }
    .pin-card {
      padding: 6px 10px;
      border-radius: 10px;
      border: 1.5px solid #ffffff;
      color: #ffffff;
      min-width: 140px;
      max-width: 175px;
      text-align: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .pin-status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      margin-bottom: 2px;
    }
    .pin-hazard-name {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 110px;
    }
    .pin-status-badge {
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
      font-size: 8px;
      font-weight: 900;
      padding: 1px 4px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .pin-title {
      font-size: 11.5px;
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 155px;
      line-height: 14px;
    }
    .pin-dist {
      font-size: 9px;
      font-weight: 600;
      opacity: 0.9;
      margin-top: 2px;
    }
    .pin-tip {
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 7px solid #dc2626;
      margin-top: -1px;
    }
    .pin-pulse-ring {
      width: 18px;
      height: 5px;
      border-radius: 50%;
      border: 1.5px solid #dc2626;
      margin-top: 2px;
      animation: groundPulse 2s infinite;
    }
    @keyframes groundPulse {
      0% { transform: scale(0.8); opacity: 0.9; }
      50% { transform: scale(1.5); opacity: 0.2; }
      100% { transform: scale(0.8); opacity: 0.9; }
    }

    .user-pulse-outer {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(2, 132, 199, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: userPulse 1.8s infinite;
    }
    .user-body-circle {
      width: 24px;
      height: 24px;
      border-radius: 12px;
      background: #0284c7;
      border: 2px solid #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 6px rgba(0,0,0,0.4);
    }
    @keyframes userPulse {
      0% { transform: scale(0.9); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.5; }
      100% { transform: scale(0.9); opacity: 1; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${defaultCenterLat}, ${defaultCenterLng}], 13);
    window.map = map;
    window.userMarker = null;

    // Google Maps Crisp Street Layer
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps'
    }).addTo(map);

    var incidentGroup = L.featureGroup().addTo(map);

    ${incidentMarkersJs}
    ${userMarkerJs}

    // Dynamic Live User Marker Update function
    window.updateUserLocation = function(lat, lng) {
      if (!window.map) return;
      if (window.userMarker) {
        window.userMarker.setLatLng([lat, lng]);
      } else {
        var userIcon = L.divIcon({
          className: 'custom-user-pin',
          html: '<div class="user-pulse-outer"><div class="user-body-circle"><svg width="15" height="15" viewBox="0 0 512 512" fill="#ffffff"><path d="M256 128a64 64 0 10-64-64 64 64 0 0064 64zm0 64c-61.86 0-112 50.14-112 112v128a16 16 0 0016 16h32a16 16 0 0016-16V304h16v176a32 32 0 0032 32h0a32 32 0 0032-32V304h16v128a16 16 0 0016 16h32a16 16 0 0016-16V304c0-61.86-50.14-112-112-112z"/></svg></div></div>',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });
        window.userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 });
        window.userMarker.bindTooltip("Kasalukuyang Lokasyon", { direction: 'top', offset: [0, -14] });
        window.map.addLayer(window.userMarker);
      }
    };

    if (incidentGroup.getLayers().length > 0) {
      map.fitBounds(incidentGroup.getBounds().pad(0.25));
    }
  </script>
</body>
</html>`;
  }, [incidentsHash]);

  // Handle message from Leaflet Web Map
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECT_INCIDENT' && data.id) {
        const found = incidents.find(i => i.id === data.id);
        if (found) {
          setSelectedIncident(found);
        }
      }
    } catch {}
  };

  const selectedBadge = selectedIncident ? getStatusBadgeProps(selectedIncident.status, language) : null;
  const selectedHazardInfo = selectedIncident ? getHazardDisplayName(selectedIncident.hazardType, language) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

      {/* ── Top Header Bar ── */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIconWrap, { backgroundColor: colors.primaryBg, borderColor: colors.cardBorder }]}>
            <Ionicons name="location-outline" size={19} color={colors.primaryLight} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {language === 'tl' ? 'Mga Kalapit na Sakuna' : 'Nearby Incidents'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              {incidents.length} {language === 'tl' ? 'aktibong ulat sa mapa' : 'active incidents on map'}
            </Text>
          </View>
        </View>

        {/* Right Header Action Buttons: Impassable Roads Icon-Only + List Button + Home Shortcut */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {/* Dedicated In-Screen Impassable Roads Button (Icon-Only) */}
          <TouchableOpacity
            style={[styles.headerRoadIconBtn, { backgroundColor: colors.primaryLight }]}
            onPress={() => setIsRoadsModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="alert-circle-outline" size={18} color="#ffffff" />
            {impassableRoads.length > 0 && (
              <View style={styles.headerRoadBadge}>
                <Text style={styles.headerRoadBadgeText}>{impassableRoads.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Incidents List Button */}
          {incidents.length > 0 && (
            <TouchableOpacity
              style={[styles.headerListBtn, { backgroundColor: colors.primaryBg, borderColor: colors.cardBorder }]}
              onPress={() => setIsListModalOpen(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="list-outline" size={16} color={colors.primaryLight} />
            </TouchableOpacity>
          )}

          {/* Home Shortcut */}
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.7}
          >
            <Ionicons name="home-outline" size={17} color={colors.primaryLight} />
          </TouchableOpacity>
        </View>
      </View>

      <OfflineBanner isOffline={isOffline} />

      {/* ── Live GPS Location Bar ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingVertical: 8,
          backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc',
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: isGpsRefreshing ? '#f59e0b' : '#10b981',
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }} numberOfLines={1}>
              {userPlaceName ? `📍 ${userPlaceName}` : (userCoords ? `📍 ${userCoords.latitude.toFixed(4)}, ${userCoords.longitude.toFixed(4)}` : (language === 'tl' ? '📍 Kumukuha ng live GPS...' : '📍 Acquiring GPS...'))}
            </Text>
            <Text style={{ fontSize: 9.5, color: colors.textMuted }}>
              {isGpsRefreshing
                ? (language === 'tl' ? 'Ina-update ang iyong live na lokasyon...' : 'Updating live location...')
                : (language === 'tl' ? 'Live GPS Tracker • Awtomatikong nag-a-update habang lumilipat' : 'Live GPS Tracker • Auto-updates as you move')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => requestLocation(true)}
          disabled={isGpsRefreshing}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            backgroundColor: colors.primaryBg,
            borderWidth: 1,
            borderColor: colors.cardBorder,
          }}
          activeOpacity={0.7}
        >
          {isGpsRefreshing ? (
            <ActivityIndicator size="small" color={colors.primaryLight} />
          ) : (
            <>
              <Ionicons name="refresh" size={13} color={colors.primaryLight} />
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.primaryLight }}>
                {language === 'tl' ? 'I-update' : 'Refresh'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Main Map Canvas ── */}
      <View style={styles.mapWrap}>
        {loading && incidents.length === 0 ? (
          <RadarPulseLoading
            title={language === 'tl' ? 'Ikinakarga ang mga kalapit na sakuna...' : 'Scanning nearby incidents...'}
            subtitle={
              language === 'tl'
                ? 'Nagsi-scan ng mga aktibong ulat at harang sa daan...'
                : 'Scanning active incident reports and road hazards...'
            }
          />
        ) : (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            style={styles.webview}
            onMessage={handleWebViewMessage}
          />
        )}

        {/* Top Floating Guide Pill */}
        {!loading && incidents.length > 0 && (
          <View style={[styles.floatingHintPill, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="information-circle-outline" size={15} color={colors.primaryLight} />
            <Text style={[styles.floatingHintText, { color: colors.text }]}>
              {language === 'tl'
                ? 'Pindutin ang alinmang pin sa mapa para sa buong detalye'
                : 'Tap any pin on the map to view full incident details'}
            </Text>
          </View>
        )}

        {/* Floating Impassable Roads FAB */}
        <TouchableOpacity
          style={[styles.floatingRoadFab, { backgroundColor: '#dc2626', borderColor: '#ffffff' }]}
          onPress={() => setIsRoadsModalOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="alert-circle-outline" size={20} color="#ffffff" />
          <View style={styles.fabSubLabel}>
            <Text style={styles.fabSubLabelText}>{impassableRoads.length}</Text>
          </View>
        </TouchableOpacity>

        {/* Floating Incidents List FAB */}
        {!loading && incidents.length > 0 && (
          <TouchableOpacity
            style={[styles.floatingListFab, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => setIsListModalOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="layers-outline" size={19} color={colors.primaryLight} />
            <View style={styles.fabBadge}>
              <Text style={styles.fabBadgeText}>{incidents.length}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Floating Recenter FAB */}
        <TouchableOpacity
          style={[styles.recenterFab, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={handleRecenter}
          activeOpacity={0.85}
        >
          <Ionicons name="locate-outline" size={21} color={colors.primaryLight} />
        </TouchableOpacity>

        {/* Empty State Banner Overlay if 0 items */}
        {!loading && incidents.length === 0 && (
          <View style={[styles.emptyBanner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#10b981" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {language === 'tl' ? 'Walang Kalapit na Sakuna' : 'No nearby incidents'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {language === 'tl'
                  ? 'Kasalukuyang ligtas at walang aktibong insidente sa iyong lugar.'
                  : 'There are currently no active incidents in your area.'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Dedicated Modal: Mga Daan na Hindi Pwedeng Daanan (From Live Incidents) ── */}
      <Modal
        visible={isRoadsModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRoadsModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropDismiss}
            activeOpacity={1}
            onPress={() => setIsRoadsModalOpen(false)}
          />
          <View style={[styles.listModalSheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.dragHandle} />

            <View style={styles.listModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="alert-circle" size={16} color="#ffffff" />
                </View>
                <Text style={[styles.listModalTitle, { color: '#dc2626' }]}>
                  {language === 'tl' ? 'Mga Saradong Daan / Bawal Daanan' : 'Impassable & Blocked Roads'} ({impassableRoads.length})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsRoadsModalOpen(false)}>
                <Ionicons name="close-circle-outline" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.listModalSubtitle, { color: colors.textMuted }]}>
              {language === 'tl'
                ? 'Listahan ng mga kalsadang may baha, guho, o harang mula sa mga ulat ng sakuna. Pindutin ang alinman upang i-focus sa mapa.'
                : 'List of roads with flood, landslide, or blockage from incident reports. Tap any to focus on map.'}
            </Text>

            {impassableRoads.length === 0 ? (
              <View style={[styles.roadEmptyCard, { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.25)' }]}>
                <Ionicons name="checkmark-circle-outline" size={26} color="#10b981" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.roadEmptyTitle, { color: '#10b981' }]}>
                    {language === 'tl' ? 'Ligtas at Bukas ang Lahat ng Daan' : 'All Roads Passable'}
                  </Text>
                  <Text style={[styles.roadEmptySub, { color: colors.textMuted }]}>
                    {language === 'tl' ? 'Walang aktibong ulat ng saradong kalsada sa kasalukuyan.' : 'No active impassable road reports at the moment.'}
                  </Text>
                </View>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
                {impassableRoads.map(item => {
                  const hInfo = getHazardDisplayName(item.hazardType, language);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.roadHazardCard, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                      onPress={() => handleSelectFromList(item)}
                      activeOpacity={0.75}
                    >
                      {/* Top Road Header */}
                      <View style={styles.roadHazardTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                          <Text style={[styles.roadHazardTitle, { color: colors.text }]} numberOfLines={1}>
                            {item.affectedRoute || item.title}
                          </Text>
                        </View>
                        <View style={styles.impassableBadge}>
                          <Text style={styles.impassableBadgeText}>
                            {item.status === 'UNDER_CLEARING' ? 'INAAYOS' : 'BAWAL DAANAN'}
                          </Text>
                        </View>
                      </View>

                      {/* Location & Distance */}
                      <View style={styles.roadMetaRow}>
                        <Ionicons name="location-outline" size={13} color={colors.primaryLight} />
                        <Text style={[styles.roadMetaText, { color: colors.primaryLight }]}>
                          Brgy. {item.barangayName}
                        </Text>
                        {item.distanceText && (
                          <Text style={[styles.roadMetaText, { color: colors.textSecondary }]}>
                            • {item.distanceText} mula sa iyo
                          </Text>
                        )}
                      </View>

                      {/* Hazard Cause */}
                      <View style={styles.roadCauseRow}>
                        <Text style={[styles.roadCauseLabel, { color: colors.textMuted }]}>Dahilan: </Text>
                        <Text style={[styles.roadCauseValue, { color: colors.text }]}>
                          {hInfo.label}
                        </Text>
                      </View>

                      {/* Alternate Route Recommendation */}
                      {item.alternateRoute ? (
                        <View style={styles.alternateRouteBox}>
                          <Ionicons name="git-branch-outline" size={14} color="#0284c7" />
                          <Text style={styles.alternateRouteText}>
                            <Text style={{ fontWeight: '800' }}>Alternatibo: </Text>
                            {item.alternateRoute}
                          </Text>
                        </View>
                      ) : null}

                      {/* Tap to view prompt */}
                      <View style={styles.roadCardFooter}>
                        <Text style={[styles.roadTapPrompt, { color: colors.primaryLight }]}>
                          Pindutin upang makita sa mapa
                        </Text>
                        <Ionicons name="chevron-forward" size={15} color={colors.primaryLight} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal: All Active Incidents List ── */}
      <Modal
        visible={isListModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsListModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropDismiss}
            activeOpacity={1}
            onPress={() => setIsListModalOpen(false)}
          />
          <View style={[styles.listModalSheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.dragHandle} />

            <View style={styles.listModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="list-circle-outline" size={24} color={colors.primaryLight} />
                <Text style={[styles.listModalTitle, { color: colors.text }]}>
                  {language === 'tl' ? 'Listahan ng mga Sakuna' : 'Active Incidents List'} ({incidents.length})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsListModalOpen(false)}>
                <Ionicons name="close-circle-outline" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Quick Switch to Impassable Roads */}
            {impassableRoads.length > 0 && (
              <TouchableOpacity
                style={[styles.roadHazardsBannerBtn, { backgroundColor: 'rgba(220, 38, 38, 0.08)', borderColor: 'rgba(220, 38, 38, 0.25)' }]}
                onPress={() => {
                  setIsListModalOpen(false);
                  setIsRoadsModalOpen(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.roadHazardsBannerTitle}>
                    {language === 'tl' ? 'Tingnan ang mga Bawal Daanan' : 'View Impassable Roads'} ({impassableRoads.length})
                  </Text>
                  <Text style={[styles.roadHazardsBannerSub, { color: colors.textMuted }]}>
                    {language === 'tl' ? 'Listahan ng mga saradong kalsada at alternatibong daan' : 'List of closed roads & alternate routes'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="#dc2626" />
              </TouchableOpacity>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
              {incidents.map(item => {
                const badge = getStatusBadgeProps(item.status, language);
                const hInfo = getHazardDisplayName(item.hazardType, language);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.listItemCard, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                    onPress={() => handleSelectFromList(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.listItemIconBox, { backgroundColor: colors.primaryBg }]}>
                      <Ionicons name={hInfo.icon} size={20} color={colors.primaryLight} />
                    </View>

                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[styles.listItemHazard, { color: colors.primaryLight }]}>
                          {hInfo.label}
                        </Text>
                        <View style={[styles.statusPillSmall, { backgroundColor: badge.bgColor }]}>
                          <Text style={[styles.statusPillSmallText, { color: badge.color }]}>{badge.label}</Text>
                        </View>
                      </View>

                      <Text style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.listItemLoc, { color: colors.textMuted }]}>
                          Brgy. {item.barangayName}
                        </Text>
                        {item.distanceText && (
                          <Text style={[styles.listItemDist, { color: colors.textSecondary }]}>
                            • {item.distanceText}
                          </Text>
                        )}
                      </View>
                    </View>

                    <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Full Information Modal / Bottom Sheet ── */}
      <Modal
        visible={!!selectedIncident}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedIncident(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropDismiss}
            activeOpacity={1}
            onPress={() => setSelectedIncident(null)}
          />
          {selectedIncident && selectedHazardInfo && (
            <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {/* Sheet Drag Handle */}
              <View style={styles.dragHandle} />

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScrollContent}>
                {/* 1. Header Row: Hazard Type Prominent */}
                <View style={styles.sheetTopRow}>
                  <View style={[styles.sheetIconBox, { backgroundColor: colors.primaryBg }]}>
                    <Ionicons
                      name={selectedHazardInfo.icon}
                      size={24}
                      color={colors.primaryLight}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.sheetHazardBadge, { color: colors.primaryLight }]}>
                      {selectedHazardInfo.label}
                    </Text>
                    <Text style={[styles.sheetTitle, { color: colors.text }]}>
                      {selectedIncident.title}
                    </Text>
                    <Text style={[styles.sheetBarangay, { color: colors.textSecondary }]}>
                      Brgy. {selectedIncident.barangayName}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedIncident(null)} style={styles.sheetCloseBtn}>
                    <Ionicons name="close-circle-outline" size={26} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* 2. Badges Row */}
                <View style={styles.sheetBadgesRow}>
                  {selectedBadge && (
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: selectedBadge.bgColor, borderColor: selectedBadge.borderColor },
                      ]}
                    >
                      <View style={[styles.statusDot, { backgroundColor: selectedBadge.color }]} />
                      <Text style={[styles.statusPillText, { color: selectedBadge.color }]}>
                        {selectedBadge.label}
                      </Text>
                    </View>
                  )}

                  {selectedIncident.distanceText && (
                    <View style={[styles.distancePill, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}>
                      <Ionicons name="navigate-outline" size={12} color={colors.textSecondary} />
                      <Text style={[styles.distancePillText, { color: colors.textSecondary }]}>
                        {selectedIncident.distanceText} {language === 'tl' ? 'mula sa iyo' : 'away'}
                      </Text>
                    </View>
                  )}

                  <View style={[styles.distancePill, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}>
                    <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                    <Text style={[styles.distancePillText, { color: colors.textSecondary }]}>
                      {formatIncidentDate(selectedIncident.createdAt, language)}
                    </Text>
                  </View>
                </View>

                {/* 3. Incident Lifecycle Progress Tracker (Vertical) */}
                <View style={[styles.timelineCard, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.timelineTitle, { color: colors.textMuted }]}>
                    STATUS
                  </Text>
                  <View style={styles.vTimelineBlock}>
                    {/* 1. Incident */}
                    <View style={styles.vRow}>
                      <View style={styles.vIconCol}>
                        <View
                          style={[
                            styles.vDotCircle,
                            selectedIncident.status === 'VERIFIED' ||
                            selectedIncident.status === 'UNDER_CLEARING' ||
                            selectedIncident.status === 'IMPASSABLE' ||
                            selectedIncident.status === 'CAUTION' ||
                            selectedIncident.status === 'RESOLVED'
                              ? styles.vDotActive
                              : styles.vDotPending,
                          ]}
                        >
                          <Ionicons name="checkmark-outline" size={10} color="#ffffff" />
                        </View>
                        <View
                          style={[
                            styles.vBarLine,
                            {
                              backgroundColor:
                                selectedIncident.status === 'UNDER_CLEARING' ||
                                selectedIncident.status === 'IMPASSABLE' ||
                                selectedIncident.status === 'CAUTION' ||
                                selectedIncident.status === 'RESOLVED'
                                  ? '#0284c7'
                                  : colors.cardBorder,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.vTextCol}>
                        <Text style={[styles.vLabel, { color: '#0284c7', fontWeight: '800' }]}>
                          ● Incident
                        </Text>
                        <Text style={[styles.vSub, { color: colors.textMuted }]}>
                          {language === 'tl' ? 'Naiulat at Nakatala' : 'Reported & Logged'}
                        </Text>
                      </View>
                    </View>

                    {/* 2. Under Clearing */}
                    <View style={styles.vRow}>
                      <View style={styles.vIconCol}>
                        <View
                          style={[
                            styles.vDotCircle,
                            selectedIncident.status === 'UNDER_CLEARING' ||
                            selectedIncident.status === 'IMPASSABLE' ||
                            selectedIncident.status === 'CAUTION' ||
                            selectedIncident.status === 'RESOLVED'
                              ? styles.vDotClearing
                              : styles.vDotPending,
                          ]}
                        >
                          <Ionicons
                            name={
                              selectedIncident.status === 'RESOLVED'
                                ? 'checkmark-outline'
                                : selectedIncident.status === 'UNDER_CLEARING'
                                ? 'construct-outline'
                                : 'ellipse-outline'
                            }
                            size={10}
                            color="#ffffff"
                          />
                        </View>
                        <View
                          style={[
                            styles.vBarLine,
                            {
                              backgroundColor:
                                selectedIncident.status === 'RESOLVED' ? '#10b981' : colors.cardBorder,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.vTextCol}>
                        <Text
                          style={[
                            styles.vLabel,
                            {
                              color:
                                selectedIncident.status === 'UNDER_CLEARING' ||
                                selectedIncident.status === 'IMPASSABLE' ||
                                selectedIncident.status === 'CAUTION' ||
                                selectedIncident.status === 'RESOLVED'
                                  ? '#f59e0b'
                                  : colors.textMuted,
                              fontWeight:
                                selectedIncident.status === 'UNDER_CLEARING' ? '800' : '600',
                            },
                          ]}
                        >
                          ● Under Clearing
                        </Text>
                        <Text style={[styles.vSub, { color: colors.textMuted }]}>
                          {selectedIncident.status === 'UNDER_CLEARING'
                            ? (language === 'tl' ? 'Kasalukuyang Inaayos' : 'Clearing in Progress')
                            : selectedIncident.status === 'RESOLVED'
                            ? (language === 'tl' ? 'Tapos na ang Clearing' : 'Clearing Completed')
                            : (language === 'tl' ? 'Waiting for Clearing' : 'Waiting for Clearing')}
                        </Text>
                      </View>
                    </View>

                    {/* 3. Resolved */}
                    <View style={styles.vRow}>
                      <View style={styles.vIconCol}>
                        <View
                          style={[
                            styles.vDotCircle,
                            selectedIncident.status === 'RESOLVED'
                              ? styles.vDotResolved
                              : styles.vDotPending,
                          ]}
                        >
                          <Ionicons
                            name={selectedIncident.status === 'RESOLVED' ? 'checkmark-outline' : 'ellipse-outline'}
                            size={selectedIncident.status === 'RESOLVED' ? 10 : 5}
                            color="#ffffff"
                          />
                        </View>
                      </View>
                      <View style={styles.vTextCol}>
                        <Text
                          style={[
                            styles.vLabel,
                            {
                              color:
                                selectedIncident.status === 'RESOLVED' ? '#10b981' : colors.textMuted,
                              fontWeight: selectedIncident.status === 'RESOLVED' ? '800' : '600',
                            },
                          ]}
                        >
                          ● Resolved
                        </Text>
                        <Text style={[styles.vSub, { color: colors.textMuted }]}>
                          {selectedIncident.status === 'RESOLVED'
                            ? (language === 'tl' ? 'Ligtas at Naayos Na' : 'Cleared & Safe')
                            : (language === 'tl' ? 'Waiting for Resolution' : 'Waiting for Resolution')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* 4. Before & After Photo Evidence for RESOLVED incidents */}
                {selectedIncident.status === 'RESOLVED' && (selectedIncident.beforePhoto || selectedIncident.afterPhoto || selectedIncident.photos.length > 1) ? (
                  <View style={[styles.beforeAfterContainer, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="images-outline" size={15} color={colors.primaryLight} />
                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                          {language === 'tl' ? 'Katunayan sa Lugar (Before & After)' : 'Before & After Evidence'}
                        </Text>
                      </View>
                      <View style={[styles.resolvedProofBadge]}>
                        <Ionicons name="shield-checkmark-outline" size={12} color="#10b981" />
                        <Text style={styles.resolvedProofText}>{language === 'tl' ? 'NA-RESOLBA' : 'RESOLVED'}</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {/* BEFORE */}
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#ea580c' }}>
                          🚨 BEFORE ({language === 'tl' ? 'Noong Sakuna' : 'Incident'})
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => setPreviewImage(selectedIncident.beforePhoto || selectedIncident.photos[0])}
                          style={styles.baCardImgWrap}
                        >
                          <Image
                            source={{ uri: selectedIncident.beforePhoto || selectedIncident.photos[0] }}
                            style={styles.baCardImg}
                            resizeMode="cover"
                          />
                          <View style={[styles.baPill, { backgroundColor: '#ea580c' }]}>
                            <Text style={styles.baPillText}>BEFORE</Text>
                          </View>
                        </TouchableOpacity>
                      </View>

                      {/* AFTER */}
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#10b981' }}>
                          ✅ AFTER ({language === 'tl' ? 'Na-resolba' : 'Resolved'})
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => setPreviewImage(selectedIncident.afterPhoto || selectedIncident.photos[selectedIncident.photos.length - 1])}
                          style={styles.baCardImgWrap}
                        >
                          <Image
                            source={{ uri: selectedIncident.afterPhoto || selectedIncident.photos[selectedIncident.photos.length - 1] }}
                            style={styles.baCardImg}
                            resizeMode="cover"
                          />
                          <View style={[styles.baPill, { backgroundColor: '#10b981' }]}>
                            <Text style={styles.baPillText}>AFTER</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : null}

                {/* 5. Comprehensive Incident Details Card */}
                <View style={[styles.detailsCard, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}>
                  {/* Uri ng Sakuna */}
                  <View style={styles.infoRow}>
                    <Ionicons name="warning-outline" size={16} color={colors.primaryLight} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                        {language === 'tl' ? 'Uri ng Sakuna / Hazard' : 'Hazard Type'}
                      </Text>
                      <Text style={[styles.infoValue, { color: colors.text, fontWeight: '800' }]}>
                        {selectedHazardInfo.label}
                      </Text>
                    </View>
                  </View>

                  {/* Location & Landmark */}
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color={colors.primaryLight} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                        {language === 'tl' ? 'Eksaktong Lokasyon / Landmark' : 'Exact Location & Landmark'}
                      </Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>
                        {selectedIncident.locationDescription || selectedIncident.barangayName}
                      </Text>
                    </View>
                  </View>

                  {/* GPS Coordinates */}
                  <View style={styles.infoRow}>
                    <Ionicons name="compass-outline" size={16} color={colors.primaryLight} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                        {language === 'tl' ? 'Coordinates sa Mapa' : 'Map Coordinates'}
                      </Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>
                        {selectedIncident.latitude.toFixed(5)}, {selectedIncident.longitude.toFixed(5)}
                      </Text>
                    </View>
                  </View>

                  {/* Description / Detalye ng Ulat */}
                  {selectedIncident.description ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="document-text-outline" size={16} color={colors.primaryLight} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                          {language === 'tl' ? 'Deskripsyon ng Insidente' : 'Incident Description'}
                        </Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {selectedIncident.description}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Affected Route */}
                  {selectedIncident.affectedRoute ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="alert-circle-outline" size={16} color="#dc2626" style={{ marginTop: 2 }} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.infoLabel, { color: '#dc2626' }]}>
                          {language === 'tl' ? 'Apektadong Kalsada / Daan' : 'Affected Road'}
                        </Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {selectedIncident.affectedRoute}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Alternate Route */}
                  {selectedIncident.alternateRoute ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="git-branch-outline" size={16} color="#0284c7" style={{ marginTop: 2 }} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.infoLabel, { color: '#0284c7' }]}>
                          {language === 'tl' ? 'Inirerekomendang Alternatibong Daan' : 'Recommended Alternate Route'}
                        </Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {selectedIncident.alternateRoute}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* 6. Photos Gallery (for non-resolved or additional ground photos) */}
                {selectedIncident.status !== 'RESOLVED' && selectedIncident.photos.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {language === 'tl' ? 'Mga Larawan sa Lugar' : 'Ground Photos'} ({selectedIncident.photos.length})
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                      {selectedIncident.photos.map((p, idx) => (
                        <TouchableOpacity key={idx} onPress={() => setPreviewImage(p)} activeOpacity={0.8}>
                          <Image source={{ uri: p }} style={styles.photoThumb} resizeMode="cover" />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* 5. Close Button */}
                <TouchableOpacity
                  style={[styles.sheetCloseButton, { backgroundColor: colors.primaryLight }]}
                  onPress={() => setSelectedIncident(null)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sheetCloseButtonText}>
                    {language === 'tl' ? 'Isara ang Detalye' : 'Close Details'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {/* ── Photo Fullscreen Modal ── */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.fullscreenModal}>
          <TouchableOpacity style={styles.closePreviewBtn} onPress={() => setPreviewImage(null)}>
            <Ionicons name="close" size={26} color="#ffffff" />
          </TouchableOpacity>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.fullscreenImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  headerRoadIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  headerRoadBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  headerRoadBadgeText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '900',
  },
  headerListBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Map Wrap
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Floating Hint Pill
  floatingHintPill: {
    position: 'absolute',
    top: 12,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 90,
  },
  floatingHintText: {
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },

  // Floating Road Hazards FAB
  floatingRoadFab: {
    position: 'absolute',
    bottom: 136,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 99,
  },
  fabSubLabel: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#000000',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  fabSubLabelText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },

  // Floating Side Action: List FAB
  floatingListFab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 99,
  },
  fabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  fabBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },

  // Recenter FAB
  recenterFab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 99,
  },

  // Empty Banner
  emptyBanner: {
    position: 'absolute',
    top: 16,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 90,
  },
  emptyTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },

  // Modal Sheet General
  listModalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  listModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  listModalTitle: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  listModalSubtitle: {
    fontSize: 11.5,
    marginBottom: 12,
    lineHeight: 15,
  },

  // Impassable Road Cards
  roadHazardCard: {
    padding: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 7,
  },
  roadHazardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  roadHazardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  impassableBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  impassableBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  roadMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  roadMetaText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  roadCauseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roadCauseLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  roadCauseValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  alternateRouteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: 'rgba(2, 132, 199, 0.25)',
    borderWidth: 1,
    padding: 8,
    borderRadius: 8,
  },
  alternateRouteText: {
    color: '#0284c7',
    fontSize: 11.5,
    flex: 1,
  },
  roadCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.18)',
  },
  roadTapPrompt: {
    fontSize: 11,
    fontWeight: '800',
  },
  roadEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 10,
  },
  roadEmptyTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  roadEmptySub: {
    fontSize: 11.5,
  },

  // Generic List Cards
  roadHazardsBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  roadHazardsBannerTitle: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '800',
  },
  roadHazardsBannerSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  listItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  listItemIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemHazard: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  listItemTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  listItemLoc: {
    fontSize: 11,
    fontWeight: '500',
  },
  listItemDist: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPillSmall: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusPillSmallText: {
    fontSize: 9,
    fontWeight: '800',
  },

  // Bottom Sheet Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94a3b8',
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetScrollContent: {
    gap: 12,
    paddingBottom: 10,
  },
  sheetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHazardBadge: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sheetTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    lineHeight: 20,
  },
  sheetBarangay: {
    fontSize: 12,
    fontWeight: '600',
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  distancePillText: {
    fontSize: 10.5,
    fontWeight: '600',
  },

  // Vertical Timeline Progress Tracker Styles
  timelineCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  timelineTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  vTimelineBlock: {
    gap: 2,
  },
  vRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  vIconCol: {
    alignItems: 'center',
    width: 20,
  },
  vDotCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vDotActive: { backgroundColor: '#0284c7' },
  vDotClearing: { backgroundColor: '#f59e0b' },
  vDotResolved: { backgroundColor: '#10b981' },
  vDotPending: { backgroundColor: '#64748b' },
  vBarLine: {
    width: 2,
    height: 24,
    marginVertical: 2,
  },
  vTextCol: {
    flex: 1,
    paddingBottom: 4,
  },
  vLabel: {
    fontSize: 12,
    marginBottom: 1,
  },
  vSub: {
    fontSize: 10.5,
    fontWeight: '500',
  },

  // Before & After Photo Comparison
  beforeAfterContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  resolvedProofBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  resolvedProofText: {
    color: '#10b981',
    fontSize: 9.5,
    fontWeight: '900',
  },
  baCardImgWrap: {
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  baCardImg: {
    width: '100%',
    height: '100%',
  },
  baPill: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  baPillText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '900',
  },

  // Details Card
  detailsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 9,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  infoLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },

  // Photo Gallery
  photoScroll: {
    marginVertical: 4,
  },
  photoThumb: {
    width: 78,
    height: 78,
    borderRadius: 8,
    marginRight: 8,
  },

  // Close Button
  sheetCloseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 4,
  },
  sheetCloseButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  // Fullscreen Photo Modal
  fullscreenModal: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePreviewBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 99,
    padding: 10,
  },
  fullscreenImg: {
    width: width,
    height: height * 0.8,
  },
});
