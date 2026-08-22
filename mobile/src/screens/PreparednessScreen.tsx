import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Api } from '../services/api';
import { PreparednessGuide } from '../types';
import { OfflineBanner } from '../components/OfflineBanner';
import { OfflineStorage } from '../services/offlineStorage';
import { usePreferences } from '../context/PreferencesContext';
import { LinearGradient } from 'expo-linear-gradient';

export const PreparednessScreen = () => {
  const { colors, language, theme, t } = usePreferences();
  const [guides, setGuides] = useState<PreparednessGuide[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'BEFORE' | 'DURING' | 'AFTER'>('BEFORE');
  const [selectedHazard, setSelectedHazard] = useState<string>('ALL');
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    OfflineStorage.getCache<PreparednessGuide[]>('GUIDES').then(cached => {
      if (cached && cached.length > 0) {
        setGuides(cached);
        setLoading(false);
      }
    });

    loadGuides(false);
  }, [selectedCategory, selectedHazard]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGuides(false);
    setRefreshing(false);
  };

  const loadGuides = async (showLoading = false) => {
    try {
      if (showLoading && guides.length === 0) setLoading(true);
      const hazardParam = selectedHazard === 'ALL' ? undefined : selectedHazard;
      const res = await Api.getGuides(hazardParam, selectedCategory);
      const items = res.data || [];
      if (items.length > 0) {
        setGuides(items);
      }
      setIsOffline(res.isOffline);
    } catch {
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  const getPhaseLabel = (phase: string) => {
    if (language === 'tl') {
      switch (phase) {
        case 'BEFORE': return 'BAGO ang Sakuna';
        case 'DURING': return 'HABANG may Sakuna';
        case 'AFTER': return 'PAGKATAPOS';
        default: return phase;
      }
    }
    switch (phase) {
      case 'BEFORE': return 'BEFORE Disaster';
      case 'DURING': return 'DURING Disaster';
      case 'AFTER': return 'AFTER Disaster';
      default: return phase;
    }
  };

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
            backgroundColor: "rgba(16, 185, 129, 0.12)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(16, 185, 129, 0.25)",
          }}
        >
          <Ionicons name="shield-checkmark" size={22} color="#10b981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t('guidesTitle')}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>{t('guidesSub')}</Text>
        </View>
      </View>

      {/* Phase Filters */}
      <View style={[styles.phaseContainer, { backgroundColor: "transparent", borderBottomWidth: 0 }]}>
        {(['BEFORE', 'DURING', 'AFTER'] as const).map(phase => (
          <TouchableOpacity
            key={phase}
            onPress={() => setSelectedCategory(phase)}
            style={[
              styles.phaseBtn,
              selectedCategory === phase && [styles.phaseBtnActive, { borderBottomColor: colors.primaryLight }]
            ]}
          >
            <Text
              style={[
                styles.phaseText,
                { color: colors.textMuted },
                selectedCategory === phase && { color: colors.primaryLight, fontWeight: '800' }
              ]}
            >
              {getPhaseLabel(phase)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Hazard Category Filter Chips */}
      <View style={[styles.chipWrapper, { backgroundColor: "transparent", borderBottomWidth: 0 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {['ALL', 'TYPHOON', 'FLOOD', 'EARTHQUAKE', 'VOLCANIC_ERUPTION', 'LANDSLIDE'].map(h => (
            <TouchableOpacity
              key={h}
              onPress={() => setSelectedHazard(h)}
              style={[
                styles.chip,
                { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                selectedHazard === h && [styles.chipActive, { backgroundColor: colors.primary, borderColor: colors.primaryLight }]
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: colors.textSecondary },
                  selectedHazard === h && { color: '#ffffff', fontWeight: '800' }
                ]}
              >
                {h.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} colors={[colors.primaryLight]} />
        }
      >
        {loading && guides.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Kinukuha ang mga gabay sa kaligtasan...' : 'Loading Preparedness Guides...'}
            </Text>
          </View>
        ) : guides.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Ionicons name="book-outline" size={48} color={colors.primaryLight} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {language === 'tl' ? 'Walang Gabay para sa Kategoryang Ito' : 'No Preparedness Guides Found'}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Maaaring pumili ng ibang yugto o kategorya ng hazard sa itaas.' : 'Try selecting another hazard category or phase above.'}
            </Text>
          </View>
        ) : (
          guides.map(guide => {
            const contentText = (guide as any).content || guide.introduction || (guide as any).description || '';
            const stepsList = (guide as any).steps || guide.checklist || guide.instructions || guide.emergencyActions || [];
            const tipsList = (guide as any).tips || guide.warnings || [];
            const kitItems = (guide as any).emergencyKitItems || [];
            const sourceText = (guide as any).source || 'MDRRMO Irosin Operations Center';

            return (
              <View key={guide.id} style={[styles.guideCard, { backgroundColor: colors.card }]}>
                <View style={styles.guideHeader}>
                  <Text style={[styles.guideCategory, { color: colors.primaryLight }]}>
                    {guide.hazardType.replace(/_/g, ' ')}
                  </Text>
                  <View style={[styles.phaseBadge, { backgroundColor: colors.primaryBg }]}>
                    <Text style={[styles.phaseBadgeText, { color: colors.primaryLight }]}>
                      {getPhaseLabel(guide.category)}
                    </Text>
                  </View>
                </View>

                {/* Title */}
                <Text style={[styles.guideTitle, { color: colors.text }]}>{guide.title}</Text>

                {/* Description / Introduction */}
                {contentText ? (
                  <Text style={[styles.guideSummary, { color: colors.textSecondary }]}>
                    {contentText}
                  </Text>
                ) : null}

                {/* Step-by-step Action Checklist */}
                {stepsList.length > 0 && (
                  <View style={[styles.checklistBox, { backgroundColor: colors.inputBg }]}>
                    <Text style={[styles.checklistHeader, { color: colors.text }]}>
                      {language === 'tl' ? '📋 Mga Hakbang at Aksyon:' : '📋 Key Action Steps:'}
                    </Text>
                    {stepsList.map((item: string, idx: number) => (
                      <View key={idx} style={styles.checkItem}>
                        <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} style={{ marginTop: 2 }} />
                        <Text style={[styles.checkText, { color: colors.text }]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Emergency Kit Items */}
                {kitItems.length > 0 && (
                  <View style={[styles.kitBox, { backgroundColor: 'rgba(2, 132, 199, 0.08)', borderColor: 'rgba(2, 132, 199, 0.25)' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Ionicons name="medkit-outline" size={16} color="#0284c7" />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284c7' }}>
                        {language === 'tl' ? '🎒 Emergency Kit Items:' : '🎒 Emergency Kit Checklist:'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {kitItems.map((item: string, idx: number) => (
                        <View key={idx} style={{ backgroundColor: 'rgba(2, 132, 199, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                          <Text style={{ fontSize: 11.5, color: colors.text, fontWeight: '700' }}>• {item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Important Tips & Warnings */}
                {tipsList.length > 0 && (
                  <View style={[styles.tipsBox, { backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.25)' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Ionicons name="bulb-outline" size={15} color="#d97706" />
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#d97706' }}>
                        {language === 'tl' ? '💡 Mahahalagang Paalala:' : '💡 Important Tips:'}
                      </Text>
                    </View>
                    {tipsList.map((tip: string, idx: number) => (
                      <Text key={idx} style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 4 }}>
                        • {tip}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Official Source Footer */}
                <View style={styles.sourceRow}>
                  <Ionicons name="shield-checkmark-outline" size={13} color={colors.textMuted} />
                  <Text style={[styles.sourceText, { color: colors.textMuted }]}>
                    {language === 'tl' ? 'Pinagmulan: ' : 'Source: '} {sourceText}
                  </Text>
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
  title: { fontSize: 19, fontWeight: '900' },
  sub: { fontSize: 13, marginTop: 2 },
  phaseContainer: { flexDirection: 'row', borderBottomWidth: 1 },
  phaseBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  phaseBtnActive: {},
  phaseText: { fontSize: 13, fontWeight: '700' },
  chipWrapper: { borderBottomWidth: 1 },
  chipScroll: { paddingHorizontal: 12, paddingVertical: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, borderWidth: 1 },
  chipActive: {},
  chipText: { fontSize: 12, fontWeight: '700' },
  container: { flex: 1, padding: 14 },
  loadingBox: { padding: 40, alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13 },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 0,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  emptyTitle: { fontSize: 17, fontWeight: '900', marginTop: 12, marginBottom: 4 },
  emptySub: { fontSize: 13, textAlign: 'center' },
  guideCard: {
    borderRadius: 12,
    borderWidth: 0,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  guideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  guideCategory: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  phaseBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  phaseBadgeText: { fontSize: 11, fontWeight: '800' },
  guideTitle: { fontSize: 17, fontWeight: '900', marginBottom: 6 },
  guideSummary: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  checklistBox: {
    borderRadius: 12,
    borderWidth: 0,
    padding: 12,
    marginBottom: 10,
  },
  checklistHeader: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  checkItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  checkText: { fontSize: 13, flex: 1, lineHeight: 19 },
  kitBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  tipsBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
  },
  sourceText: {
    fontSize: 11.5,
    fontStyle: 'italic',
  }
});
