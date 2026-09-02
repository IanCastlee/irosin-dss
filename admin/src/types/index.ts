export type UserRole = 'RESIDENT' | 'BARANGAY_OFFICIAL' | 'MDRRMO_ADMIN' | 'RESPONDER';

export interface User {
  id: string;
  email?: string;
  username?: string;
  fullName: string;
  phone: string;
  role: UserRole;
  roleTitle?: string;
  barangayId: string;
  barangayName?: string;
  isMunicipalWide?: boolean;
  jurisdiction?: 'BARANGAY' | 'ALL_BARANGAYS';
  fcmToken?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL' | 'REJECTED';
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
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
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
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
  isDemo?: boolean;
}

export type HazardRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface HazardZone {
  id: string;
  name: string;
  hazardType: DisasterCategory;
  riskLevel: HazardRiskLevel;
  barangayId: string;
  barangayName: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  description?: string;
  createdAt?: string;
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
  steps?: string[];
  imageUrl?: string;
  image?: string;
  priority: number;
  isPublished: boolean;
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
  description: string;
  priority: number;
  status: 'ACTIVE' | 'INACTIVE';
  isDemo?: boolean;
}

export type AlertLevel = 'INFORMATION' | 'ADVISORY' | 'WARNING' | 'EVACUATION_ORDER';

export interface DisasterAlert {
  id: string;
  title: string;
  message: string;
  disasterType: DisasterCategory;
  alertLevel: AlertLevel;
  affectedBarangayIds: string[];
  affectedBarangayNames?: string[];
  recommendedAction: string;
  issuingAuthority: string;
  startTime: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
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
export type ReportStatus = 'PENDING' | 'VERIFIED' | 'UNDER_CLEARING' | 'REJECTED' | 'RESOLVED' | 'IMPASSABLE';

export interface DisasterReport {
  id: string;
  reportType: ReportType;
  description: string;
  latitude: number;
  longitude: number;
  locationDescription: string;
  streetLocation?: string;
  nearbyLandmark?: string;
  barangayId: string;
  barangayName: string;
  reportedBy: string;
  reporterName: string;
  reporterPhone: string;
  reporterRole: UserRole;
  status: ReportStatus;
  adminNotes?: string;
  affectedRoute?: string;
  alternateRoute?: string;
  notedCount?: number;
  imageUrl?: string;
  photoUrl?: string;
  photos?: string[];
  photoItems?: { uri: string; stage: string; label: string; uploadedBy?: string }[];
  beforePhoto?: string | null;
  afterPhoto?: string | null;
  reporterPhotoCount?: number;
  verifiedBy?: string;
  verifiedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  statusHistory?: {
    previousStatus: string | null;
    status: string;
    changedBy: string;
    changedAt: string;
    remarks?: string;
  }[];
  createdAt: string;
  updatedAt?: string;
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

export interface SecurityThreat {
  id: string;
  ip: string;
  threatType: 'DDOS_BURST' | 'BRUTE_FORCE' | 'SPAM_REGISTRATION' | 'INJECTION_ATTEMPT';
  details: string;
  endpoint?: string;
  attemptCount: number;
  isBlocked: boolean;
  firstDetectedAt: string;
  lastDetectedAt: string;
}

export interface BlockedIpRecord {
  ip: string;
  reason: string;
  blockedBy: string;
  blockedAt: string;
}
