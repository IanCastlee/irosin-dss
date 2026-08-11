import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Api } from '../services/api';
import { PreparednessGuide } from '../types';
import { OfflineBanner } from '../components/OfflineBanner';

import { ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export const PreparednessScreen = () => {
  const [guides, setGuides] = useState<PreparednessGuide[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'BEFORE' | 'DURING' | 'AFTER'>('BEFORE');
  const [selectedHazard, setSelectedHazard] = useState<string>('ALL');
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadGuides();
      const interval = setInterval(() => {
        loadGuides(false);
      }, 3000);
      return () => clearInterval(interval);
    }, [selectedCategory, selectedHazard])
  );

  const loadGuides = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const hazardParam = selectedHazard === 'ALL' ? undefined : selectedHazard;
      const res = await Api.getGuides(hazardParam, selectedCategory);
      setGuides(res.data);
      setIsOffline(res.isOffline);
    } catch {
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <OfflineBanner isOffline={isOffline} />

      <View style={styles.header}>
        <Text style={styles.title}>Disaster Preparedness</Text>
        <Text style={styles.sub}>Official Guidelines by MDRRMO Irosin</Text>
      </View>

      {/* Phase Filters (Before / During / After) */}
      <View style={styles.phaseContainer}>
        {(['BEFORE', 'DURING', 'AFTER'] as const).map(phase => (
          <TouchableOpacity
            key={phase}
            onPress={() => setSelectedCategory(phase)}
            style={[styles.phaseBtn, selectedCategory === phase && styles.phaseBtnActive]}
          >
            <Text style={[styles.phaseText, selectedCategory === phase && styles.phaseTextActive]}>
              {phase === 'BEFORE' ? 'BEFORE Disaster' : phase === 'DURING' ? 'DURING Disaster' : 'AFTER Disaster'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Hazard Category Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {['ALL', 'TYPHOON', 'FLOOD', 'EARTHQUAKE', 'VOLCANIC_ERUPTION', 'LANDSLIDE'].map(h => (
          <TouchableOpacity
            key={h}
            onPress={() => setSelectedHazard(h)}
            style={[styles.chip, selectedHazard === h && styles.chipActive]}
          >
            <Text style={[styles.chipText, selectedHazard === h && styles.chipTextActive]}>
              {h.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.container}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loadingText}>Fetching Official Guidelines...</Text>
          </View>
        ) : guides.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="book-outline" size={32} color="#38bdf8" />
            </View>
            <Text style={styles.emptyTitle}>No Preparedness Guides Found</Text>
            <Text style={styles.emptyText}>Official guidelines for this category will appear here once published by MDRRMO Admin.</Text>
          </View>
        ) : (
          guides.map(g => (
            <View key={g.id} style={styles.card}>
              <Text style={styles.guideTitle}>{g.title}</Text>
              <Text style={styles.guideIntro}>{g.introduction}</Text>

              {g.checklist.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>✓ Preparation Checklist</Text>
                  {g.checklist.map((item, idx) => (
                    <Text key={idx} style={styles.bulletItem}>• {item}</Text>
                  ))}
                </View>
              )}

              {g.warnings.length > 0 && (
                <View style={[styles.section, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Text style={[styles.sectionHeader, { color: '#f59e0b' }]}>⚠️ Emergency Warnings</Text>
                  {g.warnings.map((w, idx) => (
                    <Text key={idx} style={[styles.bulletItem, { color: '#fcd34d' }]}>• {w}</Text>
                  ))}
                </View>
              )}
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  header: { padding: 16, backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '900' },
  sub: { color: '#38bdf8', fontSize: 12, marginTop: 2 },

  phaseContainer: { flexDirection: 'row', backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  phaseBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  phaseBtnActive: { borderBottomWidth: 2, borderBottomColor: '#0ea5e9' },
  phaseText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  phaseTextActive: { color: '#38bdf8', fontWeight: '900' },

  chipScroll: { paddingHorizontal: 16, paddingVertical: 10, flexGrow: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', marginRight: 8 },
  chipActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  chipText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#ffffff', fontWeight: '800' },

  container: { flex: 1, padding: 16 },
  card: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  guideTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  guideIntro: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  section: { backgroundColor: '#1e293b', padding: 12, borderRadius: 10, marginTop: 8 },
  sectionHeader: { color: '#10b981', fontSize: 12, fontWeight: '800', marginBottom: 6 },
  bulletItem: { color: '#f8fafc', fontSize: 12, lineHeight: 18, marginBottom: 4 },

  emptyCard: { padding: 32, alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 20, borderWidth: 1, borderColor: '#1e293b', marginTop: 12 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(56, 189, 248, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  emptyText: { color: '#94a3b8', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { color: '#38bdf8', fontSize: 13, fontWeight: '700' }
});
