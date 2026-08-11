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

async function clearAlerts() {
  const snapshot = await db.collection('alerts').get();
  if (snapshot.empty) {
    console.log('Alerts collection is already empty.');
    process.exit(0);
  }
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log('✓ Successfully deleted all documents in alerts collection!');
  process.exit(0);
}

clearAlerts().catch(err => {
  console.error('Error clearing alerts:', err);
  process.exit(1);
});
