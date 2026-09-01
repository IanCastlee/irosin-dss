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
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePreferences } from '../context/PreferencesContext';
import { useFocusEffect } from '@react-navigation/native';
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

  // Auth Portal Modal State (Login / Register)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Register Form State
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRoleTitle, setRegRoleTitle] = useState('Barangay Emergency Responder');
  const [regBarangayId, setRegBarangayId] = useState('');
  const [regBarangayName, setRegBarangayName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);
  const [showBrgyPickerModal, setShowBrgyPickerModal] = useState(false);

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
      soundService.playEmergencyAlertSound().catch(() => {});
      loadUnreadChatCount();
    });

    const unsubSeen = RealtimeSocket.on('chat:messages_seen', () => {
      loadUnreadChatCount();
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
      unsubSeen();
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
      await Promise.all([
        loadReports(activeProf, token),
        loadEvacuationCenters(),
        loadBarangays(),
        loadUnreadChatCount(token),
      ]);
    } catch (err) {
      console.warn('[ResponderPortal] Init error:', err);
    } finally {
      setIsAuthChecking(false);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUnreadChatCount = useCallback(async (tokenOverride?: string | null) => {
    try {
      const t = tokenOverride !== undefined ? tokenOverride : authToken;
      const res = await Api.getChatConversations(t);
      if (res && Array.isArray(res.conversations)) {
        const total = res.conversations.reduce((sum: number, c: any) => sum + (Number(c.unreadCount) || 0), 0);
        setUnreadChatCount(total);
      }
    } catch (err) {
      console.warn('[ResponderPortal] Load unread chat count warning:', err);
    }
  }, [authToken]);

  // Sync unread chat count whenever Responder Portal gains focus
  useFocusEffect(
    useCallback(() => {
      loadUnreadChatCount();
    }, [loadUnreadChatCount])
  );

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
      await Promise.all([
        loadReports(currentProf),
        loadEvacuationCenters(),
        loadBarangays(),
        loadUnreadChatCount(),
      ]);
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

  // Registration handler
  const handleRegisterSubmit = async () => {
    if (!regFullName.trim() || !regUsername.trim() || !regPhone.trim() || !regPassword.trim()) {
      Alert.alert('Kulang na Datos ⚠️', 'Pakipunan ang lahat ng kinakailangang field na may asterisk (*).');
      return;
    }

    if (regUsername.trim().length < 3) {
      Alert.alert('Maling Username ⚠️', 'Ang username ay dapat may hindi bababa sa 3 letra o numero.');
      return;
    }

    if (regPassword.length < 6) {
      Alert.alert('Maling Password ⚠️', 'Ang password ay dapat may hindi bababa sa 6 characters.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      Alert.alert('Hindi Tugma ang Password ⚠️', 'Pakisiguraduhing magkatugma ang password at confirm password.');
      return;
    }

    setIsSubmittingRegister(true);
    try {
      const res = await Api.responderRegister({
        fullName: regFullName.trim(),
        username: regUsername.toLowerCase().trim(),
        password: regPassword,
        phone: regPhone.trim(),
        barangayId: regBarangayId || 'brgy-1',
        barangayName: regBarangayName || 'Irosin',
        roleTitle: regRoleTitle.trim() || 'Barangay Emergency Responder',
      });

      if (res?.success) {
        Alert.alert(
          'Rehistrasyon Matagumpay! ✅',
          res.message || 'Nai-record na ang iyong responder account. Mangyaring mag-login gamit ang iyong credentials.',
          [
            {
              text: 'Mag-login Ngayon',
              onPress: () => {
                setLoginUsername(regUsername.toLowerCase().trim());
                setLoginPassword(regPassword);
                setAuthMode('login');
              },
            },
          ]
        );
        setRegFullName('');
        setRegUsername('');
        setRegPhone('');
        setRegPassword('');
        setRegConfirmPassword('');
      } else {
        throw new Error(res?.message || 'Hindi maiproseso ang rehistrasyon.');
      }
    } catch (err: any) {
      Alert.alert('Registration Error ❌', err.message || 'Hindi makapag-rehistro.');
    } finally {
      setIsSubmittingRegister(false);
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

      {/* ── Full-Screen Modal: Responder Login & Registration Portal ── */}
      <Modal
        visible={isLoginModalOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCancelLogin}
      >
        <SafeAreaView style={[styles.authFullScreenContainer, { backgroundColor: colors.bg }]} edges={['top', 'bottom', 'left', 'right']}>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

          {/* Top Bar with Return to Public App */}
          <View style={[styles.authTopBar, { borderBottomColor: colors.cardBorder }]}>
            <TouchableOpacity
              onPress={handleCancelLogin}
              style={[styles.authBackBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
              <Text style={[styles.authBackText, { color: colors.text }]}>
                {language === 'tl' ? 'Pampublikong App' : 'Public App'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.authShieldPill, { backgroundColor: colors.primaryBg, borderColor: colors.primaryLight }]}>
              <Ionicons name="shield-checkmark" size={15} color={colors.primaryLight} />
              <Text style={[styles.authShieldPillText, { color: colors.primaryLight }]}>
                OFFICIAL PORTAL
              </Text>
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.authScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Header Info */}
              <View style={styles.authHeaderBox}>
                <View style={[styles.authLogoCircle, { backgroundColor: colors.primaryBg, borderColor: colors.primaryLight }]}>
                  <Ionicons name="shield-checkmark" size={36} color={colors.primaryLight} />
                </View>
                <Text style={[styles.authMainTitle, { color: colors.text }]}>
                  MDRRMO & Barangay Responder
                </Text>
                <Text style={[styles.authMainSubtitle, { color: colors.textSecondary }]}>
                  Ligtas at opisyal na command portal para sa mga emergency responders
                </Text>
              </View>

              {/* Segmented Switch: Login vs Register */}
              <View style={[styles.authSegmentTrack, { backgroundColor: theme === 'dark' ? '#0f172a' : '#f1f5f9', borderColor: colors.cardBorder }]}>
                <TouchableOpacity
                  style={[
                    styles.authSegmentTab,
                    authMode === 'login' && [styles.authSegmentTabActive, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => setAuthMode('login')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={authMode === 'login' ? 'log-in' : 'log-in-outline'}
                    size={16}
                    color={authMode === 'login' ? '#ffffff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.authSegmentTabText,
                      { color: authMode === 'login' ? '#ffffff' : colors.textSecondary },
                    ]}
                  >
                    Mag-login
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.authSegmentTab,
                    authMode === 'register' && [styles.authSegmentTabActive, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => setAuthMode('register')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={authMode === 'register' ? 'person-add' : 'person-add-outline'}
                    size={16}
                    color={authMode === 'register' ? '#ffffff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.authSegmentTabText,
                      { color: authMode === 'register' ? '#ffffff' : colors.textSecondary },
                    ]}
                  >
                    Mag-register
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── Form Body: Login ── */}
              {authMode === 'login' ? (
                <View style={[styles.authCardWrapper, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.authSectionHeader, { color: colors.text }]}>
                    I-access ang iyong Account
                  </Text>

                  <Text style={[styles.loginInputLabel, { color: colors.text }]}>Username</Text>
                  <TextInput
                    style={[styles.loginInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                    placeholder="Ilagay ang iyong username"
                    placeholderTextColor={colors.textMuted}
                    value={loginUsername}
                    onChangeText={setLoginUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <Text style={[styles.loginInputLabel, { color: colors.text, marginTop: 10 }]}>Password</Text>
                  <TextInput
                    style={[styles.loginInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                    placeholder="Ilagay ang iyong password"
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
                    style={[styles.loginSubmitBtn, { backgroundColor: colors.primary }]}
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
              ) : (
                /* ── Form Body: Register ── */
                <View style={[styles.authCardWrapper, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.authSectionHeader, { color: colors.text }]}>
                    Bagong Responder Registration
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
                    Punan ang form upang mairehistro bilang opisyal na responder ng inyong barangay.
                  </Text>

                  <Text style={[styles.loginInputLabel, { color: colors.text }]}>Buong Pangalan (Full Name) *</Text>
                  <TextInput
                    style={[styles.loginInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                    placeholder="Hal. Juan Dela Cruz"
                    placeholderTextColor={colors.textMuted}
                    value={regFullName}
                    onChangeText={setRegFullName}
                  />

                  <Text style={[styles.loginInputLabel, { color: colors.text, marginTop: 10 }]}>Username (Walang Kapareho) *</Text>
                  <TextInput
                    style={[styles.loginInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                    placeholder="Hal. jdelacruz"
                    placeholderTextColor={colors.textMuted}
                    value={regUsername}
                    onChangeText={setRegUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <Text style={[styles.loginInputLabel, { color: colors.text, marginTop: 10 }]}>Numero ng Telepono / Mobile *</Text>
                  <TextInput
                    style={[styles.loginInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                    placeholder="Hal. 09123456789"
                    placeholderTextColor={colors.textMuted}
                    value={regPhone}
                    onChangeText={setRegPhone}
                    keyboardType="phone-pad"
                  />

                  <Text style={[styles.loginInputLabel, { color: colors.text, marginTop: 10 }]}>Tungkulin / Posisyon *</Text>
                  <TextInput
                    style={[styles.loginInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                    placeholder="Hal. Barangay Emergency Responder"
                    placeholderTextColor={colors.textMuted}
                    value={regRoleTitle}
                    onChangeText={setRegRoleTitle}
                  />

                  <Text style={[styles.loginInputLabel, { color: colors.text, marginTop: 10 }]}>Itinalagang Barangay *</Text>
                  <TouchableOpacity
                    style={[styles.loginInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                    onPress={() => setShowBrgyPickerModal(true)}
                  >
                    <Text style={{ color: regBarangayName ? colors.text : colors.textMuted, fontSize: 14 }}>
                      {regBarangayName || 'Pumili ng Barangay...'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                  </TouchableOpacity>

                  <Text style={[styles.loginInputLabel, { color: colors.text, marginTop: 10 }]}>Password *</Text>
                  <TextInput
                    style={[styles.loginInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                    placeholder="Gumawa ng password (min. 6 characters)"
                    placeholderTextColor={colors.textMuted}
                    value={regPassword}
                    onChangeText={setRegPassword}
                    secureTextEntry
                  />

                  <Text style={[styles.loginInputLabel, { color: colors.text, marginTop: 10 }]}>Kumpirmahin ang Password *</Text>
                  <TextInput
                    style={[styles.loginInput, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
                    placeholder="Ulitin ang password"
                    placeholderTextColor={colors.textMuted}
                    value={regConfirmPassword}
                    onChangeText={setRegConfirmPassword}
                    secureTextEntry
                  />

                  <TouchableOpacity
                    style={[styles.loginSubmitBtn, { backgroundColor: colors.primary, marginTop: 18 }]}
                    onPress={handleRegisterSubmit}
                    disabled={isSubmittingRegister}
                    activeOpacity={0.85}
                  >
                    {isSubmittingRegister ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                        <Text style={styles.loginSubmitText}>I-rehistro ang Responder Account</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ height: 80 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

        {/* Barangay Picker Modal */}
        <Modal visible={showBrgyPickerModal} transparent animationType="slide" onRequestClose={() => setShowBrgyPickerModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Pumili ng Barangay</Text>
                <TouchableOpacity onPress={() => setShowBrgyPickerModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={{ paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.cardBorder }}
                  onPress={() => {
                    setRegBarangayId('all');
                    setRegBarangayName('All Barangays / Municipal Wide');
                    setShowBrgyPickerModal(false);
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primaryLight }}>
                    🌐 Lahat ng Barangay (Municipal-Wide)
                  </Text>
                </TouchableOpacity>
                {barangays.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={{ paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.cardBorder }}
                    onPress={() => {
                      setRegBarangayId(b.id);
                      setRegBarangayName(b.name);
                      setShowBrgyPickerModal(false);
                    }}
                  >
                    <Text style={{ fontSize: 15, color: colors.text, fontWeight: regBarangayId === b.id ? '700' : '400' }}>
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
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

  // Full-Screen Auth Portal Styles
  authFullScreenContainer: {
    flex: 1,
  },
  authTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  authBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  authBackText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  authShieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  authShieldPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  authScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  authHeaderBox: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  authLogoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  authMainTitle: {
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  authMainSubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  authSegmentTrack: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  authSegmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  authSegmentTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  authSegmentTabText: {
    fontSize: 13,
    fontWeight: '800',
  },
  authCardWrapper: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  authSectionHeader: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },

  loginInputLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  loginInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  rememberMeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
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
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  loginSubmitText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '900',
  },
});
