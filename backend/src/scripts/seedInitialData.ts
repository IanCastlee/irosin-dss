/**
 * Seed real initial data to Firestore for Irosin DSS
 * Run: npx ts-node src/scripts/seedInitialData.ts
 */

import { db } from '../config/firebase';

async function seedInitialData() {
  if (!db) { console.error('Firestore not initialized'); process.exit(1); }
  const now = new Date().toISOString();
  console.log('🌱 Seeding initial data to Firestore...\n');

  // ─── EVACUATION CENTERS ────────────────────────────────────────────────────
  const centers = [
    { id: 'center-1', name: 'Irosin Central School Gymnasium', barangayId: 'brgy-2', barangayName: 'San Agustin', address: 'M.L. Quezon St, Irosin', latitude: 12.7042, longitude: 124.0371, capacity: 800, currentOccupancy: 0, status: 'OPEN', contactPerson: 'Principal Dela Cruz', contactPhone: '0917-123-4567', facilities: ['Water', 'Toilets', 'Generator', 'Medical Aid'], createdAt: now, updatedAt: now },
    { id: 'center-2', name: 'Gabao Multipurpose Covered Court', barangayId: 'brgy-3', barangayName: 'Gabao', address: 'National Highway, Gabao, Irosin', latitude: 12.7215, longitude: 124.0203, capacity: 350, currentOccupancy: 0, status: 'OPEN', contactPerson: 'Brgy. Captain Reyes', contactPhone: '0918-765-4321', facilities: ['Water', 'Toilets'], createdAt: now, updatedAt: now },
    { id: 'center-3', name: 'Monbon Barangay Hall & Court', barangayId: 'brgy-1', barangayName: 'Monbon', address: 'Monbon, Irosin, Sorsogon', latitude: 12.7081, longitude: 124.0325, capacity: 250, currentOccupancy: 0, status: 'OPEN', contactPerson: 'Brgy. Captain Santos', contactPhone: '0919-234-5678', facilities: ['Water', 'Toilets', 'First Aid'], createdAt: now, updatedAt: now },
    { id: 'center-4', name: 'San Julian Elementary School', barangayId: 'brgy-4', barangayName: 'San Julian', address: 'San Julian, Irosin, Sorsogon', latitude: 12.6985, longitude: 124.0412, capacity: 400, currentOccupancy: 0, status: 'STANDBY', contactPerson: 'Principal Bautista', contactPhone: '0920-345-6789', facilities: ['Water', 'Toilets', 'Classrooms'], createdAt: now, updatedAt: now },
    { id: 'center-5', name: 'Irosin Municipal Gym', barangayId: 'brgy-15', barangayName: 'Poblacion', address: 'Poblacion, Irosin, Sorsogon', latitude: 12.7057, longitude: 124.0364, capacity: 1200, currentOccupancy: 0, status: 'OPEN', contactPerson: 'MDRRMO Duty Officer', contactPhone: '0917-111-2222', facilities: ['Water', 'Toilets', 'Generator', 'Medical Aid', 'Kitchen', 'Sleeping Area'], createdAt: now, updatedAt: now },
  ];

  for (const c of centers) {
    await db.collection('evacuation_centers').doc(c.id).set(c);
    console.log(`  ✅ Center: ${c.name}`);
  }

  // ─── HAZARD ZONES ──────────────────────────────────────────────────────────
  const hazards = [
    { id: 'hazard-1', name: 'Cadacan River Flood Zone', hazardType: 'FLOOD', description: 'Low-lying riverbank areas along Cadacan River subject to overflow during heavy rainfall. High risk during typhoon season.', severity: 'HIGH', status: 'ACTIVE', affectedBarangayIds: ['brgy-1', 'brgy-2', 'brgy-8'], affectedBarangayNames: ['Monbon', 'San Agustin', 'Cogon'], coordinates: [{ lat: 12.708, lng: 124.031 }, { lat: 12.706, lng: 124.034 }], source: 'PHIVOLCS / LGU Assessment', lastUpdated: now, createdAt: now, updatedAt: now },
    { id: 'hazard-2', name: 'Bulusan Volcano Danger Zone', hazardType: 'VOLCANIC', description: 'Extended danger zone covering areas within 4km radius of Bulusan Volcano. Risk of ashfall, pyroclastic flows, and lahar during eruptive episodes.', severity: 'CRITICAL', status: 'ACTIVE', affectedBarangayIds: ['brgy-6', 'brgy-14'], affectedBarangayNames: ['San Roque', 'Patag'], coordinates: [{ lat: 12.769, lng: 124.056 }], source: 'PHIVOLCS Bulletin', lastUpdated: now, createdAt: now, updatedAt: now },
    { id: 'hazard-3', name: 'Irosin Valley Landslide-Prone Slopes', hazardType: 'LANDSLIDE', description: 'Steep hillside communities with unstable soil composition. Risk increases significantly during prolonged heavy rainfall.', severity: 'MEDIUM', status: 'ACTIVE', affectedBarangayIds: ['brgy-3', 'brgy-11', 'brgy-14'], affectedBarangayNames: ['Gabao', 'Macawayan', 'Patag'], coordinates: [{ lat: 12.722, lng: 124.020 }], source: 'MGB Assessment Report 2024', lastUpdated: now, createdAt: now, updatedAt: now },
    { id: 'hazard-4', name: 'San Agustin Storm Surge Zone', hazardType: 'STORM_SURGE', description: 'Coastal areas susceptible to storm surge during strong typhoons. Evacuation required for Tropical Cyclone Wind Signal 3 and above.', severity: 'HIGH', status: 'MONITORING', affectedBarangayIds: ['brgy-2', 'brgy-5'], affectedBarangayNames: ['San Agustin', 'Buenavista'], coordinates: [{ lat: 12.700, lng: 124.038 }], source: 'PAGASA Storm Surge Advisory', lastUpdated: now, createdAt: now, updatedAt: now },
  ];

  for (const h of hazards) {
    await db.collection('hazard_zones').doc(h.id).set(h);
    console.log(`  ✅ Hazard: ${h.name}`);
  }

  // ─── EMERGENCY CONTACTS ────────────────────────────────────────────────────
  const contacts = [
    { id: 'contact-1', organization: 'MDRRMO Irosin - Emergency Operations Center', contactPerson: 'Duty Disaster Risk Reduction Officer', phone: '056-311-1000', alternatePhone: '0917-800-1234', address: 'Municipal Hall Complex, Irosin, Sorsogon', category: 'GOVERNMENT', isAvailable24hrs: true, createdAt: now, updatedAt: now },
    { id: 'contact-2', organization: 'PNP Irosin Municipal Police Station', contactPerson: 'Desk Officer', phone: '056-311-1234', alternatePhone: '0998-598-6123', address: 'Poblacion, Irosin, Sorsogon', category: 'POLICE', isAvailable24hrs: true, createdAt: now, updatedAt: now },
    { id: 'contact-3', organization: 'BFP Irosin Fire Station', contactPerson: 'Fire Station Control', phone: '056-311-2345', alternatePhone: '0939-912-3456', address: 'San Agustin, Irosin, Sorsogon', category: 'FIRE', isAvailable24hrs: true, createdAt: now, updatedAt: now },
    { id: 'contact-4', organization: 'Irosin District Hospital - Emergency Room', contactPerson: 'ER Triage Nurse', phone: '056-311-1234', alternatePhone: '0917-456-7890', address: 'San Julian, Irosin, Sorsogon', category: 'MEDICAL', isAvailable24hrs: true, createdAt: now, updatedAt: now },
    { id: 'contact-5', organization: 'Philippine Red Cross - Sorsogon Chapter', contactPerson: 'Chapter Administrator', phone: '056-421-1234', alternatePhone: '0917-RED-CROSS', address: 'Sorsogon City', category: 'NGO', isAvailable24hrs: false, createdAt: now, updatedAt: now },
    { id: 'contact-6', organization: 'NBI Sorsogon - Search & Rescue Unit', contactPerson: 'SAR Team Leader', phone: '056-421-5678', alternatePhone: '0918-999-0001', address: 'Sorsogon City', category: 'SEARCH_RESCUE', isAvailable24hrs: true, createdAt: now, updatedAt: now },
    { id: 'contact-7', organization: 'PAGASA - Legazpi Weather Station', contactPerson: 'Duty Forecaster', phone: '052-480-5400', alternatePhone: '', address: 'Legazpi City, Albay', category: 'GOVERNMENT', isAvailable24hrs: true, createdAt: now, updatedAt: now },
  ];

  for (const c of contacts) {
    await db.collection('emergency_contacts').doc(c.id).set(c);
    console.log(`  ✅ Contact: ${c.organization}`);
  }

  // ─── EVACUATION ROUTES ─────────────────────────────────────────────────────
  const routes = [
    { id: 'route-1', routeName: 'Monbon Riverbank → Irosin Central School Gym', barangayId: 'brgy-1', barangayName: 'Monbon', destinationCenterId: 'center-1', destinationCenterName: 'Irosin Central School Gymnasium', originDescription: 'Monbon Barangay Hall & Riverbank Area', distance: '2.3 km', estimatedTime: '8-12 minutes by vehicle', transportMode: 'VEHICLE', waypoints: ['Monbon Brgy Hall → National Highway → M.L. Quezon St → Central School Gym'], status: 'ACTIVE', lastVerifiedDate: now.split('T')[0], createdAt: now, updatedAt: now },
    { id: 'route-2', routeName: 'Gabao High Risk Zone → Gabao Covered Court', barangayId: 'brgy-3', barangayName: 'Gabao', destinationCenterId: 'center-2', destinationCenterName: 'Gabao Multipurpose Covered Court', originDescription: 'Gabao Zone 4 - Hillside Sitios', distance: '0.8 km', estimatedTime: '15-20 minutes on foot', transportMode: 'FOOT', waypoints: ['Sitio Ilaya → Barangay Road → National Highway → Covered Court'], status: 'ACTIVE', lastVerifiedDate: now.split('T')[0], createdAt: now, updatedAt: now },
    { id: 'route-3', routeName: 'Poblacion → Municipal Gymnasium', barangayId: 'brgy-15', barangayName: 'Poblacion', destinationCenterId: 'center-5', destinationCenterName: 'Irosin Municipal Gym', originDescription: 'Poblacion Town Center', distance: '0.3 km', estimatedTime: '5 minutes walking', transportMode: 'FOOT', waypoints: ['Municipal Plaza → Gym Road → Municipal Gym'], status: 'ACTIVE', lastVerifiedDate: now.split('T')[0], createdAt: now, updatedAt: now },
  ];

  for (const r of routes) {
    await db.collection('evacuation_routes').doc(r.id).set(r);
    console.log(`  ✅ Route: ${r.routeName}`);
  }

  // ─── PREPAREDNESS GUIDES ───────────────────────────────────────────────────
  const guides = [
    { id: 'guide-1', title: 'Typhoon & Heavy Rainfall Preparedness', hazardType: 'TYPHOON', category: 'BEFORE', priority: 1, introduction: 'Essential steps to protect your family and property before a typhoon strikes Irosin.', steps: ['Monitor PAGASA weather advisories via radio or text alerts.', 'Prepare a Go Bag: water, food for 3 days, documents, medicine, flashlight, extra clothes.', 'Clear drainages and gutters around your home.', 'Secure loose objects in your yard that could become projectiles.', 'Know your evacuation center and pre-planned route.', 'Charge all communication devices. Store important numbers offline.', 'Fill water containers in case supply is disrupted.'], isPublished: true, createdAt: now, updatedAt: now },
    { id: 'guide-2', title: 'Volcanic Ashfall Safety Protocol', hazardType: 'VOLCANIC', category: 'DURING', priority: 2, introduction: 'Safety actions during Bulusan Volcano ashfall events for Irosin residents.', steps: ['Stay indoors and close all windows and doors.', 'Use a damp cloth or N95 mask as respiratory protection.', 'Do NOT use electric fans — they circulate ash particles.', 'Cover water storage containers to prevent contamination.', 'Protect eyes with goggles if you must go outside.', 'Monitor PHIVOLCS bulletins via MDRRMO announcements.', 'Avoid driving — ash reduces visibility to near zero.', 'Protect pets and livestock by bringing them indoors.'], isPublished: true, createdAt: now, updatedAt: now },
    { id: 'guide-3', title: 'Flash Flood Emergency Response', hazardType: 'FLOOD', category: 'DURING', priority: 1, introduction: 'Immediate actions when flash flooding occurs in your barangay.', steps: ['Move immediately to higher ground — do not wait for official order if water is rising fast.', 'Never walk through moving floodwater — even 15cm can knock you down.', 'Do not drive through flooded roads.', 'Evacuate to your designated center: Central School Gym or Municipal Gym.', 'Bring Go Bag, medicines, and important documents.', 'Alert neighbors who may need help — elderly, PWDs, infants.', 'Do NOT touch electrical equipment if wet.', 'Contact MDRRMO EOC: 056-311-1000'], isPublished: true, createdAt: now, updatedAt: now },
    { id: 'guide-4', title: 'Post-Disaster Recovery & Health', hazardType: 'GENERAL', category: 'AFTER', priority: 3, introduction: 'Critical health and safety steps after any disaster event.', steps: ['Do not return home until authorities declare it safe.', 'Inspect your home for structural damage before entry.', 'Boil all drinking water for at least 3 minutes.', 'Do not eat food that has been in contact with floodwater.', 'Watch for signs of disease: diarrhea, fever, rashes — report to health center.', 'Document all damage with photos for insurance/assistance claims.', 'Register for DSWD disaster assistance if your home is damaged.', 'Report to your barangay captain for relief coordination.'], isPublished: true, createdAt: now, updatedAt: now },
    { id: 'guide-5', title: 'Landslide Warning Signs & Evacuation', hazardType: 'LANDSLIDE', category: 'BEFORE', priority: 2, introduction: 'How to recognize landslide warning signs in Irosin hillside communities.', steps: ['Watch for cracks appearing in the ground or on walls.', 'Listen for unusual sounds — rumbling, cracking of trees.', 'Observe if springs suddenly run muddy or stop flowing.', 'After 3+ hours of continuous heavy rain: evacuate hillside areas immediately.', 'Do not shelter under large trees on slopes.', 'Report warning signs to your Barangay Captain immediately.', 'Proceed to nearest evacuation center without delay.'], isPublished: true, createdAt: now, updatedAt: now },
  ];

  for (const g of guides) {
    await db.collection('preparedness_guides').doc(g.id).set(g);
    console.log(`  ✅ Guide: ${g.title}`);
  }

  // ─── VERIFIED DISASTER REPORTS (COMMUNITY ADVISORIES) ──────────────────────
  const sampleReports = [
    {
      id: 'report-sample-1',
      reportType: 'LANDSLIDE',
      description: 'May naganap na landslide sa kurbada ng Sitio Patag Road. Natabunan ng lupa at bato ang isang linya ng daan. Nagpapatuloy ang clearing operations ng MDRRMO at DPWH.',
      locationDescription: 'Sitio Patag Road Curve, Near KM 14',
      barangayId: 'brgy-14',
      barangayName: 'Patag',
      latitude: 12.7231,
      longitude: 124.0415,
      imageUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800',
      photoUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800',
      photos: ['https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800'],
      status: 'VERIFIED',
      reportedBy: 'resident-juan',
      reporterName: 'Juan Dela Cruz (Resident)',
      reporterPhone: '0917-555-0101',
      reporterRole: 'RESIDENT',
      adminNotes: 'Confirmed by MDRRMO Quick Response Team 1. Backhoe deployed for debris clearing. Light vehicles only for now.',
      verifiedBy: 'MDRRMO Ops Officer',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'report-sample-2',
      reportType: 'FLOODING',
      description: 'Umapaw ang spillway sa Cadacan River dulot ng walang tigil na ulan kagabi. Lagpas tuhod ang tubig sa kalsada kaya hindi madadaanan ng mga motorsiklo at maliliit na sasakyan.',
      locationDescription: 'Monbon Spillway Approach Road',
      barangayId: 'brgy-1',
      barangayName: 'Monbon',
      latitude: 12.7085,
      longitude: 124.0318,
      imageUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800',
      photoUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800',
      photos: ['https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800'],
      status: 'VERIFIED',
      reportedBy: 'resident-maria',
      reporterName: 'Maria Santos (Resident)',
      reporterPhone: '0918-555-0202',
      reporterRole: 'RESIDENT',
      adminNotes: 'Inaprubahan at na-inspeksyon. Pinayuhan ang mga residente na dumaan muna sa Gabao diversion road.',
      verifiedBy: 'MDRRMO Duty Officer',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'report-sample-3',
      reportType: 'BLOCKED_ROAD',
      description: 'Nakatumbang malaking puno ng acasia sa highway malapit sa San Julian Boundary. Nakaharang sa buong kanang linya patungong Poblacion.',
      locationDescription: 'National Highway, San Julian-Poblacion Boundary',
      barangayId: 'brgy-4',
      barangayName: 'San Julian',
      latitude: 12.6995,
      longitude: 124.0398,
      imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800',
      photoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800',
      photos: ['https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800'],
      status: 'VERIFIED',
      reportedBy: 'resident-pedro',
      reporterName: 'Pedro Alcantara',
      reporterPhone: '0919-555-0303',
      reporterRole: 'RESIDENT',
      adminNotes: 'BFP Irosin and Chainsaw team dispatched to clear the fallen tree.',
      verifiedBy: 'MDRRMO Admin',
      createdAt: now,
      updatedAt: now
    }
  ];

  for (const rep of sampleReports) {
    await db.collection('disaster_reports').doc(rep.id).set(rep);
    console.log(`  ✅ Verified Report: ${rep.locationDescription}`);
  }

  console.log('\n🎉 All initial data seeded successfully!\n');
  console.log('Collections populated:');
  console.log(`  • evacuation_centers: ${centers.length} records`);
  console.log(`  • hazard_zones: ${hazards.length} records`);
  console.log(`  • emergency_contacts: ${contacts.length} records`);
  console.log(`  • evacuation_routes: ${routes.length} records`);
  console.log(`  • preparedness_guides: ${guides.length} records`);
  console.log(`  • disaster_reports (verified): ${sampleReports.length} records`);
  process.exit(0);
}

seedInitialData().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
