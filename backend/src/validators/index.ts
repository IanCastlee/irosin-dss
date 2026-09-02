import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(10, 'Valid Philippine phone number required'),
  role: z.enum(['RESIDENT', 'BARANGAY_OFFICIAL', 'MDRRMO_ADMIN', 'RESPONDER']).default('RESIDENT'),
  roleTitle: z.string().optional(),
  barangayId: z.string().min(1, 'Barangay selection is required')
});

export const ResponderRegisterSchema = z.object({
  fullName: z.string().min(2, 'Buong pangalan ay kailangan').max(70, 'Masyadong mahaba ang pangalan'),
  username: z.string()
    .min(3, 'Ang username ay dapat hindi bababa sa 3 characters')
    .max(30, 'Ang username ay hindi dapat lumagpas sa 30 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Ang username ay maaari lamang maglaman ng mga letra, numero, underscore, at tuldok (bawal ang space).'),
  password: z.string().min(6, 'Ang password ay dapat hindi bababa sa 6 characters').max(100),
  phone: z.string()
    .regex(/^09\d{9}$/, 'Ang contact number ay dapat magsimula sa 09 at may eksaktong 11 numero (hal. 09171234567)'),
  barangayId: z.string().optional().default('brgy-1'),
  barangayName: z.string().optional().default('Irosin'),
  roleTitle: z.string().min(2, 'Tungkulin o posisyon ay kailangan (Hal. Tanod, BDRRMC)').max(60),
  fcmToken: z.string().optional()
});

export const ResponderLoginSchema = z.object({
  username: z.string().min(1, 'Username ay kailangan').max(50),
  password: z.string().min(1, 'Password ay kailangan').max(100),
  fcmToken: z.string().optional()
});

export const LoginSchema = z.object({
  email: z.string().optional(),
  username: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
  fcmToken: z.string().optional()
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
  name: z.string().min(2),
  barangayId: z.string().min(1).default('brgy-1'),
  barangayName: z.string().optional(),
  address: z.string().min(2),
  latitude: z.number(),
  longitude: z.number(),
  contactPerson: z.string().optional().default('MDRRMO Officer'),
  contactPhone: z.string().optional().default('N/A'),
  capacity: z.number().min(1).default(100),
  currentOccupancy: z.number().min(0).default(0),
  status: z.enum(['OPEN', 'CLOSED', 'FULL', 'STANDBY', 'TEMPORARILY_UNAVAILABLE']).default('OPEN'),
  facilities: z.union([
    z.record(z.boolean()),
    z.array(z.string())
  ]).optional().default({
    water: true,
    food: true,
    medical: false,
    restrooms: true,
    electricity: true,
    sleepingArea: true,
    pwdAccessible: false
  }),
  description: z.string().optional().default('')
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
  description: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  locationDescription: z.string(),
  streetLocation: z.string().optional(),
  nearbyLandmark: z.string().optional(),
  barangayId: z.string().default('brgy-1'),
  reporterName: z.string().optional(),
  reporterPhone: z.string().optional(),
  photoUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  photos: z.array(z.string()).optional()
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
  hazardType: z.enum(['TYPHOON', 'FLOOD', 'EARTHQUAKE', 'VOLCANIC_ERUPTION', 'VOLCANIC', 'LANDSLIDE', 'FIRE', 'TSUNAMI', 'GENERAL']).default('GENERAL'),
  category: z.enum(['BEFORE', 'DURING', 'AFTER']),
  introduction: z.string().min(5),
  checklist: z.array(z.string()).default([]),
  instructions: z.array(z.string()).default([]),
  emergencyActions: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  steps: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
  image: z.string().optional(),
  priority: z.number().default(1),
  isPublished: z.boolean().default(true)
});
