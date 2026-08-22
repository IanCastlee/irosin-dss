import { db } from '../config/firebase';

interface PreparednessGuideItem {
  id: string;
  title: string;
  hazardType: 'TYPHOON' | 'FLOOD' | 'EARTHQUAKE' | 'VOLCANIC_ERUPTION' | 'LANDSLIDE' | 'GENERAL';
  category: 'BEFORE' | 'DURING' | 'AFTER';
  priority: number;
  content: string;
  steps: string[];
  tips?: string[];
  emergencyKitItems?: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  source?: string;
}

const now = new Date().toISOString();

const OFFICIAL_GUIDES: PreparednessGuideItem[] = [
  // ================= TYPHOON (BAGYO) =================
  {
    id: 'guide-typhoon-before',
    title: 'Paghahanda Bago Dumating ang Bagyo',
    hazardType: 'TYPHOON',
    category: 'BEFORE',
    priority: 1,
    content: 'Mga mahahalagang hakbang upang maprotektahan ang pamilya at tahanan bago mag-landfall ang bagyo sa Irosin at Sorsogon province.',
    steps: [
      'Ihanda ang Emergency Go-Bag na may sapat na pagkain (ready-to-eat), malinis na tubig para sa 72 oras, flashlight, pito, at first aid kit.',
      'Suriin at patatagin ang bubong, dingding, at bintana ng bahay. Magtali o maglagay ng pabigat kung kinakailangan.',
      'Putulin ang mga mahahabang sanga ng puno malapit sa bubong o kable ng kuryente upang maiwasan ang sakuna.',
      'I-charge nang buo ang mga cellphone, powerbank, at emergency lights habang may kuryente pa.',
      'Makinig sa mga opisyal na ulat at anunsyo ng MDRRMO Irosin, PAGASA, at lokal na pamahalaan.',
      'Kung naninirahan sa mababang lugar o tabing-ilog, sumunod agad sa Pre-emptive Evacuation patungo sa itinalagang Evacuation Center.'
    ],
    tips: [
      'Magtabi ng mga mahahalagang dokumento (Birth Certificate, titulo, ID) sa loob ng waterproof plastic pouch.',
      'Siguraduhing ligtas ang mga alagang hayop at i-secure ang kanilang pagkain.'
    ],
    emergencyKitItems: ['Ready-to-eat canned goods', 'Inuming tubig (4L bawat tao kada araw)', 'Flashlight at ekstrang baterya', 'First aid kit at maintenance medicines', 'Transistor radio', 'Whistle / Pito'],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
    source: 'MDRRMO Irosin & PAGASA Guidelines'
  },
  {
    id: 'guide-typhoon-during',
    title: 'Mga Dapat Gawin Habang Nananalasa ang Bagyo',
    hazardType: 'TYPHOON',
    category: 'DURING',
    priority: 2,
    content: 'Kaligtasan at tamang pag-iingat sa kasagsagan ng malalakas na hangin at matinding buhos ng ulan.',
    steps: [
      'Manatili sa loob ng matibay na bahay o nasa loob ng evacuation center. Huwag lumabas nang walang pahintulot ng mga awtoridad.',
      'Lumayo sa mga bintanang salamin at pader na maaaring tamaan ng natumbang puno o lumilipad na yero.',
      'Patayin ang main electrical switch o breaker kung sakaling pumasok ang baha sa loob ng inyong tahanan.',
      'Huwag lumusong o magmaneho sa rumaragasang tubig-baha o umapaw na sapa.',
      'Subaybayan ang sitwasyon sa pamamagitan ng bateryang radyo o ng MDRRMO Irosin mobile app.'
    ],
    tips: [
      'Huwag maniwala o magpakalat ng unverified na impormasyon sa social media.',
      'Magtipid sa baterya ng cellphone para sa mga emergency calls.'
    ],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
    source: 'MDRRMO Irosin Protocol'
  },
  {
    id: 'guide-typhoon-after',
    title: 'Pag-iingat at Pagbangon Pagkatapos ng Bagyo',
    hazardType: 'TYPHOON',
    category: 'AFTER',
    priority: 3,
    content: 'Mga hakbang para sa ligtas na pagbalik sa tahanan at pag-iwas sa mga panganib pagkatapos humupa ang bagyo.',
    steps: [
      'Bantayan ang mga nakalawit o putol na kable ng kuryente at natumbang poste. Ipagbigay-alam agad ito sa SORECO II o MDRRMO.',
      'Huwag agad pumasok sa nasirang bahay hangga\'t hindi nasusuri ng mga eksperto o opisyal ng barangay.',
      'Pakuluan ang inuming tubig nang hindi bababa sa 3 minuto bago inumin upang maiwasan ang sakit sa tiyan at kolera.',
      'Linisin at itapon ang mga naipong tubig sa gulong, lata, at bote upang hindi pamahayan ng lamok na nagdudulot ng Dengue.',
      'I-report ang mga nasirang kalsada o tulay gamit ang Road Hazard report feature sa MDRRMO app.'
    ],
    tips: [
      'Magsuot ng bota at guwantes habang naglilinis ng bakuran o sirang kagamitan.',
      'Makipag-ugnayan sa BDRRMC para sa relief assistance at ayuda.'
    ],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
    source: 'MDRRMO Irosin & DOH Health Advisory'
  },

  // ================= BULUSAN VOLCANO ERUPTION & ASHFALL =================
  {
    id: 'guide-volcano-before',
    title: 'Paghahanda sa Pag-aalboroto ng Bulkang Bulusan',
    hazardType: 'VOLCANIC_ERUPTION',
    category: 'BEFORE',
    priority: 1,
    content: 'Gabay para sa mga residente ng Irosin na sakop o malapit sa Permanent Danger Zone (PDZ) ng Bulkang Bulusan.',
    steps: [
      'Alamin kung ang inyong barangay ay sakop ng 4-kilometer Permanent Danger Zone (PDZ) o 2-kilometer Extended Danger Zone (EDZ).',
      'Mag-imbak ng sapat na N95 particulate respirators o malinis na surgical masks at eye protective goggles para sa buong pamilya.',
      'Takpan nang maayos ang lahat ng mga drum, tangke, at imbakan ng tubig-inuman upang hindi mapasukan ng volcanic ash.',
      'Ihanda ang mga sasakyan at tiyaking may sapat na gasolina para sa mabilisang paglikas kung itaas ang Alert Level ng PHIVOLCS.',
      'Sumunod sa abiso ng MDRRMO Irosin kapag nag-anunsyo ng mandatory evacuation para sa mga high-risk sectors.'
    ],
    tips: [
      'Protektahan ang mga may hika, bata, at matatanda laban sa sulfur dioxide fumes at pinong abo.',
      'I-secure ang mga alagang baka, kalabaw, at manok sa mga protektadong kulungan.'
    ],
    emergencyKitItems: ['N95 Masks', 'Eye Goggles', 'Waterproof Tarpaulin', 'First Aid Supplies', 'Dust Covers'],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
    source: 'PHIVOLCS-DOST & MDRRMO Irosin'
  },
  {
    id: 'guide-volcano-during',
    title: 'Kaligtasan Habang may Pagsabog at Ashfall',
    hazardType: 'VOLCANIC_ERUPTION',
    category: 'DURING',
    priority: 2,
    content: 'Mahahalagang pag-iingat sa panahong nagbubuga ng abo at volcanic gas ang Bulkang Bulusan.',
    steps: [
      'Magsuot agad ng N95 mask o basang panyo sa ilong at bibig. Gumamit ng goggles o salamin upang hindi mapuwing ang mga mata.',
      'Manatili sa loob ng bahay. Isara ang lahat ng mga bintana, pinto, at ventilation openings upang hindi makapasok ang pinong abo.',
      'Iwasan ang pagmamaneho sa makapal na ashfall dahil madulas ang kalsada at mababa ang visibility.',
      'I-off ang air conditioning units at electric fans na kumukuha ng hangin mula sa labas.',
      'Huwag lumapit sa mga ilog at sapa (tulad ng Cadacan River) dahil sa banta ng mabilis na lahar flow kapag umulan.'
    ],
    tips: [
      'Magsuot ng long-sleeved na damit at pantalon upang maiwasan ang pangangati ng balat.',
      'Kung nagmamaneho nang biglang mag-ashfall, itabi ang sasakyan at buksan ang hazard lights.'
    ],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
    source: 'PHIVOLCS & DOH Emergency Protocol'
  },
  {
    id: 'guide-volcano-after',
    title: 'Tamang Paglilinis ng Ashfall at Pag-iwas sa Lahar',
    hazardType: 'VOLCANIC_ERUPTION',
    category: 'AFTER',
    priority: 3,
    content: 'Paraan ng paglilinis ng volcanic ash at pag-iwas sa pagbagsak ng bubong o pagbaha ng lahar.',
    steps: [
      'Huwag basain ng tubig ang makapal na abo sa bubong! Ang basang abo ay lubhang mabigat at maaaring maging sanhi ng pagguho ng bubong.',
      'Magsuot ng mask at basang guwantes habang nagwawalis ng tuyong abo mula sa bubong at bakuran.',
      'Hugasan at banlawang mabuti ang mga gulay, prutas, at kagamitan bago gamitin o kainin.',
      'Bantayan ang lagay ng panahon — kapag nagkaroon ng malalakas na pag-ulan, maging handa sa posibleng lahar flow mula sa dalisdis ng bulkan.',
      'Hintayin ang opisyal na clearance mula sa PHIVOLCS at LGU Irosin bago bumalik sa mga pook na pinalikas.'
    ],
    tips: [
      'Ilagay ang naipong volcanic ash sa sako at huwag itapon sa drainage o kanal upang hindi magbara.',
      'Palitan agad ang filters ng sasakyan bago gamitin muli.'
    ],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
    source: 'MDRRMO Irosin & DPWH Guidelines'
  },

  // ================= FLOOD (PAGBAHA) =================
  {
    id: 'guide-flood-before',
    title: 'Paghahanda Bago ang Pagbaha sa Mababang Sektor',
    hazardType: 'FLOOD',
    category: 'BEFORE',
    priority: 1,
    content: 'Paghahanda para sa mga barangay na malapit sa ilog, sapa, at mababang bahagi ng Irosin.',
    steps: [
      'Alamin ang flood hazard map ng inyong barangay at ang pinakamalapit na ligtas na evacuation shelter.',
      'Itaas ang mga gamit, appliances, at mahahalagang papeles sa ikalawang palapag o mataas na bahagi ng bahay.',
      'Linisin ang mga kanal at estero sa paligid ng inyong bakuran upang hindi magbara ang daloy ng tubig.',
      'Ihanda ang mga kagamitan sa paglikas at siguruhing may madaling lakarin na ligtas na ruta.',
      'Makipag-ugnayan sa inyong Barangay Disaster Risk Reduction Committee (BDRRMC).'
    ],
    tips: [
      'Maglagay ng sandbags sa mga pintuan kung mababa ang threshold ng inyong bahay.',
      'I-save ang emergency hotlines ng MDRRMO at Rescue Teams.'
    ],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
    source: 'MDRRMO Irosin Flood Safety Protocol'
  },
  {
    id: 'guide-flood-during',
    title: 'Mga Dapat Gawin Habang Tumataas ang Baha',
    hazardType: 'FLOOD',
    category: 'DURING',
    priority: 2,
    content: 'Mahahalagang alituntunin sa kaligtasan kapag mabilis na umapaw ang tubig-baha.',
    steps: [
      'Patayin agad ang main breaker ng kuryente bago lumusong o bago maabot ng tubig ang mga saksakan.',
      'Huwag lumusong o magtampisaw sa baha upang maiwasan ang Leptospirosis, pagkalunod, at electrocution.',
      'Kung inabot ng baha sa loob ng sasakyan, iwanan agad ito at lumipat sa mas mataas na lugar.',
      'Lumikas nang maaga habang mababaw pa ang tubig at huwag maghintay ng gabi o pagdilim bago umalis.',
      'Gumamit ng safety ropes o humawak sa matitibay na bagay kung kinakailangang tumawid sa mababaw ngunit mabilis na agos.'
    ],
    tips: [
      'Ang 6 inches na mabilis na agos ay kayang magpatumba ng tao, at ang 12 inches ay kayang magpalutang ng maliit na kotse.',
      'Huwag hayaang maglaro ang mga bata sa tubig-baha.'
    ],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
    source: 'NDRRMC & MDRRMO Safety Guidelines'
  },
  {
    id: 'guide-flood-after',
    title: 'Pag-iingat Pagkatapos Humupa ang Tubig-Baha',
    hazardType: 'FLOOD',
    category: 'AFTER',
    priority: 3,
    content: 'Ligtas na paglilinis at pag-iwas sa mga sakit pagkatapos ng baha.',
    steps: [
      'Huwag agad bubuksan ang kuryente. Ipasuri muna sa lisensyadong elektrisyan ang mga saksakan at linya ng kuryente na nabasa.',
      'Mag-ingat sa mga nakatagong bubog, pako, ahas, at iba pang mapanganib na hayop na maaaring inanod ng baha sa loob ng bahay.',
      'Magdisimpekta ng bahay gamit ang bleach solution (1 kutsarang bleach sa bawat 1 galon ng tubig).',
      'Itapon ang lahat ng pagkain at inumin na nabasa o nadikit sa tubig-baha.',
      'Uminom agad ng Doxycycline prophylaxis mula sa Rural Health Unit (RHU) kung ikaw ay lumusong sa baha para maiwasan ang Leptospirosis.'
    ],
    tips: [
      'Magsuot ng makakapal na bota at gloves habang naglilinis ng putik.',
      'Patuyuin at i-ventilate ang mga kwarto upang maiwasan ang amag (mold growth).'
    ],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
    source: 'DOH & MDRRMO Health Guidelines'
  },

  // ================= EARTHQUAKE (LINDOL) =================
  {
    id: 'guide-earthquake-before',
    title: 'Paghahanda Bago Magkaroon ng Lindol',
    hazardType: 'EARTHQUAKE',
    category: 'BEFORE',
    priority: 1,
    content: 'Paghahanda ng pamilya at tahanan laban sa biglaang pagyanig.',
    steps: [
      'I-anchor o itali sa dingding ang mga matatayog at mabibigat na aparador, refrigerator, at picture frames.',
      'Alamin ang mga matitibay na mesa sa loob ng bahay na maaaring pagtaguan habang lumilindol.',
      'Tukuyin ang ligtas na open evacuation area sa inyong komunidad na malayo sa mga gusali, pader, at poste ng kuryente.',
      'Magsanay ng regular na Duck, Cover, and Hold drill kasama ang buong pamilya.',
      'Ihanda ang Emergency Grab-Bag sa madaling maabot na lugar malapit sa pintuan.'
    ],
    tips: [
      'Huwag maglagay ng mabibigat na gamit o salamin sa itaas ng headboard ng kama.',
      'Alamin kung saan at paano isara ang main valve ng gas/LPG at main electrical switch.'
    ],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
    source: 'PHIVOLCS-DOST & OCD Guidelines'
  },
  {
    id: 'guide-earthquake-during',
    title: 'DUCK, COVER, AND HOLD Habang Lumilindol',
    hazardType: 'EARTHQUAKE',
    category: 'DURING',
    priority: 2,
    content: 'Tamang reaksyon at pag-iingat sa panahong maramdaman ang pagyanig.',
    steps: [
      'DUCK (Dumapa): Yumuko at protektahan ang ulo at leeg.',
      'COVER (Magtago): Sumuot sa ilalim ng matibay na mesa o desk. Kung walang mesa, lumuhod sa tabi ng interior wall at takpan ang ulo gamit ang braso o unan.',
      'HOLD (Humawak): Hawakan nang mahigpit ang mga paa ng mesa at maghintay hanggang sa ganap na tumigil ang pagyanig.',
      'Kung nasa labas: Lumayo agad sa mga gusali, salamin, poste, puno, at overpass.',
      'Huwag gumamit ng elevator. Manatili kung nasaan ka at huwag mag-unahan sa pintuan.'
    ],
    tips: [
      'Huwag mag-panic. Maging alerto sa mga babagsak na debris at gamit sa paligid.',
      'Kung nagmamaneho, marahang itabi ang sasakyan at huwag huminto sa ibabaw ng tulay o flyover.'
    ],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
    source: 'PHIVOLCS Official Protocol'
  },
  {
    id: 'guide-earthquake-after',
    title: 'Paglikas at Pagsusuri Pagkatapos ng Lindol',
    hazardType: 'EARTHQUAKE',
    category: 'AFTER',
    priority: 3,
    content: 'Mga hakbang matapos ang pagyanig at pag-iingat sa mga aftershocks.',
    steps: [
      'Kapag tumigil na ang pagyanig, mabilis ngunit maayos na lumabas ng gusali gamit ang hagdan patungo sa open evacuation area.',
      'Suriin ang sarili at pamilya kung may tinamong sugat at maglapat ng paunang lunas (first aid).',
      'Suriin kung may amoy ng gas leak. Huwag magsindi ng posporo, lighter, o switch ng kuryente kung may hinalang may tagas ang LPG.',
      'Mag-ingat sa mga posibleng AFTERSHOCKS na maaaring magpaguho sa mga bahagyang napinsalang istruktura.',
      'Makinig sa opisyal na balita mula sa MDRRMO Irosin at PHIVOLCS.'
    ],
    tips: [
      'Huwag pumasok sa mga gusaling may malalaking bitak o struktural na sira.',
      'Gamitin ang cellphone para sa mga urgent emergency situations lamang.'
    ],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
    source: 'PHIVOLCS-DOST & MDRRMO Irosin'
  },

  // ================= LANDSLIDE (PAGGUHO NG LUPA) =================
  {
    id: 'guide-landslide-before',
    title: 'Paghahanda at Palatandaan ng Pagguho ng Lupa',
    hazardType: 'LANDSLIDE',
    category: 'BEFORE',
    priority: 1,
    content: 'Pagmamanman sa mga senyales ng paglambot at pagguho ng lupa sa mga bulubunduking barangay ng Irosin.',
    steps: [
      'Magmasid sa mga palatandaan ng paggalaw ng lupa: mga bitak sa lupa o kalsada, pagtagilid ng mga puno o poste, at pagkaipit ng mga pinto at bintana.',
      'Pansinin ang biglaang paglabo ng tubig sa mga bukal o sapa (palatandaan ng paggalaw ng lupa sa itaas na bahagi ng bundok).',
      'Alamin ang mga ligtas na evacuation routes palayo sa dalisdis ng bundok o tabing-bangin.',
      'Sumunod agad sa preemptive evacuation order kapag nagkaroon ng tuluy-tuloy na pag-ulan ng higit sa 24 oras.'
    ],
    tips: [
      'Huwag magtayo ng bahay sa mismong paanan o gilid ng matatarik na bangin.',
      'Magtanim ng mga punong may malalalim na ugat upang mapatatag ang slope ng lupa.'
    ],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
    source: 'MGB-DENR & MDRRMO Irosin'
  },
  {
    id: 'guide-landslide-during',
    title: 'Mabilisang Pagkilos Habang may Nagaganap na Landslide',
    hazardType: 'LANDSLIDE',
    category: 'DURING',
    priority: 2,
    content: 'Agarang kaligtasan kapag narinig o nakita ang pagguho ng lupa at debris.',
    steps: [
      'Mabilis na lumikas patagilid palayo sa direksyon ng rumaragasang lupa at bato (tumakbo perpendicular to the flow).',
      'Makinig sa mga kakaibang tunog tulad ng pagkabali ng mga puno o ugong ng bumababang lupa.',
      'Kung hindi na kayang makatakas, pumulupot nang pabilog (fetal position) at protektahan ang ulo at leeg.',
      'Iwasan ang mga mabababang lambak at daanan ng ilog dahil dito madalas dumadaloy ang debris flow.'
    ],
    tips: [
      'Iwanan ang mga mabibigat na gamit — unahin ang kaligtasan ng buhay ng bawat miyembro ng pamilya.'
    ],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
    source: 'MGB-DENR & OCD Protocol'
  },
  {
    id: 'guide-landslide-after',
    title: 'Pag-iingat Pagkatapos ng Pagguho ng Lupa',
    hazardType: 'LANDSLIDE',
    category: 'AFTER',
    priority: 3,
    content: 'Pag-iwas sa pangalawang pagguho at pag-uulat ng pinsala.',
    steps: [
      'Manatiling malayo sa pinangyarihan ng landslide dahil malaki ang posibilidad ng follow-up landslide, lalo na kung patuloy ang pag-ulan.',
      'I-report agad sa MDRRMO Irosin o BDRRMC ang mga natabunang bahay o kalsada upang makapagpadala ng heavy equipment at rescue teams.',
      'Suriin kung may mga naputol na linya ng kuryente, tubig, o gas sa paligid ng slide area.',
      'Huwag dumaan sa mga kalsadang may basag o nakabitin na bahagi ng bangin.'
    ],
    tips: [
      'Iwasang mag-usyoso o lumapit sa slide area para kumuha ng litrato habang hindi pa idinideklarang ligtas ng mga awtoridad.'
    ],
    isPublished: true,
    createdAt: now,
    updatedAt: now,
    source: 'MDRRMO Irosin Incident Command'
  }
];

async function seedGuides() {
  console.log('🚀 [Seeder] Starting cleanup of old dummy guides...');
  try {
    const snap = await db.collection('preparedness_guides').get();
    console.log(`Found ${snap.size} existing guides in Firestore. Deleting old entries...`);
    const batch = db.batch();
    snap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log('✅ Old dummy guides successfully deleted.');

    console.log(`📥 Inserting ${OFFICIAL_GUIDES.length} official MDRRMO emergency preparedness guides...`);
    for (const guide of OFFICIAL_GUIDES) {
      const payload = {
        ...guide,
        introduction: guide.content,
        checklist: guide.steps,
        instructions: guide.steps,
        emergencyActions: guide.steps,
        warnings: guide.tips || []
      };
      await db.collection('preparedness_guides').doc(guide.id).set(payload);
      console.log(`  ➕ Added guide: [${guide.hazardType}] (${guide.category}) - ${guide.title}`);
    }

    console.log('🎉 [Seeder] All official disaster preparedness guides successfully seeded into Cloud Firestore!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ [Seeder] Error seeding guides:', err);
    process.exit(1);
  }
}

seedGuides();
