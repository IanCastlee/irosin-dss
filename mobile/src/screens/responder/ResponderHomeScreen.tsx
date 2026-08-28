import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePreferences } from '../../context/PreferencesContext';
import { OfflineBanner } from '../../components/OfflineBanner';

const { width } = Dimensions.get('window');

interface ResponderHomeScreenProps {
  responderProfile: any;
  reports: any[];
  evacuationCenters: any[];
  unreadChatCount: number;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onNavigateTab: (tab: 'home' | 'evacuation' | 'reports') => void;
  onOpenChat: () => void;
  onOpenMap: (targetIncident?: any) => void;
  onTakeAction: (report: any) => void;
  onNavigateToLocation: (report: any) => void;
}

export const ResponderHomeScreen: React.FC<ResponderHomeScreenProps> = ({
  responderProfile,
  reports,
  evacuationCenters,
  unreadChatCount,
  loading,
  refreshing,
  onRefresh,
  onNavigateTab,
  onOpenChat,
  onOpenMap,
  onTakeAction,
  onNavigateToLocation,
}) => {
  const { colors, theme, language } = usePreferences();

  // Compute live KPIs
  const activeReportsCount = reports.filter(r => r.status === 'PENDING' || r.status === 'UNDER_CLEARING' || r.status === 'VERIFIED').length;
  const pendingReportsCount = reports.filter(r => r.status === 'PENDING').length;
  const clearingReportsCount = reports.filter(r => r.status === 'UNDER_CLEARING').length;
  const openEvacCount = evacuationCenters.filter(c => c.status === 'OPEN' || c.status === 'STANDBY').length;

  const urgentReports = reports.filter(
    r => r.status === 'PENDING' || r.status === 'VERIFIED' || r.status === 'UNDER_CLEARING'
  );

  const [previewImage, setPreviewImage] = React.useState<string | null>(null);

  const isDark = theme === 'dark';
  const isAllLocations = responderProfile?.isMunicipalWide || responderProfile?.jurisdiction === 'ALL_BARANGAYS';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
      showsVerticalScrollIndicator={false}
    >
      <OfflineBanner />

      {/* ── 1. Hero Responder Profile Card ── */}
      <LinearGradient
        colors={isDark ? ['#0f172a', '#1e293b'] : ['#0284c7', '#0369a1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTop}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>
              {(responderProfile?.fullName || 'R')
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </Text>
            <View style={styles.onlineStatusDot} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroRoleBadge}>
                <Text style={styles.heroRoleText}>
                  {responderProfile?.roleTitle || (responderProfile?.role === 'MDRRMO_ADMIN' ? 'MDRRMO Admin' : 'Barangay Responder')}
                </Text>
              </View>
              <View style={styles.heroActivePill}>
                <View style={styles.heroGreenDot} />
                <Text style={styles.heroActiveText}>AKTIBO</Text>
              </View>
            </View>
            <Text style={styles.heroName} numberOfLines={1}>
              {responderProfile?.fullName || 'Responder'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons
                name={isAllLocations ? 'globe-outline' : 'location-sharp'}
                size={14}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.heroBarangay} numberOfLines={1}>
                {isAllLocations ? 'All Locations' : (responderProfile?.barangayName || 'Walang Nakatalagang Barangay')}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ── 2. Live Summary Stats Cards ── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {language === 'tl' ? 'Pangkalahatang Buod' : 'Operations Overview'}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
          {language === 'tl' ? 'Real-time na datos ng operasyon' : 'Real-time operations summary'}
        </Text>
      </View>

      {loading ? (
        <View style={[styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <ActivityIndicator size="small" color={colors.primaryLight} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            {language === 'tl' ? 'Kinukuha ang datos...' : 'Loading summary...'}
          </Text>
        </View>
      ) : (
        <View style={styles.statsGrid}>
          {/* Active Disaster Reports */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => onNavigateTab('reports')}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Ionicons name="warning" size={22} color="#ef4444" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>{activeReportsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Aktibong Ulat' : 'Active Incidents'}
            </Text>
          </TouchableOpacity>

          {/* Pending Verification */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => onNavigateTab('reports')}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="time" size={22} color="#f59e0b" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>{pendingReportsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Bago / Pending' : 'Pending Review'}
            </Text>
          </TouchableOpacity>

          {/* Under Clearing Ops */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => onNavigateTab('reports')}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(2, 132, 199, 0.15)' }]}>
              <Ionicons name="construct" size={22} color="#0284c7" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>{clearingReportsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Inaayos / Clearing' : 'Under Clearing'}
            </Text>
          </TouchableOpacity>

          {/* Open Evacuation Centers */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => onNavigateTab('evacuation')}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="home" size={22} color="#10b981" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>{openEvacCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Bukas na Shelters' : 'Open Shelters'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 3. Urgent Field Actions Section ── */}
      <View style={styles.urgentSectionHeader}>
        <View style={styles.urgentTitleRow}>
          <View style={styles.urgentIconCircle}>
            <Ionicons name="flash" size={15} color="#ef4444" />
          </View>
          <Text style={[styles.urgentHeaderTitle, { color: colors.text }]}>
            {language === 'tl' ? 'Urgent Field Actions' : 'Immediate Response Needed'}
          </Text>
        </View>
        <Text style={[styles.urgentHeaderSubtitle, { color: colors.textSecondary }]}>
          {language === 'tl'
            ? 'Mga ulat (Pending, Verified, Under Clearing) na nangangailangan ng agarang aksyon'
            : 'Incidents requiring immediate field verification or clearing operations'}
        </Text>
      </View>

      {urgentReports.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="checkmark-circle-outline" size={40} color="#10b981" />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {language === 'tl' ? 'Lahat ay Maayos at Ligtas' : 'All Clear in the Field'}
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            {language === 'tl'
              ? 'Walang mga pending, verified, o under clearing na ulat sa kasalukuyan.'
              : 'No pending emergency incidents requiring immediate action.'}
          </Text>
        </View>
      ) : (
        urgentReports.map(item => {
          // Unified photo extraction with exact stage tags
          const photoItems: { uri: string; stage: string; label: string; badgeBg: string }[] = [];
          const allUris: string[] = [];
          const addUri = (u?: string) => {
            if (u && typeof u === 'string' && u.trim() && !allUris.includes(u.trim())) {
              allUris.push(u.trim());
            }
          };

          addUri(item.imageUrl);
          addUri(item.photoUrl);
          if (Array.isArray(item.photos)) item.photos.forEach(addUri);
          if (Array.isArray(item.photoItems)) item.photoItems.forEach((pi: any) => addUri(pi?.uri));

          allUris.forEach((uri, idx) => {
            const meta = Array.isArray(item.photoItems) ? item.photoItems.find((pi: any) => pi?.uri === uri) : null;
            let stage = meta?.stage;
            if (!stage) {
              if (item.status === 'PENDING') stage = 'PENDING';
              else if (idx === 0) stage = 'INCIDENT';
              else if (item.status === 'UNDER_CLEARING') stage = 'UNDER_CLEARING';
              else if (item.status === 'RESOLVED') stage = 'RESOLVED';
              else stage = 'INCIDENT';
            } else if (stage === 'PENDING' && item.status !== 'PENDING') {
              stage = 'INCIDENT';
            }

            let label = '🚨 INSIDENTE';
            let badgeBg = '#ea580c';
            if (stage === 'PENDING') {
              label = '⏳ PENDING';
              badgeBg = '#f59e0b';
            } else if (stage === 'UNDER_CLEARING') {
              label = '🚧 CLEARING';
              badgeBg = '#0284c7';
            } else if (stage === 'RESOLVED') {
              label = language === 'tl' ? '✅ LIGTAS NA' : '✅ RESOLVED';
              badgeBg = '#10b981';
            }

            photoItems.push({ uri, stage, label, badgeBg });
          });

          const stageRank: Record<string, number> = { RESOLVED: 3, UNDER_CLEARING: 2, INCIDENT: 1, PENDING: 0 };
          photoItems.sort((a, b) => (stageRank[b.stage] || 0) - (stageRank[a.stage] || 0));

          const statusColor = item.status === 'PENDING' ? '#ef4444' : item.status === 'VERIFIED' ? '#0284c7' : '#f59e0b';
          const statusText = item.status === 'PENDING' ? 'PENDING' : item.status === 'VERIFIED' ? 'VERIFIED' : 'CLEARING';

          return (
            <View
              key={item.id}
              style={[styles.urgentCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <View style={styles.urgentCardTop}>
                <View style={[styles.urgentTypeBadge, { backgroundColor: colors.primaryBg }]}>
                  <Ionicons name="alert-circle" size={14} color={colors.primaryLight} />
                  <Text style={[styles.urgentTypeText, { color: colors.primaryLight }]}>
                    {item.hazardType || item.type || 'Insidente'}
                  </Text>
                </View>
                <View style={[styles.urgentStatusPill, { backgroundColor: statusColor }]}>
                  <Text style={styles.urgentStatusText}>{statusText}</Text>
                </View>
              </View>

              <Text style={[styles.urgentTitle, { color: colors.text }]} numberOfLines={2}>
                {item.title || item.locationDescription || 'Ulat ng Sakuna'}
              </Text>

              <View style={styles.urgentLocRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.urgentLocText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.barangayName || item.streetLocation || item.locationDescription || 'Lokasyon ng Insidente'}
                </Text>
              </View>

              {/* Complete Photos Gallery with Stage Status Badges */}
              {photoItems.length > 0 && (
                <View style={{ marginVertical: 4 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {photoItems.map((p, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setPreviewImage(p.uri)}
                        activeOpacity={0.8}
                        style={{ marginRight: 8, position: 'relative', borderRadius: 8, overflow: 'hidden' }}
                      >
                        <Image source={{ uri: p.uri }} style={{ width: 88, height: 62, borderRadius: 8 }} resizeMode="cover" />
                        <View style={{ position: 'absolute', top: 3, left: 3, backgroundColor: p.badgeBg, paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4 }}>
                          <Text style={{ color: '#ffffff', fontSize: 8.5, fontWeight: '900' }}>{p.label}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.urgentActionRow}>
                {/* Single Clean GeoMap Button */}
                <TouchableOpacity
                  style={[styles.urgentNavBtn, { borderColor: colors.cardBorder, backgroundColor: colors.bg }]}
                  onPress={() => onOpenMap(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="map-outline" size={15} color={colors.primaryLight} />
                  <Text style={[styles.urgentNavText, { color: colors.primaryLight }]}>GeoMap</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.urgentTakeActionBtn, { backgroundColor: colors.primaryLight }]}
                  onPress={() => onTakeAction(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash" size={15} color="#ffffff" />
                  <Text style={styles.urgentTakeActionText}>Take Action</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Image Preview Modal */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 14 }} activeOpacity={1} onPress={() => setPreviewImage(null)}>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={{ width: '100%', height: '80%', borderRadius: 16 }} resizeMode="contain" />
          )}
          <Text style={{ color: '#ffffff', fontSize: 12, marginTop: 12, fontWeight: '700' }}>Pindutin kahit saan upang isara</Text>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 16,
  },

  // Hero Card
  heroCard: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    position: 'relative',
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  onlineStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroRoleBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  heroRoleText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  heroGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  heroActiveText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '900',
  },
  heroName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  heroBarangay: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
    marginBottom: -4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  urgentSectionHeader: {
    marginTop: 10,
    marginBottom: 2,
    gap: 3,
  },
  urgentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  urgentIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  urgentHeaderSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 16,
    paddingLeft: 33,
  },
  seeAllText: {
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: (width - 38) / 2,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    position: 'relative',
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statSubBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statSubBadgeText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '800',
  },

  // Urgent cards
  urgentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  urgentCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urgentTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  urgentTypeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  urgentStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  urgentStatusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  urgentTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  urgentLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  urgentLocText: {
    fontSize: 12,
    fontWeight: '500',
  },
  urgentActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  urgentNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  urgentNavText: {
    fontSize: 12,
    fontWeight: '700',
  },
  urgentTakeActionBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  urgentTakeActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },

  // Loading & Empty box
  loadingBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
