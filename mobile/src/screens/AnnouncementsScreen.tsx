import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Dimensions,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Api } from '../services/api';
import { UnreadTracker } from '../services/unreadTracker';
import { OfflineBanner } from '../components/OfflineBanner';
import { LoadingScreen } from '../components/LoadingScreen';
import { OfflineStorage } from '../services/offlineStorage';
import { usePreferences } from '../context/PreferencesContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface AnnouncementItem {
  id: string;
  title: string;
  category: string;
  content: string;
  summary?: string;
  affectedBarangays: string[];
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  imageUrl?: string;
  status: 'ACTIVE' | 'SCHEDULED' | 'ARCHIVED';
  issuedBy?: string;
  notedCount?: number;
  what?: string;
  when?: string;
  where?: string;
  who?: string;
  why?: string;
  how?: string;
  createdAt: string;
}

interface FiveWOneH {
  what?: string;
  when?: string;
  where?: string;
  who?: string;
  why?: string;
  description?: string;
}

export function parse5W1H(item: AnnouncementItem): FiveWOneH | null {
  const explicit: FiveWOneH = {
    what: item.what,
    when: item.when || (item.eventDate ? `${item.eventDate}${item.startTime ? ` - ${item.startTime}` : ''}` : undefined),
    where: item.where || (item.affectedBarangays?.length ? item.affectedBarangays.join(', ') : undefined),
    who: item.who,
    why: item.why,
    description: (item as any).description || item.how,
  };

  const text = item.content || '';
  const regex = /(?:^|\n)\s*(what|ano|when|kailan|where|saan|who|sino|why|bakit|how|paano|description|caption|paalala|tagubilin)\s*:\s*([^\n]+(?:\n(?!\s*(?:what|ano|when|kailan|where|saan|who|sino|why|bakit|how|paano|description|caption|paalala|tagubilin)\s*:)[^\n]+)*)/gi;

  const parsed: Record<string, string> = {};
  let match;
  let hasAny = false;

  while ((match = regex.exec(text)) !== null) {
    const key = match[1].toLowerCase();
    const val = match[2].trim();
    if (val) {
      hasAny = true;
      if (key === 'what' || key === 'ano') parsed.what = val;
      else if (key === 'when' || key === 'kailan') parsed.when = val;
      else if (key === 'where' || key === 'saan') parsed.where = val;
      else if (key === 'who' || key === 'sino') parsed.who = val;
      else if (key === 'why' || key === 'bakit') parsed.why = val;
      else if (key === 'how' || key === 'paano' || key === 'description' || key === 'caption' || key === 'paalala' || key === 'tagubilin') {
        parsed.description = val;
      }
    }
  }

  // If description not matched by key, check for freeform trailing paragraphs
  if (!parsed.description && text) {
    const lines = text.split('\n');
    const extraLines: string[] = [];
    for (const l of lines) {
      if (!/^\s*(what|ano|when|kailan|where|saan|who|sino|why|bakit)\s*:/i.test(l)) {
        if (l.trim()) extraLines.push(l.trim());
      }
    }
    if (extraLines.length > 0) {
      parsed.description = extraLines.join('\n');
    }
  }

  if (explicit.what || explicit.who || explicit.why || explicit.description) {
    return {
      what: explicit.what || parsed.what,
      when: explicit.when || parsed.when,
      where: explicit.where || parsed.where,
      who: explicit.who || parsed.who,
      why: explicit.why || parsed.why,
      description: explicit.description || parsed.description,
    };
  }

  if (hasAny && (parsed.what || parsed.where || parsed.who || parsed.why || parsed.description)) {
    return parsed;
  }

  return null;
}

