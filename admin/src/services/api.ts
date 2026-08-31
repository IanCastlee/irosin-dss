import {
  User,
  Barangay,
  EvacuationCenter,
  EvacuationRoute,
  PreparednessGuide,
  EmergencyContact,
  DisasterAlert,
  DisasterReport,
  AuditLog,
  NotificationLog,
} from "../types";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  "https://irosin-dss-api.onrender.com/api/v1";

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    // Check if token expired (with 3-second grace buffer)
    return payload.exp * 1000 <= Date.now() + 3000;
  } catch {
    return true;
  }
}

export function triggerSessionExpired(
  reason = "Ang iyong session ay nag-expire na. Mangyaring mag-log in muli.",
) {
  localStorage.removeItem("irosin_admin_token");
  localStorage.removeItem("irosin_admin_user");
  window.dispatchEvent(
    new CustomEvent("auth:session-expired", {
      detail: { message: reason },
    }),
  );
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("irosin_admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("irosin_admin_token");

  // Pre-flight client-side JWT expiration check
  if (endpoint !== "/auth/login" && token && isTokenExpired(token)) {
    triggerSessionExpired(
      "Ang iyong session ay nag-expire na. Mangyaring mag-log in muli.",
    );
    throw new Error("Session expired. Please log in again.");
  }

  try {
    const defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers as Record<string, string>),
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errorMsg = errData.error || `HTTP error ${res.status}`;

      // Auto-logout immediately on 401 Unauthorized or 403 Forbidden
      if (
        endpoint !== "/auth/login" &&
        (res.status === 401 || res.status === 403)
      ) {
        triggerSessionExpired(
          "Ang iyong session ay nag-expire na o hindi na balido. Mangyaring mag-log in muli.",
        );
      }

      throw new Error(errorMsg);
    }

    return await res.json();
  } catch (err: any) {
    console.warn(`[API] Endpoint ${endpoint} request failed: ${err.message}.`);
    throw err;
  }
}

