import {
  Barangay,
  EvacuationCenter,
  HazardZone,
  EvacuationRoute,
  PreparednessGuide,
  EmergencyContact,
  DisasterAlert,
  DisasterReport,
  AuditLog,
  NotificationLog
} from '../types';

const API_BASE = '/api/v1';

function getAuthHeader() {
  const token = localStorage.getItem('irosin_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(endpoint: string, options: RequestInit = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        ...options.headers
      }
    });
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    console.warn(`[API] Endpoint ${endpoint} request failed: ${err.message}. Using demo client store.`);
    throw err;
  }
}

export const Api = {
  // Auth
  async login(email: string, pass: string) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass })
    });
  },

  async getMe() {
    return request('/auth/me');
  },

  // Barangays
  async getBarangays(): Promise<{ barangays: Barangay[] }> {
    return request('/barangays');
  },
  async createBarangay(data: any): Promise<{ barangay: Barangay }> {
    return request('/barangays', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateBarangay(id: string, data: any): Promise<{ barangay: Barangay }> {
    return request(`/barangays/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deleteBarangay(id: string) {
    return request(`/barangays/${id}`, { method: 'DELETE' });
  },

  // Evacuation Centers
  async getCenters(): Promise<{ evacuationCenters: EvacuationCenter[] }> {
    return request('/evacuation-centers');
  },
  async createCenter(data: any): Promise<{ evacuationCenter: EvacuationCenter }> {
    return request('/evacuation-centers', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateCenter(id: string, data: any): Promise<{ evacuationCenter: EvacuationCenter }> {
    return request(`/evacuation-centers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deleteCenter(id: string) {
    return request(`/evacuation-centers/${id}`, { method: 'DELETE' });
  },

  // Hazard Zones
  async getHazards(): Promise<{ hazardZones: HazardZone[] }> {
    return request('/hazards');
  },
  async createHazard(data: any): Promise<{ hazardZone: HazardZone }> {
    return request('/hazards', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateHazard(id: string, data: any): Promise<{ hazardZone: HazardZone }> {
    return request(`/hazards/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deleteHazard(id: string) {
    return request(`/hazards/${id}`, { method: 'DELETE' });
  },

  // Evacuation Routes
  async getRoutes(): Promise<{ evacuationRoutes: EvacuationRoute[] }> {
    return request('/evacuation-routes');
  },
  async createRoute(data: any): Promise<{ evacuationRoute: EvacuationRoute }> {
    return request('/evacuation-routes', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateRoute(id: string, data: any): Promise<{ evacuationRoute: EvacuationRoute }> {
    return request(`/evacuation-routes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deleteRoute(id: string) {
    return request(`/evacuation-routes/${id}`, { method: 'DELETE' });
  },

  // Emergency Contacts
  async getContacts(): Promise<{ emergencyContacts: EmergencyContact[] }> {
    return request('/emergency-contacts');
  },
  async createContact(data: any): Promise<{ emergencyContact: EmergencyContact }> {
    return request('/emergency-contacts', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateContact(id: string, data: any): Promise<{ emergencyContact: EmergencyContact }> {
    return request(`/emergency-contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deleteContact(id: string) {
    return request(`/emergency-contacts/${id}`, { method: 'DELETE' });
  },

  // Preparedness Guides
  async getGuides(): Promise<{ preparednessGuides: PreparednessGuide[] }> {
    return request('/preparedness');
  },
  async createGuide(data: any): Promise<{ preparednessGuide: PreparednessGuide }> {
    return request('/preparedness', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateGuide(id: string, data: any): Promise<{ preparednessGuide: PreparednessGuide }> {
    return request(`/preparedness/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deleteGuide(id: string) {
    return request(`/preparedness/${id}`, { method: 'DELETE' });
  },

  // Alerts
  async getAlerts(): Promise<{ alerts: DisasterAlert[] }> {
    return request('/alerts');
  },
  async createAlert(data: any): Promise<{ alert: DisasterAlert; dispatchSummary: any }> {
    return request('/alerts', { method: 'POST', body: JSON.stringify(data) });
  },
  async cancelAlert(id: string) {
    return request(`/alerts/${id}/cancel`, { method: 'PUT' });
  },
  async deleteAlert(id: string) {
    return request(`/alerts/${id}`, { method: 'DELETE' });
  },
  async getNotificationLogs(): Promise<{ notificationLogs: NotificationLog[] }> {
    return request('/alerts/logs');
  },

  // Reports
  async getDisasterReports(): Promise<{ disasterReports: DisasterReport[] }> {
    return request('/reports');
  },
  async updateReportStatus(id: string, status: string, adminNotes?: string): Promise<{ disasterReport: DisasterReport }> {
    return request(`/reports/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes })
    });
  },

  // Audit & System Summary
  async getAuditLogs(): Promise<{ auditLogs: AuditLog[] }> {
    return request('/audit-logs');
  },
  async getSummary(): Promise<{ summary: any }> {
    return request('/summary-reports/summary');
  }
};
