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
  Modal,
  Alert,
  ScrollView,
  Linking,
  Dimensions,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { usePreferences } from '../../context/PreferencesContext';
import { Api } from '../../services/api';
import { OfflineBanner } from '../../components/OfflineBanner';

const { width } = Dimensions.get('window');

interface EvacuationCenterItem {
  id: string;
  name: string;
  barangayId: string;
  barangayName?: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  currentOccupancy: number;
  status: 'OPEN' | 'CLOSED' | 'FULL' | 'STANDBY' | 'TEMPORARILY_UNAVAILABLE' | string;
  contactPerson?: string;
  contactPhone?: string;
  facilities?: Record<string, boolean> | string[];
  description?: string;
}

interface BarangayItem {
  id: string;
  name: string;
}

interface ResponderEvacuationScreenProps {
  authToken: string | null;
  evacuationCenters: EvacuationCenterItem[];
  barangays: BarangayItem[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onCenterCreated: (newCenter: EvacuationCenterItem) => void;
  onCenterUpdated: (updatedCenter: EvacuationCenterItem) => void;
}

export const ResponderEvacuationScreen: React.FC<ResponderEvacuationScreenProps> = ({
  authToken,
  evacuationCenters,
  barangays,
  loading,
  refreshing,
  onRefresh,
  onCenterCreated,
  onCenterUpdated,
}) => {
  const { colors, theme, language } = usePreferences();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'FULL' | 'STANDBY' | 'CLOSED'>('ALL');
  const [selectedBarangayId, setSelectedBarangayId] = useState<string>('ALL');

  // Add Center Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);

  const [formName, setFormName] = useState('');
  const [formBarangayId, setFormBarangayId] = useState(barangays[0]?.id || 'brgy-1');
  const [formAddress, setFormAddress] = useState('');
  const [formLat, setFormLat] = useState('12.7042');
  const [formLng, setFormLng] = useState('124.0371');
  const [formCapacity, setFormCapacity] = useState('150');
  const [formOccupancy, setFormOccupancy] = useState('0');
  const [formStatus, setFormStatus] = useState<'OPEN' | 'STANDBY' | 'FULL' | 'CLOSED'>('OPEN');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Facilities Toggles
  const [facWater, setFacWater] = useState(true);
  const [facFood, setFacFood] = useState(true);
  const [facRestrooms, setFacRestrooms] = useState(true);
  const [facElectricity, setFacElectricity] = useState(true);
  const [facMedical, setFacMedical] = useState(false);
  const [facSleeping, setFacSleeping] = useState(true);
  const [facPwd, setFacPwd] = useState(false);

  // Quick Update Occupancy Modal State
  const [selectedCenterForUpdate, setSelectedCenterForUpdate] = useState<EvacuationCenterItem | null>(null);
  const [updateOccupancyVal, setUpdateOccupancyVal] = useState('0');
  const [updateStatusVal, setUpdateStatusVal] = useState<'OPEN' | 'FULL' | 'STANDBY' | 'CLOSED'>('OPEN');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // Auto-fetch GPS Coordinates
  const handleFetchCurrentGPS = async () => {
    setIsFetchingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Pahintulot Kinakailangan', 'Paki-enable ang GPS permission upang makuha ang eksaktong coordinates.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (loc?.coords) {
        setFormLat(loc.coords.latitude.toFixed(6));
        setFormLng(loc.coords.longitude.toFixed(6));
        Alert.alert('Tagumpay', `Nakuha ang GPS: ${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
      }
    } catch (err: any) {
      Alert.alert('GPS Notice', err.message || 'Hindi makuha ang kasalukuyang lokasyon.');
    } finally {
      setIsFetchingGPS(false);
    }
  };

  // Submit Add Center Form
  const handleCreateCenter = async () => {
    if (!formName.trim()) {
      Alert.alert('Kulang na Datos', 'Ilagay ang pangalan ng Evacuation Center.');
      return;
    }
    if (!formAddress.trim()) {
      Alert.alert('Kulang na Datos', 'Ilagay ang address ng Evacuation Center.');
      return;
    }
    const latNum = parseFloat(formLat);
    const lngNum = parseFloat(formLng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      Alert.alert('Maling Coordinates', 'Maglagay ng wastong numero para sa Latitude at Longitude.');
      return;
    }
    const capNum = parseInt(formCapacity, 10) || 100;
    const occNum = parseInt(formOccupancy, 10) || 0;

    const brgyObj = barangays.find(b => b.id === formBarangayId);
    const barangayName = brgyObj ? brgyObj.name : 'Irosin';

    const payload = {
      name: formName.trim(),
      barangayId: formBarangayId,
      barangayName,
      address: formAddress.trim(),
      latitude: latNum,
      longitude: lngNum,
      capacity: capNum,
      currentOccupancy: occNum,
      status: formStatus,
      contactPerson: formContactPerson.trim() || 'MDRRMO Officer',
      contactPhone: formContactPhone.trim() || 'N/A',
      description: formDescription.trim() || '',
      facilities: {
        water: facWater,
        food: facFood,
        restrooms: facRestrooms,
        electricity: facElectricity,
        medical: facMedical,
        sleepingArea: facSleeping,
        pwdAccessible: facPwd,
      },
    };

    setIsSubmittingAdd(true);
    try {
      const res = await Api.createEvacuationCenter(authToken, payload);
      const created = res.evacuationCenter || { ...payload, id: 'center-' + Date.now() };
      onCenterCreated(created);
      setIsAddModalOpen(false);

      // Reset form
      setFormName('');
      setFormAddress('');
      setFormContactPerson('');
      setFormContactPhone('');
      setFormDescription('');
      setFormCapacity('150');
      setFormOccupancy('0');

      Alert.alert('Tagumpay!', `Matagumpay na naidagdag ang "${payload.name}" sa sistema.`);
    } catch (err: any) {
      Alert.alert('Error sa Pagdagdag', err.message || 'Hindi maiproseso ang pagdagdag ng evacuation center.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open Update Modal
  const handleOpenUpdate = (center: EvacuationCenterItem) => {
    setSelectedCenterForUpdate(center);
    setUpdateOccupancyVal((center.currentOccupancy || 0).toString());
    setUpdateStatusVal((center.status as any) || 'OPEN');
  };

  // Submit Update Occupancy / Status
  const handleSaveUpdate = async () => {
    if (!selectedCenterForUpdate) return;
    const occNum = parseInt(updateOccupancyVal, 10);
    if (isNaN(occNum) || occNum < 0) {
      Alert.alert('Maling Occupancy', 'Maglagay ng wastong numero para sa bilang ng evacuees.');
      return;
    }

    const payload = {
      currentOccupancy: occNum,
      status: updateStatusVal,
    };

    setIsSubmittingUpdate(true);
    try {
      const res = await Api.updateEvacuationCenter(authToken, selectedCenterForUpdate.id, payload);
      const updated = res.evacuationCenter || { ...selectedCenterForUpdate, ...payload };
      onCenterUpdated(updated);
      setSelectedCenterForUpdate(null);
      Alert.alert('Na-update Na!', 'Matagumpay na na-update ang occupancy at status ng evacuation center.');
    } catch (err: any) {
      Alert.alert('Error sa Pag-update', err.message || 'Hindi ma-update ang evacuation center.');
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  // 1-Tap Google Maps Navigation
  const handleNavigateMaps = (center: EvacuationCenterItem) => {
    const lat = center.latitude || 12.7042;
    const lng = center.longitude || 124.0371;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Maps Error', 'Hindi mabuksan ang Google Maps application.');
    });
  };

  // Filter Centers
  const filteredCenters = useMemo(() => {
    return evacuationCenters.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.barangayName && c.barangayName.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchBrgy = selectedBarangayId === 'ALL' || c.barangayId === selectedBarangayId;

      return matchQuery && matchStatus && matchBrgy;
    });
  }, [evacuationCenters, searchQuery, statusFilter, selectedBarangayId]);

  // Render Evacuation Center Card
  const renderCenterCard = ({ item }: { item: EvacuationCenterItem }) => {
    const capacity = item.capacity || 100;
    const occupancy = item.currentOccupancy || 0;
    const percent = Math.min(100, Math.round((occupancy / capacity) * 100));

    const isOpen = item.status === 'OPEN';
    const isFull = item.status === 'FULL' || percent >= 100;
    const isClosed = item.status === 'CLOSED';

    const statusColor = isFull ? '#ef4444' : isOpen ? '#10b981' : isClosed ? '#64748b' : '#f59e0b';
    const statusLabel = isFull ? 'PUNO / FULL' : isOpen ? 'BUKAS / OPEN' : isClosed ? 'SARADO' : 'STANDBY';

    // Facilities parsing
    const facs = item.facilities || {};
    const hasWater = typeof facs === 'object' && !Array.isArray(facs) ? !!(facs as any).water : Array.isArray(facs) ? (facs as string[]).includes('water') : false;
    const hasFood = typeof facs === 'object' && !Array.isArray(facs) ? !!(facs as any).food : Array.isArray(facs) ? (facs as string[]).includes('food') : false;
    const hasMedical = typeof facs === 'object' && !Array.isArray(facs) ? !!(facs as any).medical : Array.isArray(facs) ? (facs as string[]).includes('medical') : false;
    const hasRestrooms = typeof facs === 'object' && !Array.isArray(facs) ? !!(facs as any).restrooms : Array.isArray(facs) ? (facs as string[]).includes('restrooms') : false;
    const hasElectricity = typeof facs === 'object' && !Array.isArray(facs) ? !!(facs as any).electricity : Array.isArray(facs) ? (facs as string[]).includes('electricity') : false;

    return (
      <View style={[styles.centerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {/* Top Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.brgyBadge, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="location-sharp" size={11} color={colors.primaryLight} />
                <Text style={[styles.brgyBadgeText, { color: colors.primaryLight }]}>
                  {item.barangayName || 'Irosin'}
                </Text>
              </View>
            </View>
            <Text style={[styles.centerName, { color: colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.centerAddress, { color: colors.textMuted }]} numberOfLines={1}>
              {item.address}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{statusLabel}</Text>
          </View>
        </View>

        {/* Occupancy Progress Bar */}
        <View style={styles.occupancySection}>
          <View style={styles.occupancyLabelRow}>
            <Text style={[styles.occupancyTitle, { color: colors.textSecondary }]}>Kasalukuyang Occupancy</Text>
            <Text style={[styles.occupancyNumbers, { color: colors.text }]}>
              <Text style={{ fontWeight: '900', color: percent >= 90 ? '#ef4444' : colors.primaryLight }}>{occupancy}</Text>
              {' '}/ {capacity} katao ({percent}%)
            </Text>
          </View>

          <View style={[styles.progressBarTrack, { backgroundColor: theme === 'dark' ? '#334155' : '#e2e8f0' }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${percent}%`,
                  backgroundColor: percent >= 95 ? '#ef4444' : percent >= 75 ? '#f59e0b' : '#10b981',
                },
              ]}
            />
          </View>
        </View>

        {/* Facility Chips */}
        <View style={styles.facilityRow}>
          {hasWater && (
            <View style={[styles.facilityChip, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}>
              <Ionicons name="water-outline" size={12} color="#0284c7" />
              <Text style={[styles.facilityText, { color: colors.textSecondary }]}>Tubig</Text>
            </View>
          )}
          {hasFood && (
            <View style={[styles.facilityChip, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}>
              <Ionicons name="restaurant-outline" size={12} color="#f59e0b" />
              <Text style={[styles.facilityText, { color: colors.textSecondary }]}>Pagkain</Text>
            </View>
          )}
          {hasRestrooms && (
            <View style={[styles.facilityChip, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}>
              <Ionicons name="man-outline" size={12} color="#10b981" />
              <Text style={[styles.facilityText, { color: colors.textSecondary }]}>Restroom</Text>
            </View>
          )}
          {hasElectricity && (
            <View style={[styles.facilityChip, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}>
              <Ionicons name="flash-outline" size={12} color="#eab308" />
              <Text style={[styles.facilityText, { color: colors.textSecondary }]}>Kuryente</Text>
            </View>
          )}
          {hasMedical && (
            <View style={[styles.facilityChip, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}>
              <Ionicons name="medkit-outline" size={12} color="#ef4444" />
              <Text style={[styles.facilityText, { color: colors.textSecondary }]}>Medikal</Text>
            </View>
          )}
        </View>

        {/* Contact info */}
        {item.contactPerson ? (
          <View style={styles.contactRow}>
            <Ionicons name="person-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.contactText, { color: colors.textMuted }]} numberOfLines={1}>
              {item.contactPerson} {item.contactPhone && item.contactPhone !== 'N/A' ? `• ${item.contactPhone}` : ''}
            </Text>
          </View>
        ) : null}

        {/* Card Action Buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.navBtn, { borderColor: colors.cardBorder, backgroundColor: colors.bg }]}
            onPress={() => handleNavigateMaps(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="navigate-outline" size={15} color={colors.primaryLight} />
            <Text style={[styles.navBtnText, { color: colors.primaryLight }]}>Google Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.updateBtn, { backgroundColor: colors.primaryLight }]}
            onPress={() => handleOpenUpdate(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil" size={14} color="#ffffff" />
            <Text style={styles.updateBtnText}>I-update Occupancy</Text>
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
            placeholder={language === 'tl' ? 'Hanapin ang evacuation center o barangay...' : 'Search evacuation center...'}
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

        {/* Status Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'ALL', label: 'Lahat' },
            { id: 'OPEN', label: 'Bukas / Open' },
            { id: 'FULL', label: 'Puno / Full' },
            { id: 'STANDBY', label: 'Standby' },
            { id: 'CLOSED', label: 'Sarado' },
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

      {/* Add Evacuation Center Floating / Top Action Button */}
      <View style={styles.addBarWrap}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {filteredCenters.length} Evacuation Center{filteredCenters.length !== 1 ? 's' : ''}
        </Text>

        <TouchableOpacity
          style={[styles.addCenterBtn, { backgroundColor: colors.primaryLight }]}
          onPress={() => setIsAddModalOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addCenterBtnText}>Magdagdag ng Center</Text>
        </TouchableOpacity>
      </View>

      {/* Centers List */}
      {loading && evacuationCenters.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Kinukuha ang mga Evacuation Center...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCenters}
          keyExtractor={item => item.id}
          renderItem={renderCenterCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="business-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Walang Nahanap na Center</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery
                  ? `Walang center na tumutugma sa "${searchQuery}".`
                  : 'Walang rehistradong evacuation center sa napiling filter.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Modal: Magdagdag ng Bagong Evacuation Center ── */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent onRequestClose={() => setIsAddModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Magdagdag ng Evacuation Center</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Rehistro ng bagong pasilidad para sa emergency evacuation
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Pangalan ng Center */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Pangalan ng Center *</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                placeholder="Hal. San Julian Covered Court"
                placeholderTextColor={colors.textMuted}
                value={formName}
                onChangeText={setFormName}
              />

              {/* Barangay Selector */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Barangay *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {barangays.map(b => (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.brgyPillBtn,
                      {
                        backgroundColor: formBarangayId === b.id ? colors.primaryLight : colors.bg,
                        borderColor: formBarangayId === b.id ? colors.primaryLight : colors.cardBorder,
                      },
                    ]}
                    onPress={() => setFormBarangayId(b.id)}
                  >
                    <Text style={[styles.brgyPillText, { color: formBarangayId === b.id ? '#ffffff' : colors.text }]}>
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Address */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Eksaktong Address / Lokasyon *</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                placeholder="Hal. Purok 3, Near Barangay Hall"
                placeholderTextColor={colors.textMuted}
                value={formAddress}
                onChangeText={setFormAddress}
              />

              {/* GPS Coordinates & Auto-Fetch Button */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={[styles.fieldLabel, { color: colors.text, marginBottom: 0 }]}>GPS Coordinates</Text>
                <TouchableOpacity
                  style={[styles.fetchGPSBtn, { backgroundColor: colors.primaryBg, borderColor: colors.primaryLight }]}
                  onPress={handleFetchCurrentGPS}
                  disabled={isFetchingGPS}
                >
                  {isFetchingGPS ? (
                    <ActivityIndicator size="small" color={colors.primaryLight} />
                  ) : (
                    <>
                      <Ionicons name="locate" size={13} color={colors.primaryLight} />
                      <Text style={[styles.fetchGPSText, { color: colors.primaryLight }]}>Kunin Kasalukuyang GPS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.gpsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subFieldLabel, { color: colors.textMuted }]}>Latitude</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                    placeholder="12.7042"
                    placeholderTextColor={colors.textMuted}
                    value={formLat}
                    onChangeText={setFormLat}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subFieldLabel, { color: colors.textMuted }]}>Longitude</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                    placeholder="124.0371"
                    placeholderTextColor={colors.textMuted}
                    value={formLng}
                    onChangeText={setFormLng}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Capacity & Initial Occupancy */}
              <View style={styles.gpsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Kapasidad (Katao) *</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                    placeholder="150"
                    placeholderTextColor={colors.textMuted}
                    value={formCapacity}
                    onChangeText={setFormCapacity}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Kasalukuyang Occupancy</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    value={formOccupancy}
                    onChangeText={setFormOccupancy}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Status Selector */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Status ng Center</Text>
              <View style={styles.statusSelectRow}>
                {[
                  { id: 'OPEN', label: 'Bukas' },
                  { id: 'STANDBY', label: 'Standby' },
                  { id: 'FULL', label: 'Puno' },
                  { id: 'CLOSED', label: 'Sarado' },
                ].map(st => (
                  <TouchableOpacity
                    key={st.id}
                    style={[
                      styles.statusSelectBtn,
                      {
                        backgroundColor: formStatus === st.id ? colors.primaryLight : colors.bg,
                        borderColor: formStatus === st.id ? colors.primaryLight : colors.cardBorder,
                      },
                    ]}
                    onPress={() => setFormStatus(st.id as any)}
                  >
                    <Text style={[styles.statusSelectText, { color: formStatus === st.id ? '#ffffff' : colors.text }]}>
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Facilities Checkboxes */}
              <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 6 }]}>Pasilidad at Serbisyo</Text>
              <View style={styles.facGrid}>
                {[
                  { label: 'Inuming Tubig', val: facWater, set: setFacWater, icon: 'water-outline' },
                  { label: 'Rasyon ng Pagkain', val: facFood, set: setFacFood, icon: 'restaurant-outline' },
                  { label: 'Palikuran / CR', val: facRestrooms, set: setFacRestrooms, icon: 'man-outline' },
                  { label: 'Kuryente / Generator', val: facElectricity, set: setFacElectricity, icon: 'flash-outline' },
                  { label: 'Medikal / First Aid', val: facMedical, set: setFacMedical, icon: 'medkit-outline' },
                  { label: 'Sleeping Area / Banig', val: facSleeping, set: setFacSleeping, icon: 'bed-outline' },
                  { label: 'PWD Accessible', val: facPwd, set: setFacPwd, icon: 'accessibility-outline' },
                ].map(fc => (
                  <TouchableOpacity
                    key={fc.label}
                    style={[
                      styles.facCheckRow,
                      {
                        backgroundColor: fc.val ? (theme === 'dark' ? 'rgba(2,132,199,0.2)' : '#e0f2fe') : colors.bg,
                        borderColor: fc.val ? colors.primaryLight : colors.cardBorder,
                      },
                    ]}
                    onPress={() => fc.set(!fc.val)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={fc.icon as any} size={15} color={fc.val ? colors.primaryLight : colors.textMuted} />
                    <Text style={[styles.facCheckText, { color: fc.val ? colors.text : colors.textMuted }]}>
                      {fc.label}
                    </Text>
                    <Ionicons
                      name={fc.val ? 'checkmark-circle' : 'ellipse-outline'}
                      size={17}
                      color={fc.val ? colors.primaryLight : colors.textMuted}
                      style={{ marginLeft: 'auto' }}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Contact Person & Phone */}
              <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 8 }]}>Contact Person & Numero</Text>
              <View style={styles.gpsRow}>
                <View style={{ flex: 1.2 }}>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                    placeholder="Pangalan ng Officer"
                    placeholderTextColor={colors.textMuted}
                    value={formContactPerson}
                    onChangeText={setFormContactPerson}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                    placeholder="09123456789"
                    placeholderTextColor={colors.textMuted}
                    value={formContactPhone}
                    onChangeText={setFormContactPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitCenterBtn, { backgroundColor: colors.primaryLight }]}
                onPress={handleCreateCenter}
                disabled={isSubmittingAdd}
                activeOpacity={0.85}
              >
                {isSubmittingAdd ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    <Text style={styles.submitCenterBtnText}>I-save ang Evacuation Center</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Quick Update Occupancy / Status ── */}
      <Modal visible={!!selectedCenterForUpdate} animationType="fade" transparent onRequestClose={() => setSelectedCenterForUpdate(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalUpdateSheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>I-update ang Occupancy</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                  {selectedCenterForUpdate?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedCenterForUpdate(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 14 }}>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  Bilang ng Evacuees (Max: {selectedCenterForUpdate?.capacity || 100})
                </Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder, fontSize: 20, fontWeight: '800' }]}
                  value={updateOccupancyVal}
                  onChangeText={setUpdateOccupancyVal}
                  keyboardType="number-pad"
                />
              </View>

              <View>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Status ng Center</Text>
                <View style={styles.statusSelectRow}>
                  {[
                    { id: 'OPEN', label: 'Bukas' },
                    { id: 'STANDBY', label: 'Standby' },
                    { id: 'FULL', label: 'Puno' },
                    { id: 'CLOSED', label: 'Sarado' },
                  ].map(st => (
                    <TouchableOpacity
                      key={st.id}
                      style={[
                        styles.statusSelectBtn,
                        {
                          backgroundColor: updateStatusVal === st.id ? colors.primaryLight : colors.bg,
                          borderColor: updateStatusVal === st.id ? colors.primaryLight : colors.cardBorder,
                        },
                      ]}
                      onPress={() => setUpdateStatusVal(st.id as any)}
                    >
                      <Text style={[styles.statusSelectText, { color: updateStatusVal === st.id ? '#ffffff' : colors.text }]}>
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitCenterBtn, { backgroundColor: colors.primaryLight, marginTop: 6 }]}
                onPress={handleSaveUpdate}
                disabled={isSubmittingUpdate}
                activeOpacity={0.85}
              >
                {isSubmittingUpdate ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                    <Text style={styles.submitCenterBtnText}>I-update ang Status</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
  },
  filterScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Add Bar
  addBarWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  countText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  addCenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addCenterBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },

  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 32,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Center Card
  centerCard: {
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
  brgyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  brgyBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  centerName: {
    fontSize: 15.5,
    fontWeight: '800',
    lineHeight: 20,
  },
  centerAddress: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // Occupancy Progress
  occupancySection: {
    gap: 4,
  },
  occupancyLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  occupancyTitle: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  occupancyNumbers: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Facilities
  facilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  facilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  facilityText: {
    fontSize: 10.5,
    fontWeight: '600',
  },

  // Contact
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 11.5,
    fontWeight: '500',
  },

  // Card Actions
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  navBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  updateBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  updateBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingBottom: 20,
  },
  modalUpdateSheet: {
    marginHorizontal: 16,
    marginBottom: 'auto',
    marginTop: 'auto',
    borderRadius: 20,
    borderWidth: 1,
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 5,
    marginTop: 6,
  },
  subFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 3,
  },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    marginBottom: 8,
  },
  brgyPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  brgyPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gpsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fetchGPSBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  fetchGPSText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  statusSelectRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  statusSelectBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusSelectText: {
    fontSize: 12,
    fontWeight: '700',
  },
  facGrid: {
    gap: 6,
    marginBottom: 10,
  },
  facCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  facCheckText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  submitCenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 10,
  },
  submitCenterBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
