import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Api } from '../services/api';
import { PreparednessGuide } from '../types';
import { OfflineBanner } from '../components/OfflineBanner';
import { OfflineStorage } from '../services/offlineStorage';
import { usePreferences } from '../context/PreferencesContext';
import { LinearGradient } from 'expo-linear-gradient';

// Context-aware disaster preparedness illustrations based on hazard, phase, and action descriptions
function getGuideImage(guide: PreparednessGuide): string {
  // 1. If admin provided custom imageUrl, use it first!
  if ((guide as any).imageUrl && typeof (guide as any).imageUrl === 'string' && (guide as any).imageUrl.trim().length > 0) {
    return (guide as any).imageUrl.trim();
  }
  if ((guide as any).image && typeof (guide as any).image === 'string' && (guide as any).image.trim().length > 0) {
    return (guide as any).image.trim();
  }

  const title = (guide.title || '').toLowerCase();
  const intro = (guide.introduction || (guide as any).content || (guide as any).description || '').toLowerCase();
  const cat = (guide.category || '').toUpperCase();
  const fullText = `${title} ${intro}`;

  // 2. Earthquake (Lindol) Content & Action Matching
  if (fullText.includes('lindol') || fullText.includes('earthquake') || (guide.hazardType === 'EARTHQUAKE')) {
    if (cat === 'BEFORE' || fullText.includes('aparador') || fullText.includes('anchor') || fullText.includes('itali') || fullText.includes('bahay') || fullText.includes('gamit')) {
      // Anchoring heavy furniture, cabinets & home earthquake proofing
      return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&auto=format&fit=crop';
    }
    if (cat === 'DURING' || fullText.includes('duck') || fullText.includes('cover') || fullText.includes('hold') || fullText.includes('mesa') || fullText.includes('silong')) {
      // Drop, Cover, and Hold on under sturdy table
      return 'https://images.unsplash.com/photo-1590682680695-43b964a3ae17?q=80&w=800&auto=format&fit=crop';
    }
    // Earthquake After: Safe open-air evacuation & damage assessment
    return 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop';
  }

  // 3. Flood (Baha) Content & Action Matching
  if (fullText.includes('baha') || fullText.includes('flood') || (guide.hazardType === 'FLOOD')) {
    if (cat === 'BEFORE' || fullText.includes('go-bag') || fullText.includes('sandbag') || fullText.includes('gamit') || fullText.includes('itaas')) {
      // Elevating furniture, sandbagging & Go-bag preparation
      return 'https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=800&auto=format&fit=crop';
    }
    if (cat === 'DURING' || fullText.includes('likas') || fullText.includes('evacuat') || fullText.includes('kuryente') || fullText.includes('breaker') || fullText.includes('ilug')) {
      // Evacuating through floodwaters safely
      return 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=800&auto=format&fit=crop';
    }
    // Flood After: Post-flood recovery, water disinfection & hygiene
    return 'https://images.unsplash.com/photo-1584467735815-f778f274e296?q=80&w=800&auto=format&fit=crop';
  }

  // 4. Typhoon (Bagyo) Content & Action Matching
  if (fullText.includes('bagyo') || fullText.includes('typhoon') || fullText.includes('storm') || (guide.hazardType === 'TYPHOON')) {
    if (cat === 'BEFORE' || fullText.includes('bubong') || fullText.includes('bintana') || fullText.includes('tapas') || fullText.includes('radio')) {
      // Securing roofs, windows & storm preparations
      return 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?q=80&w=800&auto=format&fit=crop';
    }
    if (cat === 'DURING' || fullText.includes('loob') || fullText.includes('stay') || fullText.includes('hangin')) {
      // Staying indoors during storm
      return 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=800&auto=format&fit=crop';
    }
    // Typhoon After: Debris removal & downed wire safety
    return 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop';
  }

  // 5. Volcanic Eruption & Ashfall (Bulkang Bulusan)
  if (fullText.includes('bulkan') || fullText.includes('volcano') || fullText.includes('ashfall') || fullText.includes('abo') || (guide.hazardType === 'VOLCANIC_ERUPTION') || (guide.hazardType === 'VOLCANIC')) {
    if (fullText.includes('mask') || fullText.includes('n95') || fullText.includes('tela') || fullText.includes('mata') || fullText.includes('salamin')) {
      // Ashfall mask protection
      return 'https://images.unsplash.com/photo-1584634731339-252c581abfc5?q=80&w=800&auto=format&fit=crop';
    }
    return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop';
  }

  // 6. Landslide (Pagguho ng Lupa)
  if (fullText.includes('guho') || fullText.includes('landslide') || (guide.hazardType === 'LANDSLIDE')) {
    return 'https://images.unsplash.com/photo-1545153996-e01b50d6f212?q=80&w=800&auto=format&fit=crop';
  }

  // 7. Fire (Sunog)
  if (fullText.includes('sunog') || fullText.includes('fire') || (guide.hazardType === 'FIRE')) {
    return 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=800&auto=format&fit=crop';
  }

  // 8. First Aid & Go-Bag Essentials
  if (fullText.includes('kit') || fullText.includes('gamot') || fullText.includes('first aid') || fullText.includes('go bag') || fullText.includes('emergency bag')) {
    return 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?q=80&w=800&auto=format&fit=crop';
  }

  return 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?q=80&w=800&auto=format&fit=crop';
}

