/**
 * MASTER SEED SCRIPT — Irosin Disaster Safety System
 * Seeds: Barangays, Admin User, Evacuation Centers, Routes,
 *        Emergency Contacts, Hazard Zones, Preparedness Guides, App Config
 *
 * Usage: npx ts-node -e "require('dotenv').config()" src/scripts/seedMaster.ts
 *    or: npx ts-node src/scripts/seedMaster.ts
 */

import * as admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const projectId   = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey  = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌  Missing Firebase credentials in .env');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  }),
});

const db  = admin.firestore();
const now = new Date().toISOString();

// ─────────────────────────────────────────────────────────────────────────────
// 1. BARANGAYS
// ─────────────────────────────────────────────────────────────────────────────
const BARANGAYS = [
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
  { id: 'brgy-16', name: 'San Isidro',    municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.6910, longitude: 124.0340, population: 2900, status: 'ACTIVE' },
  { id: 'brgy-17', name: 'San Pedro',     municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.7130, longitude: 124.0460, population: 2200, status: 'ACTIVE' },
  { id: 'brgy-18', name: 'Tabon-Tabon',   municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.7020, longitude: 124.0280, population: 1800, status: 'ACTIVE' },
  { id: 'brgy-19', name: 'Tinampo',       municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.6800, longitude: 124.0550, population: 1600, status: 'ACTIVE' },
  { id: 'brgy-20', name: 'Batang',        municipality: 'Irosin',  province: 'Sorsogon', latitude: 12.7250, longitude: 124.0350, population: 2000, status: 'ACTIVE' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. EVACUATION CENTERS
// ─────────────────────────────────────────────────────────────────────────────
const CENTERS = [
  {
    id: 'ec-irosin-main',
    name: 'Irosin Municipal Evacuation Center (Auditorium)',
    barangayId: 'brgy-4',
    barangayName: 'San Julian',
    address: 'Municipal Compound, San Julian, Irosin, Sorsogon',
    latitude: 12.7051,
    longitude: 124.0321,
    capacity: 600,
    currentOccupancy: 0,
    status: 'OPEN',
    amenities: ['Power Generator', 'Clean Drinking Water', 'Medical Clinic', 'Separate Comfort Rooms', 'WiFi Hotline'],
    contactPerson: 'Engr. Alexis Fuentes (MDRRMO Head)',
    contactPhone: '0917-555-4767',
  },
  {
    id: 'ec-bulusan-cultural',
    name: 'Bulusan Cultural Center & Evacuation Complex',
    barangayId: 'brgy-6',
    barangayName: 'San Roque',
    address: 'Poblacion, Bulusan, Sorsogon',
    latitude: 12.7523,
    longitude: 124.1356,
    capacity: 500,
    currentOccupancy: 0,
    status: 'OPEN',
    amenities: ['Emergency Standby Power', 'Water Filtration', 'Child-Friendly Space', 'Medical Station'],
    contactPerson: 'Capt. Fernando Garcia',
    contactPhone: '0918-662-3901',
  },
  {
    id: 'ec-irosin-north',
    name: 'Irosin North Evacuation Complex & Gymnasium',
    barangayId: 'brgy-3',
    barangayName: 'Gabao',
    address: 'Barangay Gabao Highway, Irosin, Sorsogon',
    latitude: 12.7120,
    longitude: 124.0380,
    capacity: 450,
    currentOccupancy: 0,
    status: 'OPEN',
    amenities: ['Covered Court Shelter', 'First Aid Station', 'Restrooms', 'Emergency Supplies Warehouse'],
    contactPerson: 'Brgy. Capt. Mateo Ramos',
    contactPhone: '0920-412-8877',
  },
  {
    id: 'ec-monbon-elementary',
    name: 'Monbon Elementary School Evacuation Center',
    barangayId: 'brgy-1',
    barangayName: 'Monbon',
    address: 'Monbon Elementary School Grounds, Irosin, Sorsogon',
    latitude: 12.7081,
    longitude: 124.0325,
    capacity: 350,
    currentOccupancy: 0,
    status: 'STANDBY',
    amenities: ['Solar Lighting', 'Potable Water Station', 'Community Kitchen'],
    contactPerson: 'Principal Josefa Cruz',
    contactPhone: '0927-319-5400',
  },
  {
    id: 'ec-poblacion-gym',
    name: 'Poblacion Sports Complex & Evacuation Gym',
    barangayId: 'brgy-15',
    barangayName: 'Poblacion',
    address: 'Poblacion, Irosin, Sorsogon',
    latitude: 12.7057,
    longitude: 124.0364,
    capacity: 800,
    currentOccupancy: 0,
    status: 'OPEN',
    amenities: ['Large Covered Court', 'Generator Backup', 'Medical Bay', 'Restrooms', 'Water Supply'],
    contactPerson: 'Barangay Chairman Roberto Lim',
    contactPhone: '0912-345-6789',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. EVACUATION ROUTES
// ─────────────────────────────────────────────────────────────────────────────
const ROUTES = [
  {
    id: 'route-gabao-auditorium',
    routeName: 'Gabao Highway to Irosin Central Auditorium Safe Path',
    barangayId: 'brgy-3',
    barangayName: 'Gabao',
    destinationCenterId: 'ec-irosin-main',
    destinationCenterName: 'Irosin Municipal Evacuation Center',
    originDescription: 'Gabao Barangay Hall & High-Risk Flood Sector',
    instructions: '1. Lumabas sa Gabao Barangay Hall patungong Maharlika Highway Bypass.\n2. Lumiko sa kanan patungong Municipal Hall Access Road.\n3. Dumiretso sa Irosin Central Auditorium entrance.',
    distanceKm: 1.8,
    estimatedMinutes: 22,
    hazardWarnings: ['Iwasan ang Cadacan River Bank Spillway kapag lumalaki ang tubig.'],
    status: 'CLEAR',
    lastVerifiedDate: now.split('T')[0],
  },
  {
    id: 'route-monbon-poblacion',
    routeName: 'Monbon to Poblacion Sports Complex Emergency Route',
    barangayId: 'brgy-1',
    barangayName: 'Monbon',
    destinationCenterId: 'ec-poblacion-gym',
    destinationCenterName: 'Poblacion Sports Complex & Evacuation Gym',
    originDescription: 'Monbon Market Square & Lowland Sector',
    instructions: '1. Lumakad mula Monbon Market patungong National Highway.\n2. Sumakay ng jeep o maglakad patungong Poblacion.\n3. Pumasok sa Sports Complex Main Gate.',
    distanceKm: 2.5,
    estimatedMinutes: 30,
    hazardWarnings: ['Maging alerto sa mga basang kalsada.', 'Iwasan ang mababang lugar malapit sa ilog.'],
    status: 'CLEAR',
    lastVerifiedDate: now.split('T')[0],
  },
  {
    id: 'route-sanroque-bulusan',
    routeName: 'San Roque to Bulusan Cultural Center Safe Route',
    barangayId: 'brgy-6',
    barangayName: 'San Roque',
    destinationCenterId: 'ec-bulusan-cultural',
    destinationCenterName: 'Bulusan Cultural Center & Evacuation Complex',
    originDescription: 'San Roque Barangay Plaza & Ashfall Sector',
    instructions: '1. Mula sa San Roque Plaza, lumakad patungong Bulusan Main Bypass Road.\n2. Sundan ang mga green evacuation signs papuntang Cultural Center Gate.',
    distanceKm: 1.2,
    estimatedMinutes: 15,
    hazardWarnings: ['Magsuot ng N95 mask habang naglalakad dahil sa abo ng Mt. Bulusan.'],
    status: 'CLEAR',
    lastVerifiedDate: now.split('T')[0],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. EMERGENCY CONTACTS
// ─────────────────────────────────────────────────────────────────────────────
const CONTACTS = [
  {
    id: 'contact-mdrrmo-head',
    organization: 'MDRRMO Irosin Command Center',
    contactPerson: 'Engr. Alexis Fuentes (Disaster Risk Reduction Officer)',
    phone: '0917-555-4767',
    category: 'MDRRMO',
    address: 'Municipal Hall Annex, Irosin, Sorsogon',
    description: '24/7 Official Emergency Command Center for Search & Rescue, Medical Dispatch, and Evacuation Assistance.',
    isEmergencyHotline: true,
    priorityOrder: 1,
  },
  {
    id: 'contact-pnp-irosin',
    organization: 'PNP Irosin Municipal Police Station',
    contactPerson: 'PMAJ Ronald Vance (Station Commander)',
    phone: '0998-598-6211',
    category: 'POLICE',
    address: 'Maharlika Highway, Irosin, Sorsogon',
    description: 'Public Safety, Peace & Order Maintenance, and Disaster Security Dispatch.',
    isEmergencyHotline: true,
    priorityOrder: 2,
  },
  {
    id: 'contact-bfp-irosin',
    organization: 'Bureau of Fire Protection (BFP Irosin)',
    contactPerson: 'INSP Mark Anthony Ramos',
    phone: '0922-841-3911',
    category: 'FIRE_STATION',
    address: 'San Julian, Irosin, Sorsogon',
    description: 'Fire Suppression, Extrication Rescue, and Hazardous Material Control.',
    isEmergencyHotline: true,
    priorityOrder: 3,
  },
  {
    id: 'contact-irosin-hospital',
    organization: 'Irosin District Hospital Emergency Room',
    contactPerson: 'Dr. Maria Elena Santos (ER Head)',
    phone: '0919-334-8822',
    category: 'HOSPITAL',
    address: 'San Mateo, Irosin, Sorsogon',
    description: '24/7 Emergency Trauma, Medical Evacuation & Critical Care Hospital Unit.',
    isEmergencyHotline: true,
    priorityOrder: 4,
  },
  {
    id: 'contact-rhu-irosin',
    organization: 'Irosin Rural Health Unit (RHU)',
    contactPerson: 'Dr. Jose Perez (Municipal Health Officer)',
    phone: '0916-222-1144',
    category: 'HEALTH_CENTER',
    address: 'Poblacion, Irosin, Sorsogon',
    description: 'Primary health care, medical consultations, and emergency first aid during disasters.',
    isEmergencyHotline: false,
    priorityOrder: 5,
  },
  {
    id: 'contact-soreco2',
    organization: 'SORECO II (Sorsogon Electric Cooperative II)',
    contactPerson: 'SORECO II Emergency Operations',
    phone: '0917-888-5632',
    category: 'UTILITY',
    address: 'Sorsogon City, Sorsogon',
    description: 'Power outage restoration, electrical hazard response, and emergency line repair for Irosin and surrounding areas.',
    isEmergencyHotline: false,
    priorityOrder: 6,
  },
  {
    id: 'contact-phivolcs',
    organization: 'PHIVOLCS Regional Office (Region V)',
    contactPerson: 'PHIVOLCS Duty Officer',
    phone: '(054) 211-1507',
    category: 'GOVERNMENT',
    address: 'Legazpi City, Albay',
    description: 'Volcano monitoring for Mt. Bulusan and seismic activity reports for Bicol Region.',
    isEmergencyHotline: false,
    priorityOrder: 7,
  },
  {
    id: 'contact-pagasa-legazpi',
    organization: 'PAGASA Legazpi City Station',
    contactPerson: 'PAGASA Weather Duty Forecaster',
    phone: '(052) 480-9064',
    category: 'GOVERNMENT',
    address: 'Legazpi City, Albay',
    description: 'Official weather forecasts, typhoon advisories, and rainfall warnings for Sorsogon province.',
    isEmergencyHotline: false,
    priorityOrder: 8,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 5. PREPAREDNESS GUIDES
// ─────────────────────────────────────────────────────────────────────────────
const GUIDES = [
  {
    id: 'guide-typhoon-before',
    title: 'Paghahanda Bago Dumating ang Bagyo',
    hazardType: 'TYPHOON',
    category: 'BEFORE',
    priority: 1,
    content: 'Mga mahahalagang hakbang upang maprotektahan ang pamilya at tahanan bago mag-landfall ang bagyo.',
    steps: [
      'Ihanda ang Emergency Go-Bag na may sapat na pagkain (ready-to-eat), malinis na tubig para sa 72 oras, flashlight, pito, at first aid kit.',
      'Suriin at patatagin ang bubong, dingding, at bintana ng bahay.',
      'Putulin ang mga mahahabang sanga ng puno malapit sa bubong o kable ng kuryente.',
      'I-charge nang buo ang mga cellphone, powerbank, at emergency lights.',
      'Makinig sa mga opisyal na ulat ng MDRRMO Irosin, PAGASA, at lokal na pamahalaan.',
      'Kung naninirahan sa mababang lugar o tabing-ilog, sumunod agad sa Pre-emptive Evacuation Order.',
    ],
    tips: [
      'Magtabi ng mga mahahalagang dokumento (Birth Certificate, titulo, ID) sa waterproof plastic pouch.',
      'Siguraduhing ligtas ang mga alagang hayop.',
    ],
    emergencyKitItems: ['Ready-to-eat canned goods', 'Inuming tubig (4L/tao/araw)', 'Flashlight at ekstrang baterya', 'First aid kit', 'Transistor radio', 'Whistle / Pito'],
    isPublished: true,
    source: 'MDRRMO Irosin & PAGASA Guidelines',
  },
  {
    id: 'guide-typhoon-during',
    title: 'Mga Dapat Gawin Habang Nananalasa ang Bagyo',
    hazardType: 'TYPHOON',
    category: 'DURING',
    priority: 2,
    content: 'Kaligtasan at tamang pag-iingat sa kasagsagan ng malalakas na hangin at matinding buhos ng ulan.',
    steps: [
      'Manatili sa loob ng matibay na bahay o evacuation center. Huwag lumabas nang walang pahintulot ng mga awtoridad.',
      'Lumayo sa mga bintanang salamin at pader na maaaring tamaan ng natumbang puno o lumilipad na yero.',
      'Patayin ang main electrical switch o breaker kung sakaling pumasok ang baha.',
      'Huwag lumusong o magmaneho sa rumaragasang tubig-baha.',
      'Subaybayan ang sitwasyon sa pamamagitan ng bateryang radyo o Irosin Disaster Safety App.',
    ],
    tips: [
      'Huwag maniwala o magpakalat ng unverified na impormasyon sa social media.',
      'Magtipid sa baterya ng cellphone para sa mga emergency calls.',
    ],
    isPublished: true,
    source: 'MDRRMO Irosin Protocol',
  },
  {
    id: 'guide-typhoon-after',
    title: 'Pag-iingat at Pagbangon Pagkatapos ng Bagyo',
    hazardType: 'TYPHOON',
    category: 'AFTER',
    priority: 3,
    content: 'Mga hakbang para sa ligtas na pagbalik sa tahanan at pag-iwas sa mga panganib pagkatapos humupa ang bagyo.',
    steps: [
      'Bantayan ang mga nakalawit o putol na kable ng kuryente at natumbang poste. Ipagbigay-alam sa SORECO II o MDRRMO.',
      'Huwag agad pumasok sa nasirang bahay hangga\'t hindi nasusuri ng mga opisyal.',
      'Gumamit ng malinis na inuming tubig lamang. Mayroon maaaring kontaminado ang mga bukal.',
      'Mag-ingat sa mga butil-butil na debris at basura na may kasamang ahas o hayop.',
      'Iulat ang mga insidente at pinsala sa MDRRMO Irosin para sa mabilis na relief response.',
    ],
    isPublished: true,
    source: 'MDRRMO Irosin & NDRRMC Guidelines',
  },
  {
    id: 'guide-earthquake-during',
    title: 'Mga Dapat Gawin Sa Oras ng Lindol',
    hazardType: 'EARTHQUAKE',
    category: 'DURING',
    priority: 4,
    content: 'Tamang reaksyon sa pagyanig ng lupa upang maiwasan ang pinsala at mapanatili ang kaligtasan ng lahat.',
    steps: [
      'DUCK — Lumuhod o lumaba sa sahig upang hindi matumba ng lakas ng lindol.',
      'COVER — Pumunta sa ilalim ng matibay na mesa o desk. Kung wala, takpan ang ulo at leeg gamit ang mga braso.',
      'HOLD ON — Kumapit nang mahigpit sa piniling silungan hanggang huminto ang panginginig.',
      'Lumayo sa mga bintana, salamin, at mga bagay na maaaring mahulog.',
      'Kung nasa labas ng gusali, lumayo sa mga puno, poste, at gusali. Lumuhod sa bukas na lugar.',
      'Kung nasa sasakyan, tigilan ang pagmamaneho at manatili sa loob hanggang huminto ang lindol.',
    ],
    tips: [
      'Huwag tumakbo palabas ng gusali habang nangyayari ang lindol.',
      'Pagkatapos ng lindol, maging handa para sa mga aftershocks.',
    ],
    isPublished: true,
    source: 'PHIVOLCS & NDRRMC Earthquake Safety Protocol',
  },
  {
    id: 'guide-volcanic-eruption',
    title: 'Paghahanda at Kaligtasan Tuwing Nagagalaw ang Mt. Bulusan',
    hazardType: 'VOLCANIC_ERUPTION',
    category: 'BEFORE',
    priority: 5,
    content: 'Espesyal na gabay para sa mga residente ng Irosin at karatig-bayan ukol sa Mt. Bulusan volcanic activity.',
    steps: [
      'Subaybayan ang mga opisyal na bulletin ng PHIVOLCS tungkol sa Alert Level ng Mt. Bulusan.',
      'Kung itinaas sa Alert Level 1-2, ihanda ang Go-Bag at maging handang lumikas kahit kailan.',
      'Magsuot ng N95 o FFP2 mask, mahahabang manggas, at salamin sa mata kung may ashfall.',
      'Isara ang lahat ng bintana, pintuan, at ventilation openings para maiwasan ang pagpasok ng abo sa bahay.',
      'Banlawan ang mga taniman at bubong ng tubig pagkatapos ng ashfall upang maiwasan ang structural collapse.',
      'Sundin ang Pre-emptive Evacuation kung nakatira sa loob ng 4km danger zone ng Mt. Bulusan.',
    ],
    tips: [
      'Ang volcanic ash ay nakakasakit sa baga at mata. Palaging may N95 mask sa Emergency Go-Bag.',
      'Huwag gagamitin ang sasakyan kung mabigat ang ashfall — maaaring masira ang makina.',
    ],
    isPublished: true,
    source: 'PHIVOLCS Mt. Bulusan Hazard Advisory',
  },
  {
    id: 'guide-flood-before',
    title: 'Paghahanda Bago Bumaha sa Inyong Lugar',
    hazardType: 'FLOOD',
    category: 'BEFORE',
    priority: 6,
    content: 'Mga hakbang na dapat gawin ng mga residente na nasa mababang lugar o malapit sa ilog bago dumating ang baha.',
    steps: [
      'Alamin kung ang inyong barangay ay nasa flood-prone area ayon sa hazard map ng MDRRMO.',
      'Ilipat ang mga gamit, kasangkapan, at pagkain sa pinakamataas na bahagi ng bahay.',
      'I-off ang main circuit breaker at gas supply kung mataas na ang antas ng baha.',
      'Ihanda ang Go-Bag na may waterproof na lagayan para sa mga dokumentong mahalaga.',
      'Makipag-coordinate sa Barangay DRRMC para sa maagang evacuation kung kinakailangan.',
    ],
    isPublished: true,
    source: 'MDRRMO Irosin & PAGASA Flood Safety Protocol',
  },
  {
    id: 'guide-emergency-kit',
    title: 'Paano Maghanda ng Emergency Go-Bag (72-Hour Kit)',
    hazardType: 'GENERAL',
    category: 'BEFORE',
    priority: 7,
    content: 'Kompletong gabay sa paghahanda ng Emergency Go-Bag para sa lahat ng uri ng sakuna. Dapat naka-ready ito sa loob ng bahay sa lahat ng oras.',
    steps: [
      'Pumili ng matibay na backpack na madaling bitbitin at may sapat na kapasidad.',
      'Magtabi ng pagkain at tubig para sa minimum 72 oras (3 araw): 4 litro ng tubig bawat tao bawat araw.',
      'Isama ang first aid kit na may bandage, antiseptic, at personal na gamot.',
      'Maglagay ng flashlight, extra batteries, at isang whistle para sa signal.',
      'Isama ang kopya ng mahahalagang dokumento (ID, insurance, titulo) sa waterproof pouch.',
      'Maglagay ng extra clothes, raincoat, at sleeping bag o kumot.',
      'Isama ang cash (small bills) dahil maaaring hindi gumagana ang ATM o credit cards sa panahon ng sakuna.',
    ],
    emergencyKitItems: [
      'Tubig (4L/tao/araw × 3 araw)', 'Canned goods at ready-to-eat food', 'Manual can opener',
      'First aid kit at maintenance medicines', 'Flashlight at extra batteries', 'Whistle / Pito',
      'N95 mask (minimum 3 pcs)', 'Extra clothes at raincoat', 'Waterproof document pouch',
      'Cash (small bills)', 'Bateryang radyo (transistor)', 'Power bank (fully charged)',
    ],
    isPublished: true,
    source: 'NDRRMC & MDRRMO Standard Emergency Kit Guidelines',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 7. APP CONFIG (for dynamic labels, privacy notice, terms)
// ─────────────────────────────────────────────────────────────────────────────
const APP_CONFIG = {
  appName: 'Irosin Disaster Safety App',
  locationSubtitle: 'Irosin, Sorsogon',
  version: '1.0.0',
  commandCenterHotline: '0917-555-4767 / MDRRMO 24/7',
  aboutDescription: 'Ang application na ito ay dinisenyo upang magbigay ng mabilis, maaasahan, at realtime na impormasyon sa panahon ng sakuna at kalamidad sa Munisipalidad ng Irosin at mga karatig-bayan sa Lalawigan ng Sorsogon. Ito ay isang opisyal na proyekto ng MDRRMO Irosin para sa kaligtasan ng lahat ng mamamayan.',
  authority: 'Municipal Disaster Risk Reduction & Management Office (MDRRMO) — Irosin, Sorsogon',
  developmentTeam: 'Project Development & Research Team, BSIT',
  academicYear: '2025 – 2026',
  privacyNoticeTitle: 'Patakaran sa Privacy ng Datos (RA 10173 Compliance)',
  privacyNoticeContent: 'Alinsunod sa Republic Act No. 10173 o Data Privacy Act of 2012 ng Pilipinas, ang Irosin Disaster Safety App at ang MDRRMO ay nangangakong poprotektahan ang iyong personal na impormasyon.\n\n1. PANGONGOLEKTA NG IMPORMASYON: Kapag ikaw ay nagsumite ng ulat ng sakuna (Citizen Report) o nag-apply bilang Barangay Responder, kinokolekta lamang namin ang iyong Pangalan, Contact Number, Lokasyon (GPS coordinates), at Larawan ng insidente para lamang sa layuning pagsagip at pag-aksyon ng mga awtoridad.\n\n2. PAGGAMIT AT PAGBABAHAGI: Ang impormasyong nakalap ay eksklusibong ginagamit ng MDRRMO at BDRRMC responders para sa emergency operations. Hindi kailanman ibebenta o ipamamahagi ang iyong datos sa mga komersyal na entidad.\n\n3. LOKASYON AT SENSORS: Ang paggamit ng GPS location ay pansamantala lamang habang ginagamit ang mapa o habang nagpapadala ng emergency report.\n\n4. KARAPATAN NG USER: May karapatan kang humiling ng pagbura o pagwawasto ng iyong datos sa pamamagitan ng pag-ugnay sa MDRRMO Data Protection Officer.',
  termsTitle: 'Kasunduan at Tuntunin sa Paggamit (Terms of Service)',
  termsContent: '1. PANGKALAHATANG LAYUNIN: Ang system na ito ay nilikha para sa pagpapalaganap ng maagang babala (early warning), impormasyon sa evacuation centers, lagay ng panahon, at pag-uulat ng mga emergency sa Irosin, Sorsogon.\n\n2. RESPONSIBLENG PAG-UULAT: Mahigpit na ipinagbabawal ang pagpapadala ng maling impormasyon, pekeng ulat ng sakuna (prank reports), o nakakapanlinlang na mga larawan. Ang mga lumalabag ay maaaring mapanagot sa ilalim ng umiiral na batas (RA 10175 Cybercrime Prevention Act at Revised Penal Code).\n\n3. EMERGENCY WARNINGS: Bagama\'t ginagawa ng sistema ang lahat upang maghatid ng real-time data mula sa PAGASA, PHIVOLCS, at USGS, laging sundin ang opisyal na tagubilin ng mga lokal na awtoridad at MDRRMO personnel sa iyong lugar.\n\n4. OFFLINE OPERATION: Ang app ay may kakayahang mag-imbak ng emergency hotlines at gabay sa kaligtasan kahit walang internet connection.',
  updatedAt: now,
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. MASTER SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
async function seedAll() {
  console.log('\n🌱 ====== IROSIN DSS MASTER SEED STARTED ======\n');

  // Barangays
  console.log('📍 Seeding Barangays...');
  for (const b of BARANGAYS) {
    await db.collection('barangays').doc(b.id).set({ ...b, createdAt: now, updatedAt: now }, { merge: true });
    console.log(`   ✅ ${b.name} (${b.municipality})`);
  }

  // Evacuation Centers
  console.log('\n🏫 Seeding Evacuation Centers...');
  for (const c of CENTERS) {
    await db.collection('evacuation_centers').doc(c.id).set({ ...c, createdAt: now, updatedAt: now }, { merge: true });
    console.log(`   ✅ ${c.name}`);
  }

  // Evacuation Routes
  console.log('\n🛣️  Seeding Evacuation Routes...');
  for (const r of ROUTES) {
    await db.collection('evacuation_routes').doc(r.id).set({ ...r, createdAt: now, updatedAt: now }, { merge: true });
    console.log(`   ✅ ${r.routeName}`);
  }

  // Emergency Contacts
  console.log('\n📞 Seeding Emergency Contacts...');
  for (const c of CONTACTS) {
    await db.collection('emergency_contacts').doc(c.id).set({ ...c, createdAt: now, updatedAt: now }, { merge: true });
    console.log(`   ✅ ${c.organization}`);
  }

  // Preparedness Guides
  console.log('\n📚 Seeding Preparedness Guides...');
  for (const g of GUIDES) {
    await db.collection('preparedness_guides').doc(g.id).set({ ...g, createdAt: now, updatedAt: now }, { merge: true });
    console.log(`   ✅ ${g.title}`);
  }

  // App Config
  console.log('\n⚙️  Seeding App Config...');
  await db.collection('system_config').doc('app_profile').set(APP_CONFIG, { merge: true });
  console.log(`   ✅ App Config saved to system_config/app_profile`);

  // Admin User
  console.log('\n👤 Seeding Admin User...');
  const adminEmail = 'mdrmo.admin@irosin.gov.ph';
  const adminSnap = await db.collection('users').where('email', '==', adminEmail).limit(1).get();
  if (adminSnap.empty) {
    const hashedPassword = await bcrypt.hash('MDRRMO@Irosin2025!', 10);
    await db.collection('users').add({
      email: adminEmail,
      password: hashedPassword,
      name: 'MDRRMO Admin',
      role: 'ADMIN',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`   ✅ Admin user created: ${adminEmail}`);
    console.log(`   🔑 Password: MDRRMO@Irosin2025!`);
  } else {
    console.log(`   ⏭️  Admin user already exists: ${adminEmail}`);
  }

  console.log('\n✅ ====== MASTER SEED COMPLETE ======');
  console.log(`   • ${BARANGAYS.length} Barangays`);
  console.log(`   • ${CENTERS.length} Evacuation Centers`);
  console.log(`   • ${ROUTES.length} Evacuation Routes`);
  console.log(`   • ${CONTACTS.length} Emergency Contacts`);
  console.log(`   • ${GUIDES.length} Preparedness Guides`);
  console.log(`   • App Config seeded`);
  console.log('\n🚀 Your Irosin DSS database is now ready!\n');

  process.exit(0);
}

seedAll().catch(err => {
  console.error('\n❌ Seed error:', err);
  process.exit(1);
});
