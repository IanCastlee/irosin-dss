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

  const urgentReports = reports
    .filter(r => r.status === 'PENDING' || r.status === 'UNDER_CLEARING')
    .slice(0, 4);

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
            {pendingReportsCount > 0 && (
              <View style={styles.statSubBadge}>
                <Text style={styles.statSubBadgeText}>{pendingReportsCount} Bago</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Evacuation Centers */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => onNavigateTab('evacuation')}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="business" size={22} color="#10b981" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>{evacuationCenters.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Evacuation Centers' : 'Evac Centers'}
            </Text>
            <View style={[styles.statSubBadge, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <Text style={[styles.statSubBadgeText, { color: '#10b981' }]}>{openEvacCount} Bukas</Text>
            </View>
          </TouchableOpacity>

          {/* Under Clearing Reports */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => onNavigateTab('reports')}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="construct" size={22} color="#f59e0b" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>{clearingReportsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Inaayos / Clearing' : 'Under Clearing'}
            </Text>
          </TouchableOpacity>

          {/* Unread Chat Messages */}
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={onOpenChat}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(2, 132, 199, 0.15)' }]}>
              <Ionicons name="chatbubbles" size={22} color="#0284c7" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>{unreadChatCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Mga Mensahe' : 'Chat Messages'}
            </Text>
            {unreadChatCount > 0 && (
              <View style={[styles.statSubBadge, { backgroundColor: '#ef4444' }]}>
                <Text style={[styles.statSubBadgeText, { color: '#ffffff' }]}>{unreadChatCount} Unread</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── 3. Urgent Field Incidents Preview ── */}
      <View style={styles.sectionHeader}>
        <View style={{ gap: 2 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {language === 'tl' ? 'Mga Nangangailangang Aksyon' : 'Urgent Field Actions'}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            {language === 'tl' ? 'Pinakabagong ulat na nangangailangan ng tugon' : 'Pending incidents needing immediate response'}
          </Text>
        </View>

        <TouchableOpacity onPress={() => onNavigateTab('reports')} activeOpacity={0.7}>
          <Text style={[styles.seeAllText, { color: colors.primaryLight }]}>
            {language === 'tl' ? 'Tingnan Lahat' : 'See All'} ({reports.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={[styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <ActivityIndicator size="small" color={colors.primaryLight} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            {language === 'tl' ? 'Ikinakarga ang mga insidente...' : 'Loading incidents...'}
          </Text>
        </View>
      ) : urgentReports.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="checkmark-circle-outline" size={40} color="#10b981" />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {language === 'tl' ? 'Lahat ay Maayos at Ligtas' : 'All Clear in the Field'}
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            {language === 'tl'
              ? 'Walang mga pending o hindi pa naaaksyunang ulat sa kasalukuyan.'
              : 'No pending emergency incidents requiring immediate action.'}
          </Text>
        </View>
      ) : (
        urgentReports.map(item => (
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
              <View style={[styles.urgentStatusPill, { backgroundColor: item.status === 'PENDING' ? '#ef4444' : '#f59e0b' }]}>
                <Text style={styles.urgentStatusText}>
                  {item.status === 'PENDING' ? 'BAGO' : 'CLEARING'}
                </Text>
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
        ))
      )}
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
