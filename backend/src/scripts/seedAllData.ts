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

// 1. Evacuation Centers
const CENTERS = [
  {
    id: 'ec-irosin-main',
    name: 'Irosin Central Emergency Evacuation Auditorium',
    barangayId: 'brgy-1',
    barangayName: 'San Julian',
    address: 'Municipal Compound, San Julian, Irosin, Sorsogon',
    latitude: 12.7051,
    longitude: 124.0321,
    capacity: 600,
    currentOccupancy: 0,
    status: 'OPEN',
    amenities: ['Power Generator', 'Clean Drinking Water', 'Medical Clinic', 'Separate Comfort Rooms', 'Wifi Hotline'],
    contactPerson: 'Engr. Alexis Fuentes (MDRRMO Head)',
    contactPhone: '0917-555-4767',
    isDemo: false,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'ec-bulusan-cultural',
    name: 'Bulusan Cultural Center & Evacuation Complex',
    barangayId: 'brgy-6',
    barangayName: 'San Roque',
    address: 'Poblacion, San Roque, Bulusan, Sorsogon',
    latitude: 12.7523,
    longitude: 124.1356,
    capacity: 500,
    currentOccupancy: 0,
    status: 'OPEN',
    amenities: ['Emergency Standby Power', 'Clean Water Filtration System', 'Child-Friendly Space', 'Medical Station'],
    contactPerson: 'Capt. Fernando Garcia (Center In-Charge)',
    contactPhone: '0918-662-3901',
    isDemo: false,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'ec-irosin-north',
    name: 'Irosin North Evacuation Complex & Gymnasium',
    barangayId: 'brgy-3',
    barangayName: 'Gabao',
    address: 'Barangay Gabao Highway, Irosin, Sorsogon',
    latitude: 12.7120,
    longitude: 124.0380,
    capacity: 450,
    currentOccupancy: 0,
    status: 'OPEN',
    amenities: ['Covered Court Shelter', 'First Aid Station', 'Restrooms', 'Emergency Supplies Warehouse'],
    contactPerson: 'Brgy. Capt. Mateo Ramos',
    contactPhone: '0920-412-8877',
    isDemo: false,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'ec-monbon-elementary',
    name: 'Monbon Disaster Relief & Evacuation School',
    barangayId: 'brgy-4',
    barangayName: 'Monbon',
    address: 'Monbon Elementary School Ground, Irosin, Sorsogon',
    latitude: 12.6890,
    longitude: 124.0250,
    capacity: 350,
    currentOccupancy: 0,
    status: 'STANDBY',
    amenities: ['Solar Lighting System', 'Potable Water Station', 'Community Kitchen'],
    contactPerson: 'Principal Josefa Cruz',
    contactPhone: '0927-319-5400',
    isDemo: false,
    createdAt: now,
    updatedAt: now
  }
];

