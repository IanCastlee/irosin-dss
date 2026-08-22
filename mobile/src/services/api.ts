import {
  Barangay,
  EvacuationCenter,
  EvacuationRoute,
  PreparednessGuide,
  EmergencyContact,
  DisasterAlert,
  DisasterReport
} from '../types';
import { OfflineStorage } from './offlineStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production Cloud Backend URL (Render HTTPS)
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://irosin-dss-api.onrender.com/api/v1';

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
  if (!obj.id && doc.name) {
    const parts = doc.name.split('/');
    obj.id = parts[parts.length - 1];
  }
  if (!obj.createdAt && doc.createTime) {
    obj.createdAt = doc.createTime;
  }
  return obj;
}

async function fetchFromFirebase(collection: string): Promise<any[] | null> {
  try {
    const res = await fetchWithTimeout(`${FIREBASE_REST_BASE}/${collection}`, {}, 8000);
    if (res && res.ok) {
      const json = await res.json();
      if (json.documents) {
        return json.documents.map((doc: any) => parseFirestoreDoc(doc));
      }
      return [];
    }
  } catch (e) {
    console.warn('Firebase REST fetch notice:', e);
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
      const res = await fetchWithTimeout(url, {}, 3500);
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

  /** Create a new Evacuation Center (Authorized Responder & Admin) */
  async createEvacuationCenter(token: string | null | undefined, data: any): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetchWithTimeout(`${API_BASE}/evacuation-centers`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    }, 8000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || 'Hindi maiproseso ang pagdagdag ng Evacuation Center.');
    }
    return res.json();
  },

  /** Update an existing Evacuation Center (Status / Occupancy / Details) */
  async updateEvacuationCenter(token: string | null | undefined, id: string, data: any): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetchWithTimeout(`${API_BASE}/evacuation-centers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    }, 8000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || 'Hindi ma-update ang Evacuation Center.');
    }
    return res.json();
  },

  /** Delete an Evacuation Center */
  async deleteEvacuationCenter(token: string | null | undefined, id: string): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetchWithTimeout(`${API_BASE}/evacuation-centers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    }, 8000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || 'Hindi mabura ang Evacuation Center.');
    }
    return res.json();
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
    const params = new URLSearchParams();
    if (hazardType && hazardType !== 'ALL') params.append('hazardType', hazardType);
    if (category) params.append('category', category);
    const qs = params.toString() ? `?${params.toString()}` : '';

    try {
      const res = await fetchWithTimeout(`${API_BASE}/preparedness${qs}`, {}, 2500);
      if (res.ok) {
        const json = await res.json();
        let guides = json.preparednessGuides || [];
        if (category) guides = guides.filter((g: any) => g.category === category);
        if (hazardType && hazardType !== 'ALL') guides = guides.filter((g: any) => g.hazardType === hazardType);
        await OfflineStorage.saveCache('GUIDES', guides);
        return { data: guides, isOffline: false };
      }
      throw new Error('Non-200 response');
    } catch {
      const fbData = await fetchFromFirebase('preparedness_guides');
      let data = fbData;
      if (data) {
        if (hazardType && hazardType !== 'ALL') data = data.filter((g: any) => g.hazardType === hazardType);
        if (category) data = data.filter((g: any) => g.category === category);
        await OfflineStorage.saveCache('GUIDES', data);
        return { data, isOffline: false };
      }
      const cached = await OfflineStorage.getCache<PreparednessGuide[]>('GUIDES');
      data = cached || DEMO_GUIDES;
      if (hazardType && hazardType !== 'ALL') data = data.filter(g => g.hazardType === hazardType);
      if (category) data = data.filter(g => g.category === category);
      return { data, isOffline: true };
    }
  },

  async getAlerts(cursor?: string, limit = 20): Promise<{ data: DisasterAlert[]; nextCursor?: string | null; hasMore?: boolean; isOffline: boolean }> {
    try {
      const query = new URLSearchParams();
      if (cursor) query.append('cursor', cursor);
      if (limit) query.append('limit', limit.toString());
      const qs = query.toString() ? `?${query.toString()}` : '';

      const res = await fetchWithTimeout(`${API_BASE}/alerts${qs}`, {}, 2500);
      if (res.ok) {
        const json = await res.json();
        if (!cursor) {
          await OfflineStorage.saveCache('ALERTS', json.alerts);
        }
        return { data: json.alerts, nextCursor: json.nextCursor, hasMore: json.hasMore, isOffline: false };
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

  async getVerifiedDisasterReports(): Promise<{ data: any[]; isOffline: boolean }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/reports?limit=100`, {}, 6000);
      if (res.ok) {
        const json = await res.json();
        const reports = (json.disasterReports || []).filter((r: any) =>
          ['VERIFIED', 'UNDER_CLEARING', 'RESOLVED', 'IMPASSABLE', 'CAUTION'].includes(r.status) &&
          r.status !== 'PENDING' &&
          r.status !== 'REJECTED'
        );
        await OfflineStorage.saveCache('VERIFIED_REPORTS', reports);
        return { data: reports, isOffline: false };
      }
      throw new Error('Non-200 response');
    } catch {
      const fbData = await fetchFromFirebase('disaster_reports');
      if (fbData) {
        const verified = fbData.filter((r: any) =>
          ['VERIFIED', 'UNDER_CLEARING', 'RESOLVED', 'IMPASSABLE', 'CAUTION'].includes(r.status) &&
          r.status !== 'PENDING' &&
          r.status !== 'REJECTED'
        );
        await OfflineStorage.saveCache('VERIFIED_REPORTS', verified);
        return { data: verified, isOffline: false };
      }
      const cached = await OfflineStorage.getCache<any[]>('VERIFIED_REPORTS');
      return { data: cached || [], isOffline: true };
    }
  },

  async toggleNoted(reportId: string): Promise<boolean> {
    try {
      await fetchWithTimeout(`${API_BASE}/reports/${reportId}/noted`, { method: 'POST' }, 3000);
      return true;
    } catch {
      return true;
    }
  },

  async getPowerInterruptions(): Promise<{ data: any[]; isOffline: boolean }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/power-interruptions`, {}, 2500);
      if (res.ok) {
        const json = await res.json();
        const items = json.powerInterruptions || [];
        await OfflineStorage.saveCache('POWER_INTERRUPTIONS', items);
        return { data: items, isOffline: false };
      }
      throw new Error('Non-200 response');
    } catch {
      const fbData = await fetchFromFirebase('power_interruptions');
      if (fbData) {
        await OfflineStorage.saveCache('POWER_INTERRUPTIONS', fbData);
        return { data: fbData, isOffline: false };
      }
      const cached = await OfflineStorage.getCache<any[]>('POWER_INTERRUPTIONS');
      return { data: cached || [], isOffline: true };
    }
  },

  async getAnnouncements(): Promise<{ data: any[]; isOffline: boolean }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/announcements`, {}, 2500);
      if (res.ok) {
        const json = await res.json();
        const items = json.announcements || [];
        await OfflineStorage.saveCache('ANNOUNCEMENTS', items);
        return { data: items, isOffline: false };
      }
      throw new Error('Non-200 response');
    } catch {
      const fbData = await fetchFromFirebase('announcements');
      if (fbData) {
        await OfflineStorage.saveCache('ANNOUNCEMENTS', fbData);
        return { data: fbData, isOffline: false };
      }
      const cached = await OfflineStorage.getCache<any[]>('ANNOUNCEMENTS');
      return { data: cached || [], isOffline: true };
    }
  },

  async toggleAnnouncementNoted(id: string): Promise<boolean> {
    try {
      await fetchWithTimeout(`${API_BASE}/announcements/${id}/noted`, { method: 'POST' }, 3000);
      return true;
    } catch {
      return true;
    }
  },

  async submitReport(payload: any): Promise<{ success: boolean; message: string; remainingToday?: number }> {
    const docId = payload.id || ('report-' + Date.now());
    const createdAt = new Date().toISOString();

    const photoList: string[] = [];
    if (Array.isArray(payload.photos)) {
      payload.photos.forEach((p: any) => {
        if (p && typeof p === 'string' && p.trim()) photoList.push(p.trim());
      });
    }
    if (payload.imageUrl && !photoList.includes(payload.imageUrl.trim())) {
      photoList.unshift(payload.imageUrl.trim());
    }
    if (payload.photoUrl && !photoList.includes(payload.photoUrl.trim())) {
      photoList.push(payload.photoUrl.trim());
    }
    const primaryPhoto = photoList.length > 0 ? photoList[0] : '';

    let fbSuccess = false;
    // 1. Direct Sync to Firebase Cloud Firestore
    try {
      const fbFields: any = {
        id: { stringValue: docId },
        reportType: { stringValue: payload.reportType || 'OTHER' },
        description: { stringValue: payload.description || '' },
        latitude: { doubleValue: Number(payload.latitude) || 12.7081 },
        longitude: { doubleValue: Number(payload.longitude) || 124.0325 },
        locationDescription: { stringValue: payload.locationDescription || '' },
        barangayId: { stringValue: payload.barangayId || 'brgy-1' },
        barangayName: { stringValue: payload.barangayName || 'Irosin' },
        status: { stringValue: 'PENDING' },
        reporterPhotoCount: { integerValue: String(photoList.length) },
        createdAt: { stringValue: createdAt },
        updatedAt: { stringValue: createdAt }
      };

      if (primaryPhoto) {
        fbFields.imageUrl = { stringValue: primaryPhoto };
        fbFields.photoUrl = { stringValue: primaryPhoto };
      }

      if (photoList.length > 0) {
        fbFields.photos = {
          arrayValue: {
            values: photoList.map((p: string) => ({ stringValue: p }))
          }
        };
      }

      const fbRes = await fetchWithTimeout(`${FIREBASE_REST_BASE}/disaster_reports?documentId=${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fbFields })
      }, 7000);
      if (fbRes.ok) {
        fbSuccess = true;
        console.log('[API] Disaster report written directly to Firebase Firestore:', docId);
      }
    } catch (fbErr) {
      console.warn('[API] Firebase direct write notice:', fbErr);
    }

    // 2. Submit to Backend API
    let backendSuccess = false;
    let backendMsg = '';
    let remainingToday: number | undefined;

    try {
      const res = await fetchWithTimeout(`${API_BASE}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: docId,
          ...payload,
          photos: photoList,
          imageUrl: primaryPhoto,
          photoUrl: primaryPhoto
        })
      }, 10000);

      const json = await res.json().catch(() => ({}));

      if (res.status === 429) {
        throw new Error(json.error || 'Nakaabot na po kayo sa limit na 3 reports ngayong araw.');
      }

      if (res.ok) {
        backendSuccess = true;
        backendMsg = json.message || 'Natanggap na ng MDRRMO ang inyong ulat!';
        remainingToday = json.remainingToday;
      }
    } catch (err: any) {
      if (err?.message && err.message.includes('limit')) {
        throw err;
      }
      console.warn('[API] Backend submit notice:', err);
    }

    // Strict validation: if neither reached the cloud/server, reject with internet connection error!
    if (!fbSuccess && !backendSuccess) {
      throw new Error('Walang koneksyon sa internet. Hindi maipadala ang ulat sa MDRRMO.');
    }

    return {
      success: true,
      message: backendMsg || 'Natanggap na ng MDRRMO ang inyong ulat!',
      remainingToday
    };
  },

  async registerResponderDevice(token: string, isResponder: boolean) {
    try {
      await fetch(`${API_BASE}/admin/push/register-mobile-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, isResponder })
      });
      return true;
    } catch {
      return true;
    }
  },

  async responderRegister(data: {
    fullName: string;
    username: string;
    password: string;
    phone: string;
    barangayId: string;
    barangayName?: string;
    roleTitle: string;
    fcmToken?: string;
  }): Promise<{ success: boolean; message: string; user?: any }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/auth/responder/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }, 7000);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Hindi maiproseso ang rehistrasyon.');
      }
      return json;
    } catch (err: any) {
      throw new Error(err.message || 'Hindi makakonekta sa MDRRMO backend server (192.168.1.35:5000). Pakitiyak na naka-connect sa parehong Wi-Fi ang cellphone at computer at tumatakbo ang backend.');
    }
  },

  async responderLogin(data: {
    username: string;
    password: string;
    fcmToken?: string;
  }): Promise<{ success: boolean; message?: string; token?: string; user?: any; status?: string; error?: string }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/auth/responder/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }, 7000);
      const json = await res.json();
      if (!res.ok) {
        return { success: false, ...json };
      }
      return { success: true, ...json };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Hindi makakonekta sa MDRRMO backend server (192.168.1.35:5000). Pakitiyak na naka-connect sa parehong Wi-Fi ang cellphone at computer at tumatakbo ang backend server.'
      };
    }
  },

  async getResponderProfile(token?: string | null): Promise<any | null> {
    try {
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetchWithTimeout(`${API_BASE}/auth/me`, { headers }, 4000);
      if (res && res.ok) {
        const json = await res.json();
        return json.user || null;
      }
      return null;
    } catch {
      return null;
    }
  },

  async requestResponderAccess(data: { token: string; fullName: string; roleTitle: string; phone: string; barangayName: string }) {
    try {
      const res = await fetch(`${API_BASE}/admin/push/request-responder-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (err: any) {
      throw new Error(err?.message || 'Failed to submit responder request');
    }
  },

  async checkResponderStatus(token: string): Promise<{ status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NONE'; requestData?: any }> {
    try {
      const res = await fetch(`${API_BASE}/admin/push/check-responder-status?token=${encodeURIComponent(token)}`);
      return await res.json();
    } catch {
      return { status: 'NONE' };
    }
  },

  async submitResponderAction(reportId: string, data: {
    status: string;
    responderNotes?: string;
    actionTakenBy?: string;
    roleTitle?: string;
    barangayName?: string;
    photos?: string[];
    photoItems?: { uri: string; stage: string; label: string; uploadedBy?: string; createdAt?: string }[];
    requestBackup?: boolean;
    alternateRoute?: string;
    affectedRoute?: string;
  }) {
    let fbSuccess = false;
    let backendSuccess = false;
    let backendJson: any = null;

    // 1. Submit to Backend API (which also handles Firestore sync and websocket broadcast)
    const backendPromise = (async () => {
      try {
        const res = await fetchWithTimeout(`${API_BASE}/reports/${encodeURIComponent(reportId)}/responder-action`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }, 8000);
        const text = await res.text();
        try {
          backendJson = JSON.parse(text);
          if (res.ok) backendSuccess = true;
        } catch {
          if (res.ok) backendSuccess = true;
        }
      } catch (err: any) {
        console.warn('[API] Backend responder action notice:', err);
      }
    })();

    // 2. Direct Sync update to Firebase Cloud Firestore in parallel
    const fbPromise = (async () => {
      try {
        const updateMasks: string[] = ['updateMask.fieldPaths=status', 'updateMask.fieldPaths=updatedAt'];
        const fbFields: any = {
          status: { stringValue: data.status },
          updatedAt: { stringValue: new Date().toISOString() }
        };

        if (data.responderNotes) {
          fbFields.adminNotes = { stringValue: data.responderNotes };
          updateMasks.push('updateMask.fieldPaths=adminNotes');
        }
        if (data.affectedRoute) {
          fbFields.affectedRoute = { stringValue: data.affectedRoute };
          updateMasks.push('updateMask.fieldPaths=affectedRoute');
        }
        if (data.alternateRoute) {
          fbFields.alternateRoute = { stringValue: data.alternateRoute };
          updateMasks.push('updateMask.fieldPaths=alternateRoute');
        }
        if (data.actionTakenBy) {
          const who = `${data.actionTakenBy}${data.roleTitle ? ` (${data.roleTitle})` : ''}${data.barangayName ? ` - ${data.barangayName}` : ''}`;
          fbFields.verifiedBy = { stringValue: who };
          updateMasks.push('updateMask.fieldPaths=verifiedBy');
        }
        if (data.requestBackup !== undefined) {
          fbFields.requestBackup = { booleanValue: !!data.requestBackup };
          updateMasks.push('updateMask.fieldPaths=requestBackup');
        }
        if (Array.isArray(data.photos) && data.photos.length > 0) {
          fbFields.photos = {
            arrayValue: {
              values: data.photos.map((p: string) => ({ stringValue: p }))
            }
          };
          updateMasks.push('updateMask.fieldPaths=photos');
          fbFields.photoUrl = { stringValue: data.photos[0] };
          updateMasks.push('updateMask.fieldPaths=photoUrl');
        }
        if (Array.isArray(data.photoItems) && data.photoItems.length > 0) {
          fbFields.photoItems = {
            arrayValue: {
              values: data.photoItems.map((pi) => ({
                mapValue: {
                  fields: {
                    uri: { stringValue: pi.uri },
                    stage: { stringValue: pi.stage },
                    label: { stringValue: pi.label },
                    uploadedBy: { stringValue: pi.uploadedBy || 'Responder' },
                    createdAt: { stringValue: pi.createdAt || new Date().toISOString() }
                  }
                }
              }))
            }
          };
          updateMasks.push('updateMask.fieldPaths=photoItems');
        }

        const fbRes = await fetchWithTimeout(`${FIREBASE_REST_BASE}/disaster_reports/${encodeURIComponent(reportId)}?${updateMasks.join('&')}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: fbFields })
        }, 8000);
        if (fbRes.ok) {
          fbSuccess = true;
          console.log('[API] Responder action synced to Firebase Firestore:', reportId);
        }
      } catch (fbErr) {
        console.warn('[API] Firebase direct update notice:', fbErr);
      }
    })();

    // Run both simultaneously for lightning fast responsiveness
    await Promise.all([backendPromise, fbPromise]);

    // Strict validation: if neither reached the cloud/server, reject with internet connection error!
    if (!fbSuccess && !backendSuccess) {
      throw new Error('Walang koneksyon sa internet. Hindi maipadala ang aksyon sa MDRRMO server.');
    }

    return backendJson || { success: true, message: 'Matagumpay na naitala ang aksyon ng responder.' };
  },

  getWeather: async (locationKey = 'irosin'): Promise<{ data: any; isOffline: boolean }> => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/weather/${locationKey.toLowerCase()}`, {
        headers: { 'Accept': 'application/json' }
      }, 1800);
      if (res && res.ok) {
        const data = await res.json();
        await OfflineStorage.saveCache('IROSIN_WEATHER', data);
        return { data, isOffline: false };
      }
    } catch {}

    // Direct fallback to Open-Meteo (works instantly even when local backend is unreachable)
    try {
      const coords: Record<string, { lat: number; lng: number; name: string }> = {
        irosin: { lat: 12.7042, lng: 124.0371, name: "Irosin" },
        bulusan: { lat: 12.7512, lng: 124.1324, name: "Bulusan" },
        juban: { lat: 12.8485, lng: 123.9961, name: "Juban" },
        casiguran: { lat: 12.8715, lng: 124.0094, name: "Casiguran" },
        bulan: { lat: 12.6698, lng: 123.8758, name: "Bulan" },
        gubat: { lat: 12.9189, lng: 124.1242, name: "Gubat" },
        sorsogon_city: { lat: 12.9742, lng: 124.0058, name: "Sorsogon City" },
        matnog: { lat: 12.5852, lng: 124.0847, name: "Matnog" },
      };
      const loc = coords[locationKey.toLowerCase()] || coords['irosin'];
      const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,surface_pressure,wind_speed_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FManila`;
      
      const omRes = await fetchWithTimeout(openMeteoUrl, {}, 2500);
      if (omRes && omRes.ok) {
        const raw: any = await omRes.json();
        const cur = raw.current || {};
        const windSpeed = cur.wind_speed_10m || 0;
        const windGusts = cur.wind_gusts_10m || 0;
        const pressure = cur.surface_pressure || 1012;
        const precipitation = cur.precipitation || 0;
        
        let hasActiveThreat = false;
        let threatCategory = 'NONE';
        let advisoryLevel = 'NONE';
        let threatTitle = `Maliwalas ang Panahon sa ${loc.name}`;
        let threatDesc = `Walang aktibong banta ng bagyo o sama ng panahon sa ${loc.name} sa kasalukuyan.`;
        let windSignal = 0;

        if (windSpeed >= 89 || windGusts >= 110 || pressure < 990) {
          hasActiveThreat = true;
          threatCategory = 'TYPHOON';
          advisoryLevel = 'RED';
          windSignal = 3;
          threatTitle = `⚠️ BABALA SA BAGYO (${loc.name})`;
          threatDesc = `Malalakas na hangin (${Math.round(windSpeed)} km/h) at mababang presyon (${Math.round(pressure)} hPa).`;
        } else if (windSpeed >= 62 || windGusts >= 80 || pressure < 1000) {
          hasActiveThreat = true;
          threatCategory = 'TROPICAL_STORM';
          advisoryLevel = 'ORANGE';
          windSignal = 2;
          threatTitle = `⚠️ TROPICAL STORM ADVISORY (${loc.name})`;
          threatDesc = `Hanging may lakas na ${Math.round(windSpeed)} km/h. Mag-ingat sa baha at landslides.`;
        } else if (pressure < 1006 || precipitation >= 10 || windSpeed >= 39) {
          hasActiveThreat = true;
          threatCategory = precipitation >= 15 ? 'HEAVY_RAINFALL' : 'LOW_PRESSURE_AREA';
          advisoryLevel = 'YELLOW';
          windSignal = 1;
          threatTitle = precipitation >= 15 ? `🌧️ HEAVY RAINFALL WARNING (${loc.name})` : `🌀 LOW PRESSURE AREA (LPA) SA ${loc.name.toUpperCase()}`;
          threatDesc = `Mababang presyon (${Math.round(pressure)} hPa) at pag-ulan (${precipitation} mm).`;
        }

        const formatted = {
          location: { municipality: loc.name, province: "Sorsogon" },
          current: {
            temperature: Math.round(cur.temperature_2m || 28),
            apparentTemperature: Math.round(cur.apparent_temperature || 31),
            humidity: cur.relative_humidity_2m || 80,
            precipitationMm: cur.precipitation || 0,
            pressureHpa: Math.round(pressure),
            windSpeedKmh: Math.round(windSpeed),
            windGustsKmh: Math.round(windGusts),
            conditionLabel: "Maliwalas ang Panahon",
            conditionEn: "Fair Weather",
            icon: "partly-sunny-outline",
            severity: "NORMAL",
            updatedAt: new Date().toISOString()
          },
          stormAlert: {
            hasActiveThreat,
            category: threatCategory,
            advisoryLevel,
            windSignal,
            title: threatTitle,
            description: threatDesc
          },
          dailyForecast: (raw.daily?.time || []).slice(0, 5).map((dateStr: string, idx: number) => ({
            date: dateStr,
            maxTemp: Math.round(raw.daily?.temperature_2m_max?.[idx] || 31),
            minTemp: Math.round(raw.daily?.temperature_2m_min?.[idx] || 24),
            precipitationSum: raw.daily?.precipitation_sum?.[idx] || 0,
            condition: "Maliwalas",
            icon: "sunny-outline"
          }))
        };
        await OfflineStorage.saveCache('IROSIN_WEATHER', formatted);
        return { data: formatted, isOffline: false };
      }
    } catch {}

    const cached = await OfflineStorage.getCache<any>('IROSIN_WEATHER');
    if (cached) return { data: cached, isOffline: true };

    return {
      data: {
        location: { municipality: "Irosin", province: "Sorsogon" },
        current: {
          temperature: 28,
          apparentTemperature: 31,
          humidity: 80,
          precipitationMm: 0,
          pressureHpa: 1012,
          windSpeedKmh: 12,
          windGustsKmh: 20,
          conditionLabel: "Maliwalas ang Panahon",
          conditionEn: "Fair Weather",
          icon: "partly-sunny-outline",
          severity: "NORMAL",
          updatedAt: new Date().toISOString()
        },
        stormAlert: {
          hasActiveThreat: false,
          category: "NONE",
          advisoryLevel: "NONE",
          windSignal: 0,
          title: "Maliwalas / Normal ang Panahon",
          description: "Walang aktibong banta ng bagyo o sama ng panahon sa Irosin sa kasalukuyan."
        }
      },
      isOffline: true
    };
  },

  getAppConfig: async (): Promise<{ data: any; isOffline: boolean }> => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/app-config`, {
        headers: { 'Accept': 'application/json' }
      }, 2000);
      if (res && res.ok) {
        const json = await res.json();
        if (json && json.config) {
          await OfflineStorage.saveCache('APP_CONFIG', json.config);
          return { data: json.config, isOffline: false };
        }
      }
    } catch {}

    const cached = await OfflineStorage.getCache<any>('APP_CONFIG');
    if (cached) {
      return { data: cached, isOffline: true };
    }

    return {
      data: {
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
        termsContent: "1. PANGKALAHATANG LAYUNIN: Ang system na ito ay nilikha para sa pagpapalaganap ng maagang babala (early warning), impormasyon sa evacuation centers, lagay ng panahon, at pag-uulat ng mga emergency sa Irosin, Sorsogon.\n\n2. RESPONSIBLENG PAG-UULAT: Mahigpit na ipinagbabawal ang pagpapadala ng maling impormasyon, pekeng ulat ng sakuna (prank reports), o nakakapanlinlang na mga larawan. Ang mga lumalabag ay maaaring mapanagot sa ilalim ng umiiral na batas (tulad ng Anti-Hoaxing / RA 10175 at Revised Penal Code).\n\n3. EMERGENCY WARNINGS: Bagama't ginagawa ng sistema ang lahat upang maghatid ng real-time data mula sa PAGASA, PHIVOLCS, at USGS, laging sundin ang opisyal na tagubilin ng mga lokal na awtoridad at MDRRMO personnel sa iyong lugar.\n\n4. OFFLINE OPERATION: Ang app ay may kakayahang mag-imbak ng emergency hotlines at gabay sa kaligtasan kahit walang internet connection."
      },
      isOffline: true
    };
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CHAT API
  // ─────────────────────────────────────────────────────────────────────────────

  /** List/search active responders for starting a new conversation */
  async getChatResponders(token?: string | null, q?: string, cursor?: string): Promise<{
    responders: { id: string; fullName: string; roleTitle: string; barangayName: string; role: string }[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    // 1. Try Backend API first if available
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (q) params.append('q', q);
      if (cursor) params.append('cursor', cursor);
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetchWithTimeout(`${API_BASE}/chat/responders?${params}`, { headers }, 3000);
      if (res && res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.responders) && json.responders.length > 0) {
          return json;
        }
      }
    } catch (err) {
      console.warn('[API] Backend chat responders notice, falling back to direct Firebase:', err);
    }

    // 2. Direct Firestore REST Fallback (100% Real Production Data from Firebase)
    try {
      const fbUsers = await fetchFromFirebase('users');
      if (fbUsers && fbUsers.length > 0) {
        let mapped = fbUsers
          .filter((u: any) => u.status !== 'REJECTED' && u.status !== 'INACTIVE')
          .map((u: any) => ({
            id: u.id || u.username || 'resp',
            fullName: u.fullName || u.username || 'Responder',
            roleTitle: u.roleTitle || (u.role === 'MDRRMO_ADMIN' ? 'MDRRMO Admin' : 'Barangay Responder'),
            barangayName: u.barangayName || (u.isMunicipalWide ? 'Lahat ng Barangay' : 'Irosin'),
            role: u.role || 'RESPONDER',
          }));

        if (q) {
          const qLower = q.toLowerCase();
          mapped = mapped.filter((u: any) =>
            u.fullName.toLowerCase().includes(qLower) ||
            u.barangayName.toLowerCase().includes(qLower) ||
            u.roleTitle.toLowerCase().includes(qLower)
          );
        }

        mapped.sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));
        return { responders: mapped, nextCursor: null, hasMore: false };
      }
    } catch (fbErr) {
      console.warn('[API] Firebase direct responders fetch notice:', fbErr);
    }

    return { responders: [], nextCursor: null, hasMore: false };
  },

  /** Get the authenticated responder's conversation list (paginated) */
  async getChatConversations(token?: string | null, cursor?: string): Promise<{
    conversations: {
      chatId: string; recipientId: string; recipientName: string;
      recipientRoleTitle: string; recipientBarangay: string;
      lastMessage: string; lastMessageAt: string | null;
      lastSenderId: string; unreadCount: number;
    }[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    try {
      let activeToken = token;
      if (!activeToken) {
        try {
          const stored = await AsyncStorage.multiGet(['@responder_jwt_token', '@responder_token']);
          activeToken = stored[0][1] || stored[1][1] || null;
        } catch {}
      }

      const params = new URLSearchParams({ limit: '50' });
      if (cursor) params.append('cursor', cursor);
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

      const res = await fetchWithTimeout(`${API_BASE}/chat/conversations?${params}`, { headers }, 4000);
      if (res && res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[API] getChatConversations network notice:', err);
    }
    return { conversations: [], nextCursor: null, hasMore: false };
  },

  /** Get paginated messages for a conversation (newest first) */
  async getChatMessages(token: string | null | undefined, chatId: string, cursor?: string): Promise<{
    messages: {
      id: string; senderId: string; senderName: string;
      text: string | null; imageUrl: string | null;
      type: 'text' | 'image'; createdAt: string;
      isSeen?: boolean; isEdited?: boolean; editedAt?: string | null;
      reactions?: Record<string, string>; replyTo?: any;
    }[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    try {
      let activeToken = token;
      if (!activeToken) {
        try {
          const stored = await AsyncStorage.multiGet(['@responder_jwt_token', '@responder_token']);
          activeToken = stored[0][1] || stored[1][1] || null;
        } catch {}
      }

      const params = new URLSearchParams({ limit: '50' });
      if (cursor) params.append('cursor', cursor);
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;

      const res = await fetchWithTimeout(`${API_BASE}/chat/${encodeURIComponent(chatId)}/messages?${params}`, { headers }, 4000);
      if (res && res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[API] getChatMessages network notice:', err);
    }
    return { messages: [], nextCursor: null, hasMore: false };
  },

  /** Send a text or image message */
  async sendChatMessage(token: string | null | undefined, payload: {
    recipientId: string;
    type: 'text' | 'image';
    text?: string;
    imageUrl?: string;
    replyTo?: { id: string; senderName: string; text?: string | null; type: 'text' | 'image' } | null;
  }): Promise<{ message: any; chatId: string }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetchWithTimeout(`${API_BASE}/chat/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    }, 10000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || 'Failed to send message');
    }
    return res.json();
  },

  /** Mark all messages in a conversation as read for the current user */
  async markChatRead(token: string | null | undefined, chatId: string): Promise<void> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    await fetchWithTimeout(`${API_BASE}/chat/${encodeURIComponent(chatId)}/read`, {
      method: 'PUT',
      headers,
    }, 4000).catch(() => {});
  },

  /** Associate the device's Expo push token with this user for chat notifications */
  async registerChatPushToken(token: string | null | undefined, pushToken: string): Promise<void> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    await fetchWithTimeout(`${API_BASE}/chat/register-push-token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ token: pushToken }),
    }, 4000).catch(() => {});
  },

  /** React with an emoji to a chat message */
  async reactToChatMessage(token: string | null | undefined, chatId: string, messageId: string, emoji: string, userId: string): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetchWithTimeout(`${API_BASE}/chat/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/react`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ emoji, userId }),
    }, 5000);
    if (!res.ok) throw new Error('Failed to react');
    return res.json();
  },

  /** Edit a chat message (if not yet seen) */
  async editChatMessage(token: string | null | undefined, chatId: string, messageId: string, text: string, userId: string): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetchWithTimeout(`${API_BASE}/chat/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/edit`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ text, userId }),
    }, 5000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to edit message');
    }
    return res.json();
  },

  /** Unsend a chat message (if not yet seen) */
  async unsendChatMessage(token: string | null | undefined, chatId: string, messageId: string, userId: string): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetchWithTimeout(`${API_BASE}/chat/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ userId }),
    }, 5000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to unsend message');
    }
    return res.json();
  },
};

// Offline-only fallbacks — empty so app shows real data or nothing
const DEMO_BARANGAYS: Barangay[] = [];
const DEMO_CENTERS: EvacuationCenter[] = [];
const DEMO_ROUTES: EvacuationRoute[] = [];
const DEMO_CONTACTS: EmergencyContact[] = [];
const DEMO_GUIDES: PreparednessGuide[] = [];
const DEMO_ALERTS: DisasterAlert[] = [];

