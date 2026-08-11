import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Api } from '../services/api';
import { EvacuationCenter, HazardZone, EvacuationRoute } from '../types';
import { OfflineBanner } from '../components/OfflineBanner';
import { WebView } from 'react-native-webview';

export const MapScreen = ({ navigation }: any) => {
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [hazards, setHazards] = useState<HazardZone[]>([]);
  const [routes, setRoutes] = useState<EvacuationRoute[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<EvacuationCenter | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<EvacuationRoute | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [activeTab, setActiveTab] = useState<'MAP' | 'CENTERS' | 'HAZARDS' | 'ROUTES'>('MAP');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    requestLocation();
    loadMapData();
  }, []);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        const loc = await Location.getCurrentPositionAsync({});
        setUserCoords({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });
      } else {
        setLocationPermission(false);
      }
    } catch {
      setLocationPermission(false);
    }
  };

  const loadMapData = async () => {
    try {
      const cRes = await Api.getCenters();
      const hRes = await Api.getHazards();
      const rRes = await Api.getRoutes();

      setCenters(cRes.data);
      setHazards(hRes.data);
      setRoutes(rRes.data);
      setIsOffline(cRes.isOffline);
    } catch {
      setIsOffline(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <OfflineBanner isOffline={isOffline} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Irosin Emergency Map</Text>
        <Text style={styles.headerSub}>Monbon & San Agustin Sector</Text>
      </View>

      {/* Permission Warning Notice if Denied */}
      {locationPermission === false && (
        <View style={styles.permWarning}>
          <Text style={styles.permWarningText}>
            📍 Location permission not granted. Map showing default Irosin center coordinates.
          </Text>
          <TouchableOpacity onPress={requestLocation} style={styles.permBtn}>
            <Text style={styles.permBtnText}>Grant Location</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mode Selector Tabs */}
      <View style={styles.tabContainer}>
        {(['MAP', 'CENTERS', 'HAZARDS', 'ROUTES'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Interactive Map Simulator View */}
      {activeTab === 'MAP' && (
        <ScrollView style={styles.mapSimulatorContainer}>
          <View style={styles.mapCanvas}>
            {/* Interactive Irosin Command Map Canvas */}
            <View style={styles.interactiveMapHeader}>
              <Ionicons name="map-outline" size={24} color="#38bdf8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.interactiveMapTitle}>Irosin Sector Live Map</Text>
                <Text style={styles.interactiveMapSub}>Latitude 12.7042° N • Longitude 124.0371° E</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsFullscreen(true)}
                style={{ backgroundColor: '#0284c7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Ionicons name="expand-outline" size={14} color="#ffffff" />
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800' }}>Full Screen</Text>
              </TouchableOpacity>
            </View>

            {/* Real Interactive Map WebView Container */}
            <View style={{ height: 280, borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#334155' }}>
              <WebView
                originWhitelist={['*']}
                source={{
                  html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                      <style>
                        body, html { margin:0; padding:0; height:100%; width:100%; background: #0f172a; }
                        #map { height:100%; width:100%; }
                        .leaflet-popup-content-wrapper { background: #0f172a; color: #f8fafc; border: 1px solid #38bdf8; border-radius: 10px; font-family: sans-serif; }
                        .leaflet-popup-tip { background: #0f172a; }
                      </style>
                    </head>
                    <body>
                      <div id="map"></div>
                      <script>
                        var map = L.map('map').setView([12.7042, 124.0371], 14);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                          maxZoom: 19,
                          attribution: '© OpenStreetMap | MDRRMO Irosin'
                        }).addTo(map);

                        var featureGroup = L.featureGroup();

                        // Add User GPS Location Blue Dot
                        ${userCoords ? `
                          var userMarker = L.circleMarker([${userCoords.latitude}, ${userCoords.longitude}], {
                            radius: 10,
                }}
                style={{ flex: 1 }}
              />
            </View>

            {/* Official Safe Route Warning Banner */}
            <View style={styles.officialNoticeBox}>
              <View style={styles.rowCenter}>
                <Ionicons name="warning-outline" size={18} color="#f87171" />
                <Text style={styles.officialNoticeTitle}>SAFE ROUTE POLICY NOTICE</Text>
              </View>
              <Text style={styles.officialNoticeText}>
                Google Maps general navigation DOES NOT automatically verify road safety during floods or volcanic ashfall. This app prioritizes administrator-verified official evacuation routes only.
              </Text>
            </View>

            {/* Centers Markers List */}
            <Text style={styles.layerHeader}>Designated Evacuation Shelters ({centers.length})</Text>
            {centers.map(c => (
              <TouchableOpacity
                key={c.id}
                style={styles.markerCard}
                onPress={() => setSelectedCenter(c)}
              >
                <Ionicons name="business-outline" size={22} color="#10b981" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.markerTitle}>{c.name}</Text>
                  <Text style={styles.markerSub}>{c.barangayName} • Status: {c.status}</Text>
                </View>
                <Text style={styles.markerCapacity}>{c.currentOccupancy}/{c.capacity}</Text>
              </TouchableOpacity>
            ))}

            {/* Hazard Zones List */}
            <Text style={styles.layerHeader}>Mapped Hazard Zones ({hazards.length})</Text>
            {hazards.map(h => (
              <View key={h.id} style={styles.hazardCard}>
                <Ionicons name="warning-outline" size={22} color="#f59e0b" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.hazardTitle}>{h.name}</Text>
                  <Text style={styles.hazardSub}>Type: {h.hazardType} • Severity: {h.severity}</Text>
                </View>
              </View>
            ))}

            {/* Official Routes List */}
            <Text style={styles.layerHeader}>Verified Official Routes ({routes.length})</Text>
            {routes.map(r => (
              <TouchableOpacity
                key={r.id}
                style={styles.routeCard}
                onPress={() => setSelectedRoute(r)}
              >
                <Ionicons name="navigate-outline" size={22} color="#38bdf8" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeTitle}>{r.routeName}</Text>
                  <Text style={styles.routeSub}>{r.distanceKm} km • Est. {r.estimatedMinutes} min</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Centers Tab View */}
      {activeTab === 'CENTERS' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          {centers.map(c => (
            <TouchableOpacity key={c.id} style={styles.listCard} onPress={() => setSelectedCenter(c)}>
              <Text style={styles.cardTitle}>{c.name}</Text>
              <Text style={styles.cardSub}>📍 {c.barangayName} • {c.address}</Text>
              <Text style={styles.cardInfo}>Capacity: {c.currentOccupancy}/{c.capacity} • Contact: {c.contactPhone}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Hazards Tab View */}
      {activeTab === 'HAZARDS' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          {hazards.map(h => (
            <View key={h.id} style={[styles.listCard, { borderColor: '#ef4444' }]}>
              <Text style={[styles.cardTitle, { color: '#f87171' }]}>{h.name}</Text>
              <Text style={styles.cardSub}>Severity: {h.severity} • Source: {h.source}</Text>
              <Text style={styles.cardInfo}>{h.description}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Routes Tab View */}
      {activeTab === 'ROUTES' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          {routes.map(r => (
            <TouchableOpacity key={r.id} style={[styles.listCard, { borderColor: '#0ea5e9' }]} onPress={() => setSelectedRoute(r)}>
              <Text style={[styles.cardTitle, { color: '#38bdf8' }]}>{r.routeName}</Text>
              <Text style={styles.cardSub}>From: {r.originDescription}</Text>
              <Text style={styles.cardInfo}>Distance: {r.distanceKm} km • Est: {r.estimatedMinutes} min</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Selected Center Modal */}
      <Modal visible={!!selectedCenter} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedCenter && (
              <>
                <Text style={styles.modalTitle}>{selectedCenter.name}</Text>
                <Text style={styles.modalSub}>📍 {selectedCenter.address}</Text>
                <Text style={styles.modalSection}>Status: <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{selectedCenter.status}</Text></Text>
                <Text style={styles.modalSection}>Occupancy: {selectedCenter.currentOccupancy} / {selectedCenter.capacity}</Text>
                <Text style={styles.modalSection}>Contact: {selectedCenter.contactPerson} ({selectedCenter.contactPhone})</Text>

                <Text style={[styles.modalSection, { marginTop: 8, fontWeight: 'bold' }]}>Available Facilities:</Text>
                <View style={styles.facilitiesRow}>
                  {Object.entries(selectedCenter.facilities || {}).map(([key, val]) => (
                    <Text key={key} style={[styles.facilityChip, val ? styles.chipActive : styles.chipInactive]}>
                      {val ? '✓' : '✗'} {key}
                    </Text>
                  ))}
                  {selectedCenter.amenities?.map((amenity, idx) => (
                    <Text key={idx} style={[styles.facilityChip, styles.chipActive]}>
                      ✓ {amenity}
                    </Text>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: '#0284c7', flex: 1 }]}
                    onPress={() => {
                      const center = selectedCenter;
                      setSelectedCenter(null);
                      navigation.navigate('CenterDetails', { centerId: center.id });
                    }}
                  >
                    <Text style={styles.modalBtnText}>View Full Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: '#334155' }]}
                    onPress={() => setSelectedCenter(null)}
                  >
                    <Text style={styles.modalBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Selected Route Modal */}
      <Modal visible={!!selectedRoute} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRoute && (
              <>
                <Text style={[styles.modalTitle, { color: '#38bdf8' }]}>{selectedRoute.routeName}</Text>
                <Text style={styles.modalSub}>Origin: {selectedRoute.originDescription}</Text>
                <Text style={styles.modalSection}>Distance: {selectedRoute.distanceKm} km • Est: {selectedRoute.estimatedMinutes} mins</Text>

                <View style={styles.warningBox}>
                  <Text style={styles.warningBoxTitle}>⚠️ Official MDRRMO Verified Route</Text>
                  <Text style={styles.warningBoxText}>{selectedRoute.instructions}</Text>
                </View>

                {selectedRoute.hazardWarnings.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: 'bold' }}>Warnings:</Text>
                    {selectedRoute.hazardWarnings.map((w, idx) => (
                      <Text key={idx} style={{ color: '#fcd34d', fontSize: 11 }}>• {w}</Text>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#334155', marginTop: 16 }]}
                  onPress={() => setSelectedRoute(null)}
                >
                  <Text style={styles.modalBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Fullscreen Map Modal */}
      <Modal visible={isFullscreen} animationType="slide" onRequestClose={() => setIsFullscreen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="map" size={20} color="#38bdf8" />
              <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '900' }}>Irosin Interactive Fullscreen Map</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsFullscreen(false)}
              style={{ backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 12 }}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <WebView
              originWhitelist={['*']}
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                    <style>
                      body, html { margin:0; padding:0; height:100%; width:100%; background: #0f172a; }
                      #map { height:100%; width:100%; }
                      .leaflet-popup-content-wrapper { background: #0f172a; color: #f8fafc; border: 1px solid #38bdf8; border-radius: 10px; font-family: sans-serif; }
                      .leaflet-popup-tip { background: #0f172a; }
                    </style>
                  </head>
                  <body>
                    <div id="map"></div>
                    <script>
                      var map = L.map('map').setView([12.7042, 124.0371], 14);
                      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        maxZoom: 19,
                        attribution: '© OpenStreetMap | MDRRMO Irosin'
                      }).addTo(map);

                      var featureGroup = L.featureGroup();

                      // Add Center Markers
                      ${centers.map(c => `
                        var m = L.marker([${c.latitude || 12.7042}, ${c.longitude || 124.0371}])
                          .bindPopup("<b>${c.name.replace(/'/g, "\\'")}</b><br>Brgy. ${c.barangayName}<br>Status: <b>${c.status}</b><br>Occupancy: ${c.currentOccupancy}/${c.capacity}");
                        featureGroup.addLayer(m);
                      `).join('\n')}

                      // Add Hazard Zones Circles
                      ${hazards.map(h => `
                        var hz = L.circle([${h.centerLatitude || 12.7042}, ${h.centerLongitude || 124.0371}], {
                          color: '${h.severity === 'CRITICAL' || h.severity === 'HIGH' ? '#ef4444' : '#f59e0b'}',
                          fillColor: '${h.severity === 'CRITICAL' || h.severity === 'HIGH' ? '#ef4444' : '#f59e0b'}',
                          fillOpacity: 0.35,
                          radius: ${h.radiusMeters || 750}
                        }).bindPopup("<b>⚠️ ${h.name.replace(/'/g, "\\'")}</b><br>Type: ${h.hazardType}<br>Severity: ${h.severity}");
                        featureGroup.addLayer(hz);
                      `).join('\n')}

                      featureGroup.addTo(map);
                      if (featureGroup.getLayers().length > 0) {
                        map.fitBounds(featureGroup.getBounds(), { padding: [30, 30] });
                      }
                    </script>
                  </body>
                  </html>
                `
              }}
              style={{ flex: 1 }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  header: { padding: 16, backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  headerSub: { color: '#38bdf8', fontSize: 12 },

  permWarning: { backgroundColor: '#78350f', padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  permWarningText: { color: '#fef3c7', fontSize: 11, flex: 1, paddingRight: 8 },
  permBtn: { backgroundColor: '#b45309', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  permBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },

  tabContainer: { flexDirection: 'row', backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabButtonActive: { borderBottomWidth: 2, borderBottomColor: '#0ea5e9' },
  tabText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#38bdf8', fontWeight: '900' },

  mapSimulatorContainer: { flex: 1, padding: 16 },
  mapCanvas: { backgroundColor: '#0f172a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1e293b' },
  interactiveMapHeader: { backgroundColor: '#1e293b', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  interactiveMapTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '800' },
  interactiveMapSub: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  liveTag: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  liveTagText: { color: '#34d399', fontSize: 9, fontWeight: '900' },
  gridBackground: { height: 4, backgroundColor: '#0ea5e9', borderRadius: 2, marginBottom: 12 },
  mapCanvasTitle: { color: '#38bdf8', fontSize: 12, fontWeight: '800', marginBottom: 12 },

  officialNoticeBox: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', borderWidth: 1, padding: 12, borderRadius: 12, marginBottom: 16 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  officialNoticeTitle: { color: '#f87171', fontSize: 11, fontWeight: '800' },
  officialNoticeText: { color: '#fca5a5', fontSize: 11, lineHeight: 15 },

  layerHeader: { color: '#94a3b8', fontSize: 12, fontWeight: '800', uppercase: true, marginTop: 12, marginBottom: 8 },
  markerCard: { backgroundColor: '#1e293b', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  markerTitle: { color: '#f8fafc', fontSize: 13, fontWeight: '800' },
  markerSub: { color: '#94a3b8', fontSize: 11 },
  markerCapacity: { color: '#10b981', fontSize: 12, fontWeight: '800' },

  hazardCard: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)', borderWidth: 1, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  hazardTitle: { color: '#fcd34d', fontSize: 13, fontWeight: '800' },
  hazardSub: { color: '#fbbf24', fontSize: 11 },

  routeCard: { backgroundColor: 'rgba(14, 165, 233, 0.1)', borderColor: 'rgba(14, 165, 233, 0.3)', borderWidth: 1, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  routeTitle: { color: '#38bdf8', fontSize: 13, fontWeight: '800' },
  routeSub: { color: '#7dd3fc', fontSize: 11 },

  listCard: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  cardSub: { color: '#38bdf8', fontSize: 12, marginBottom: 4 },
  cardInfo: { color: '#94a3b8', fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: '#1e293b' },
  modalTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  modalSub: { color: '#94a3b8', fontSize: 12, marginBottom: 12 },
  modalSection: { color: '#cbd5e1', fontSize: 13, marginBottom: 4 },
  facilitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  facilityChip: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  chipActive: { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' },
  chipInactive: { backgroundColor: '#1e293b', color: '#64748b' },
  modalBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  warningBox: { backgroundColor: '#1e293b', padding: 12, borderRadius: 10, marginTop: 12 },
  warningBoxTitle: { color: '#38bdf8', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  warningBoxText: { color: '#cbd5e1', fontSize: 12, lineHeight: 16 }
});