// 2. Evacuation Routes
const ROUTES = [
  {
    id: 'route-gabao-auditorium',
    routeName: 'Gabao Highway to Irosin Central Auditorium Safe Path',
    barangayId: 'brgy-3',
    barangayName: 'Gabao',
    destinationCenterId: 'ec-irosin-main',
    destinationCenterName: 'Irosin Central Emergency Evacuation Auditorium',
    originDescription: 'Gabao Barangay Hall & High-Risk Flood Sector',
    instructions: '1. Lumabas sa Gabao Barangay Hall papuntang Maharlika Highway Bypass.\n2. Lumiko sa kanan papuntang Municipal Hall Access Road.\n3. Dumiretso sa Irosin Central Auditorium entrance.',
    distanceKm: 1.8,
    estimatedMinutes: 22,
    hazardWarnings: ['Iwasan ang Cadacan River Bank Spillway kapag lumalaki ang tubig.'],
    status: 'CLEAR',
    lastVerifiedDate: now.split('T')[0],
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'route-sanroque-bulusan',
    routeName: 'San Roque Sector to Bulusan Cultural Center Safe Route',
    barangayId: 'brgy-6',
    barangayName: 'San Roque',
    destinationCenterId: 'ec-bulusan-cultural',
    destinationCenterName: 'Bulusan Cultural Center & Evacuation Complex',
    originDescription: 'San Roque Barangay Plaza & Ashfall Sector',
    instructions: '1. Mula sa San Roque Plaza, lumakad patungong Bulusan Main Bypass Road.\n2. Sundan ang mga green evacuation directional signs papuntang Cultural Center Gate.',
    distanceKm: 1.2,
    estimatedMinutes: 15,
    hazardWarnings: ['Magsuot ng N95 mask habang naglalakad dahil sa abo.'],
    status: 'CLEAR',
    lastVerifiedDate: now.split('T')[0],
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'route-monbon-shelter',
    routeName: 'Monbon Coastal Bypass to Monbon Evacuation School',
    barangayId: 'brgy-4',
    barangayName: 'Monbon',
    destinationCenterId: 'ec-monbon-elementary',
    destinationCenterName: 'Monbon Disaster Relief & Evacuation School',
    originDescription: 'Monbon Market Square & Lowland Sector',
    instructions: '1. Lumakad mula Monbon Market patungong High-Ground Access Road.\n2. Pumasok sa Monbon Elementary Main Gate.',
    distanceKm: 0.9,
    estimatedMinutes: 11,
    hazardWarnings: ['Maging alerto sa mga basang kalsada.'],
    status: 'CLEAR',
    lastVerifiedDate: now.split('T')[0],
    createdAt: now,
    updatedAt: now
  }
];

// 3. Emergency Contacts
const CONTACTS = [
  {
    id: 'contact-mdrmo-head',
    organization: 'MDRRMO Irosin Command Center',
    contactPerson: 'Engr. Alexis Fuentes (Disaster Officer)',
    phone: '0917-555-4767',
    category: 'MDRRMO',
    address: 'Municipal Hall Annex, Irosin, Sorsogon',
    description: '24/7 Official Emergency Command Center for Search & Rescue, Medical Dispatch, and Evacuation Assistance.',
    isEmergencyHotline: true,
    priorityOrder: 1,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'contact-pnp-irosin',
    organization: 'PNP Irosin Municipal Police Station',
    contactPerson: 'PMAJ Ronald Vance',
    phone: '0998-598-6211',
    category: 'POLICE',
    address: 'Maharlika Highway, Irosin, Sorsogon',
    description: 'Public Safety, Peace & Order Maintenance, and Disaster Security Dispatch.',
    isEmergencyHotline: true,
    priorityOrder: 2,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'contact-bfp-irosin',
    organization: 'Bureau of Fire Protection (BFP Irosin)',
    contactPerson: 'INSP Mark Anthony Ramos',
    phone: '0922-841-3911',
    category: 'FIRE_STATION',
    address: 'San Julian, Irosin, Sorsogon',
    description: 'Fire Suppression, Extrication Rescue, and Hazardous Material Control.',
    isEmergencyHotline: true,
    priorityOrder: 3,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'contact-irosin-hospital',
    organization: 'Irosin District Hospital Emergency Room',
    contactPerson: 'Dr. Maria Elena Santos (ER Head)',
    phone: '0919-334-8822',
    category: 'HOSPITAL',
    address: 'San Mateo, Irosin, Sorsogon',
    description: '24/7 Emergency Trauma, Medical Evacuation & Critical Care Hospital Unit.',
    isEmergencyHotline: true,
    priorityOrder: 4,
    createdAt: now,
    updatedAt: now
  }
];

async function seedAll() {
  console.log('Seeding Evacuation Centers to Firebase...');
  for (const c of CENTERS) {
    await db.collection('evacuation_centers').doc(c.id).set(c);
  }

  console.log('Seeding Evacuation Routes to Firebase...');
  for (const r of ROUTES) {
    await db.collection('evacuation_routes').doc(r.id).set(r);
  }

  console.log('Seeding Emergency Contacts to Firebase...');
  for (const contact of CONTACTS) {
    await db.collection('emergency_contacts').doc(contact.id).set(contact);
  }

  console.log('✓ Successfully uploaded all Evacuation Centers, Routes, and Emergency Contacts to Firebase!');
  process.exit(0);
}

seedAll().catch(err => {
  console.error('Error seeding data:', err);
  process.exit(1);
});