// Actionable Visual Icons for Checklist Steps
function getStepActionIcon(stepText: string): { icon: any; color: string } {
  const s = (stepText || '').toLowerCase();
  if (s.includes('anchor') || s.includes('itali') || s.includes('aparador') || s.includes('dingding') || s.includes('patibay') || s.includes('refrigerator')) {
    return { icon: 'construct-outline', color: '#0284c7' };
  }
  if (s.includes('mesa') || s.includes('silong') || s.includes('duck') || s.includes('cover') || s.includes('hold') || s.includes('taguan')) {
    return { icon: 'shield-checkmark-outline', color: '#10b981' };
  }
  if (s.includes('bag') || s.includes('gamit') || s.includes('kit') || s.includes('tubig') || s.includes('pagkain') || s.includes('gamot')) {
    return { icon: 'briefcase-outline', color: '#f59e0b' };
  }
  if (s.includes('radio') || s.includes('balita') || s.includes('pagasa') || s.includes('abiso') || s.includes('cellphone') || s.includes('charge')) {
    return { icon: 'radio-outline', color: '#8b5cf6' };
  }
  if (s.includes('kuryente') || s.includes('gas') || s.includes('lpg') || s.includes('patay') || s.includes('switch') || s.includes('breaker') || s.includes('valve')) {
    return { icon: 'flash-outline', color: '#ef4444' };
  }
  if (s.includes('likas') || s.includes('evacuat') || s.includes('daan') || s.includes('ruta') || s.includes('mataas') || s.includes('labas')) {
    return { icon: 'exit-outline', color: '#10b981' };
  }
  if (s.includes('mask') || s.includes('n95') || s.includes('tela') || s.includes('abo') || s.includes('usok') || s.includes('salamin')) {
    return { icon: 'medkit-outline', color: '#06b6d4' };
  }
  if (s.includes('linis') || s.includes('disinfect') || s.includes('hugas') || s.includes('tubig') || s.includes('kanal')) {
    return { icon: 'water-outline', color: '#0284c7' };
  }
  return { icon: 'checkmark-circle-outline', color: '#10b981' };
}

