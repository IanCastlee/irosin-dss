import * as admin from 'firebase-admin';
import { ENV } from './env';

let firebaseInitialized = false;

try {
  if (ENV.FIREBASE_PROJECT_ID && ENV.FIREBASE_CLIENT_EMAIL && ENV.FIREBASE_PRIVATE_KEY) {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: ENV.FIREBASE_PROJECT_ID,
          clientEmail: ENV.FIREBASE_CLIENT_EMAIL,
          privateKey: ENV.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
    firebaseInitialized = true;
    console.log('[Firebase] Admin SDK initialized successfully.');
  } else {
    console.warn('[Firebase] Credentials missing. Running in DEMO/MOCK STORE MODE.');
  }
} catch (error) {
  console.error('[Firebase] Failed to initialize Firebase Admin:', error);
}

export const isFirebaseActive = () => firebaseInitialized;
export const db = (firebaseInitialized ? admin.firestore() : admin.firestore()) as FirebaseFirestore.Firestore;
export const messaging = firebaseInitialized ? admin.messaging() : null;
