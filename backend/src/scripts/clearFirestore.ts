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

async function clearCollection(collectionName: string) {
  const snapshot = await db.collection(collectionName).get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log(`✓ Cleared collection: ${collectionName}`);
}

async function main() {
  console.log('Cleaning all dummy data from Firebase Cloud Firestore...');
  
  await clearCollection('alerts');
  await clearCollection('evacuation_centers');
  await clearCollection('hazard_zones');
  await clearCollection('evacuation_routes');
  await clearCollection('reports');
  await clearCollection('emergency_contacts');

  console.log('🎉 Firebase Database is now 100% CLEAN and ready for real production data!');
  process.exit(0);
}

main().catch(err => {
  console.error('Clear error:', err);
  process.exit(1);
});
