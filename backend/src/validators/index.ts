import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(10, 'Valid Philippine phone number required'),
  role: z.enum(['RESIDENT', 'BARANGAY_OFFICIAL', 'MDRRMO_ADMIN']).default('RESIDENT'),
  barangayId: z.string().min(1, 'Barangay selection is required')
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const BarangaySchema = z.object({
  name: z.string().min(2),
  municipality: z.string().default('Irosin'),
  province: z.string().default('Sorsogon'),
  latitude: z.number(),
  longitude: z.number(),
  population: z.number().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
});

export const EvacuationCenterSchema = z.object({
  name: z.string().min(3),
  barangayId: z.string().min(1),
  address: z.string().min(3),
  latitude: z.number(),
  longitude: z.number(),
  contactPerson: z.string().min(2),
  contactPhone: z.string().min(7),
  capacity: z.number().min(1),
  currentOccupancy: z.number().min(0).default(0),
  status: z.enum(['OPEN', 'CLOSED', 'FULL', 'TEMPORARILY_UNAVAILABLE']).default('OPEN'),
  facilities: z.object({
    water: z.boolean(),
    food: z.boolean(),
    medical: z.boolean(),
    restrooms: z.boolean(),
    electricity: z.boolean(),
    sleepingArea: z.boolean(),
    pwdAccessible: z.boolean()
  }),
  description: z.string().default('')
});

export const HazardZoneSchema = z.object({
  name: z.string().min(3),
  hazardType: z.enum(['FLOOD', 'LANDSLIDE', 'EARTHQUAKE', 'VOLCANIC', 'LAHAR', 'TYPHOON', 'OTHER']),
  description: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  affectedBarangayIds: z.array(z.string()),
  coordinates: z.array(z.object({ lat: z.number(), lng: z.number() })).min(3, 'At least 3 points required for a polygon'),
  source: z.string().default('MDRRMO Irosin Hazard Assessment'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).default('ACTIVE')
});

export const EvacuationRouteSchema = z.object({
  routeName: z.string().min(3),
  originDescription: z.string().min(3),
  destinationCenterId: z.string().min(1),
  barangayId: z.string().min(1),
  waypoints: z.array(z.object({ lat: z.number(), lng: z.number() })).min(2, 'At least start and destination waypoints required'),
  status: z.enum(['ACTIVE', 'TEMPORARILY_CLOSED', 'UNDER_REVIEW']).default('ACTIVE'),
  instructions: z.string().min(5),
  hazardWarnings: z.array(z.string()).default([]),
  distanceKm: z.number().positive(),
  estimatedMinutes: z.number().positive()
});

export const DisasterAlertSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  message: z.string().min(3, 'Message must be at least 3 characters'),
  disasterType: z.enum(['TYPHOON', 'FLOOD', 'EARTHQUAKE', 'VOLCANIC_ERUPTION', 'LANDSLIDE', 'GENERAL']),
  alertLevel: z.enum(['INFORMATION', 'ADVISORY', 'WARNING', 'EVACUATION_ORDER']),
  affectedBarangayIds: z.array(z.string()).default([]),
  recommendedAction: z.string().min(3, 'Recommended action is required'),
  issuingAuthority: z.string().default('MDRRMO Irosin Emergency Operations Center'),
  expiresAt: z.string().optional().or(z.literal(''))
});

export const DisasterReportSchema = z.object({
  reportType: z.enum(['FLOODING', 'BLOCKED_ROAD', 'DAMAGED_ROAD', 'LANDSLIDE', 'DAMAGED_EVACUATION_CENTER', 'UNSAFE_ROUTE', 'OTHER']),
  description: z.string().min(5),
  latitude: z.number(),
  longitude: z.number(),
  locationDescription: z.string().min(3),
  barangayId: z.string().min(1),
  photoUrl: z.string().optional()
});

export const EmergencyContactSchema = z.object({
  organization: z.string().min(2),
  contactPerson: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().min(3),
  category: z.enum(['MDRRMO', 'BARANGAY_OFFICE', 'POLICE', 'FIRE_STATION', 'HOSPITAL', 'RESCUE_TEAM', 'OTHER']),
  barangayId: z.string().optional(),
  description: z.string().default(''),
  priority: z.number().default(1),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
});

export const PreparednessGuideSchema = z.object({
  title: z.string().min(3),
  hazardType: z.enum(['TYPHOON', 'FLOOD', 'EARTHQUAKE', 'VOLCANIC_ERUPTION', 'LANDSLIDE', 'GENERAL']),
  category: z.enum(['BEFORE', 'DURING', 'AFTER']),
  introduction: z.string().min(5),
  checklist: z.array(z.string()),
  instructions: z.array(z.string()),
  emergencyActions: z.array(z.string()),
  warnings: z.array(z.string()),
  priority: z.number().default(1),
  isPublished: z.boolean().default(true)
});
