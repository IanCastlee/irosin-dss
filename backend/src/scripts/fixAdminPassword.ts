/**
 * Fix admin password — adds passwordHash to existing admin user in Firestore.
 * Run: npx ts-node src/scripts/fixAdminPassword.ts
 */
import { db } from '../config/firebase';
import bcrypt from 'bcryptjs';

async function fixAdminPassword() {
  if (!db) { console.error('Firestore not initialized'); process.exit(1); }

  const adminEmail = 'mdrmo.admin@irosin.gov.ph';
  const password = 'admin123';

  console.log(`🔐 Updating password hash for: ${adminEmail}`);

  const snap = await db.collection('users')
    .where('email', '==', adminEmail)
    .limit(1)
    .get();

  if (snap.empty) {
    console.error('❌ Admin user not found in Firestore! Run npm run seed:prod first.');
    process.exit(1);
  }

  const userDoc = snap.docs[0];
  const passwordHash = await bcrypt.hash(password, 10);

  await db.collection('users').doc(userDoc.id).set(
    { passwordHash, updatedAt: new Date().toISOString() },
    { merge: true }
  );

  console.log('✅ Admin passwordHash updated successfully!');
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${password}`);
  process.exit(0);
}

fixAdminPassword().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
