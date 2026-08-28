import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  Dimensions,
  Platform,
  Linking,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePreferences } from '../context/PreferencesContext';
import { Api } from '../services/api';
import { RealtimeSocket } from '../services/socketService';
import { soundService } from '../services/soundService';

// Sub-Screens
import { ResponderHomeScreen } from './responder/ResponderHomeScreen';
import { ResponderEvacuationScreen } from './responder/ResponderEvacuationScreen';
import { ResponderReportsScreen } from './responder/ResponderReportsScreen';

export const ResponderPortalScreen = ({ navigation }: any) => {
  const { colors, theme, language } = usePreferences();
  const insets = useSafeAreaInsets();

  // Active Tab: 'home' | 'evacuation' | 'reports'
  const [activeTab, setActiveTab] = useState<'home' | 'evacuation' | 'reports'>('home');

  // Auth & Profile State
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [responderProfile, setResponderProfile] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Login Modal State (if not authenticated)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Shared Data State
  const [reports, setReports] = useState<any[]>([]);
  const [evacuationCenters, setEvacuationCenters] = useState<any[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Take action modal triggered from Home or Reports
  const [selectedReportForAction, setSelectedReportForAction] = useState<any | null>(null);

  // 1. Intercept Android Hardware / Gesture Back Action (Require explicit Logout)
  useEffect(() => {
    const onBackPress = () => {
      // If inside sub-tab, go back to Home tab first
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      // If on Home tab and logged in, require explicit logout to exit
      if (responderProfile) {
        handleLogout();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [activeTab, responderProfile]);

  // 2. Check Auth & Load Initial Data
  useEffect(() => {
    initPortal();
  }, []);

  // 3. Real-Time WebSocket Listeners
  useEffect(() => {
    const unsubNewReport = RealtimeSocket.on('new_disaster_report', (data: any) => {
      console.log('[ResponderPortal] ⚡ Live event: new_disaster_report');
      soundService.playEmergencyAlertSound().catch(() => {});
      loadReports();
    });

    const unsubStatusReport = RealtimeSocket.on('report_status_updated', () => {
      console.log('[ResponderPortal] ⚡ Live event: report_status_updated');
      loadReports();
    });

    const unsubNewCenter = RealtimeSocket.on('EVACUATION_CENTER_CREATED', (center: any) => {
      if (center) {
        setEvacuationCenters(prev => {
          if (prev.some(c => c.id === center.id)) return prev;
          return [center, ...prev];
        });
      }
    });

    const unsubUpdateCenter = RealtimeSocket.on('EVACUATION_CENTER_UPDATED', (center: any) => {
      if (center) {
        setEvacuationCenters(prev => prev.map(c => (c.id === center.id ? center : c)));
      }
    });

    const unsubChat = RealtimeSocket.on('chat:new_message', () => {
      setUnreadChatCount(prev => prev + 1);
    });

    // ⚡ Real-Time Jurisdiction Update listener (when Admin changes responder jurisdiction)
    const unsubJurisdiction = RealtimeSocket.on('RESPONDER_JURISDICTION_UPDATED', async (data: any) => {
      if (data && responderProfile && data.userId === responderProfile.id) {
        const updatedProf = {
          ...responderProfile,
          isMunicipalWide: data.isMunicipalWide,
          jurisdiction: data.jurisdiction,
          barangayName: data.barangayName || responderProfile.barangayName,
          barangayId: data.barangayId || responderProfile.barangayId,
        };
        setResponderProfile(updatedProf);
        await AsyncStorage.setItem('@responder_user_session', JSON.stringify(updatedProf));
        loadReports(updatedProf);
        Alert.alert(
          'Na-update ang Hurisdiksyon 🔄',
          data.isMunicipalWide
            ? 'Naka-set ka na ngayon bilang Municipal-Wide Responder (Makikita ang lahat ng barangay).'
            : `Naka-set ka na ngayon para sa "${updatedProf.barangayName || 'iyong barangay'}" lamang.`
        );
      }
    });

    return () => {
      unsubNewReport();
      unsubStatusReport();
      unsubNewCenter();
      unsubUpdateCenter();
      unsubChat();
      unsubJurisdiction();
    };
  }, [responderProfile]);

  // Helper to check if report belongs to responder's assigned jurisdiction
  const isReportInMyJurisdiction = (r: any, profile: any) => {
    if (!profile) return true;
    if (profile.role === 'MDRRMO_ADMIN' || profile.role === 'ADMIN') return true;
    if (profile.isMunicipalWide === true || profile.jurisdiction === 'ALL_BARANGAYS' || profile.barangayName === 'ALL_BARANGAYS' || profile.barangayName === 'All Locations') return true;

    // Specific Barangay Only
    const myBrgyId = String(profile.barangayId || '').trim().toLowerCase();
    const myBrgyName = String(profile.barangayName || '')
      .trim()
      .toLowerCase()
      .replace(/^barangay\s+/i, '')
      .replace(/^brgy\.?\s+/i, '');

    const reportBrgyId = String(r.barangayId || '').trim().toLowerCase();
    const reportBrgyName = String(r.barangayName || '')
      .trim()
      .toLowerCase()
      .replace(/^barangay\s+/i, '')
      .replace(/^brgy\.?\s+/i, '');

    if (myBrgyId && reportBrgyId && myBrgyId === reportBrgyId) return true;
    if (myBrgyName && reportBrgyName) {
      if (myBrgyName === reportBrgyName) return true;
      if (myBrgyName.includes(reportBrgyName) || reportBrgyName.includes(myBrgyName)) return true;
    }
    return false;
  };

  const initPortal = async () => {
    setIsAuthChecking(true);
    try {
      // 1. GPS Location
      try {
        const { status: locStatus } = await Location.getForegroundPermissionsAsync();
        if (locStatus === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc?.coords) {
            setUserCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          }
        }
      } catch (locErr) {
        console.warn('[ResponderPortal] GPS notice:', locErr);
      }

      // 2. Auth Session & Fetch Fresh Profile from Server
      const pairs = await AsyncStorage.multiGet([
        '@responder_jwt_token',
        '@responder_token',
        '@responder_user_session',
        '@responder_profile',
        '@responder_status_cache',
        '@responder_remembered_credentials',
      ]);
      const token = pairs[0][1] || pairs[1][1] || null;
      const sessionRaw = pairs[2][1] || pairs[3][1] || pairs[4][1] || null;
      const rememberedRaw = pairs[5][1] || null;
      let activeProf: any = null;

      // Load remembered credentials if present
      if (rememberedRaw) {
        try {
          const creds = JSON.parse(rememberedRaw);
          if (creds?.username) {
            setLoginUsername(creds.username);
            if (creds?.password) setLoginPassword(creds.password);
            setRememberMe(true);
          }
        } catch {}
      }

      if (token) setAuthToken(token);

      if (sessionRaw) {
        try {
          activeProf = JSON.parse(sessionRaw);
          setResponderProfile(activeProf);
          if (activeProf?.id) {
            RealtimeSocket.joinUserRoom(activeProf.id);
          }
        } catch {}
      } else {
        // If not logged in, prompt login
        setIsLoginModalOpen(true);
      }

      // Fetch fresh live profile from server to ensure latest jurisdiction setting
      if (token) {
        try {
          const liveProfile = await Api.getResponderProfile(token);
          if (liveProfile && liveProfile.id) {
            activeProf = { ...(activeProf || {}), ...liveProfile };
            setResponderProfile(activeProf);
            await AsyncStorage.setItem('@responder_user_session', JSON.stringify(activeProf));
          }
        } catch {}
      }

      // 3. Load Data in Parallel (filtered by active jurisdiction)
      await Promise.all([loadReports(activeProf, token), loadEvacuationCenters(), loadBarangays()]);
    } catch (err) {
      console.warn('[ResponderPortal] Init error:', err);
    } finally {
      setIsAuthChecking(false);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadReports = async (activeProfile?: any, tokenOverride?: string | null) => {
    try {
      const activeTok = tokenOverride !== undefined ? tokenOverride : authToken;
      const res = await Api.getAllDisasterReports(activeTok);
      if (res?.data) {
        const prof = activeProfile !== undefined ? activeProfile : responderProfile;
        const filtered = res.data.filter((r: any) => isReportInMyJurisdiction(r, prof));
        setReports(filtered);
      }
    } catch (err) {
      console.warn('[ResponderPortal] Load reports notice:', err);
    }
  };

  const loadEvacuationCenters = async () => {
    try {
      const res = await Api.getCenters();
      if (res?.data) {
        setEvacuationCenters(res.data);
      }
    } catch (err) {
      console.warn('[ResponderPortal] Load evac centers notice:', err);
    }
  };

  const loadBarangays = async () => {
    try {
      const res = await Api.getBarangays();
      if (res?.data) {
        setBarangays(res.data);
      }
    } catch (err) {
      console.warn('[ResponderPortal] Load barangays notice:', err);
    }
  };

  const onRefreshAll = async () => {
    setRefreshing(true);
    try {
      let currentProf = responderProfile;
      if (authToken) {
        const liveProfile = await Api.getResponderProfile(authToken);
        if (liveProfile && liveProfile.id) {
          currentProf = { ...(currentProf || {}), ...liveProfile };
          setResponderProfile(currentProf);
          await AsyncStorage.setItem('@responder_user_session', JSON.stringify(currentProf));
        }
      }
      await Promise.all([loadReports(currentProf), loadEvacuationCenters(), loadBarangays()]);
    } finally {
      setRefreshing(false);
    }
  };

  // Login handler
  const handleLoginSubmit = async () => {
    if (!loginUsername.trim() || !loginPassword.trim()) {
      Alert.alert('Kulang na Datos', 'Ilagay ang iyong username at password.');
      return;
    }

    setIsSubmittingLogin(true);
    try {
      const res = await Api.responderLogin({
        username: loginUsername.trim(),
        password: loginPassword.trim(),
      });
      if (res?.success && res?.user) {
        const token = res.token || 'responder-token';
        setAuthToken(token);
        setResponderProfile(res.user);
        await AsyncStorage.setItem('@responder_jwt_token', token);
        await AsyncStorage.setItem('@responder_user_session', JSON.stringify(res.user));

        if (rememberMe) {
          await AsyncStorage.setItem(
            '@responder_remembered_credentials',
            JSON.stringify({ username: loginUsername.trim(), password: loginPassword.trim(), rememberMe: true })
          );
        } else {
          await AsyncStorage.removeItem('@responder_remembered_credentials');
        }

        RealtimeSocket.joinUserRoom(res.user.id);
        setIsLoginModalOpen(false);
        if (!rememberMe) {
          setLoginUsername('');
          setLoginPassword('');
        }
        Alert.alert('Maligayang Pagbabalik!', `Naka-login bilang ${res.user.fullName}`);
      } else {
        throw new Error(res?.error || res?.message || 'Maling username o password.');
      }
    } catch (err: any) {
      Alert.alert('Login Error', err.message || 'Hindi makapag-login. Pakisuri ang iyong credentials.');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  // Close Login Modal and return to public main app
  const handleCancelLogin = () => {
    setIsLoginModalOpen(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  // Logout handler (The ONLY way to exit the portal when logged in)
  const handleLogout = () => {
    Alert.alert(
      language === 'tl' ? 'Mag-logout sa Responders Portal?' : 'Log Out of Responders Portal?',
      language === 'tl'
        ? 'Nais mo bang mag-logout upang lumabas sa Responders Portal at bumalik sa pampublikong app?'
        : 'Do you want to log out to exit the Responders Portal and return to the main app?',
      [
        { text: language === 'tl' ? 'Manatili' : 'Stay', style: 'cancel' },
        {
          text: language === 'tl' ? 'Mag-logout at Lumabas' : 'Log Out & Exit',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['@responder_jwt_token', '@responder_token', '@responder_user_session']);
            setAuthToken(null);
            setResponderProfile(null);
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          },
        },
      ]
    );
  };

  // Navigate to Chat
  const handleOpenChat = () => {
    setUnreadChatCount(0);
    navigation.navigate('ChatList');
  };

  // Navigate to GeoMap (with optional target incident focused)
  const handleOpenMapWithTarget = (targetIncident?: any) => {
    if (targetIncident) {
      navigation.navigate('Map', {
        initialTab: 'MAP',
        targetIncident: {
          latitude: targetIncident.latitude || 12.7042,
          longitude: targetIncident.longitude || 124.0371,
          title: targetIncident.title || targetIncident.hazardType || 'Disaster Report',
          locationDescription: targetIncident.barangayName || targetIncident.streetLocation || targetIncident.locationDescription || '',
        },
        incidentLat: targetIncident.latitude || 12.7042,
        incidentLng: targetIncident.longitude || 124.0371,
        incidentTitle: targetIncident.title || targetIncident.hazardType || 'Disaster Report',
        incidentLocation: targetIncident.barangayName || targetIncident.streetLocation || targetIncident.locationDescription || '',
      });
    } else {
      navigation.navigate('Map');
    }
  };

  // Google Maps directions
  const handleNavigateToIncident = (item: any) => {
    const lat = item.latitude || 12.7042;
    const lng = item.longitude || 124.0371;
    const url = userCoords
      ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords.latitude},${userCoords.longitude}&destination=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Navigation Error', 'Hindi mabuksan ang Google Maps application.');
    });
  };

  // Center created callback
  const handleCenterCreated = (newCenter: any) => {
    setEvacuationCenters(prev => [newCenter, ...prev]);
  };

  // Center updated callback
  const handleCenterUpdated = (updatedCenter: any) => {
    setEvacuationCenters(prev => prev.map(c => (c.id === updatedCenter.id ? updatedCenter : c)));
  };

  // Report updated callback
  const handleReportUpdated = (updatedReport: any) => {
    setReports(prev => prev.map(r => (r.id === updatedReport.id ? updatedReport : r)));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
      {/* ── Status Bar (Edge-to-Edge compatible) ── */}
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

      {/* ── Top Portal Header (Secure: No casual Back button, Only Shield + Actions) ── */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        {/* Responder Shield Badge */}
        <View style={[styles.headerShieldBox, { backgroundColor: colors.primaryBg, borderColor: colors.cardBorder }]}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primaryLight} />
        </View>

        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {language === 'tl' ? 'Responders Portal' : 'Responders Portal'}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {responderProfile?.barangayName ? `${responderProfile.barangayName} • Operasyon` : 'MDRRMO Operasyon'}
          </Text>
        </View>

        {/* Right Header Action Icons */}
        <View style={styles.headerActionRow}>
          {/* GeoMap Icon button */}
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
            onPress={() => handleOpenMapWithTarget()}
            activeOpacity={0.7}
          >
            <Ionicons name="map-outline" size={20} color={colors.primaryLight} />
          </TouchableOpacity>

          {/* Chat Icon with live unread badge */}
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
            onPress={handleOpenChat}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubbles-outline" size={20} color={colors.primaryLight} />
            {unreadChatCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{unreadChatCount > 9 ? '9+' : unreadChatCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Secure Logout Action Button */}
          <TouchableOpacity
            style={[styles.headerLogoutBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
            onPress={responderProfile ? handleLogout : () => setIsLoginModalOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={17} color="#ef4444" />
            <Text style={styles.headerLogoutText}>{language === 'tl' ? 'Logout' : 'Logout'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Active Screen Container ── */}
      <View style={styles.mainContent}>
        {activeTab === 'home' && (
          <ResponderHomeScreen
            responderProfile={responderProfile}
            reports={reports}
            evacuationCenters={evacuationCenters}
            unreadChatCount={unreadChatCount}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefreshAll}
            onNavigateTab={tab => setActiveTab(tab)}
            onOpenChat={handleOpenChat}
            onOpenMap={handleOpenMapWithTarget}
            onTakeAction={report => {
              setSelectedReportForAction(report);
              setActiveTab('reports');
            }}
            onNavigateToLocation={handleNavigateToIncident}
          />
        )}

        {activeTab === 'evacuation' && (
          <ResponderEvacuationScreen
            authToken={authToken}
            evacuationCenters={evacuationCenters}
            barangays={barangays}
            loading={loading}
            refreshing={refreshing}
            onRefresh={loadEvacuationCenters}
            onCenterCreated={handleCenterCreated}
            onCenterUpdated={handleCenterUpdated}
          />
        )}

        {activeTab === 'reports' && (
          <ResponderReportsScreen
            authToken={authToken}
            reports={reports}
            userCoords={userCoords}
            loading={loading}
            refreshing={refreshing}
            onRefresh={loadReports}
            onReportUpdated={handleReportUpdated}
            onOpenMap={handleOpenMapWithTarget}
            selectedReportForAction={selectedReportForAction}
            setSelectedReportForAction={setSelectedReportForAction}
          />
        )}
      </View>

      {/* ── Modern Bottom Navigation Bar ── */}
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.cardBorder,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        {/* Tab 1: Home */}
        <TouchableOpacity
          style={[styles.navTab, activeTab === 'home' && styles.navTabActive]}
          onPress={() => setActiveTab('home')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={22}
            color={activeTab === 'home' ? colors.primaryLight : colors.textMuted}
          />
          <Text
            style={[
              styles.navTabLabel,
              { color: activeTab === 'home' ? colors.primaryLight : colors.textMuted },
              activeTab === 'home' && { fontWeight: '800' },
            ]}
          >
            {language === 'tl' ? 'Home' : 'Home'}
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Evacuation Centers */}
        <TouchableOpacity
          style={[styles.navTab, activeTab === 'evacuation' && styles.navTabActive]}
          onPress={() => setActiveTab('evacuation')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'evacuation' ? 'business' : 'business-outline'}
            size={22}
            color={activeTab === 'evacuation' ? colors.primaryLight : colors.textMuted}
          />
          <Text
            style={[
              styles.navTabLabel,
              { color: activeTab === 'evacuation' ? colors.primaryLight : colors.textMuted },
              activeTab === 'evacuation' && { fontWeight: '800' },
            ]}
          >
            {language === 'tl' ? 'Evac Centers' : 'Evac Centers'}
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Disaster Reports & Road Conditions */}
        <TouchableOpacity
          style={[styles.navTab, activeTab === 'reports' && styles.navTabActive]}
          onPress={() => setActiveTab('reports')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'reports' ? 'warning' : 'warning-outline'}
            size={22}
            color={activeTab === 'reports' ? colors.primaryLight : colors.textMuted}
          />
          <Text
            style={[
              styles.navTabLabel,
              { color: activeTab === 'reports' ? colors.primaryLight : colors.textMuted },
              activeTab === 'reports' && { fontWeight: '800' },
            ]}
          >
            {language === 'tl' ? 'Disaster Reports' : 'Disaster Reports'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Modal: Responder Login Form ── */}
      <Modal visible={isLoginModalOpen} animationType="slide" transparent onRequestClose={handleCancelLogin}>
        <View style={styles.loginModalOverlay}>
          <View style={[styles.loginModalSheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.loginHeader}>
              <TouchableOpacity onPress={handleCancelLogin} style={styles.closeLoginBtn}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
              <View style={[styles.loginIconBox, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="shield-checkmark" size={32} color={colors.primaryLight} />
              </View>
              <Text style={[styles.loginTitle, { color: colors.text }]}>Responder Login</Text>
              <Text style={[styles.loginSubtitle, { color: colors.textMuted }]}>
                Mag-login gamit ang iyong opisyal na responder account
              </Text>
            </View>

            <View style={styles.loginForm}>
              <Text style={[styles.loginInputLabel, { color: colors.text }]}>Username</Text>
              <TextInput
                style={[styles.loginInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                placeholder="Ilagay ang username"
                placeholderTextColor={colors.textMuted}
                value={loginUsername}
                onChangeText={setLoginUsername}
                autoCapitalize="none"
              />

              <Text style={[styles.loginInputLabel, { color: colors.text }]}>Password</Text>
              <TextInput
                style={[styles.loginInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                placeholder="Ilagay ang password"
                placeholderTextColor={colors.textMuted}
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
              />

              {/* Remember Me Checkbox Card */}
              <TouchableOpacity
                style={[
                  styles.rememberMeCard,
                  {
                    backgroundColor: colors.bg,
                    borderColor: rememberMe ? colors.primaryLight : colors.cardBorder,
                  },
                ]}
                onPress={() => setRememberMe(prev => !prev)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    {
                      backgroundColor: rememberMe ? colors.primaryLight : 'transparent',
                      borderColor: rememberMe ? colors.primaryLight : colors.textMuted,
                    },
                  ]}
                >
                  {rememberMe && <Ionicons name="checkmark" size={15} color="#ffffff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rememberMeTitle, { color: colors.text }]}>
                    {language === 'tl' ? 'Tandaan ang Account (Remember Me)' : 'Remember Account'}
                  </Text>
                  <Text style={[styles.rememberMeSub, { color: colors.textSecondary }]}>
                    {language === 'tl'
                      ? 'I-save ang credentials para sa mabilisang login'
                      : 'Keep credentials saved on this device for fast login'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.loginSubmitBtn, { backgroundColor: colors.primaryLight }]}
                onPress={handleLoginSubmit}
                disabled={isSubmittingLogin}
                activeOpacity={0.85}
              >
                {isSubmittingLogin ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={20} color="#ffffff" />
                    <Text style={styles.loginSubmitText}>Mag-login sa Portal</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  headerShieldBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#ef4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '900',
  },
  headerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerLogoutText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '800',
  },

  mainContent: {
    flex: 1,
  },

  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 10,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  navTabActive: {},
  navTabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },

  // Login Modal
  loginModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loginModalSheet: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 16,
    position: 'relative',
  },
  closeLoginBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 6,
  },
  loginHeader: {
    alignItems: 'center',
    gap: 6,
  },
  loginIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  loginSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  loginForm: {
    gap: 10,
  },
  loginInputLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  loginInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  rememberMeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 2,
    marginBottom: 4,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberMeTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  rememberMeSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  loginSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 8,
  },
  loginSubmitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
