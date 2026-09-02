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
export const storage = firebaseInitialized ? admin.storage() : null;

export const getStorageBucket = () => {
  if (!firebaseInitialized) return null;
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${ENV.FIREBASE_PROJECT_ID}.appspot.com`;
  return admin.storage().bucket(bucketName);
};

// Automatic cleanup of old / orphaned images from Firebase Storage
export async function deleteFirebaseStorageImage(imageUrl?: string): Promise<void> {
  if (!imageUrl || typeof imageUrl !== 'string') return;
  try {
    if (imageUrl.includes('firebasestorage.googleapis.com') || imageUrl.startsWith('gs://')) {
      const bucket = getStorageBucket();
      if (!bucket) return;

      let filePath = '';
      if (imageUrl.startsWith('gs://')) {
        filePath = imageUrl.replace(/^gs:\/\/[^\/]+\//, '');
      } else if (imageUrl.includes('/o/')) {
        const parts = imageUrl.split('/o/')[1];
        if (parts) {
          const rawPath = parts.split('?')[0];
          filePath = decodeURIComponent(rawPath);
        }
      }

      if (filePath) {
        const file = bucket.file(filePath);
        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
          console.log(`[Firebase Storage] Successfully deleted old/orphaned image: ${filePath}`);
        }
      }
    }
  } catch (err) {
    console.warn(`[Firebase Storage] Failed to delete image (${imageUrl}):`, err);
  }
}
