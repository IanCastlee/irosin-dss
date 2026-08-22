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
  NotificationLog
} from '../types';
import bcrypt from 'bcryptjs';

class MockStore {
  public users: User[] = [];
  public barangays: Barangay[] = [];
  public evacuationCenters: EvacuationCenter[] = [];
  public evacuationRoutes: EvacuationRoute[] = [];
  public preparednessGuides: PreparednessGuide[] = [];
  public emergencyContacts: EmergencyContact[] = [];
  public alerts: DisasterAlert[] = [];
  public disasterReports: DisasterReport[] = [];
  public auditLogs: AuditLog[] = [];
  public notificationLogs: NotificationLog[] = [];
  public pushTokens: { token: string; platform?: string; registeredAt: string }[] = [];

  constructor() {
    this.seedInitialData();
  }

  private async seedInitialData() {
    const now = new Date().toISOString();

    // 1. Official Barangays in Irosin & Bulusan, Sorsogon
    this.barangays = [
      { id: 'brgy-1', name: 'Monbon', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.7081, longitude: 124.0325, population: 4250, status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: 'brgy-2', name: 'San Agustin', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.7042, longitude: 124.0371, population: 5800, status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: 'brgy-3', name: 'Gabao', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.7215, longitude: 124.0203, population: 3900, status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: 'brgy-4', name: 'San Julian', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.6985, longitude: 124.0412, population: 4100, status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: 'brgy-5', name: 'Buenavista', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.6852, longitude: 124.0531, population: 3100, status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: 'brgy-6', name: 'San Roque', municipality: 'Bulusan', province: 'Sorsogon', latitude: 12.7512, longitude: 124.1324, population: 3500, status: 'ACTIVE', createdAt: now, updatedAt: now }
    ];

    // 2. Initial Admin Users
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    this.users = [
      {
        id: 'usr-admin',
        email: 'mdrmo.admin@irosin.gov.ph',
        fullName: 'MDRRMO Chief Admin Officer',
        phone: '+639171234567',
        role: 'MDRRMO_ADMIN',
        barangayId: 'brgy-2',
        barangayName: 'San Agustin',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      }
    ];

    // Operational collections start 100% clean for real production data entry
    this.evacuationCenters = [];
    this.evacuationRoutes = [];
    this.emergencyContacts = [];
    this.preparednessGuides = [];
    this.alerts = [];
    this.disasterReports = [];

    this.auditLogs.push({
      id: 'log-1',
      action: 'SYSTEM_INITIALIZED',
      performedBy: 'SYSTEM',
      performedByRole: 'MDRRMO_ADMIN',
      targetCollection: 'system',
      targetId: 'init',
      details: 'System initialized with clean production data collections for Irosin & Bulusan, Sorsogon.',
      timestamp: now
    });
  }
}

export const mockStore = new MockStore();
