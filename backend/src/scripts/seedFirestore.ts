import * as admin from 'firebase-admin';
import { ENV } from '../config/env';

if (!ENV.FIREBASE_PROJECT_ID || !ENV.FIREBASE_CLIENT_EMAIL || !ENV.FIREBASE_PRIVATE_KEY) {
  console.error('Missing Firebase credentials in .env');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: ENV.FIREBASE_PROJECT_ID,
    clientEmail: ENV.FIREBASE_CLIENT_EMAIL,
    privateKey: ENV.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();
const now = new Date().toISOString();

const BARANGAYS = [
  { id: 'brgy-1', name: 'Monbon', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.7081, longitude: 124.0325, population: 4250, status: 'ACTIVE', createdAt: now, updatedAt: now },
  { id: 'brgy-2', name: 'San Agustin', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.7042, longitude: 124.0371, population: 5800, status: 'ACTIVE', createdAt: now, updatedAt: now },
  { id: 'brgy-3', name: 'Gabao', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.7215, longitude: 124.0203, population: 3900, status: 'ACTIVE', createdAt: now, updatedAt: now },
  { id: 'brgy-4', name: 'San Julian', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.6985, longitude: 124.0412, population: 4100, status: 'ACTIVE', createdAt: now, updatedAt: now },
  { id: 'brgy-5', name: 'Buenavista', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.6852, longitude: 124.0531, population: 3100, status: 'ACTIVE', createdAt: now, updatedAt: now },
  { id: 'brgy-6', name: 'San Roque', municipality: 'Bulusan', province: 'Sorsogon', latitude: 12.7512, longitude: 124.1324, population: 3500, status: 'ACTIVE', createdAt: now, updatedAt: now }
];

const CENTERS = [
  {
    id: 'center-1',
    name: 'Irosin Central School Gymnasium',
    barangayId: 'brgy-2',
    barangayName: 'San Agustin',
    address: 'M.L. Quezon St, Barangay San Agustin, Irosin, Sorsogon',
    latitude: 12.7038,
    longitude: 124.0375,
    contactPerson: 'Engr. Roberto Ramos (MDRRMO)',
    contactPhone: '+63 917 555 0192',
    capacity: 500,
    currentOccupancy: 45,
    status: 'OPEN',
    facilities: { water: true, food: true, medical: true, restrooms: true, electricity: true, sleepingArea: true, pwdAccessible: true },
    description: 'Primary evacuation center equipped with emergency generator, clean water tank, and medical station.',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'center-2',
    name: 'Gabao Multipurpose Covered Court',
    barangayId: 'brgy-3',
    barangayName: 'Gabao',
    address: 'National Highway, Barangay Gabao, Irosin, Sorsogon',
    latitude: 12.7210,
    longitude: 124.0208,
    contactPerson: 'Brgy Capt. Jose Fernandez',
    contactPhone: '+63 928 444 8812',
    capacity: 350,
    currentOccupancy: 0,
    status: 'OPEN',
    facilities: { water: true, food: true, medical: false, restrooms: true, electricity: true, sleepingArea: true, pwdAccessible: true },
    description: 'Secondary evacuation shelter for residents in Gabao and neighboring elevated areas.',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'center-3',
    name: 'Monbon Elementary School Evacuation Hub',
    barangayId: 'brgy-1',
    barangayName: 'Monbon',
    address: 'Sitio Riverbank, Brgy Monbon, Irosin, Sorsogon',
    latitude: 12.7095,
    longitude: 124.0310,
    contactPerson: 'Maria Clara (School Principal)',
    contactPhone: '+63 919 333 1199',
    capacity: 250,
    currentOccupancy: 0,
    status: 'OPEN',
    facilities: { water: true, food: true, medical: true, restrooms: true, electricity: true, sleepingArea: true, pwdAccessible: false },
    description: 'Designated evacuation center for high-risk flood zone families in Barangay Monbon.',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'center-4',
    name: 'Bulusan Cultural Center & Evacuation Complex',
    barangayId: 'brgy-6',
    barangayName: 'San Roque',
    address: 'Poblacion, Barangay San Roque, Bulusan, Sorsogon',
    latitude: 12.7523,
    longitude: 124.1356,
    contactPerson: 'Bulusan LGU Disaster Desk Officer',
    contactPhone: '+63 917 888 9900',
    capacity: 450,
    currentOccupancy: 12,
    status: 'OPEN',
    facilities: { water: true, food: true, medical: true, restrooms: true, electricity: true, sleepingArea: true, pwdAccessible: true },
    description: 'Primary emergency evacuation shelter for Bulusan sector equipped with emergency response logistics.',
    createdAt: now,
    updatedAt: now
  }
];

const HAZARDS = [
  {
    id: 'hazard-1',
    name: 'Cadacan River High Flood Risk Zone',
    hazardType: 'FLOOD',
    description: 'Low-lying riverbank zone subject to severe overflow during intense rain / typhoons.',
    severity: 'HIGH',
    affectedBarangayIds: ['brgy-1', 'brgy-2'],
    affectedBarangayNames: ['Monbon', 'San Agustin'],
    centerLatitude: 12.7081,
    centerLongitude: 124.0325,
    radiusMeters: 500,
    source: 'MDRRMO Irosin Flood Hazard Mapping',
    status: 'ACTIVE',
    lastUpdated: now,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'hazard-2',
    name: 'Mt. Bulusan Volcanic Ashfall & Lahar Corridor',
    hazardType: 'VOLCANIC',
    description: 'Volcanic ashfall and potential lahar stream channels along natural gullies during heavy downpours.',
    severity: 'CRITICAL',
    affectedBarangayIds: ['brgy-3', 'brgy-5', 'brgy-6'],
    affectedBarangayNames: ['Gabao', 'Buenavista', 'San Roque'],
    centerLatitude: 12.7400,
    centerLongitude: 124.0900,
    radiusMeters: 1200,
    source: 'PHIVOLCS Volcanic Hazard Bulletin',
    status: 'ACTIVE',
    lastUpdated: now,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'hazard-3',
    name: 'Bulusan Hillside Landslide Risk Sector',
    hazardType: 'LANDSLIDE',
    description: 'Steep slope area prone to soil movement during prolonged rainfall.',
    severity: 'HIGH',
    affectedBarangayIds: ['brgy-6'],
    affectedBarangayNames: ['San Roque'],
    centerLatitude: 12.7560,
    centerLongitude: 124.1390,
    radiusMeters: 450,
    source: 'Mines and Geosciences Bureau (MGB)',
    status: 'ACTIVE',
    lastUpdated: now,
    createdAt: now,
    updatedAt: now
  }
];

const CONTACTS = [
  {
    id: 'contact-1',
    organization: 'MDRRMO Irosin Emergency Operations Center',
    contactPerson: 'Duty Disaster Officer',
    phone: '0917-123-4567',
    email: 'mdrmo@irosin.gov.ph',
    address: 'Municipal Hall Complex, San Agustin, Irosin, Sorsogon',
    category: 'MDRRMO',
    barangayId: 'brgy-2',
    barangayName: 'San Agustin',
    description: '24/7 Main Municipal Emergency Hotline for Search, Rescue, and Evacuation Assistance.',
    priority: 1,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'contact-2',
    organization: 'Bulusan LGU Disaster Operations Center',
    contactPerson: 'Bulusan MDRRMO Head',
    phone: '0917-888-9900',
    email: 'mdrmo@bulusan.gov.ph',
    address: 'Poblacion, Bulusan, Sorsogon',
    category: 'MDRRMO',
    barangayId: 'brgy-6',
    barangayName: 'San Roque',
    description: '24/7 Emergency Response Center for Bulusan Municipality.',
    priority: 1,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'contact-3',
    organization: 'PNP Irosin Municipal Police Station',
    contactPerson: 'Desk Officer',
    phone: '0998-598-6123',
    address: 'Poblacion, Irosin, Sorsogon',
    category: 'POLICE',
    description: 'Police security, peace and order, and traffic enforcement during emergencies.',
    priority: 2,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'contact-4',
    organization: 'Bureau of Fire Protection (BFP) Irosin',
    contactPerson: 'Fire Station Control',
    phone: '0939-912-3456',
    address: 'San Agustin, Irosin, Sorsogon',
    category: 'FIRE_STATION',
    description: 'Fire response, vehicular rescue, and flood water rescue operations.',
    priority: 3,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'contact-5',
    organization: 'Irosin District Hospital ER',
    contactPerson: 'ER Triage Officer',
    phone: '056-311-1234',
    address: 'San Julian, Irosin, Sorsogon',
    category: 'HOSPITAL',
    description: 'Medical emergencies, trauma care, and ambulance dispatch.',
    priority: 4,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now
  }
];

const ROUTES = [
  {
    id: 'route-1',
    routeName: 'Monbon Riverbank to Irosin Central Gym Safe Route',
    originDescription: 'Monbon Barangay Hall & Riverbank Residential Area',
    destinationCenterId: 'center-1',
    destinationCenterName: 'Irosin Central School Gymnasium',
    barangayId: 'brgy-1',
    barangayName: 'Monbon',
    waypoints: [
      { lat: 12.7081, lng: 124.0325 },
      { lat: 12.7065, lng: 124.0340 },
      { lat: 12.7050, lng: 124.0360 },
      { lat: 12.7038, lng: 124.0375 }
    ],
    status: 'ACTIVE',
    instructions: 'Head EAST along Barangay Road away from Cadacan River bank. Use the elevated concrete bypass road. Cross Main Highway with traffic assistance.',
    hazardWarnings: ['Avoid lower river bridge if water level reaches Alert Stage 2.'],
    distanceKm: 1.4,
    estimatedMinutes: 18,
    lastVerifiedDate: '2026-08-01',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'route-2',
    routeName: 'San Roque Sector to Bulusan Cultural Center Safe Route',
    originDescription: 'San Roque Zone 2 Hillside Area',
    destinationCenterId: 'center-4',
    destinationCenterName: 'Bulusan Cultural Center & Evacuation Complex',
    barangayId: 'brgy-6',
    barangayName: 'San Roque',
    waypoints: [
      { lat: 12.7550, lng: 124.1330 },
      { lat: 12.7535, lng: 124.1345 },
      { lat: 12.7523, lng: 124.1356 }
    ],
    status: 'ACTIVE',
    instructions: 'Follow concrete barangay road downhill towards Poblacion. Turn left at Cultural Center entrance gate.',
    hazardWarnings: ['Watch out for loose gravel during heavy downpours.'],
    distanceKm: 0.6,
    estimatedMinutes: 8,
    lastVerifiedDate: '2026-08-05',
    createdAt: now,
    updatedAt: now
  }
];

const ALERTS = [
  {
    id: 'alert-1',
    title: 'ADVISORY: Heavy Rainfall & River Monitor',
    message: 'Trough of Low Pressure Area expected to bring moderate to heavy rainfall over Irosin & Bulusan sectors. Residents in low-lying riverbank areas are advised to prepare for possible preemptive evacuation.',
    disasterType: 'FLOOD',
    alertLevel: 'ADVISORY',
    affectedBarangayIds: ['brgy-1', 'brgy-2', 'brgy-6'],
    affectedBarangayNames: ['Monbon', 'San Agustin', 'San Roque'],
    recommendedAction: 'Prepare emergency Go-Bags and monitor official MDRRMO bulletins.',
    issuingAuthority: 'MDRRMO Disaster Response Operations Center',
    startTime: now,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now
  }
];

async function seed() {
  console.log('Seeding complete real data collections into Firebase Firestore...');

  for (const b of BARANGAYS) {
    await db.collection('barangays').doc(b.id).set(b);
  }
  console.log('✓ Barangays uploaded to Firebase');

  for (const c of CENTERS) {
    await db.collection('evacuation_centers').doc(c.id).set(c);
  }
  console.log('✓ Evacuation Centers uploaded to Firebase');

  for (const h of HAZARDS) {
    await db.collection('hazard_zones').doc(h.id).set(h);
  }
  console.log('✓ Hazard Zones uploaded to Firebase');

  for (const contact of CONTACTS) {
    await db.collection('emergency_contacts').doc(contact.id).set(contact);
  }
  console.log('✓ Emergency Contacts uploaded to Firebase');

  for (const r of ROUTES) {
    await db.collection('evacuation_routes').doc(r.id).set(r);
  }
  console.log('✓ Evacuation Routes uploaded to Firebase');

  for (const a of ALERTS) {
    await db.collection('alerts').doc(a.id).set(a);
  }
  console.log('✓ Alerts uploaded to Firebase');

  console.log('🎉 Firebase Complete Real Data Seeding Finished!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
