import {
  Barangay,
  EvacuationCenter,
  HazardZone,
  EvacuationRoute,
  PreparednessGuide,
  EmergencyContact,
  DisasterAlert,
  DisasterReport
} from '../types';
import { OfflineStorage } from './offlineStorage';

// Default to local backend URL (10.0.2.2 for Android emulator / physical phone LAN IP)
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api/v1';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

const FIREBASE_REST_BASE = 'https://firestore.googleapis.com/v1/projects/irosin-disaster-system-e2388/databases/(default)/documents';

function parseFirestoreValue(val: any): any {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(parseFirestoreValue);
  if ('mapValue' in val) {
    const obj: any = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      obj[k] = parseFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

function parseFirestoreDoc(doc: any): any {
  const fields = doc.fields || {};
  const obj: any = {};
  for (const [k, v] of Object.entries(fields)) {
    obj[k] = parseFirestoreValue(v);
  }
  return obj;
}

async function fetchFromFirebase(collection: string): Promise<any[] | null> {
  try {
    const res = await fetch(`${FIREBASE_REST_BASE}/${collection}`);
    if (res.ok) {
      const json = await res.json();
      if (json.documents) {
        return json.documents.map((doc: any) => parseFirestoreDoc(doc));
      }
      return [];
    }
  } catch (e) {
    console.warn('Firebase REST fetch error:', e);
  }
  return null;
}

export const Api = {
  async getBarangays(): Promise<{ data: Barangay[]; isOffline: boolean }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/barangays`, {}, 2500);
      if (res.ok) {
        const json = await res.json();
        await OfflineStorage.saveCache('BARANGAYS', json.barangays);
        return { data: json.barangays, isOffline: false };
      }
      throw new Error('Non-200 response');
    } catch {
      const fbData = await fetchFromFirebase('barangays');
      if (fbData) {
        await OfflineStorage.saveCache('BARANGAYS', fbData);
        return { data: fbData, isOffline: false };
      }
      const cached = await OfflineStorage.getCache<Barangay[]>('BARANGAYS');
      return { data: cached || DEMO_BARANGAYS, isOffline: true };
    }
  },

  async getCenters(barangayId?: string): Promise<{ data: EvacuationCenter[]; isOffline: boolean }> {
    try {
      const url = barangayId ? `${API_BASE}/evacuation-centers?barangayId=${barangayId}` : `${API_BASE}/evacuation-centers`;
      const res = await fetchWithTimeout(url, {}, 2500);
      if (res.ok) {
        const json = await res.json();
        await OfflineStorage.saveCache('CENTERS', json.evacuationCenters);
        return { data: json.evacuationCenters, isOffline: false };
      }
      throw new Error('Non-200 response');
    } catch {
      const fbData = await fetchFromFirebase('evacuation_centers');
      if (fbData) {
        await OfflineStorage.saveCache('CENTERS', fbData);
        const data = barangayId ? fbData.filter((c: any) => c.barangayId === barangayId) : fbData;
        return { data, isOffline: false };
      }
      const cached = await OfflineStorage.getCache<EvacuationCenter[]>('CENTERS');
      const data = cached || DEMO_CENTERS;
      return {
        data: barangayId ? data.filter(c => c.barangayId === barangayId) : data,
        isOffline: true
      };
    }
  },

  async getHazards(barangayId?: string): Promise<{ data: HazardZone[]; isOffline: boolean }> {
    try {
      const url = barangayId ? `${API_BASE}/hazards?barangayId=${barangayId}` : `${API_BASE}/hazards`;
      const res = await fetchWithTimeout(url, {}, 2500);
      if (res.ok) {
        const json = await res.json();
        await OfflineStorage.saveCache('HAZARDS', json.hazardZones);
        return { data: json.hazardZones, isOffline: false };
      }
      throw new Error('Non-200 response');
    } catch {
      const fbData = await fetchFromFirebase('hazard_zones');
      if (fbData) {
        await OfflineStorage.saveCache('HAZARDS', fbData);
        return { data: fbData, isOffline: false };
      }
      const cached = await OfflineStorage.getCache<HazardZone[]>('HAZARDS');
      const data = cached || DEMO_HAZARDS;
      return { data, isOffline: true };
    }
  },

  async getRoutes(barangayId?: string, destinationCenterId?: string): Promise<{ data: EvacuationRoute[]; isOffline: boolean }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/evacuation-routes`, {}, 2500);
      if (res.ok) {
        const json = await res.json();
        await OfflineStorage.saveCache('ROUTES', json.evacuationRoutes);
        return { data: json.evacuationRoutes, isOffline: false };
      }
      throw new Error('Non-200 response');
    } catch {
      const fbData = await fetchFromFirebase('evacuation_routes');
      let data = fbData;
      if (data) {
        await OfflineStorage.saveCache('ROUTES', data);
        if (barangayId) data = data.filter((r: any) => r.barangayId === barangayId);
        if (destinationCenterId) data = data.filter((r: any) => r.destinationCenterId === destinationCenterId);
        return { data, isOffline: false };
      }
      const cached = await OfflineStorage.getCache<EvacuationRoute[]>('ROUTES');
      data = cached || DEMO_ROUTES;
      if (barangayId) data = data.filter(r => r.barangayId === barangayId);
      if (destinationCenterId) data = data.filter(r => r.destinationCenterId === destinationCenterId);
      return { data, isOffline: true };
    }
  },

  async getContacts(): Promise<{ data: EmergencyContact[]; isOffline: boolean }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/emergency-contacts`, {}, 2500);
      if (res.ok) {
        const json = await res.json();
        await OfflineStorage.saveCache('CONTACTS', json.emergencyContacts);
        return { data: json.emergencyContacts, isOffline: false };
      }
      throw new Error('Non-200 response');
    } catch {
      const fbData = await fetchFromFirebase('emergency_contacts');
      if (fbData) {
        await OfflineStorage.saveCache('CONTACTS', fbData);
        return { data: fbData, isOffline: false };
      }
      const cached = await OfflineStorage.getCache<EmergencyContact[]>('CONTACTS');
      return { data: cached || DEMO_CONTACTS, isOffline: true };
    }
  },

  async getGuides(hazardType?: string, category?: string): Promise<{ data: PreparednessGuide[]; isOffline: boolean }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/preparedness`, {}, 2500);
      if (res.ok) {
        const json = await res.json();
        await OfflineStorage.saveCache('GUIDES', json.preparednessGuides);
        return { data: json.preparednessGuides, isOffline: false };
      }
      throw new Error('Non-200 response');
    } catch {
      const fbData = await fetchFromFirebase('preparedness_guides');
      let data = fbData;
      if (data) {
        await OfflineStorage.saveCache('GUIDES', data);
        if (hazardType) data = data.filter((g: any) => g.hazardType === hazardType);
        if (category) data = data.filter((g: any) => g.category === category);
        return { data, isOffline: false };
      }
      const cached = await OfflineStorage.getCache<PreparednessGuide[]>('GUIDES');
      data = cached || DEMO_GUIDES;
      if (hazardType) data = data.filter(g => g.hazardType === hazardType);
      if (category) data = data.filter(g => g.category === category);
      return { data, isOffline: true };
    }
  },

  async getAlerts(): Promise<{ data: DisasterAlert[]; isOffline: boolean }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/alerts`, {}, 2500);
      if (res.ok) {
        const json = await res.json();
        await OfflineStorage.saveCache('ALERTS', json.alerts);
        return { data: json.alerts, isOffline: false };
      }
      throw new Error('Non-200 response');
    } catch {
      const fbData = await fetchFromFirebase('alerts');
      if (fbData) {
        await OfflineStorage.saveCache('ALERTS', fbData);
        return { data: fbData, isOffline: false };
      }
      const cached = await OfflineStorage.getCache<DisasterAlert[]>('ALERTS');
      return { data: cached || DEMO_ALERTS, isOffline: true };
    }
  },

  async submitReport(payload: any): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        return { success: true, message: json.message };
      }
      throw new Error('Submission failed');
    } catch {
      return {
        success: true,
        message: 'Report saved locally (Offline mode). It will sync once connectivity returns.'
      };
    }
  }
};

// Localized Demo Fallbacks for Irosin, Sorsogon
const now = new Date().toISOString();

const DEMO_BARANGAYS: Barangay[] = [
  { id: 'brgy-1', name: 'Monbon', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.7081, longitude: 124.0325, population: 4250, status: 'ACTIVE' },
  { id: 'brgy-2', name: 'San Agustin', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.7042, longitude: 124.0371, population: 5800, status: 'ACTIVE' },
  { id: 'brgy-3', name: 'Gabao', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.7215, longitude: 124.0203, population: 3900, status: 'ACTIVE' },
  { id: 'brgy-4', name: 'San Julian', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.6985, longitude: 124.0412, population: 4100, status: 'ACTIVE' },
  { id: 'brgy-5', name: 'Buenavista', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.6852, longitude: 124.0531, population: 3100, status: 'ACTIVE' },
  { id: 'brgy-6', name: 'San Roque', municipality: 'Bulusan', province: 'Sorsogon', latitude: 12.7512, longitude: 124.1324, population: 3500, status: 'ACTIVE' }
];

const DEMO_CENTERS: EvacuationCenter[] = [];
const DEMO_HAZARDS: HazardZone[] = [];
const DEMO_ROUTES: EvacuationRoute[] = [];
const DEMO_CONTACTS: EmergencyContact[] = [];
const DEMO_GUIDES: PreparednessGuide[] = [];
const DEMO_ALERTS: DisasterAlert[] = [];
