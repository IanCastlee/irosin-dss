import { db } from '../config/firebase';

const now = new Date().toISOString();

const OFFICIAL_CENTERS = [
  {
    id: 'center-irosin-central',
    name: 'Irosin Central School Multi-Purpose Evacuation Center',
    barangayId: 'brgy-2',
    barangayName: 'San Agustin',
    address: 'National Highway, Brgy. San Agustin, Irosin, Sorsogon',
    latitude: 12.7042,
    longitude: 124.0371,
    contactPerson: 'Principal Maria Santos / MDRRMO Evac Team',
    contactPhone: '+63 917 888 1234',
    capacity: 450,
    currentOccupancy: 0,
    status: 'OPEN',
    facilities: {
      water: true,
      food: true,
      medical: true,
      restrooms: true,
      electricity: true,
      sleepingArea: true,
      pwdAccessible: true
    },
    description: 'Pangunahing evacuation shelter sa Poblacion na may kongkretong estruktura, kusina, standby generator, at medical clinic.',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'center-gallanosa-gym',
    name: 'Gallanosa National High School Gymnasium',
    barangayId: 'brgy-2',
    barangayName: 'San Agustin',
    address: 'Gallanosa St., Brgy. San Agustin, Irosin, Sorsogon',
    latitude: 12.7015,
    longitude: 124.0392,
    contactPerson: 'Engr. Roberto Dela Cruz (Camp Manager)',
    contactPhone: '+63 919 555 6789',
    capacity: 600,
    currentOccupancy: 0,
    status: 'OPEN',
    facilities: {
      water: true,
      food: true,
      medical: true,
      restrooms: true,
      electricity: true,
      sleepingArea: true,
      pwdAccessible: true
    },
    description: 'Malaking indoor gymnasium na may matatag na bubong, hiwalay na palikuran para sa kababaihan at kalalakihan, at PWD ramps.',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'center-monbon-hall',
    name: 'Monbon Community Evacuation Center & Covered Court',
    barangayId: 'brgy-1',
    barangayName: 'Monbon',
    address: 'Barangay Hall Compound, Brgy. Monbon, Irosin, Sorsogon',
    latitude: 12.7081,
    longitude: 124.0325,
    contactPerson: 'Punong Barangay Rolando Gueta',
    contactPhone: '+63 928 444 3210',
    capacity: 250,
    currentOccupancy: 0,
    status: 'OPEN',
    facilities: {
      water: true,
      food: true,
      medical: false,
      restrooms: true,
      electricity: true,
      sleepingArea: true,
      pwdAccessible: true
    },
    description: 'Itinalagang sentro ng paglilikas para sa mga pamilyang naninirahan malapit sa Cadacan River at flood-prone zones.',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'center-gabao-shelter',
    name: 'Gabao Barangay Multi-Purpose Evacuation Facility',
    barangayId: 'brgy-3',
    barangayName: 'Gabao',
    address: 'Purok 2, Brgy. Gabao, Irosin, Sorsogon',
    latitude: 12.7215,
    longitude: 124.0203,
    contactPerson: 'Kgd. Antonio Morales (BDRRMC Head)',
    contactPhone: '+63 930 111 9876',
    capacity: 200,
    currentOccupancy: 0,
    status: 'OPEN',
    facilities: {
      water: true,
      food: true,
      medical: false,
      restrooms: true,
      electricity: true,
      sleepingArea: true,
      pwdAccessible: false
    },
    description: 'Matibay na two-storey concrete building na may deep well water supply at emergency solar lighting.',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'center-sanjulian-court',
    name: 'San Julian Disaster Resilient Covered Court',
    barangayId: 'brgy-4',
    barangayName: 'San Julian',
    address: 'Near Elementary School, Brgy. San Julian, Irosin, Sorsogon',
    latitude: 12.6985,
    longitude: 124.0412,
    contactPerson: 'Barangay Secretary Elena Ramos',
    contactPhone: '+63 945 222 3456',
    capacity: 300,
    currentOccupancy: 0,
    status: 'OPEN',
    facilities: {
      water: true,
      food: true,
      medical: false,
      restrooms: true,
      electricity: true,
      sleepingArea: true,
      pwdAccessible: true
    },
    description: 'Covered court na may reinforced steel trusses, concrete bleachers, at cooking stations para sa mass feeding.',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'center-buenavista-hall',
    name: 'Buenavista Evacuation Center',
    barangayId: 'brgy-5',
    barangayName: 'Buenavista',
    address: 'Brgy. Buenavista, Irosin, Sorsogon',
    latitude: 12.6852,
    longitude: 124.0531,
    contactPerson: 'Punong Barangay Fernando Balmes',
    contactPhone: '+63 916 333 7890',
    capacity: 180,
    currentOccupancy: 0,
    status: 'OPEN',
    facilities: {
      water: true,
      food: true,
      medical: false,
      restrooms: true,
      electricity: true,
      sleepingArea: true,
      pwdAccessible: false
    },
    description: 'Evacuation center para sa southern mountain sectors na may elevated concrete foundation laban sa flashfloods.',
    createdAt: now,
    updatedAt: now
  }
];

async function seedOfficialCenters() {
  console.log('🚀 [Seeder] Starting cleanup of old evacuation centers...');
  try {
    const snap = await db.collection('evacuation_centers').get();
    console.log(`Found ${snap.size} existing centers in Firestore. Deleting old entries...`);
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log('✅ Old entries successfully cleared.');

    console.log(`📥 Inserting ${OFFICIAL_CENTERS.length} official Irosin evacuation centers...`);
    for (const center of OFFICIAL_CENTERS) {
      await db.collection('evacuation_centers').doc(center.id).set(center);
      console.log(`  ➕ Added: [${center.barangayName}] ${center.name} (Cap: ${center.capacity})`);
    }

    console.log('🎉 [Seeder] All official evacuation centers successfully seeded into Cloud Firestore!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ [Seeder] Error seeding evacuation centers:', err);
    process.exit(1);
  }
}

seedOfficialCenters();
