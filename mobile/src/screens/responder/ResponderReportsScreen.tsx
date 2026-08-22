import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Alert,
  ScrollView,
  Linking,
  Dimensions,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { usePreferences } from '../../context/PreferencesContext';
import { Api } from '../../services/api';
import { processImageToWebP } from '../../utils/imageUtils';
import { OfflineBanner } from '../../components/OfflineBanner';

const { width } = Dimensions.get('window');

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // KM
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

interface ResponderReportsScreenProps {
  authToken: string | null;
  reports: any[];
  userCoords: { latitude: number; longitude: number } | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onReportUpdated: (updatedReport: any) => void;
  onOpenMap: (targetIncident?: any) => void;
  selectedReportForAction: any | null;
  setSelectedReportForAction: (report: any | null) => void;
}

export const ResponderReportsScreen: React.FC<ResponderReportsScreenProps> = ({
  authToken,
  reports,
  userCoords,
  loading,
  refreshing,
  onRefresh,
  onReportUpdated,
  onOpenMap,
  selectedReportForAction,
  setSelectedReportForAction,
}) => {
  const { colors, theme, language } = usePreferences();

  // Map Provider: 'geo' (Default: In-App GeoMap) | 'gmaps' (Google Maps External)
  const [mapProvider, setMapProvider] = useState<'geo' | 'gmaps'>('geo');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'UNDER_CLEARING' | 'RESOLVED'>('ALL');
  const [roadFilter, setRoadFilter] = useState<'ALL' | 'IMPASSABLE' | 'CAUTION' | 'PASSABLE'>('ALL');

  // Photo Preview State
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Take Action Form State
  const [actionStatus, setActionStatus] = useState<'UNDER_CLEARING' | 'RESOLVED' | 'VERIFIED' | 'REJECTED'>('UNDER_CLEARING');
  const [actionNote, setActionNote] = useState('');
  const [affectedRoute, setAffectedRoute] = useState('');
  const [alternateRoute, setAlternateRoute] = useState('');
  const [requestBackup, setRequestBackup] = useState(false);
  const [actionPhotos, setActionPhotos] = useState<string[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Open Action Modal & populate existing fields
  const handleOpenAction = (report: any) => {
    setSelectedReportForAction(report);
    setActionStatus(report.status === 'PENDING' ? 'UNDER_CLEARING' : report.status === 'UNDER_CLEARING' ? 'RESOLVED' : report.status);
    setActionNote(report.adminNotes || '');
    setAffectedRoute(report.affectedRoute || '');
    setAlternateRoute(report.alternateRoute || '');
    setRequestBackup(!!report.requestBackup);
    setActionPhotos([]);
  };

  // Pick Action Photos
  const handlePickActionPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Pahintulot Kinakailangan', 'Payagan ang access sa gallery para sa field photo evidence.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (!res.canceled && res.assets?.[0]?.uri) {
      setIsProcessingPhotos(true);
      try {
        const webpUri = await processImageToWebP(res.assets[0].uri);
        setActionPhotos(prev => [...prev, webpUri]);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Hindi maiproseso ang larawan.');
      } finally {
        setIsProcessingPhotos(false);
      }
    }
  };

  // Submit Action Modal
  const handleSubmitAction = async () => {
    if (!selectedReportForAction) return;

    setIsSubmittingAction(true);
    try {
      const payload: any = {
        status: actionStatus,
        responderNotes: actionNote.trim(),
        affectedRoute: affectedRoute.trim() || undefined,
        alternateRoute: alternateRoute.trim() || undefined,
        requestBackup,
        photos: actionPhotos,
      };

      await Api.submitResponderAction(selectedReportForAction.id, payload);

      const updated = {
        ...selectedReportForAction,
        ...payload,
        status: actionStatus,
        adminNotes: actionNote.trim(),
        statusLabel: actionStatus === 'UNDER_CLEARING' ? 'UNDER CLEARING' : actionStatus === 'RESOLVED' ? 'RESOLVED' : actionStatus,
      };

      onReportUpdated(updated);
      setSelectedReportForAction(null);
      Alert.alert('Naitala ang Aksyon!', 'Matagumpay na na-update ang estado ng ulat sa field operations.');
    } catch (err: any) {
      Alert.alert('Error sa Pag-update', err.message || 'Hindi maiproseso ang aksyon sa ulat.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Google Maps Navigation
  const handleNavigateMaps = (report: any) => {
    const lat = report.latitude || 12.7042;
    const lng = report.longitude || 124.0371;
    const url = userCoords
      ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords.latitude},${userCoords.longitude}&destination=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Navigation Error', 'Hindi mabuksan ang Google Maps application.');
    });
  };

  // Filtered Reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.barangayName && r.barangayName.toLowerCase().includes(q)) ||
        (r.locationDescription && r.locationDescription.toLowerCase().includes(q)) ||
        (r.hazardType && r.hazardType.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && r.status === 'PENDING') ||
        (statusFilter === 'UNDER_CLEARING' && r.status === 'UNDER_CLEARING') ||
        (statusFilter === 'RESOLVED' && r.status === 'RESOLVED');

      let matchRoad = true;
      if (roadFilter === 'IMPASSABLE') {
        matchRoad = r.status === 'IMPASSABLE' || (r.description && r.description.toLowerCase().includes('barado'));
      } else if (roadFilter === 'CAUTION') {
        matchRoad = r.status === 'UNDER_CLEARING' || r.status === 'VERIFIED';
      } else if (roadFilter === 'PASSABLE') {
        matchRoad = r.status === 'RESOLVED';
      }

      return matchQuery && matchStatus && matchRoad;
    });
  }, [reports, searchQuery, statusFilter, roadFilter]);

  // Render Report Card
  const renderReportCard = ({ item }: { item: any }) => {
    const isPending = item.status === 'PENDING';
    const isClearing = item.status === 'UNDER_CLEARING';
    const isResolved = item.status === 'RESOLVED';
    const isImpassable = item.status === 'IMPASSABLE';

    const statusColor = isPending ? '#ef4444' : isClearing ? '#f59e0b' : isResolved ? '#10b981' : isImpassable ? '#dc2626' : '#64748b';
    const statusText = isPending ? 'BAGO / PENDING' : isClearing ? 'UNDER CLEARING' : isResolved ? 'RESOLVED / LIGTAS' : item.status;

    let distKm: number | null = null;
    if (userCoords && item.latitude && item.longitude) {
      distKm = calculateDistance(userCoords.latitude, userCoords.longitude, item.latitude, item.longitude);
    }

    const allPhotos: string[] = [];
    if (item.imageUrl) allPhotos.push(item.imageUrl);
    if (Array.isArray(item.photos)) {
      item.photos.forEach((p: string) => {
        if (p && !allPhotos.includes(p)) allPhotos.push(p);
      });
    }

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.typeBadge, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="warning" size={12} color={colors.primaryLight} />
                <Text style={[styles.typeBadgeText, { color: colors.primaryLight }]}>
                  {item.hazardType || item.type || 'Insidente'}
                </Text>
              </View>
              {item.barangayName ? (
                <View style={[styles.brgyBadge, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.brgyBadgeText, { color: colors.textSecondary }]}>
                    {item.barangayName}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title || item.locationDescription || 'Ulat ng Sakuna / Hazard'}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{statusText}</Text>
          </View>
        </View>

        {/* Location & Live GPS Distance */}
        <View style={styles.locRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.locText, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.streetLocation || item.locationDescription || 'Irosin, Sorsogon'}
          </Text>
          {distKm !== null && (
            <View style={[styles.distBadge, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="navigate" size={10} color={colors.primaryLight} />
              <Text style={[styles.distText, { color: colors.primaryLight }]}>
                {distKm < 1 ? `${Math.round(distKm * 1000)}m layo` : `${distKm.toFixed(1)} km layo`}
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        {item.description ? (
          <Text style={[styles.descText, { color: colors.textSecondary }]} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}

        {/* Route Blockage & Alternate Route Banner */}
        {(item.affectedRoute || item.alternateRoute) && (
          <View style={[styles.routeBanner, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}>
            {item.affectedRoute ? (
              <View style={styles.routeItem}>
                <Ionicons name="close-circle" size={14} color="#ef4444" />
                <Text style={[styles.routeText, { color: colors.text }]} numberOfLines={1}>
                  <Text style={{ fontWeight: '700', color: '#ef4444' }}>Apektado: </Text>
                  {item.affectedRoute}
                </Text>
              </View>
            ) : null}
            {item.alternateRoute ? (
              <View style={styles.routeItem}>
                <Ionicons name="arrow-forward-circle" size={14} color="#10b981" />
                <Text style={[styles.routeText, { color: colors.text }]} numberOfLines={1}>
                  <Text style={{ fontWeight: '700', color: '#10b981' }}>Alternatibo: </Text>
                  {item.alternateRoute}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Backup assistance alert pill */}
        {item.requestBackup && (
          <View style={styles.backupPill}>
            <Ionicons name="people" size={13} color="#dc2626" />
            <Text style={styles.backupPillText}>HUMIHINGI NG KARAGDAGANG BACKUP PERSONNEL</Text>
          </View>
        )}

        {/* Photo Gallery Thumbnails */}
        {allPhotos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {allPhotos.map((p, idx) => (
              <TouchableOpacity key={idx} onPress={() => setPreviewImage(p)} activeOpacity={0.8}>
                <Image source={{ uri: p }} style={styles.photoThumb} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Card Action Buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.navBtn, { borderColor: colors.cardBorder, backgroundColor: colors.bg }]}
            onPress={() => onOpenMap(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="map-outline" size={15} color={colors.primaryLight} />
            <Text style={[styles.navBtnText, { color: colors.primaryLight }]}>GeoMap</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primaryLight }]}
            onPress={() => handleOpenAction(item)}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={15} color="#ffffff" />
            <Text style={styles.actionBtnText}>Take Action / Aksyon</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <OfflineBanner />

      {/* Top Search & Filter Bar */}
      <View style={[styles.topHeaderWrap, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={language === 'tl' ? 'Hanapin ang ulat, kalsada, o barangay...' : 'Search reports or roads...'}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'ALL', label: 'Lahat ng Ulat' },
            { id: 'PENDING', label: 'Bago / Pending' },
            { id: 'UNDER_CLEARING', label: 'Under Clearing' },
            { id: 'RESOLVED', label: 'Resolved / Ligtas' },
          ].map(f => {
            const isActive = statusFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? colors.primaryLight : colors.bg,
                    borderColor: isActive ? colors.primaryLight : colors.cardBorder,
                  },
                ]}
                onPress={() => setStatusFilter(f.id as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, { color: isActive ? '#ffffff' : colors.textSecondary }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Reports Count Header */}
      <View style={styles.countBar}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {filteredReports.length} Disaster & Field Report{filteredReports.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Reports List */}
      {loading && reports.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Kinukuha ang mga ulat ng sakuna...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={item => item.id}
          renderItem={renderReportCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#10b981" />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Walang Ulat sa Listahan</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery
                  ? `Walang ulat na tumutugma sa "${searchQuery}".`
                  : 'Walang aktibong insidente o hazard sa napiling kategorya.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Modal: Take Action / Update Status & Photo Evidence ── */}
      <Modal visible={!!selectedReportForAction} animationType="slide" transparent onRequestClose={() => setSelectedReportForAction(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Aksyon sa Field Incident</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                  {selectedReportForAction?.title || selectedReportForAction?.locationDescription}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedReportForAction(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Bagong Status Selector */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Bagong Estado / Status *</Text>
              <View style={styles.statusGrid}>
                {[
                  { id: 'UNDER_CLEARING', label: 'Under Clearing', icon: 'construct-outline', color: '#f59e0b' },
                  { id: 'RESOLVED', label: 'Resolved / Ligtas', icon: 'checkmark-circle-outline', color: '#10b981' },
                  { id: 'VERIFIED', label: 'Verified', icon: 'shield-checkmark-outline', color: '#0284c7' },
                  { id: 'REJECTED', label: 'Rejected', icon: 'close-circle-outline', color: '#ef4444' },
                ].map(st => {
                  const isActive = actionStatus === st.id;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      style={[
                        styles.statusBtn,
                        {
                          backgroundColor: isActive ? st.color : colors.bg,
                          borderColor: isActive ? st.color : colors.cardBorder,
                        },
                      ]}
                      onPress={() => setActionStatus(st.id as any)}
                    >
                      <Ionicons name={st.icon as any} size={15} color={isActive ? '#ffffff' : colors.textSecondary} />
                      <Text style={[styles.statusBtnText, { color: isActive ? '#ffffff' : colors.text }]}>
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action / Progress Notes */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Mga Tala / Deskripsyon ng Aksyon</Text>
              <TextInput
                style={[styles.modalTextArea, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                placeholder="Hal. Kasalukuyang pinuputol ang bumagsak na puno sa kalsada gamit ang chainsaw."
                placeholderTextColor={colors.textMuted}
                value={actionNote}
                onChangeText={setActionNote}
                multiline
                numberOfLines={3}
              />

              {/* Road / Route Info */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Kalsada at Alternatibong Daanan</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                placeholder="Apektadong Daanan (Hal. Maharlika Highway Purok 2)"
                placeholderTextColor={colors.textMuted}
                value={affectedRoute}
                onChangeText={setAffectedRoute}
              />
              <TextInput
                style={[styles.modalInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                placeholder="Alternatibong Daanan (Hal. Dumaan sa Bypass Road)"
                placeholderTextColor={colors.textMuted}
                value={alternateRoute}
                onChangeText={setAlternateRoute}
              />

              {/* Backup Request Switch */}
              <View style={[styles.switchCard, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.switchTitle, { color: colors.text }]}>Humingi ng Backup Assistance</Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    Ipaalam sa MDRRMO EOC na kailangan ng karagdagang responders
                  </Text>
                </View>
                <Switch
                  value={requestBackup}
                  onValueChange={setRequestBackup}
                  trackColor={{ false: '#767577', true: '#ef4444' }}
                />
              </View>

              {/* Photo Evidence Upload (WebP) */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 6 }}>
                <Text style={[styles.fieldLabel, { color: colors.text, marginBottom: 0 }]}>Litrato ng Aksyon (Field Evidence)</Text>
                <TouchableOpacity
                  style={[styles.addPhotoBtn, { backgroundColor: colors.primaryBg, borderColor: colors.primaryLight }]}
                  onPress={handlePickActionPhoto}
                  disabled={isProcessingPhotos}
                >
                  {isProcessingPhotos ? (
                    <ActivityIndicator size="small" color={colors.primaryLight} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={13} color={colors.primaryLight} />
                      <Text style={[styles.addPhotoBtnText, { color: colors.primaryLight }]}>Magdagdag ng Litrato</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {actionPhotos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {actionPhotos.map((uri, i) => (
                    <View key={i} style={styles.actionPhotoWrap}>
                      <Image source={{ uri }} style={styles.actionPhotoImg} />
                      <TouchableOpacity
                        style={styles.delPhotoBtn}
                        onPress={() => setActionPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      >
                        <Ionicons name="close" size={12} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={[styles.noPhotoText, { color: colors.textMuted }]}>Walang naidagdag na litrato.</Text>
              )}

              {/* Submit Action */}
              <TouchableOpacity
                style={[styles.submitActionBtn, { backgroundColor: colors.primaryLight }]}
                onPress={handleSubmitAction}
                disabled={isSubmittingAction}
                activeOpacity={0.85}
              >
                {isSubmittingAction ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    <Text style={styles.submitActionBtnText}>I-save at I-update ang Ulat</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Fullscreen Photo Preview ── */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity style={styles.closeFullBtn} onPress={() => setPreviewImage(null)}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.fullscreenImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeaderWrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13.5, fontWeight: '500' },
  filterScroll: { gap: 6, paddingVertical: 2 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontWeight: '700' },

  countBar: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  countText: { fontSize: 12.5, fontWeight: '700' },

  listContent: { paddingHorizontal: 14, paddingBottom: 32, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 60 },
  loadingText: { fontSize: 13, fontWeight: '500' },

  // Card
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '800' },
  brgyBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  brgyBadgeText: { fontSize: 11, fontWeight: '600' },
  cardTitle: { fontSize: 15.5, fontWeight: '800', lineHeight: 20 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },

  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locText: { fontSize: 12, fontWeight: '500', flex: 1 },
  distBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  distText: { fontSize: 10, fontWeight: '800' },

  descText: { fontSize: 12.5, lineHeight: 18 },

  routeBanner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  routeItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeText: { fontSize: 12, fontWeight: '500', flex: 1 },

  backupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backupPillText: { color: '#dc2626', fontSize: 10.5, fontWeight: '900' },

  photoScroll: { flexDirection: 'row', gap: 8, marginVertical: 2 },
  photoThumb: { width: 72, height: 72, borderRadius: 10, marginRight: 8 },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  mapBtnGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  navBtnText: { fontSize: 12, fontWeight: '700' },
  mapSwitchPill: {
    paddingHorizontal: 7,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  actionBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySubtitle: { fontSize: 12.5, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  modalSubtitle: { fontSize: 11.5, fontWeight: '500' },
  closeBtn: { padding: 4 },
  modalScroll: { paddingHorizontal: 16, paddingTop: 12 },
  fieldLabel: { fontSize: 12.5, fontWeight: '700', marginBottom: 5, marginTop: 6 },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    marginBottom: 8,
  },
  modalTextArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    marginBottom: 8,
    textAlignVertical: 'top',
    minHeight: 70,
  },

  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  statusBtn: {
    width: (width - 48) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBtnText: { fontSize: 12, fontWeight: '800' },

  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 6,
  },
  switchTitle: { fontSize: 13, fontWeight: '700' },
  switchSub: { fontSize: 11, fontWeight: '500' },

  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  addPhotoBtnText: { fontSize: 11, fontWeight: '800' },
  noPhotoText: { fontSize: 12, fontStyle: 'italic', marginBottom: 8 },
  actionPhotoWrap: { position: 'relative', marginRight: 8 },
  actionPhotoImg: { width: 68, height: 68, borderRadius: 8 },
  delPhotoBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  submitActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 12,
  },
  submitActionBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },

  // Fullscreen
  fullscreenOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  closeFullBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImg: { width: '100%', height: '85%' },
});
