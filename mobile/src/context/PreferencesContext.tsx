import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimeSocket } from '../services/socketService';
import { Api } from '../services/api';
import { OfflineStorage } from '../services/offlineStorage';
import { soundService } from '../services/soundService';
import * as Notifications from 'expo-notifications';

export type AppTheme = 'dark' | 'light';
export type AppLanguage = 'tl' | 'en';

export interface ApiIntegrationItem {
  id: string;
  name: string;
  category: string;
  provider: string;
  purpose: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  attributionUrl?: string;
}

export interface TechStackItem {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface AppConfigData {
  appName: string;
  locationSubtitle: string;
  version: string;
  commandCenterHotline: string;
  aboutDescription: string;
  authority: string;
  developmentTeam: string;
  academicYear: string;
  privacyNoticeTitle: string;
  privacyNoticeContent: string;
  termsTitle: string;
  termsContent: string;
  apiIntegrations?: ApiIntegrationItem[];
  techStack?: TechStackItem[];
}

export const DEFAULT_APP_CONFIG: AppConfigData = {
  appName: "Irosin Disaster Safety App",
  locationSubtitle: "Irosin, Sorsogon",
  version: "1.0.0",
  commandCenterHotline: "0917-123-4567 / MDRRMO 24/7",
  aboutDescription: "Ang application na ito ay dinisenyo upang magbigay ng mabilis, maaasahan, at realtime na impormasyon sa panahon ng sakuna at kalamidad sa Munisipalidad ng Irosin at mga karatig-bayan sa Lalawigan ng Sorsogon.",
  authority: "Municipal Disaster Risk Reduction & Management Office (MDRRMO) - Irosin, Sorsogon",
  developmentTeam: "Project Development & Research Team, BSIT",
  academicYear: "2025 - 2026",
  privacyNoticeTitle: "Patakaran sa Privacy ng Datos (RA 10173 Compliance)",
  privacyNoticeContent: "Alinsunod sa Republic Act No. 10173 o Data Privacy Act of 2012 ng Pilipinas, ang Irosin Disaster Safety App at ang MDRRMO ay nangangakong poprotektahan ang iyong personal na impormasyon.\n\n1. PANGONGOLEKTA NG IMPORMASYON: Kapag ikaw ay nagsumite ng ulat ng sakuna (Citizen Report) o nag-apply bilang Barangay Responder, kinokolekta lamang namin ang iyong Pangalan, Contact Number, Lokasyon (GPS coordinates), at Larawan ng insidente para lamang sa layuning pagsagip at pag-aksyon ng mga awtoridad.\n\n2. PAGGAMIT AT PAGBABAHAGI: Ang impormasyong nakalap ay eksklusibong ginagamit ng MDRRMO at BDRRMC responders para sa emergency operations. Hindi kailanman ibebenta o ipamamahagi ang iyong datos sa mga komersyal na entidad.\n\n3. LOKASYON AT SENSORS: Ang paggamit ng GPS location ay pansamantala lamang habang ginagamit ang mapa o habang nagpapadala ng emergency report.\n\n4. KARAPATAN NG USER: May karapatan kang humiling ng pagbura o pagwawasto ng iyong datos sa pamamagitan ng pag-ugnay sa MDRRMO Data Protection Officer.",
  termsTitle: "Kasunduan at Tuntunin sa Paggamit (Terms of Service)",
  termsContent: "1. PANGKALAHATANG LAYUNIN: Ang system na ito ay nilikha para sa pagpapalaganap ng maagang babala (early warning), impormasyon sa evacuation centers, lagay ng panahon, at pag-uulat ng mga emergency sa Irosin, Sorsogon.\n\n2. RESPONSIBLENG PAG-UULAT: Mahigpit na ipinagbabawal ang pagpapadala ng maling impormasyon, pekeng ulat ng sakuna (prank reports), o nakakapanlinlang na mga larawan. Ang mga lumalabag ay maaaring mapanagot sa ilalim ng umiiral na batas (tulad ng Anti-Hoaxing / RA 10175 at Revised Penal Code).\n\n3. EMERGENCY WARNINGS: Bagama't ginagawa ng sistema ang lahat upang maghatid ng real-time data mula sa PAGASA, PHIVOLCS, at USGS, laging sundin ang opisyal na tagubilin ng mga lokal na awtoridad at MDRRMO personnel sa iyong lugar.\n\n4. OFFLINE OPERATION: Ang app ay may kakayahang mag-imbak ng emergency hotlines at gabay sa kaligtasan kahit walang internet connection.",
  apiIntegrations: [
    {
      id: "api-1",
      name: "Open-Meteo Weather API",
      category: "Live Weather & Satellite Models",
      provider: "Open-Meteo, ECMWF & NOAA GFS",
      purpose: "Real-time temperature, rainfall, humidity, wind radar, at 5-day extended forecasts para sa Irosin at karatig-bayan.",
      status: "ACTIVE",
      attributionUrl: "https://open-meteo.com/"
    },
    {
      id: "api-2",
      name: "USGS Earthquake Hazards Feed",
      category: "Real-Time Seismic Monitoring",
      provider: "United States Geological Survey (USGS)",
      purpose: "250km radius live seismic monitoring sa paligid ng Bulkang Bulusan at Irosin faults (M3.5+ earthquake alerts).",
      status: "ACTIVE",
      attributionUrl: "https://earthquake.usgs.gov/"
    },
    {
      id: "api-3",
      name: "OpenStreetMap & Nominatim Geocoding",
      category: "Geographic Map & Reverse Geocoding",
      provider: "OpenStreetMap Foundation & Contributors",
      purpose: "High-resolution road maps, barangay boundary resolution, at disaster incident location reverse geocoding.",
      status: "ACTIVE",
      attributionUrl: "https://www.openstreetmap.org/"
    },
    {
      id: "api-4",
      name: "Google Maps Navigation Intent Engine",
      category: "Turn-by-Turn GPS Navigation",
      provider: "Google Maps Navigation Engine",
      purpose: "Live interactive turn-by-turn routing mula sa live GPS location ng user patungo sa pinakamalapit na ligtas na evacuation center.",
      status: "ACTIVE",
      attributionUrl: "https://www.google.com/maps"
    },
    {
      id: "api-5",
      name: "Expo Push Notification Service",
      category: "Emergency Broadcast & Push Alerts",
      provider: "Expo Application Services & Google Firebase",
      purpose: "High-priority push alert dispatch para sa disaster advisories at critical evacuation orders.",
      status: "ACTIVE",
      attributionUrl: "https://expo.dev/"
    }
  ],
  techStack: [
    {
      id: "tech-1",
      name: "React Native & TypeScript",
      category: "Frontend Mobile Framework",
      description: "Native cross-platform mobile application para sa Android at iOS na may type-safe state management."
    },
    {
      id: "tech-2",
      name: "Node.js & Express REST API",
      category: "Backend Gateway",
      description: "Modular RESTful microservices para sa authentication, disaster report triage, at automated weather sync."
    },
    {
      id: "tech-3",
      name: "Socket.IO WebSockets",
      category: "Real-time Sync",
      description: "Zero-latency real-time bidirectional synchronization sa pagitan ng MDRRMO Admin Command Center at Mobile Responders."
    },
    {
      id: "tech-4",
      name: "Google Firebase Cloud Firestore",
      category: "Cloud NoSQL Database",
      description: "Real-time cloud document store para sa disaster reports, evacuation centers, at responder user registry."
    },
    {
      id: "tech-5",
      name: "Leaflet.js & WebView Engine",
      category: "Geospatial Engine",
      description: "Custom interactive mapping na may pulsing GPS beacon glow rings at safe evacuation routing."
    }
  ]
};

export interface ThemeColors {
  bg: string;
  card: string;
  cardBorder: string;
  inputBg: string;
  inputBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  primaryBg: string;
  accent: string;
  accentBg: string;
  success: string;
  successBg: string;
  danger: string;
  dangerBg: string;
}

export const darkColors: ThemeColors = {
  bg: '#090d16',
  card: '#0f172a',
  cardBorder: '#1e293b',
  inputBg: '#0f172a',
  inputBorder: '#334155',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#0284c7',
  primaryLight: '#38bdf8',
  primaryBg: 'rgba(56, 189, 248, 0.1)',
  accent: '#f59e0b',
  accentBg: 'rgba(245, 158, 11, 0.1)',
  success: '#10b981',
  successBg: 'rgba(16, 185, 129, 0.1)',
  danger: '#ef4444',
  dangerBg: 'rgba(239, 68, 68, 0.1)'
};

export const lightColors: ThemeColors = {
  bg: '#f8fafc',
  card: '#ffffff',
  cardBorder: '#e2e8f0',
  inputBg: '#f1f5f9',
  inputBorder: '#cbd5e1',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#0284c7',
  primaryLight: '#0369a1',
  primaryBg: 'rgba(2, 132, 199, 0.08)',
  accent: '#d97706',
  accentBg: 'rgba(217, 119, 6, 0.08)',
  success: '#16a34a',
  successBg: 'rgba(22, 163, 74, 0.08)',
  danger: '#dc2626',
  dangerBg: 'rgba(220, 38, 38, 0.08)'
};

interface PreferencesContextType {
  theme: AppTheme;
  language: AppLanguage;
  colors: ThemeColors;
  appConfig: AppConfigData;
  setTheme: (t: AppTheme) => Promise<void>;
  setLanguage: (l: AppLanguage) => Promise<void>;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<string, { tl: string; en: string }> = {
  // Navigation Tabs
  navHome: { tl: 'Home', en: 'Home' },
  navMap: { tl: 'Mapa', en: 'Map' },
  navAlerts: { tl: 'Mga Abiso', en: 'Alerts' },
  navRoads: { tl: 'Kalsada', en: 'Roads' },
  navAnnouncements: { tl: 'Balita', en: 'News' },
  navMore: { tl: 'Iba Pa', en: 'More' },

  // Settings
  settings: { tl: 'Mga Setting', en: 'Settings' },
  appearance: { tl: 'Hitsura at Wika', en: 'Appearance & Language' },
  theme: { tl: 'Tema ng App', en: 'App Theme' },
  darkMode: { tl: 'Madilim (Dark Mode)', en: 'Dark Mode' },
  lightMode: { tl: 'Maliwanag (Light Mode)', en: 'Light Mode' },
  language: { tl: 'Pangunahing Wika', en: 'Primary Language' },
  tagalog: { tl: 'Tagalog (Filipino)', en: 'Tagalog (Filipino)' },
  english: { tl: 'English', en: 'English' },
  notifications: { tl: 'Mga Notification at Tunog', en: 'Notifications & Sound' },
  alertSound: { tl: 'Emergency Alert Sound', en: 'Emergency Alert Sound' },
  vibration: { tl: 'Vibration Alert', en: 'Vibration Alert' },
  siren: { tl: 'Alarm Siren Warning', en: 'Alarm Siren Warning' },
  offlineCache: { tl: 'Offline Data Cache', en: 'Offline Data Cache' },
  testNotification: { tl: 'Subukan ang Tunog at Vibration', en: 'Test Sound & Vibration' },

  // Home Screen
  appHeaderTitle: { tl: 'Irosin Disaster Safety App', en: 'Irosin Disaster Safety App' },
  alertAdvisoryBanner: { tl: 'Aktibong Abiso sa Kalamidad', en: 'Active Disaster Advisories' },
  quickActions: { tl: 'Mabilisang Aksyon', en: 'Quick Actions' },
  nearestShelters: { tl: 'Pinakamalapit na Evacuation Center', en: 'Nearest Evacuation Centers' },
  latestAlerts: { tl: 'Pinakahuling mga Babala', en: 'Latest Active Alerts' },
  viewAll: { tl: 'Tingnan Lahat', en: 'View All' },
  directions: { tl: 'Direksyon', en: 'Directions' },
  capacityOccupied: { tl: 'Kapasidad', en: 'Occupied' },
  openStatus: { tl: 'BUKAS', en: 'OPEN' },

  // Map Screen
  mapTitle: { tl: 'Mapa ng Kalamidad at Evacuation', en: 'Disaster & Evacuation Map' },
  mapSub: { tl: 'Lokasyon ng mga Sentro, Panganib at Ligtas na Daan', en: 'Centers, Hazard Zones & Evacuation Routes' },
  filterAll: { tl: 'Lahat', en: 'All' },
  filterCenters: { tl: 'Evacuation Centers', en: 'Evacuation Centers' },
  filterHazards: { tl: 'Peligrong Lugar', en: 'Hazard Zones' },
  filterRoutes: { tl: 'Ligtas na Ruta', en: 'Safe Routes' },

  // Bulletins / Announcements
  announcementsTitle: { tl: 'Mga Anunsyo at Balita mula sa LGU', en: 'LGU Bulletins & Announcements' },
  announcementsSub: { tl: 'Opisyal na balita ukol sa klase, ayuda, at operasyon ng MDRRMO', en: 'Official notices on class suspensions, relief, and operations' },
  filterNoClasses: { tl: 'Walang Pasok', en: 'No Classes' },
  filterPower: { tl: 'Kuryente', en: 'Power' },
  filterWeather: { tl: 'Panahon', en: 'Weather' },
  filterRelief: { tl: 'Ayuda at Tulong', en: 'Relief' },
  filterGeneral: { tl: 'Pangkalahatan', en: 'General' },

  // Power Outage Screen
  powerTitle: { tl: 'Ulat sa Kuryente at Brownout', en: 'Power Interruptions & Advisories' },
  powerSub: { tl: 'SORECO II & LGU Irosin Power Monitoring', en: 'SORECO II & LGU Irosin Power Monitoring' },
  unplannedOutages: { tl: 'Brownout at Pagkawala ng Kuryente', en: 'Emergency Outages' },
  scheduledMaintenance: { tl: 'Nakatakdang Maintenance ng SORECO', en: 'Scheduled Maintenance' },
  restoredPower: { tl: 'Naibalik na Kuryente', en: 'Restored Power' },
  affectedBarangays: { tl: 'Apektadong Barangay:', en: 'Affected Barangays:' },
  estimatedRestore: { tl: 'Tinatayang Pagbabalik:', en: 'Estimated Restoration:' },

  // Emergency Contacts
  contactsTitle: { tl: 'Direktoryo ng Emergency Hotlines', en: 'Emergency Hotlines Directory' },
  contactsSub: { tl: 'Mabilisang tawag sa MDRRMO, Pulisya, BFP, RHU at mga Ospital', en: 'Direct dial to MDRRMO, Police, Fire, RHU and Hospitals' },
  callBtn: { tl: 'Tawagan', en: 'Call' },

  // Road Hazards
  roadHazards: { tl: 'Kalsada & Hazard', en: 'Road Hazards' },
  roadHazardsTitle: { tl: 'Ulat sa Kondisyon ng mga Kalsada', en: 'Road Hazards & Conditions' },
  roadHazardsSub: { tl: 'Mga abiso sa hindi madaanan, landslide, baha at clearing ops', en: 'Impassable roads, landslide, flood alerts & clearing operations' },
  iReportBtn: { tl: 'Mag-ulat', en: 'Report' },
  activeTab: { tl: 'Aktibo at Babala', en: 'Active Hazards' },
  resolvedTab: { tl: 'Naayos / Madaanan', en: 'Cleared & Safe' },
  emptySafeRoads: { tl: 'Ligtas at Madaanan ang Lahat ng Ruta', en: 'All Roads are Clear & Passable' },
  emptySafeRoadsSub: { tl: 'Walang naiulat na nakaharang o impassable na kalsada sa Irosin sa kasalukuyan.', en: 'No road blocks or impassable routes reported in Irosin at this time.' },
  emptyResolvedRoads: { tl: 'Walang Naitalang Naayos na Kalsada', en: 'No Cleared Roads on Record' },
  emptyResolvedRoadsSub: { tl: 'Lalabas dito ang mga ulat ng kalsadang natapos nang malinis o madaanan muli.', en: 'Cleared road hazards will appear here once resolved.' },
  barangayLabel: { tl: 'Barangay:', en: 'Barangay:' },
  locationLabel: { tl: 'Lokasyon / Landmark:', en: 'Location / Landmark:' },
  affectedRouteLabel: { tl: 'Apektadong Ruta:', en: 'Affected Route:' },
  adminNotesLabel: { tl: 'Aksyon ng MDRRMO / clearing team:', en: 'MDRRMO Action & Updates:' },
  notedBtn: { tl: 'Noted', en: 'Noted' },
  notedActiveBtn: { tl: 'Na-Noted', en: 'Acknowledged' },
  powerAdvisory: { tl: 'Kuryente & Brownout', en: 'Power Interruptions' },
  emergencyHotlines: { tl: 'Emergency Hotlines', en: 'Emergency Hotlines' },

  // Preparedness Guides
  guidesTitle: { tl: 'Mga Gabay sa Kaligtasan at Sakuna', en: 'Disaster Preparedness Guides' },
  guidesSub: { tl: 'Mga dapat gawin Bago, Habang, at Pagkatapos ng Bagyo, Baha, at Lindol', en: 'What to do Before, During, and After Typhoons, Floods & Earthquakes' },
  emergencyKitChecklist: { tl: 'Emergency Go-Bag Checklist', en: 'Emergency Go-Bag Checklist' },

  // 🛡️ BDRRMC Action Portal
  bdrrmcActionPanel: { tl: 'BDRRMC Action Portal', en: 'BDRRMC Action Portal' },
  selectNewStatus: { tl: 'PUMILI NG BAGONG STATUS', en: 'SELECT NEW STATUS' },
  statusUnderClearing: { tl: 'Isinasagawa ang Clearing', en: 'Under Clearing' },
  statusResolved: { tl: 'Naresolba / Ligtas Na', en: 'Resolved / Safe' },
  statusImpassable: { tl: 'Hindi Madaanan', en: 'Impassable' },
  statusVerified: { tl: 'Kumpirmadong Banta', en: 'Verified Hazard' },
  requestBackupLabel: { tl: 'Humingi ng Karagdagang Tulong / Backup', en: 'Request Backup / Equipment' },
  requestBackupSub: { tl: 'Magpapadala ng alert sa MDRRMO Central Command', en: 'Alerts MDRRMO Central Command' },
  saveAndBroadcastBtn: { tl: 'I-save at I-broadcast ang Aksyon', en: 'Save & Broadcast Action' },
  takeActionBtn: { tl: 'Magsagawa ng Aksyon', en: 'Take Action' },
  mdrrmoActionLabel: { tl: 'Aksyon ng MDRRMO / Responder:', en: 'MDRRMO / Responder Action:' }
};

const PreferencesContext = createContext<PreferencesContextType>({
  theme: 'light',
  language: 'en',
  colors: lightColors,
  appConfig: DEFAULT_APP_CONFIG,
  setTheme: async () => {},
  setLanguage: async () => {},
  t: (key: string, fallback?: string) => fallback || key
});

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>('light');
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [appConfig, setAppConfig] = useState<AppConfigData>(DEFAULT_APP_CONFIG);

