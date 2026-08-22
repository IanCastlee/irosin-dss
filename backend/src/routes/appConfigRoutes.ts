import { Router, Request, Response } from 'express';
import { db } from '../config/firebase';
import { emitRealtimeEvent } from '../services/socketService';

const router = Router();

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

export interface AppConfig {
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
  apiIntegrations: ApiIntegrationItem[];
  techStack: TechStackItem[];
  updatedAt: string;
}

const DEFAULT_CONFIG: AppConfig = {
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
      purpose: "Real-time atmospheric telemetry, temperature, humidity, precipitation radar, at 5-day extended forecasts para sa Irosin at Sorsogon municipalities.",
      status: "ACTIVE",
      attributionUrl: "https://open-meteo.com/"
    },
    {
      id: "api-2",
      name: "USGS Earthquake Hazards Feed",
      category: "Real-Time Seismic Monitoring",
      provider: "United States Geological Survey (USGS)",
      purpose: "250km radius seismic monitoring sa paligid ng Bulkang Bulusan at Irosin faults (M3.5+ earthquake alerts).",
      status: "ACTIVE",
      attributionUrl: "https://earthquake.usgs.gov/"
    },
    {
      id: "api-3",
      name: "OpenStreetMap & Nominatim Geocoding",
      category: "Geographic Map & Reverse Geocoding",
      provider: "OpenStreetMap Foundation & Contributors",
      purpose: "High-resolution road maps, barangay boundary resolution, at incident location reverse geocoding.",
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
      category: "Frontend Mobile Client",
      description: "Native cross-platform mobile application para sa Android at iOS na may type-safe architecture."
    },
    {
      id: "tech-2",
      name: "Node.js & Express REST API",
      category: "Backend Application Gateway",
      description: "Modular RESTful microservices para sa authentication, disaster report triage, at automated weather sync."
    },
    {
      id: "tech-3",
      name: "Socket.IO WebSockets Gateway",
      category: "Real-time Synchronization",
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
      name: "Leaflet.js & WebView Mapping",
      category: "Geospatial Engine",
      description: "Custom interactive mapping na may pulsing GPS beacon glow rings at safe evacuation routing."
    }
  ],
  updatedAt: new Date().toISOString()
};

let inMemoryConfig: AppConfig = { ...DEFAULT_CONFIG };

/**
 * GET /api/v1/app-config
 * Public endpoint consumed by Mobile App and Admin Dashboard
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (db) {
      const doc = await db.collection('system_config').doc('app_profile').get();
      if (doc.exists) {
        const data = doc.data() as AppConfig;
        inMemoryConfig = {
          ...DEFAULT_CONFIG,
          ...data,
          apiIntegrations: data.apiIntegrations && data.apiIntegrations.length > 0 ? data.apiIntegrations : DEFAULT_CONFIG.apiIntegrations,
          techStack: data.techStack && data.techStack.length > 0 ? data.techStack : DEFAULT_CONFIG.techStack,
        };
        return res.json({ success: true, config: inMemoryConfig });
      }
    }
  } catch (err) {
    console.warn('[AppConfig] Error fetching from Firestore, returning cached config:', err);
  }
  return res.json({ success: true, config: inMemoryConfig });
});

/**
 * PUT /api/v1/app-config
 * Admin endpoint to update system identity, about, privacy notice, terms, APIs & Tech Stack
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const {
      appName,
      locationSubtitle,
      version,
      commandCenterHotline,
      aboutDescription,
      authority,
      developmentTeam,
      academicYear,
      privacyNoticeTitle,
      privacyNoticeContent,
      termsTitle,
      termsContent,
      apiIntegrations,
      techStack
    } = req.body;

    const updatedConfig: AppConfig = {
      appName: (appName || inMemoryConfig.appName || DEFAULT_CONFIG.appName).trim(),
      locationSubtitle: (locationSubtitle || inMemoryConfig.locationSubtitle || DEFAULT_CONFIG.locationSubtitle).trim(),
      version: (version || inMemoryConfig.version || DEFAULT_CONFIG.version).trim(),
      commandCenterHotline: (commandCenterHotline || inMemoryConfig.commandCenterHotline || DEFAULT_CONFIG.commandCenterHotline).trim(),
      aboutDescription: (aboutDescription || inMemoryConfig.aboutDescription || DEFAULT_CONFIG.aboutDescription).trim(),
      authority: (authority || inMemoryConfig.authority || DEFAULT_CONFIG.authority).trim(),
      developmentTeam: (developmentTeam || inMemoryConfig.developmentTeam || DEFAULT_CONFIG.developmentTeam).trim(),
      academicYear: (academicYear || inMemoryConfig.academicYear || DEFAULT_CONFIG.academicYear).trim(),
      privacyNoticeTitle: (privacyNoticeTitle || inMemoryConfig.privacyNoticeTitle || DEFAULT_CONFIG.privacyNoticeTitle).trim(),
      privacyNoticeContent: (privacyNoticeContent || inMemoryConfig.privacyNoticeContent || DEFAULT_CONFIG.privacyNoticeContent).trim(),
      termsTitle: (termsTitle || inMemoryConfig.termsTitle || DEFAULT_CONFIG.termsTitle).trim(),
      termsContent: (termsContent || inMemoryConfig.termsContent || DEFAULT_CONFIG.termsContent).trim(),
      apiIntegrations: Array.isArray(apiIntegrations) ? apiIntegrations : (inMemoryConfig.apiIntegrations || DEFAULT_CONFIG.apiIntegrations),
      techStack: Array.isArray(techStack) ? techStack : (inMemoryConfig.techStack || DEFAULT_CONFIG.techStack),
      updatedAt: new Date().toISOString()
    };

    inMemoryConfig = updatedConfig;

    if (db) {
      await db.collection('system_config').doc('app_profile').set(updatedConfig, { merge: true });
    }

    // Broadcast instant update to all connected mobile clients via WebSocket
    emitRealtimeEvent('APP_CONFIG_UPDATED', updatedConfig);

    return res.json({
      success: true,
      message: 'Matagumpay na na-update ang mga impormasyon, API Integrations, at patakaran ng system.',
      config: updatedConfig
    });
  } catch (err: any) {
    console.error('[AppConfig] Error saving config:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to update app configuration' });
  }
});

export default router;