export const Api = {
  // Auth
  async login(email: string, pass: string) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: pass }),
    });
  },

  async getMe() {
    return request("/auth/me");
  },

  // Barangays
  async getBarangays(): Promise<{ barangays: Barangay[] }> {
    return request("/barangays");
  },
  async createBarangay(data: any): Promise<{ barangay: Barangay }> {
    return request("/barangays", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateBarangay(id: string, data: any): Promise<{ barangay: Barangay }> {
    return request(`/barangays/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async deleteBarangay(id: string) {
    return request(`/barangays/${id}`, { method: "DELETE" });
  },

  // Evacuation Centers
  async getCenters(): Promise<{ evacuationCenters: EvacuationCenter[] }> {
    return request("/evacuation-centers");
  },
  async createCenter(
    data: any,
  ): Promise<{ evacuationCenter: EvacuationCenter }> {
    return request("/evacuation-centers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateCenter(
    id: string,
    data: any,
  ): Promise<{ evacuationCenter: EvacuationCenter }> {
    return request(`/evacuation-centers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async deleteCenter(id: string) {
    return request(`/evacuation-centers/${id}`, { method: "DELETE" });
  },

  // Evacuation Routes
  async getRoutes(): Promise<{ evacuationRoutes: EvacuationRoute[] }> {
    return request("/evacuation-routes");
  },
  async createRoute(data: any): Promise<{ evacuationRoute: EvacuationRoute }> {
    return request("/evacuation-routes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateRoute(
    id: string,
    data: any,
  ): Promise<{ evacuationRoute: EvacuationRoute }> {
    return request(`/evacuation-routes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async deleteRoute(id: string) {
    return request(`/evacuation-routes/${id}`, { method: "DELETE" });
  },

  // Emergency Contacts
  async getContacts(): Promise<{ emergencyContacts: EmergencyContact[] }> {
    return request("/emergency-contacts");
  },
  async createContact(
    data: any,
  ): Promise<{ emergencyContact: EmergencyContact }> {
    return request("/emergency-contacts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateContact(
    id: string,
    data: any,
  ): Promise<{ emergencyContact: EmergencyContact }> {
    return request(`/emergency-contacts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async deleteContact(id: string) {
    return request(`/emergency-contacts/${id}`, { method: "DELETE" });
  },

  // Preparedness Guides
  async getGuides(): Promise<{ preparednessGuides: PreparednessGuide[] }> {
    return request("/preparedness");
  },
  async createGuide(
    data: any,
  ): Promise<{ preparednessGuide: PreparednessGuide }> {
    return request("/preparedness", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateGuide(
    id: string,
    data: any,
  ): Promise<{ preparednessGuide: PreparednessGuide }> {
    return request(`/preparedness/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async deleteGuide(id: string) {
    return request(`/preparedness/${id}`, { method: "DELETE" });
  },

  // Alerts
  async getAlerts(
    cursor?: string,
    limit = 20,
  ): Promise<{
    alerts: DisasterAlert[];
    nextCursor?: string | null;
    hasMore?: boolean;
  }> {
    const query = new URLSearchParams();
    if (cursor) query.append("cursor", cursor);
    if (limit) query.append("limit", limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request(`/alerts${qs}`);
  },
  async createAlert(
    data: any,
  ): Promise<{ alert: DisasterAlert; dispatchSummary: any }> {
    return request("/alerts", { method: "POST", body: JSON.stringify(data) });
  },
  async cancelAlert(id: string) {
    return request(`/alerts/${id}/cancel`, { method: "PUT" });
  },
  async deleteAlert(id: string) {
    return request(`/alerts/${id}`, { method: "DELETE" });
  },
  async testPush(): Promise<any> {
    return request("/alerts/test-push");
  },
  async registerPushToken(token: string, platform = "android"): Promise<any> {
    return request("/alerts/push-token", {
      method: "POST",
      body: JSON.stringify({ token, platform }),
    });
  },
  async getNotificationLogs(): Promise<{
    notificationLogs: NotificationLog[];
  }> {
    return request("/alerts/logs");
  },

  // Reports
  async getDisasterReports(
    cursor?: string,
    limit = 20,
  ): Promise<{
    disasterReports: DisasterReport[];
    nextCursor?: string | null;
    hasMore?: boolean;
  }> {
    const query = new URLSearchParams();
    if (cursor) query.append("cursor", cursor);
    if (limit) query.append("limit", limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request(`/reports${qs}`);
  },
  async createDisasterReport(
    data: any,
  ): Promise<{ disasterReport: DisasterReport; message: string }> {
    return request("/reports", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateReportStatus(
    id: string,
    status: string,
    adminNotes?: string,
    affectedRoute?: string,
    photos?: string[],
  ): Promise<{ disasterReport: DisasterReport }> {
    return request(`/reports/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, adminNotes, affectedRoute, photos }),
    });
  },
  async deleteDisasterReport(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    return request(`/reports/${id}`, {
      method: "DELETE",
    });
  },

  // Audit & System Summary
  async getAuditLogs(
    cursor?: string,
    limit = 20,
  ): Promise<{
    auditLogs: AuditLog[];
    nextCursor?: string | null;
    hasMore?: boolean;
  }> {
    const query = new URLSearchParams();
    if (cursor) query.append("cursor", cursor);
    if (limit) query.append("limit", limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request(`/audit-logs${qs}`);
  },
  async getSummary(): Promise<{ summary: any }> {
    return request("/summary-reports/summary");
  },

  // Real-Time Web Push (Works when browser tab is closed)
  async getVapidPublicKey(): Promise<{ publicKey: string }> {
    return request("/admin/push/vapid-public-key");
  },
  async subscribeWebPush(
    subscription: any,
  ): Promise<{ success: boolean; message: string }> {
    return request("/admin/push/subscribe", {
      method: "POST",
      body: JSON.stringify({ subscription }),
    });
  },
  async testAdminPush(): Promise<{ success: boolean; message: string }> {
    return request("/admin/push/test", {
      method: "POST",
    });
  },

  // Responder Authorization & Devices
  async getResponderRequests(): Promise<{ requests: any[] }> {
    return request("/admin/push/responder-requests");
  },
  async reviewResponderRequest(
    id: string,
    status: "APPROVED" | "REJECTED",
    adminNotes?: string,
  ): Promise<{ success: boolean; message: string }> {
    return request(`/admin/push/responder-requests/${id}/review`, {
      method: "PUT",
      body: JSON.stringify({ status, adminNotes }),
    });
  },

  // User & Responder Management
  async getUsers(): Promise<{ users: User[] }> {
    return request("/users");
  },
  async updateUserStatus(
    id: string,
    status: "ACTIVE" | "PENDING_APPROVAL" | "REJECTED" | "INACTIVE",
    adminNotes?: string,
  ): Promise<{ success: boolean; message: string; user: User }> {
    return request(`/users/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, adminNotes }),
    });
  },
  async updateUserJurisdiction(
    id: string,
    isMunicipalWide: boolean,
    barangayName?: string,
  ): Promise<{ success: boolean; message: string; user: User }> {
    return request(`/users/${id}/jurisdiction`, {
      method: "PUT",
      body: JSON.stringify({ isMunicipalWide, barangayName }),
    });
  },
  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/users/${id}`, {
      method: "DELETE",
    });
  },

  // App Profile & Legal Configuration
  async getAppConfig(): Promise<{ success: boolean; config: any }> {
    return request("/app-config");
  },
  async updateAppConfig(
    config: any,
  ): Promise<{ success: boolean; message: string; config: any }> {
    return request("/app-config", {
      method: "PUT",
      body: JSON.stringify(config),
    });
  },

  // Announcements
  async getAnnouncements(): Promise<{ announcements: any[] }> {
    return request("/announcements");
  },
  async getAnnouncementMediaLibrary(): Promise<{ mediaLibrary: any[] }> {
    return request("/announcements/media-library");
  },
  async createAnnouncement(
    data: any,
  ): Promise<{ success: boolean; announcement: any }> {
    return request("/announcements", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateAnnouncement(
    id: string,
    data: any,
  ): Promise<{ success: boolean; message: string; announcement?: any }> {
    return request(`/announcements/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async deleteAnnouncement(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    return request(`/announcements/${id}`, {
      method: "DELETE",
    });
  },

  // 🛡️ Security Firewall & IP Blacklist
  async getSecurityThreats(): Promise<{ threats: any[] }> {
    return request("/security/threats");
  },
  async getBlockedIps(): Promise<{ blockedIps: any[] }> {
    return request("/security/blocked-ips");
  },
  async blockIp(
    ip: string,
    reason: string,
  ): Promise<{ success: boolean; message: string; record?: any }> {
    return request("/security/block-ip", {
      method: "POST",
      body: JSON.stringify({ ip, reason }),
    });
  },
  async unblockIp(ip: string): Promise<{ success: boolean; message: string }> {
    return request("/security/unblock-ip", {
      method: "POST",
      body: JSON.stringify({ ip }),
    });
  },
};