export const PreparednessScreen = () => {
  const { colors, language, theme, t } = usePreferences();
  const [guides, setGuides] = useState<PreparednessGuide[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'BEFORE' | 'DURING' | 'AFTER'>('BEFORE');
  const [selectedHazard, setSelectedHazard] = useState<string>('ALL');
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch fresh guides every time the user opens the tab / screen
  useFocusEffect(
    useCallback(() => {
      loadGuides(false);
    }, [selectedCategory, selectedHazard])
  );

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
      setIsOffline(res.isOffline);

      if (items.length > 0) {
        setGuides(items);
        OfflineStorage.saveCache('GUIDES', items).catch(() => {});
      } else if (!res.isOffline) {
        // Server confirmed 0 — wipe display & stale cache
        setGuides([]);
        OfflineStorage.saveCache('GUIDES', []).catch(() => {});
      }
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
        contentContainerStyle={{ paddingBottom: 60 }}
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
            const guideImg = getGuideImage(guide);

            return (
              <View key={guide.id} style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                {/* 🖼️ Hero Disaster Guide Banner Image */}
                <View style={styles.guideImageContainer}>
                  <Image
                    source={{ uri: guideImg }}
                    style={styles.guideBannerImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.75)']}
                    style={styles.guideImageGradient}
                  />

                  {/* Top Floating Badges */}
                  <View style={styles.guideImageTopRow}>
                    <View style={[styles.hazardPill, { backgroundColor: 'rgba(2, 132, 199, 0.9)' }]}>
                      <Ionicons name="shield-outline" size={12} color="#ffffff" />
                      <Text style={styles.hazardPillText}>
                        {guide.hazardType.replace(/_/g, ' ')}
                      </Text>
                    </View>

                    <View style={[styles.phasePill, { backgroundColor: 'rgba(15, 23, 42, 0.85)' }]}>
                      <Text style={styles.phasePillText}>
                        {getPhaseLabel(guide.category)}
                      </Text>
                    </View>
                  </View>

                  {/* Image Bottom Title Overlay */}
                  <View style={styles.guideImageBottomOverlay}>
                    <Text style={styles.guideImageTitle} numberOfLines={2}>
                      {guide.title}
                    </Text>
                  </View>
                </View>

                {/* Card Body */}
                <View style={styles.guideBody}>
                  {/* Description / Introduction */}
                  {contentText ? (
                    <Text style={[styles.guideSummary, { color: colors.textSecondary }]}>
                      {contentText}
                    </Text>
                  ) : null}

                  {/* Step-by-step Action Checklist with Visual Icons */}
                  {stepsList.length > 0 && (
                    <View style={[styles.checklistBox, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                      <Text style={[styles.checklistHeader, { color: colors.text }]}>
                        {language === 'tl' ? '📋 Mga Hakbang at Aksyon na Dapat Gawin:' : '📋 Key Action Steps to Take:'}
                      </Text>
                      {stepsList.map((item: string, idx: number) => {
                        const stepIcon = getStepActionIcon(item);
                        return (
                          <View key={idx} style={styles.checkItem}>
                            <View style={[styles.checkIconWrap, { backgroundColor: `${stepIcon.color}15`, borderColor: `${stepIcon.color}35` }]}>
                              <Ionicons name={stepIcon.icon} size={15} color={stepIcon.color} />
                            </View>
                            <Text style={[styles.checkText, { color: colors.text }]}>{item}</Text>
                          </View>
                        );
                      })}
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
              </View>
            );
          })
        )}
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
    borderRadius: 16,
    borderWidth: 0,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyTitle: { fontSize: 17, fontWeight: '900', marginTop: 12, marginBottom: 4 },
  emptySub: { fontSize: 13, textAlign: 'center' },
  guideCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  guideImageContainer: {
    width: '100%',
    height: 155,
    position: 'relative',
    backgroundColor: '#1e293b',
  },
  guideBannerImage: {
    width: '100%',
    height: '100%',
  },
  guideImageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  guideImageTopRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hazardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hazardPillText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  phasePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  phasePillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  guideImageBottomOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  guideImageTitle: {
    color: '#ffffff',
    fontSize: 16.5,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  guideBody: {
    padding: 16,
  },
  guideSummary: { fontSize: 13.5, lineHeight: 20, marginBottom: 12 },
  checklistBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  checkItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  checkIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkText: { fontSize: 13, flex: 1, lineHeight: 19 },
  kitBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  tipsBox: {
    borderRadius: 12,
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
  },
});
