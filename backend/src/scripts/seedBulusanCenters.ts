import { db } from '../config/firebase';

const now = new Date().toISOString();

const BULUSAN_BARANGAYS = [
  {
    id: 'brgy-6',
    name: 'San Roque',
    municipality: 'Bulusan',
    province: 'Sorsogon',
    latitude: 12.7512,
    longitude: 124.1324,
    population: 3500,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'brgy-7',
    name: 'San Francisco',
    municipality: 'Bulusan',
    province: 'Sorsogon',
    latitude: 12.7684,
    longitude: 124.1205,
    population: 2900,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'brgy-8',
    name: 'Central (Poblacion)',
    municipality: 'Bulusan',
    province: 'Sorsogon',
    latitude: 12.7523,
    longitude: 124.1356,
    population: 4100,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now
  }
];

const NEW_BULUSAN_CENTERS = [
  {
    id: 'center-bulusan-cultural',
    name: 'Bulusan Cultural Center Multi-Purpose Evacuation Complex',
    barangayId: 'brgy-8',
    barangayName: 'Central (Poblacion)',
    address: 'Municipal Hall Compound, Poblacion, Bulusan, Sorsogon',
    latitude: 12.7523,
    longitude: 124.1356,
    contactPerson: 'MDRRMO Bulusan Desk / Camp Administrator',
    contactPhone: '+63 917 555 4321',
    capacity: 500,
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
    description: 'Pangunahing multi-purpose evacuation complex sa kabayanan ng Bulusan na may standby power generator, kusina, medical station, at hiwalay na sleeping quarters.',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'center-san-francisco-elem',
    name: 'San Francisco Elementary School Evacuation Center',
    barangayId: 'brgy-7',
    barangayName: 'San Francisco',
    address: 'National Highway, Brgy. San Francisco, Bulusan, Sorsogon',
    latitude: 12.7684,
    longitude: 124.1205,
    contactPerson: 'Principal Alicia Gomez / BDRRMC San Francisco',
    contactPhone: '+63 920 666 7890',
    capacity: 350,
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
    description: 'Itinalagang evacuation facility sa hilagang bahagi ng Bulusan para sa mga komunidad na apektado ng bagyo, volcanic ashfall, at baha.',
    createdAt: now,
    updatedAt: now
  }
];

async function seedBulusan() {
  console.log('🚀 [Seeder] Registering Bulusan Barangays & Evacuation Centers into Cloud Firestore...');
  try {
    // 1. Insert Bulusan Barangays
    for (const brgy of BULUSAN_BARANGAYS) {
      await db.collection('barangays').doc(brgy.id).set(brgy, { merge: true });
      console.log(`  📍 Registered Barangay: ${brgy.name}, Bulusan (${brgy.id})`);
    }

    // 2. Insert Bulusan Evacuation Centers
    for (const center of NEW_BULUSAN_CENTERS) {
      await db.collection('evacuation_centers').doc(center.id).set(center, { merge: true });
      console.log(`  🏛️ Registered Evacuation Center: ${center.name} in Brgy. ${center.barangayName}, Bulusan`);
    }

    console.log('🎉 [Seeder] Bulusan Cultural Center and San Francisco Elementary School successfully added to Firestore!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ [Seeder] Error inserting Bulusan centers:', err);
    process.exit(1);
  }
}

seedBulusan();