export const AnnouncementsScreen = ({ navigation }: any) => {
  const { colors, language, theme, t } = usePreferences();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [notedMap, setNotedMap] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    OfflineStorage.getCache<AnnouncementItem[]>('ANNOUNCEMENTS').then(cached => {
      if (cached && cached.length > 0) {
        setAnnouncements(cached);
        setLoading(false);
      }
    });

    loadData();
    loadNotedStatus();

    const sub = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      if (data?.type === 'ANNOUNCEMENT_CREATED') {
        loadData();
      }
    });

    const unsub = UnreadTracker.subscribe(() => {
      UnreadTracker.getViewedIds('power').then(setViewedIds);
    });

    return () => {
      sub.remove();
      unsub();
    };
  }, []);

  const loadNotedStatus = async () => {
    try {
      const val = await AsyncStorage.getItem('@user_noted_announcements');
      if (val) {
        setNotedMap(JSON.parse(val));
      }
    } catch {}
  };

  const handleToggleNoted = async (item: AnnouncementItem) => {
    if (notedMap[item.id]) {
      Alert.alert(
        language === 'tl' ? 'Na-Noted Mo Na 👍' : 'Already Noted 👍',
        language === 'tl' ? 'Nai-record na ang iyong pag-acknowledge sa balitang ito.' : 'You have already acknowledged this announcement.'
      );
      return;
    }

    try {
      const nextMap = { ...notedMap, [item.id]: true };
      setNotedMap(nextMap);
      await AsyncStorage.setItem('@user_noted_announcements', JSON.stringify(nextMap));

      setAnnouncements(prev =>
        prev.map(a => (a.id === item.id ? { ...a, notedCount: (a.notedCount || 0) + 1 } : a))
      );

      Api.toggleAnnouncementNoted(item.id).catch(() => {});
    } catch (e) {
      console.warn('[Announcements] Error toggling noted:', e);
    }
  };

  const loadData = async () => {
    try {
      const [res, viewed] = await Promise.all([
        Api.getAnnouncements(),
        UnreadTracker.getViewedIds('power')
      ]);

      const items = res.data || [];
      setIsOffline(res.isOffline);
      setViewedIds(viewed);

      if (items.length > 0) {
        setAnnouncements(items);
        OfflineStorage.saveCache('ANNOUNCEMENTS', items).catch(() => {});
        setTimeout(() => {
          const ids = items.map((i: any) => i.id);
          UnreadTracker.markAllViewed('power', ids);
          setViewedIds(new Set([...Array.from(viewed), ...ids]));
        }, 1500);
      } else if (!res.isOffline) {
        // Server confirmed 0 — wipe display & stale cache
        setAnnouncements([]);
        OfflineStorage.saveCache('ANNOUNCEMENTS', []).catch(() => {});
      }
    } catch (e) {
      console.warn('[Announcements] Failed to fetch:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filtered = activeCategory === 'ALL'
    ? announcements
    : announcements.filter(a => (a.category || '').toLowerCase() === activeCategory.toLowerCase());

  const categories = [
    { key: 'ALL', label: t('filterAll') },
    { key: 'Walang Pasok', label: t('filterNoClasses') },
    { key: 'Kuryente', label: t('filterPower') },
    { key: 'Panahon', label: t('filterWeather') },
    { key: 'Ayuda at Relief', label: t('filterRelief') },
    { key: 'Pangkalahatan', label: t('filterGeneral') }
  ];

  if (loading && !refreshing) {
    return <LoadingScreen message="Kinukuha ang mga Opisyal na Balita..." subMessage="Loading bulletins, weather, no-class notices & relief advisories..." />;
  }

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

      {/* Header */}
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
            backgroundColor: "rgba(99, 102, 241, 0.12)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(99, 102, 241, 0.25)",
          }}
        >
          <Ionicons name="newspaper" size={22} color="#6366f1" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t('announcementsTitle')}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>{t('announcementsSub')}</Text>
        </View>
      </View>

      {/* Category Pills Bar */}
      <View style={[styles.filterBarWrapper, { backgroundColor: "transparent", borderBottomWidth: 0 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {categories.map(cat => {
            const isActive = activeCategory === cat.key;
            const count = cat.key === 'ALL' ? announcements.length : announcements.filter(a => (a.category || '').toLowerCase() === cat.key.toLowerCase()).length;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.filterPill,
                  { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                  isActive && [styles.filterPillActive, { backgroundColor: colors.primary, borderColor: colors.primaryLight }]
                ]}
                onPress={() => setActiveCategory(cat.key)}
              >
                <Text style={[styles.filterPillText, { color: colors.textSecondary }, isActive && styles.filterPillTextActive]}>
                  {cat.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : colors.cardBorder }]}>
                    <Text style={[styles.countBadgeText, { color: isActive ? '#ffffff' : colors.textMuted }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Feed List */}
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
      >
        {filtered.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="notifications-off-outline" size={36} color={colors.primaryLight} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {language === 'tl' ? 'Walang Anunsyo sa Kategoryang Ito' : 'No Bulletins in This Category'}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Manatiling nakatutok para sa mga pinakabagong ulat mula sa MDRRMO.' : 'Stay tuned for official updates from MDRRMO Irosin.'}
            </Text>
          </View>
        ) : (
          filtered.map(item => {
            const isNoted = !!notedMap[item.id];
            const isUnread = !viewedIds.has(item.id);

            return (
              <View key={item.id} style={[styles.card, { backgroundColor: colors.card }]}>
                {/* Category Badge & BAGO Pill */}
                <View style={styles.cardTopRow}>
                  <View style={[styles.categoryBadge, { backgroundColor: colors.primaryBg }]}>
                    <Ionicons name="megaphone-outline" size={12} color={colors.primaryLight} style={{ marginRight: 4 }} />
                    <Text style={[styles.categoryBadgeText, { color: colors.primaryLight }]}>{item.category || 'Opisyal na Anunsyo'}</Text>
                  </View>

                  {isUnread && (
                    <View style={[styles.unreadBadge, { backgroundColor: colors.danger }]}>
                      <View style={styles.pulsingDot} />
                      <Text style={styles.unreadBadgeText}>BAGO</Text>
                    </View>
                  )}
                </View>

                {/* Photo Banner if attached */}
                {item.imageUrl ? (
                  <TouchableOpacity onPress={() => setPreviewImage(item.imageUrl || null)}>
                    <Image source={{ uri: item.imageUrl }} style={styles.bannerImg} resizeMode="cover" />
                    <View style={styles.zoomPill}>
                      <Ionicons name="scan-outline" size={12} color="#ffffff" />
                      <Text style={styles.zoomText}>Tap to zoom</Text>
                    </View>
                  </TouchableOpacity>
                ) : null}

                {/* Title */}
                <Text style={[styles.advisoryTitle, { color: colors.text }]}>{item.title}</Text>

                {/* 5W Structured View + Description / Caption below */}
                {(() => {
                  const fiveW = parse5W1H(item);
                  if (fiveW) {
                    return (
                      <View style={{ marginBottom: 12 }}>
                        {/* 5W Summary Box */}
                        <View style={[styles.fiveWContainer, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderColor: colors.cardBorder, marginBottom: fiveW.description ? 10 : 0 }]}>
                          {fiveW.what && (
                            <View style={styles.fiveWRow}>
                              <View style={[styles.fiveWBadge, { backgroundColor: 'rgba(2, 132, 199, 0.12)' }]}>
                                <Ionicons name="help-circle" size={13} color="#0284c7" />
                                <Text style={[styles.fiveWLabel, { color: '#0284c7' }]}>WHAT</Text>
                              </View>
                              <Text style={[styles.fiveWValue, { color: colors.text, fontWeight: '800' }]}>{fiveW.what}</Text>
                            </View>
                          )}

                          {fiveW.when && (
                            <View style={styles.fiveWRow}>
                              <View style={[styles.fiveWBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                                <Ionicons name="calendar" size={13} color="#f59e0b" />
                                <Text style={[styles.fiveWLabel, { color: '#f59e0b' }]}>WHEN</Text>
                              </View>
                              <Text style={[styles.fiveWValue, { color: colors.text, fontWeight: '700' }]}>{fiveW.when}</Text>
                            </View>
                          )}

                          {fiveW.where && (
                            <View style={styles.fiveWRow}>
                              <View style={[styles.fiveWBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                                <Ionicons name="location" size={13} color="#10b981" />
                                <Text style={[styles.fiveWLabel, { color: '#10b981' }]}>WHERE</Text>
                              </View>
                              <Text style={[styles.fiveWValue, { color: colors.text, fontWeight: '700' }]}>{fiveW.where}</Text>
                            </View>
                          )}

                          {fiveW.who && (
                            <View style={styles.fiveWRow}>
                              <View style={[styles.fiveWBadge, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                                <Ionicons name="people" size={13} color="#8b5cf6" />
                                <Text style={[styles.fiveWLabel, { color: '#8b5cf6' }]}>WHO</Text>
                              </View>
                              <Text style={[styles.fiveWValue, { color: colors.text }]}>{fiveW.who}</Text>
                            </View>
                          )}

                          {fiveW.why && (
                            <View style={styles.fiveWRow}>
                              <View style={[styles.fiveWBadge, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                                <Ionicons name="bulb" size={13} color="#ef4444" />
                                <Text style={[styles.fiveWLabel, { color: '#ef4444' }]}>WHY</Text>
                              </View>
                              <Text style={[styles.fiveWValue, { color: colors.textSecondary }]}>{fiveW.why}</Text>
                            </View>
                          )}
                        </View>

                        {/* Description / Caption / Tagubilin at Bottom */}
                        {fiveW.description && (
                          <View style={{ paddingHorizontal: 2, paddingTop: 2 }}>
                            <Text style={[styles.contentText, { color: colors.text, lineHeight: 21, marginBottom: 0 }]}>
                              {fiveW.description}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  }
                  return (
                    <>
                      {/* Schedule Info if present */}
                      {(item.eventDate || item.startTime) && (
                        <View style={[styles.scheduleBox, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(2, 132, 199, 0.05)' }]}>
                          {item.eventDate && (
                            <View style={styles.scheduleRow}>
                              <Ionicons name="calendar-outline" size={14} color={colors.primaryLight} />
                              <Text style={[styles.scheduleText, { color: colors.text }]}>
                                <Text style={{ fontWeight: '800', color: colors.primaryLight }}>Petsa: </Text>
                                {new Date(item.eventDate).toLocaleDateString(undefined, {
                                  weekday: 'long',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </Text>
                            </View>
                          )}
                          {item.startTime && (
                            <View style={[styles.scheduleRow, { marginTop: 4 }]}>
                              <Ionicons name="time-outline" size={14} color={colors.primaryLight} />
                              <Text style={[styles.scheduleText, { color: colors.text }]}>
                                <Text style={{ fontWeight: '800', color: colors.primaryLight }}>Oras: </Text>
                                {item.startTime} {item.endTime ? `- ${item.endTime}` : ''}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Affected Barangays */}
                      {item.affectedBarangays && item.affectedBarangays.length > 0 && (
                        <View style={[styles.barangayBox, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(2, 132, 199, 0.05)' }]}>
                          <Ionicons name="location-outline" size={14} color={colors.primaryLight} />
                          <Text style={[styles.barangayText, { color: colors.text }]}>
                            <Text style={{ fontWeight: '800', color: colors.primaryLight }}>Apektado: </Text>
                            {item.affectedBarangays.join(' • ')}
                          </Text>
                        </View>
                      )}

                      <Text style={[styles.contentText, { color: colors.textSecondary }]}>{item.content}</Text>
                    </>
                  );
                })()}

                {/* Card Footer: Timestamp & Borderless Solid Noted Button */}
                <View style={[styles.cardFooter, { borderTopColor: colors.cardBorder }]}>
                  <Text style={[styles.footerTimestamp, { color: colors.textMuted }]}>
                    {item.issuedBy || 'MDRRMO Irosin'} • {new Date(item.createdAt).toLocaleDateString()}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.notedBtn,
                      {
                        backgroundColor: isNoted ? colors.primaryBg : 'transparent',
                        borderWidth: 0,
                      },
                    ]}
                    onPress={() => handleToggleNoted(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isNoted ? "thumbs-up" : "thumbs-up-outline"}
                      size={16}
                      color={isNoted ? colors.primaryLight : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.notedBtnText,
                        {
                          color: isNoted ? colors.primaryLight : colors.textMuted,
                          fontWeight: isNoted ? '900' : '700',
                        },
                      ]}
                    >
                      {isNoted ? `${t('notedBtn')} (${item.notedCount || 1})` : `Noted (${item.notedCount || 0})`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Fullscreen Photo Lightbox Modal */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.closeModalBtn} onPress={() => setPreviewImage(null)}>
            <Ionicons name="close-outline" size={28} color="#ffffff" />
          </TouchableOpacity>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.fullscreenImg}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1
  },
  title: { fontSize: 18, fontWeight: '900' },
  sub: { fontSize: 11, marginTop: 2 },

  filterBarWrapper: { borderBottomWidth: 1 },
  filterScroll: { paddingHorizontal: 12, paddingVertical: 10 },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1
  },
  filterPillActive: {},
  filterPillText: { fontSize: 12, fontWeight: '700' },
  filterPillTextActive: { color: '#ffffff', fontWeight: '800' },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10
  },
  countBadgeText: { fontSize: 10, fontWeight: '800' },

  container: { flex: 1, padding: 14 },
  card: {
    borderRadius: 12,
    borderWidth: 0,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0
  },
  categoryBadgeText: { fontSize: 12, fontWeight: '800' },

  unreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  pulsingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff' },
  unreadBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },

  bannerImg: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 0
  },
  zoomPill: {
    position: 'absolute',
    bottom: 20,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  zoomText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },

  advisoryTitle: { fontSize: 17, fontWeight: '900', marginBottom: 8 },

  scheduleBox: {
    borderRadius: 12,
    borderWidth: 0,
    padding: 12,
    marginBottom: 10
  },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scheduleText: { fontSize: 13 },

  barangayBox: {
    borderRadius: 12,
    borderWidth: 0,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 10
  },
  barangayText: { fontSize: 13, flex: 1, lineHeight: 18 },

  // 5W1H Container & Rows
  fiveWContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  fiveWRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  fiveWBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 80,
  },
  fiveWLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  fiveWValue: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  contentText: { fontSize: 14, lineHeight: 21, marginBottom: 12 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 8
  },
  footerTimestamp: { fontSize: 12, flex: 1, flexShrink: 1 },

  notedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 0,
  },
  notedBtnInactive: {},
  notedBtnActive: {},
  notedBtnText: { fontSize: 12, fontWeight: '700' },

  emptyCard: {
    borderRadius: 12,
    borderWidth: 0,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeModalBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20
  },
  fullscreenImg: {
    width: width * 0.95,
    height: height * 0.75
  }
});
