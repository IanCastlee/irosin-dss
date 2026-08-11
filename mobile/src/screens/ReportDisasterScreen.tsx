import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Api } from '../services/api';
import { ReportType } from '../types';

export const ReportDisasterScreen = ({ navigation }: any) => {
  const [reportType, setReportType] = useState<ReportType>('FLOODING');
  const [description, setDescription] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [barangayId] = useState('brgy-1');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description || !locationDescription) {
      Alert.alert('Required Fields', 'Please fill in the description and location.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await Api.submitReport({
        reportType,
        description,
        latitude: 12.7081,
        longitude: 124.0325,
        locationDescription,
        barangayId
      });

      Alert.alert(
        'Report Submitted',
        'Your report has been received by MDRRMO personnel. Please note: Citizen reports must be verified before becoming official announcements.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Submission Error', err?.message || 'Could not submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  const types: { type: ReportType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { type: 'FLOODING', label: 'Flooding', icon: 'water-outline' },
    { type: 'BLOCKED_ROAD', label: 'Blocked Road', icon: 'construct-outline' },
    { type: 'DAMAGED_ROAD', label: 'Damaged Road', icon: 'warning-outline' },
    { type: 'LANDSLIDE', label: 'Landslide', icon: 'alert-circle-outline' },
    { type: 'DAMAGED_EVACUATION_CENTER', label: 'Damaged Shelter', icon: 'home-outline' },
    { type: 'UNSAFE_ROUTE', label: 'Unsafe Evacuation Route', icon: 'navigate-outline' },
    { type: 'OTHER', label: 'Other Hazard', icon: 'document-text-outline' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={18} color="#38bdf8" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Submit Disaster Report</Text>
        <Text style={styles.sub}>Report road blockages, flooding, or hazards to MDRRMO Irosin</Text>

        <View style={styles.noticeBox}>
          <View style={styles.rowCenter}>
            <Ionicons name="information-circle-outline" size={18} color="#38bdf8" />
            <Text style={styles.noticeTitle}>Verification Notice</Text>
          </View>
          <Text style={styles.noticeText}>
            Citizen reports ARE NOT automatically published as official disaster info. MDRRMO team will verify on the ground.
          </Text>
        </View>

        {/* Hazard Type Selector */}
        <Text style={styles.label}>Select Report Category *</Text>
        <View style={styles.typeGrid}>
          {types.map(t => (
            <TouchableOpacity
              key={t.type}
              onPress={() => setReportType(t.type)}
              style={[styles.typeChip, reportType === t.type && styles.typeChipActive]}
            >
              <Ionicons name={t.icon} size={18} color={reportType === t.type ? '#38bdf8' : '#94a3b8'} />
              <Text style={[styles.typeText, reportType === t.type && styles.typeTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Location Description */}
        <Text style={styles.label}>Specific Location / Landmark *</Text>
        <TextInput
          style={styles.input}
          value={locationDescription}
          onChangeText={setLocationDescription}
          placeholder="e.g., Near Monbon Bridge, Sitio Riverbank Road"
          placeholderTextColor="#64748b"
        />

        {/* Description */}
        <Text style={styles.label}>Hazard Details / Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe water depth, tree blockage, or road damage..."
          placeholderTextColor="#64748b"
          multiline
          numberOfLines={4}
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? 'Submitting Report...' : 'Submit Report to MDRRMO'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  container: { flex: 1, padding: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backBtnText: { color: '#38bdf8', fontSize: 14, fontWeight: '700' },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '900', marginBottom: 4 },
  sub: { color: '#38bdf8', fontSize: 12, marginBottom: 16 },

  noticeBox: { backgroundColor: '#1e293b', padding: 12, borderRadius: 12, marginBottom: 20 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  noticeTitle: { color: '#38bdf8', fontSize: 12, fontWeight: '800' },
  noticeText: { color: '#cbd5e1', fontSize: 11, lineHeight: 15 },

  label: { color: '#f8fafc', fontSize: 12, fontWeight: '800', uppercase: true, marginBottom: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { width: '48%', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeChipActive: { backgroundColor: 'rgba(14, 165, 233, 0.2)', borderColor: '#0ea5e9' },
  typeText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  typeTextActive: { color: '#38bdf8', fontWeight: '800' },

  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, padding: 12, color: '#f8fafc', fontSize: 13, marginBottom: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },

  submitBtn: { backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' }
});
