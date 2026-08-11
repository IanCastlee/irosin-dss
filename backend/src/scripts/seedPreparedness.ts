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

const SAMPLE_GUIDE = {
  id: 'guide-' + Date.now(),
  title: 'Bulusan Volcanic Ashfall & Lahar Safety Protocol',
  hazardType: 'VOLCANIC_ERUPTION',
  category: 'BEFORE',
  introduction: 'Mga opisyal na hakbang at paghahanda para sa seguridad ng pamilya bago at habang may pag-ulan ng abo mula sa Bulkang Bulusan.',
  checklist: [
    'Maghanda ng N95 respirators o basang takip sa mukha para sa bawat miyembro ng pamilya.',
    'Isara at i-seal ang mga bintana, pintuan, at roof vents gamit ang basahan.',
    'Takpan nang mahigpit ang lahat ng imbakan ng malinis na inuming tubig.',
    'Ihanda ang 3-day emergency Go-Bag, flashlight, at dagdag na baterya.'
  ],
  instructions: [
    'Manatili sa loob ng bahay maliban kung may opisyal na utos ng paglikas mula sa MDRRMO.',
    'Magsuot ng protective goggles at damit na mahaba ang braso kapag lumalabas.'
  ],
  emergencyActions: [
    'Kung mabigat na ang naiipong abo sa bubong, mag-evacuate agad sa pinakamalapit na shelter.'
  ],
  warnings: [
    'Iwasan ang pagmamaneho habang may ashfall dahil sa kawalan ng kalinawan at madulas na kalsada.'
  ],
  priority: 1,
  isPublished: true,
  createdAt: now,
  updatedAt: now
};

async function seedPreparedness() {
  console.log('Uploading sample Preparedness Guide to Firebase...');
  await db.collection('preparedness_guides').doc(SAMPLE_GUIDE.id).set(SAMPLE_GUIDE);
  console.log('✓ Successfully uploaded sample Preparedness Guide to Firebase!');
  process.exit(0);
}

seedPreparedness().catch(err => {
  console.error('Error seeding guide:', err);
  process.exit(1);
});
