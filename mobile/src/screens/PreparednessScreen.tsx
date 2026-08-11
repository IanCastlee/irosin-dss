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

export const PreparednessScreen = () => {
  const [guides, setGuides] = useState<PreparednessGuide[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'BEFORE' | 'DURING' | 'AFTER'>('BEFORE');
  const [selectedHazard, setSelectedHazard] = useState<string>('ALL');
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    loadGuides();
  }, [selectedCategory, selectedHazard]);

  const loadGuides = async () => {
    try {
      const hazardParam = selectedHazard === 'ALL' ? undefined : selectedHazard;
      const res = await Api.getGuides(hazardParam, selectedCategory);
      setGuides(res.data);
      setIsOffline(res.isOffline);
    } catch {
      setIsOffline(true);
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
        {guides.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No preparedness guides found for this selection.</Text>
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

  emptyCard: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 13 }
});
