/**
 * Production Firestore Seeder
 * Run ONCE to initialize Firestore with barangays and the initial admin account.
 * Safe to re-run — skips existing records.
 *
 * Usage: npx ts-node src/scripts/seedFirestore.ts
 */

import { db } from '../config/firebase';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Starting Firestore production seed...\n');

  if (!db) {
    console.error('❌ Firestore (db) is not initialized. Check your Firebase credentials.');
    process.exit(1);
  }

  // ─── 1. Barangays ────────────────────────────────────────────────────────────
  const barangays = [
    { id: 'brgy-1',  name: 'Monbon',        municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.7081, longitude: 124.0325, population: 4250, status: 'ACTIVE' },
    { id: 'brgy-2',  name: 'San Agustin',   municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.7042, longitude: 124.0371, population: 5800, status: 'ACTIVE' },
    { id: 'brgy-3',  name: 'Gabao',         municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.7215, longitude: 124.0203, population: 3900, status: 'ACTIVE' },
    { id: 'brgy-4',  name: 'San Julian',    municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.6985, longitude: 124.0412, population: 4100, status: 'ACTIVE' },
    { id: 'brgy-5',  name: 'Buenavista',    municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.6852, longitude: 124.0531, population: 3100, status: 'ACTIVE' },
    { id: 'brgy-6',  name: 'San Roque',     municipality: 'Bulusan', province: 'Sorsogon', latitude: 12.7512, longitude: 124.1324, population: 3500, status: 'ACTIVE' },
    { id: 'brgy-7',  name: 'Bagsangan',     municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.7150, longitude: 124.0280, population: 2800, status: 'ACTIVE' },
    { id: 'brgy-8',  name: 'Cogon',         municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.7010, longitude: 124.0450, population: 3200, status: 'ACTIVE' },
    { id: 'brgy-9',  name: 'Gulang-Gulang', municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.6920, longitude: 124.0380, population: 2500, status: 'ACTIVE' },
    { id: 'brgy-10', name: 'Liang',         municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.7200, longitude: 124.0500, population: 2100, status: 'ACTIVE' },
    { id: 'brgy-11', name: 'Macawayan',     municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.7080, longitude: 124.0180, population: 1900, status: 'ACTIVE' },
    { id: 'brgy-12', name: 'Mapaso',        municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.6780, longitude: 124.0620, population: 2300, status: 'ACTIVE' },
    { id: 'brgy-13', name: 'Ologuin',       municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.6850, longitude: 124.0490, population: 1700, status: 'ACTIVE' },
    { id: 'brgy-14', name: 'Patag',         municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.7300, longitude: 124.0150, population: 2600, status: 'ACTIVE' },
    { id: 'brgy-15', name: 'Poblacion',     municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.7057, longitude: 124.0364, population: 6100, status: 'ACTIVE' },
  ];

  let brgyCreated = 0;
  for (const brgy of barangays) {
    const now = new Date().toISOString();
    const ref = db.collection('barangays').doc(brgy.id);
    const existing = await ref.get();
    if (!existing.exists) {
      await ref.set({ ...brgy, createdAt: now, updatedAt: now });
      brgyCreated++;
      console.log(`  ✅ Barangay created: ${brgy.name}`);
    } else {
      console.log(`  ⏭  Barangay exists:  ${brgy.name}`);
    }
  }
  console.log(`\n  📍 Barangays: ${brgyCreated} created, ${barangays.length - brgyCreated} already existed\n`);

  // ─── 2. Admin User ───────────────────────────────────────────────────────────
  const adminEmail = 'mdrmo.admin@irosin.gov.ph';
  const adminSnap = await db.collection('users')
    .where('email', '==', adminEmail)
    .limit(1)
    .get();

  if (adminSnap.empty) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    const now = new Date().toISOString();
    await db.collection('users').doc('usr-admin').set({
      id: 'usr-admin',
      email: adminEmail,
      fullName: 'MDRRMO Chief Admin Officer',
      phone: '+639171234567',
      role: 'MDRRMO_ADMIN',
      barangayId: 'brgy-2',
      barangayName: 'San Agustin',
      passwordHash,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    });
    console.log(`  ✅ Admin user created: ${adminEmail}`);
    console.log(`     Default password: admin123`);
    console.log(`     ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!\n`);
  } else {
    console.log(`  ⏭  Admin user already exists: ${adminEmail}\n`);
  }

  // ─── 3. Seed audit log entry ─────────────────────────────────────────────────
  const seedLogId = 'audit-seed-' + Date.now();
  await db.collection('audit_logs').doc(seedLogId).set({
    id: seedLogId,
    action: 'SYSTEM_SEEDED',
    performedBy: 'SEEDER_SCRIPT',
    performedByRole: 'MDRRMO_ADMIN',
    targetCollection: 'system',
    targetId: 'seed',
    details: `Firestore production seed completed. ${brgyCreated} barangays initialized.`,
    timestamp: new Date().toISOString()
  });

  console.log('🎉 Firestore seed complete!\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
