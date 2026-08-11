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

const SAMPLE_HAZARD = {
  id: 'hazard-' + Date.now(),
  name: 'Mt. Bulusan Volcanic Ashfall & Lahar Danger Corridor',
  hazardType: 'VOLCANIC',
  severity: 'CRITICAL',
  description: 'Extended danger corridor subject to volcanic ashfall accumulation and potential lahar stream channels during intense downpours.',
  affectedBarangayIds: ['brgy-3', 'brgy-5', 'brgy-6'],
  affectedBarangayNames: ['Gabao', 'Buenavista', 'San Roque'],
  centerLatitude: 12.7512,
  centerLongitude: 124.1324,
  radiusMeters: 750,
  source: 'PHIVOLCS Volcanic Hazard Bulletin',
  status: 'ACTIVE',
  lastUpdated: now,
  createdAt: now,
  updatedAt: now
};

async function seedHazard() {
  console.log('Uploading sample Hazard Zone to Firebase...');
  await db.collection('hazard_zones').doc(SAMPLE_HAZARD.id).set(SAMPLE_HAZARD);
  console.log('✓ Successfully uploaded sample Hazard Zone to Firebase!');
  process.exit(0);
}

seedHazard().catch(err => {
  console.error('Error seeding hazard zone:', err);
  process.exit(1);
});
