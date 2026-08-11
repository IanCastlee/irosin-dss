export type UserRole = 'RESIDENT' | 'BARANGAY_OFFICIAL' | 'MDRRMO_ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  barangayId: string;
  barangayName?: string;
  fcmToken?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface Barangay {
  id: string;
  name: string;
  municipality: string;
  province: string;
  latitude: number;
  longitude: number;
  population?: number;
  boundaryJson?: string; // GeoJSON polygon
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  isDemo?: boolean;
}

export type HazardType = 'FLOOD' | 'LANDSLIDE' | 'EARTHQUAKE' | 'VOLCANIC' | 'LAHAR' | 'TYPHOON' | 'OTHER';
export type HazardSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface HazardZone {
  id: string;
  name: string;
  hazardType: HazardType;
  description: string;
  severity: HazardSeverity;
  affectedBarangayIds: string[];
  affectedBarangayNames?: string[];
  coordinates: { lat: number; lng: number }[]; // Polygon coordinates
  source: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  isDemo?: boolean;
}

export type CenterStatus = 'OPEN' | 'CLOSED' | 'FULL' | 'TEMPORARILY_UNAVAILABLE';

export interface EvacuationCenter {
  id: string;
  name: string;
  barangayId: string;
  barangayName: string;
  address: string;
  latitude: number;
  longitude: number;
  contactPerson: string;
  contactPhone: string;
  capacity: number;
  currentOccupancy: number;
  status: CenterStatus;
  facilities: {
    water: boolean;
    food: boolean;
    medical: boolean;
    restrooms: boolean;
    electricity: boolean;
    sleepingArea: boolean;
    pwdAccessible: boolean;
  };
  description: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  isDemo?: boolean;
}

export type RouteStatus = 'ACTIVE' | 'TEMPORARILY_CLOSED' | 'UNDER_REVIEW';

export interface EvacuationRoute {
  id: string;
  routeName: string;
  originDescription: string;
  destinationCenterId: string;
  destinationCenterName?: string;
  barangayId: string;
  barangayName: string;
  waypoints: { lat: number; lng: number }[];
  status: RouteStatus;
  instructions: string;
  hazardWarnings: string[];
  distanceKm: number;
  estimatedMinutes: number;
  lastVerifiedDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  isDemo?: boolean;
}

export type DisasterCategory = 'TYPHOON' | 'FLOOD' | 'EARTHQUAKE' | 'VOLCANIC_ERUPTION' | 'LANDSLIDE' | 'GENERAL';
export type GuidePhase = 'BEFORE' | 'DURING' | 'AFTER';

export interface PreparednessGuide {
  id: string;
  title: string;
  hazardType: DisasterCategory;
  category: GuidePhase;
  introduction: string;
  checklist: string[];
  instructions: string[];
  emergencyActions: string[];
  warnings: string[];
  priority: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  isDemo?: boolean;
}

export type ContactCategory = 'MDRRMO' | 'BARANGAY_OFFICE' | 'POLICE' | 'FIRE_STATION' | 'HOSPITAL' | 'RESCUE_TEAM' | 'OTHER';

export interface EmergencyContact {
  id: string;
  organization: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address: string;
  category: ContactCategory;
  barangayId?: string;
  barangayName?: string;
  description: string;
  priority: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  isDemo?: boolean;
}

export type AlertLevel = 'INFORMATION' | 'ADVISORY' | 'WARNING' | 'EVACUATION_ORDER';

export interface DisasterAlert {
  id: string;
  title: string;
  message: string;
  disasterType: DisasterCategory;
  alertLevel: AlertLevel;
  affectedBarangayIds: string[]; // empty array means ALL barangays
  affectedBarangayNames?: string[];
  recommendedAction: string;
  issuingAuthority: string;
  startTime: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  isDemo?: boolean;
}

export interface NotificationLog {
  id: string;
  alertId?: string;
  recipientPhoneOrToken: string;
  channel: 'PUSH' | 'SMS';
  message: string;
  providerResponse: string;
  deliveryStatus: 'SENT' | 'FAILED' | 'MOCK_SENT';
  timestamp: string;
}

export type ReportType = 'FLOODING' | 'BLOCKED_ROAD' | 'DAMAGED_ROAD' | 'LANDSLIDE' | 'DAMAGED_EVACUATION_CENTER' | 'UNSAFE_ROUTE' | 'OTHER';
export type ReportStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'RESOLVED';

export interface DisasterReport {
  id: string;
  reportType: ReportType;
  description: string;
  latitude: number;
  longitude: number;
  locationDescription: string;
  barangayId: string;
  barangayName: string;
  reportedBy: string;
  reporterName: string;
  reporterPhone: string;
  reporterRole: UserRole;
  photoUrl?: string;
  status: ReportStatus;
  adminNotes?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  performedByRole: UserRole;
  targetCollection: string;
  targetId: string;
  details: string;
  timestamp: string;
}