  useEffect(() => {
    loadPreferences();
    loadAppConfig();

    // 📱 Auto-Register Push Token on App Startup / Responder Mount
    const syncPushRegistration = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        let finalStatus = status;
        if (finalStatus !== 'granted') {
          const { status: reqStatus } = await Notifications.requestPermissionsAsync();
          finalStatus = reqStatus;
        }
        if (finalStatus === 'granted') {
          const tokenRes = await Notifications.getExpoPushTokenAsync().catch(() => null);
          if (tokenRes?.data) {
            const expoPushToken = tokenRes.data;
            // 1. General token registration
            Api.registerPushToken(expoPushToken).catch(() => {});

            // 2. Responder Chat token registration if logged in
            const pairs = await AsyncStorage.multiGet([
              '@responder_jwt_token',
              '@responder_token',
              '@responder_user_session',
            ]);
            const token = pairs[0][1] || pairs[1][1];
            if (token) {
              Api.registerChatPushToken(token, expoPushToken).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn('[PreferencesContext] Push sync warning:', err);
      }
    };
    syncPushRegistration();

    // ⚡ Real-Time WebSocket listener for 0ms silent dynamic updates
    const unsub = RealtimeSocket.on('APP_CONFIG_UPDATED', (newCfg: any) => {
      console.log('[PreferencesContext] Real-time: App config updated from admin');
      if (newCfg) {
        setAppConfig({ ...DEFAULT_APP_CONFIG, ...newCfg });
        OfflineStorage.saveCache('APP_CONFIG', newCfg);
      }
    });

    // 🚨 Real-Time Emergency Alert Broadcast Sound Trigger for all mobile users
    const unsubAlert1 = RealtimeSocket.on('EMERGENCY_ALERT_CREATED', () => {
      console.log('[PreferencesContext] 🚨 Live Emergency Alert received! Playing alarm...');
      soundService.playEmergencyAlertSound().catch(() => {});
    });
    const unsubAlert2 = RealtimeSocket.on('NEW_ALERT', () => {
      soundService.playEmergencyAlertSound().catch(() => {});
    });

    // 💬 Real-Time Chat Message Sound Trigger for all screens across the app
    const unsubChat = RealtimeSocket.on('chat:new_message', async (data: any) => {
      try {
        const msg = data?.message;
        if (!msg) return;

        const pairs = await AsyncStorage.multiGet([
          '@responder_jwt_token',
          '@responder_user_session',
          '@responder_profile',
          '@citizen_user_session'
        ]);
        let myId: string | null = null;
        for (let i = 1; i <= 3; i++) {
          if (pairs[i]?.[1]) {
            try {
              const p = JSON.parse(pairs[i][1] as string);
              if (p?.id || p?.userId || p?._id) {
                myId = p.id || p.userId || p._id;
                break;
              }
            } catch {}
          }
        }

        const senderId = msg.senderId || data.senderId;

        // If I am the sender, DO NOT play notification sound!
        if (senderId && myId && String(senderId) === String(myId)) {
          return;
        }

        // Play dedicated soft chat chime
        soundService.playChatMessageSound().catch(() => {});
      } catch (err) {
        console.warn('[PreferencesContext] Chat sound error:', err);
      }
    });

    return () => {
      unsub();
      unsubAlert1();
      unsubAlert2();
      unsubChat();
    };
  }, []);

  const loadPreferences = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@app_theme');
      if (savedTheme === 'dark') {
        setThemeState('dark');
      } else {
        setThemeState('light');
      }
      const savedLang = await AsyncStorage.getItem('@app_language');
      if (savedLang === 'tl') {
        setLanguageState('tl');
      } else {
        setLanguageState('en');
      }
    } catch {}
  };

  const loadAppConfig = async () => {
    try {
      // 1. Instant 0ms Local Cache Load
      const cached = await OfflineStorage.getCache<AppConfigData>('APP_CONFIG');
      if (cached) {
        setAppConfig({ ...DEFAULT_APP_CONFIG, ...cached });
      }

      // 2. Background Revalidation
      Api.getAppConfig().then((res) => {
        if (res.data) {
          setAppConfig({ ...DEFAULT_APP_CONFIG, ...res.data });
        }
      }).catch(() => {});
    } catch {}
  };

  const setTheme = async (t: AppTheme) => {
    setThemeState(t);
    try {
      await AsyncStorage.setItem('@app_theme', t);
    } catch {}
  };

  const setLanguage = async (l: AppLanguage) => {
    setLanguageState(l);
    try {
      await AsyncStorage.setItem('@app_language', l);
    } catch {}
  };

  const t = (key: string, fallback?: string) => {
    const item = translations[key];
    if (item && item[language]) return item[language];
    return fallback || key;
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <PreferencesContext.Provider value={{ theme, language, colors, appConfig, setTheme, setLanguage, t }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);
