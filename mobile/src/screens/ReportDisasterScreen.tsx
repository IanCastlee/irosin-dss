import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Api } from "../services/api";
import { ReportType, Barangay } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePreferences } from "../context/PreferencesContext";
import { processImageToWebP } from "../utils/imageUtils";
import { LinearGradient } from "expo-linear-gradient";

interface BarangayCoord {
  id: string;
  name: string;
  lat: number;
  lng: number;
  municipality: string;
}

const BARANGAY_COORDINATES: BarangayCoord[] = [
  // Irosin (28 Barangays)
  {
    id: "brgy-1",
    name: "Monbon",
    lat: 12.7081,
    lng: 124.0325,
    municipality: "Irosin",
  },
  {
    id: "brgy-2",
    name: "Gabao",
    lat: 12.7215,
    lng: 124.0203,
    municipality: "Irosin",
  },
  {
    id: "brgy-3",
    name: "San Julian",
    lat: 12.6985,
    lng: 124.0412,
    municipality: "Irosin",
  },
  {
    id: "brgy-4",
    name: "San Pedro",
    lat: 12.7015,
    lng: 124.035,
    municipality: "Irosin",
  },
  {
    id: "brgy-5",
    name: "Gulang-Gulang",
    lat: 12.715,
    lng: 124.028,
    municipality: "Irosin",
  },
  {
    id: "brgy-6",
    name: "Bacolod",
    lat: 12.7055,
    lng: 124.0305,
    municipality: "Irosin",
  },
  {
    id: "brgy-7",
    name: "Bagsangan",
    lat: 12.728,
    lng: 124.015,
    municipality: "Irosin",
  },
  {
    id: "brgy-8",
    name: "Batang",
    lat: 12.689,
    lng: 124.048,
    municipality: "Irosin",
  },
  {
    id: "brgy-9",
    name: "Bolos",
    lat: 12.712,
    lng: 124.045,
    municipality: "Irosin",
  },
  {
    id: "brgy-10",
    name: "Buenavista",
    lat: 12.6852,
    lng: 124.0531,
    municipality: "Irosin",
  },
  {
    id: "brgy-11",
    name: "Bulawan",
    lat: 12.718,
    lng: 124.011,
    municipality: "Irosin",
  },
  {
    id: "brgy-12",
    name: "Carriedo",
    lat: 12.731,
    lng: 124.008,
    municipality: "Irosin",
  },
  {
    id: "brgy-13",
    name: "Casiguran",
    lat: 12.735,
    lng: 124.019,
    municipality: "Irosin",
  },
  {
    id: "brgy-14",
    name: "Cawayan",
    lat: 12.692,
    lng: 124.026,
    municipality: "Irosin",
  },
  {
    id: "brgy-15",
    name: "Cogon",
    lat: 12.701,
    lng: 124.021,
    municipality: "Irosin",
  },
  {
    id: "brgy-16",
    name: "Liang",
    lat: 12.697,
    lng: 124.049,
    municipality: "Irosin",
  },
  {
    id: "brgy-17",
    name: "Macawayan",
    lat: 12.711,
    lng: 124.055,
    municipality: "Irosin",
  },
  {
    id: "brgy-18",
    name: "Mapaso",
    lat: 12.724,
    lng: 124.039,
    municipality: "Irosin",
  },
  {
    id: "brgy-19",
    name: "Patag",
    lat: 12.719,
    lng: 124.051,
    municipality: "Irosin",
  },
  {
    id: "brgy-20",
    name: "Salvacion",
    lat: 12.706,
    lng: 124.044,
    municipality: "Irosin",
  },
  {
    id: "brgy-21",
    name: "San Agustin",
    lat: 12.7042,
    lng: 124.0371,
    municipality: "Irosin",
  },
  {
    id: "brgy-22",
    name: "San Bartolome",
    lat: 12.713,
    lng: 124.018,
    municipality: "Irosin",
  },
  {
    id: "brgy-23",
    name: "San Isidro",
    lat: 12.695,
    lng: 124.038,
    municipality: "Irosin",
  },
  {
    id: "brgy-24",
    name: "San Juan",
    lat: 12.703,
    lng: 124.034,
    municipality: "Irosin",
  },
  {
    id: "brgy-25",
    name: "San Roque",
    lat: 12.71,
    lng: 124.031,
    municipality: "Irosin",
  },
  {
    id: "brgy-26",
    name: "Santa Cruz",
    lat: 12.708,
    lng: 124.026,
    municipality: "Irosin",
  },
  {
    id: "brgy-27",
    name: "Santo Domingo",
    lat: 12.705,
    lng: 124.039,
    municipality: "Irosin",
  },
  {
    id: "brgy-28",
    name: "Tabon-Tabon",
    lat: 12.716,
    lng: 124.042,
    municipality: "Irosin",
  },

  // Bulusan (24 Barangays)
  {
    id: "bul-1",
    name: "Bagacay",
    lat: 12.748,
    lng: 124.12,
    municipality: "Bulusan",
  },
  {
    id: "bul-2",
    name: "Central",
    lat: 12.752,
    lng: 124.135,
    municipality: "Bulusan",
  },
  {
    id: "bul-3",
    name: "Cogon",
    lat: 12.76,
    lng: 124.13,
    municipality: "Bulusan",
  },
  {
    id: "bul-4",
    name: "Dancalan",
    lat: 12.765,
    lng: 124.14,
    municipality: "Bulusan",
  },
  {
    id: "bul-5",
    name: "Dapdap",
    lat: 12.745,
    lng: 124.13,
    municipality: "Bulusan",
  },
  {
    id: "bul-6",
    name: "Lalud",
    lat: 12.74,
    lng: 124.125,
    municipality: "Bulusan",
  },
  {
    id: "bul-7",
    name: "Looban",
    lat: 12.751,
    lng: 124.133,
    municipality: "Bulusan",
  },
  {
    id: "bul-8",
    name: "Mabuhay",
    lat: 12.758,
    lng: 124.128,
    municipality: "Bulusan",
  },
  {
    id: "bul-9",
    name: "Madlawon",
    lat: 12.762,
    lng: 124.138,
    municipality: "Bulusan",
  },
  {
    id: "bul-10",
    name: "Poctol",
    lat: 12.755,
    lng: 124.142,
    municipality: "Bulusan",
  },
  {
    id: "bul-11",
    name: "Porog",
    lat: 12.742,
    lng: 124.118,
    municipality: "Bulusan",
  },
  {
    id: "bul-12",
    name: "Sabang",
    lat: 12.75,
    lng: 124.137,
    municipality: "Bulusan",
  },
  {
    id: "bul-13",
    name: "Salvacion",
    lat: 12.749,
    lng: 124.129,
    municipality: "Bulusan",
  },
  {
    id: "bul-14",
    name: "San Antonio",
    lat: 12.738,
    lng: 124.115,
    municipality: "Bulusan",
  },
  {
    id: "bul-15",
    name: "San Bernardo",
    lat: 12.735,
    lng: 124.11,
    municipality: "Bulusan",
  },
  {
    id: "bul-16",
    name: "San Francisco",
    lat: 12.747,
    lng: 124.131,
    municipality: "Bulusan",
  },
  {
    id: "bul-17",
    name: "San Isidro",
    lat: 12.754,
    lng: 124.125,
    municipality: "Bulusan",
  },
  {
    id: "bul-18",
    name: "San Jose",
    lat: 12.7535,
    lng: 124.134,
    municipality: "Bulusan",
  },
  {
    id: "bul-19",
    name: "San Rafael",
    lat: 12.743,
    lng: 124.122,
    municipality: "Bulusan",
  },
  {
    id: "bul-20",
    name: "San Roque",
    lat: 12.7512,
    lng: 124.1324,
    municipality: "Bulusan",
  },
  {
    id: "bul-21",
    name: "Santa Barbara",
    lat: 12.757,
    lng: 124.136,
    municipality: "Bulusan",
  },
  {
    id: "bul-22",
    name: "Sapngan",
    lat: 12.76,
    lng: 124.141,
    municipality: "Bulusan",
  },
  {
    id: "bul-23",
    name: "Tinampo",
    lat: 12.746,
    lng: 124.127,
    municipality: "Bulusan",
  },
  {
    id: "bul-24",
    name: "Tubli",
    lat: 12.739,
    lng: 124.119,
    municipality: "Bulusan",
  },
];

function findNearestBarangay(lat: number, lng: number): BarangayCoord {
  let closest = BARANGAY_COORDINATES[0];
  let minDistance = Infinity;

  for (const b of BARANGAY_COORDINATES) {
    const dLat = b.lat - lat;
    const dLng = b.lng - lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistance) {
      minDistance = distSq;
      closest = b;
    }
  }

  return closest;
}

const DEFAULT_BARANGAYS: { id: string; name: string; municipality: string; label: string }[] =
  BARANGAY_COORDINATES.map((b) => ({
    id: b.id,
    name: b.name,
    municipality: b.municipality,
    label: `${b.name}, ${b.municipality}`,
  }));

export const ReportDisasterScreen = ({ navigation }: any) => {
  const { colors, language, theme } = usePreferences();

  const [reportType, setReportType] = useState<ReportType>("FLOODING");
  const [streetLocation, setStreetLocation] = useState("");
  const [nearbyLandmark, setNearbyLandmark] = useState("");
  const [description, setDescription] = useState("");

  const [barangayList, setBarangayList] = useState<any[]>(DEFAULT_BARANGAYS);
  const [selectedBarangay, setSelectedBarangay] = useState<any>(DEFAULT_BARANGAYS[0]);
  const [showBarangayModal, setShowBarangayModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [showPickerSheet, setShowPickerSheet] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [todaySubmissions, setTodaySubmissions] = useState<number>(0);
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>("Kumukuha ng GPS...");

  const streetInputRef = useRef<TextInput>(null);
  const [streetSelection, setStreetSelection] = useState<
    { start: number; end: number } | undefined
  >(undefined);

  const handleCustomPurokPress = () => {
    streetInputRef.current?.focus();
    setStreetSelection({ start: 0, end: 0 });
    setTimeout(() => {
      setStreetSelection(undefined);
    }, 250);
  };

  useFocusEffect(
    useCallback(() => {
      checkDailyQuota();
    }, []),
  );

  useEffect(() => {
    fetchCurrentGps();
    loadBarangays();
  }, []);

  const loadBarangays = async () => {
    try {
      const res = await Api.getBarangays();
      if (res && res.data && res.data.length > 0) {
        const mapped = res.data.map((b: Barangay) => ({
          id: b.id,
          name: b.name,
        }));
        setBarangayList(mapped);
        setSelectedBarangay(mapped[0]);
      }
    } catch {
      // Use DEFAULT_BARANGAYS
    }
  };

  const getTodayKey = () => {
    const d = new Date();
    return `@report_quota_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
  };

  const checkDailyQuota = async () => {
    try {
      const key = getTodayKey();
      const val = await AsyncStorage.getItem(key);
      const count = val ? parseInt(val, 10) : 0;
      setTodaySubmissions(count);
      return count;
    } catch {
      setTodaySubmissions(0);
      return 0;
    }
  };

  const incrementDailyQuota = async () => {
    try {
      const key = getTodayKey();
      const val = await AsyncStorage.getItem(key);
      const count = val ? parseInt(val, 10) : 0;
      const next = count + 1;
      await AsyncStorage.setItem(key, next.toString());
      setTodaySubmissions(next);
      return next;
    } catch {
      const next = todaySubmissions + 1;
      setTodaySubmissions(next);
      return next;
    }
  };

  const fetchCurrentGps = async () => {
    try {
      setGpsStatus("Humihingi ng pahintulot sa GPS...");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsStatus("Walang GPS Permission (Gagamitin ang default center)");
        setCoords({ latitude: 12.7081, longitude: 124.0325 });
        return;
      }

      setGpsStatus("Hinahanap ang eksaktong coordinates...");
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setGpsStatus("GPS Active & Naka-lock");
    } catch {
      setGpsStatus("Hindi available ang GPS (Default sector coords)");
      setCoords({ latitude: 12.7081, longitude: 124.0325 });
    }
  };

  async function fetchNativeGpsAddress(
    lat: number,
    lng: number,
  ): Promise<{ fullAddress: string; barangay: string }> {
    let street = "";
    let barangay = "";
    let municipality = "";
    let province = "Sorsogon";

    const isPlusCode = (val?: string | null) =>
      !val || /^[A-Z0-9]{2,8}\+[A-Z0-9]{2,4}/i.test(val.trim());

    // 1. Try Native Location Reverse Geocode
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      if (results && results.length > 0) {
        const addr = results[0];

        if (!isPlusCode(addr.street)) {
          street = addr.street || "";
        }

        if (!isPlusCode(addr.district)) {
          barangay = addr.district || "";
        } else if (
          !isPlusCode(addr.name) &&
          addr.name !== addr.city &&
          addr.name !== addr.subregion
        ) {
          barangay = addr.name || "";
        }

        if (!isPlusCode(addr.city)) {
          municipality = addr.city || "";
        } else if (
          !isPlusCode(addr.subregion) &&
          addr.subregion !== addr.region
        ) {
          municipality = addr.subregion || "";
        }

        if (
          addr.region &&
          !addr.region.toLowerCase().includes("bicol") &&
          !addr.region.toLowerCase().includes("region")
        ) {
          province = addr.region;
        }
      }
    } catch (e) {
      console.warn("Native GPS reverse geocode error:", e);
    }

    // 2. If street OR barangay is missing, ALWAYS query OpenStreetMap (High Resolution Road & Barangay Database)
    if (!street || !barangay) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              "User-Agent": "IrosinDisasterPreparednessApp/1.0",
              "Accept-Language": "tl,en",
            },
            signal: controller.signal,
          },
        );
        clearTimeout(timer);

        if (res.ok) {
          const osm = await res.json();
          const osmAddr = osm.address || {};

          // Extract road / street name
          if (!street) {
            street =
              osmAddr.road ||
              osmAddr.highway ||
              osmAddr.street ||
              osmAddr.pedestrian ||
              osmAddr.footway ||
              osmAddr.path ||
              "";
          }

          // Extract barangay name
          if (!barangay) {
            barangay =
              osmAddr.village ||
              osmAddr.suburb ||
              osmAddr.hamlet ||
              osmAddr.neighbourhood ||
              "";
          }

          // Extract municipality if missing
          if (!municipality) {
            municipality =
              osmAddr.town || osmAddr.municipality || osmAddr.city || "";
          }
        }
      } catch {}
    }

    // 3. If STILL missing, mathematically find the closest exact Barangay using GPS distance
    const nearest = findNearestBarangay(lat, lng);
    if (!barangay) {
      barangay = nearest.name;
    }
    if (!municipality) {
      municipality = nearest.municipality;
    }

    // Clean redundant prefixes from barangay
    if (barangay.toLowerCase().startsWith("barangay ")) {
      barangay = barangay.substring(9).trim();
    } else if (barangay.toLowerCase().startsWith("brgy. ")) {
      barangay = barangay.substring(6).trim();
    } else if (barangay.toLowerCase().startsWith("brgy ")) {
      barangay = barangay.substring(5).trim();
    }

    // 4. Construct guaranteed complete address format (without Sorsogon):
    // Hal: "Brgy. San Jose (Purok 1), Bulusan" o "Maharlika Highway, Brgy. Monbon, Irosin"
    const parts: string[] = [];
    if (
      street &&
      street.toLowerCase() !== barangay.toLowerCase() &&
      street.toLowerCase() !== municipality.toLowerCase()
    ) {
      if (
        street.toLowerCase().includes("purok") ||
        street.toLowerCase().includes("sitio") ||
        street.toLowerCase().includes("zone")
      ) {
        parts.push(`Brgy. ${barangay} (${street})`);
      } else {
        parts.push(street);
        parts.push(`Brgy. ${barangay}`);
      }
    } else {
      parts.push(`Brgy. ${barangay}`);
    }
    parts.push(municipality);

    return {
      fullAddress: parts.join(", "),
      barangay,
    };
  }

  // Quick GPS Auto-Detect Location Action
  const handleUseCurrentGpsLocation = async () => {
    setDetectingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "GPS Permission Required",
          "Pahintulutan ang location access upang ma-detect ang inyong kalsada.",
        );
        setDetectingGps(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const currentCoords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setCoords(currentCoords);
      setGpsStatus("GPS Active & Naka-lock");

      const result = await fetchNativeGpsAddress(
        currentCoords.latitude,
        currentCoords.longitude,
      );

      if (result && result.fullAddress) {
        setStreetLocation(result.fullAddress);

        if (result.barangay) {
          const match = barangayList.find(
            (b) =>
              result.barangay.toLowerCase().includes(b.name.toLowerCase()) ||
              b.name.toLowerCase().includes(result.barangay.toLowerCase()),
          );
          if (match) {
            setSelectedBarangay(match);
          }
        }
      }

      Alert.alert(
        "Naitakda ang GPS Lokasyon! 📍",
        "Nai-detect ang inyong lokasyon mula sa GPS. Maaari mo itong baguhin sa kahon sa ibaba kung nais mo itong itama.",
      );
    } catch {
      Alert.alert(
        "GPS Error",
        "Hindi ma-detect ang GPS sa ngayon. Maaari ninyong ilagay nang manwal ang lokasyon.",
      );
    } finally {
      setDetectingGps(false);
    }
  };

  const addPhoto = (newImgData: string) => {
    if (selectedImages.length >= 3) {
      Alert.alert(
        "Photo Limit Reached",
        "Hanggang 3 litrato lamang ang maaaring i-attach bawat report.",
      );
      return;
    }
    setSelectedImages((prev) => [...prev, newImgData]);
  };

  const handleLaunchCamera = async () => {
    setShowPickerSheet(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Camera Permission",
        "Kailangan ang camera permission para makakuha ng litrato.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets?.[0]) {
      setIsProcessingPhotos(true);
      try {
        const processed = await processImageToWebP(result.assets[0].uri);
        setSelectedImages([processed]);
      } finally {
        setIsProcessingPhotos(false);
      }
    }
  };

  const handleLaunchGallery = async () => {
    setShowPickerSheet(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Photo Library Permission",
        "Kailangan ang photo library permission.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsMultipleSelection: false,
      selectionLimit: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIsProcessingPhotos(true);
      try {
        const processed = await processImageToWebP(result.assets[0].uri);
        setSelectedImages([processed]);
      } finally {
        setIsProcessingPhotos(false);
      }
    }
  };

  const handlePickImage = () => {
    setShowPickerSheet(true);
  };

  const removePhoto = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (
      !streetLocation.trim() ||
      !nearbyLandmark.trim() ||
      !description.trim()
    ) {
      Alert.alert(
        "Kailangang Punan ⚠️",
        "Pakilagay ang Eksaktong Lokasyon / Kalye, Malapit na Landmark, at Deskripsyon ng perwisyo.",
      );
      return;
    }

    const fullLocationDescription = `${streetLocation.trim()} (Malapit sa: ${nearbyLandmark.trim()})`;

    setSubmitting(true);
    try {
      let bId = selectedBarangay?.id || "brgy-1";
      let bName = selectedBarangay?.label || (selectedBarangay ? `${selectedBarangay.name}, ${selectedBarangay.municipality || 'Irosin'}` : "San Agustin, Irosin");

      // Match streetLocation text directly against the full 52-barangay list (Irosin & Bulusan)
      const cleanLoc = streetLocation.toLowerCase();
      for (const b of BARANGAY_COORDINATES) {
        const bNameClean = b.name.toLowerCase();
        const bMuniClean = b.municipality.toLowerCase();
        if (cleanLoc.includes(bNameClean)) {
          if (cleanLoc.includes(bMuniClean) || (!cleanLoc.includes("bulusan") && !cleanLoc.includes("irosin"))) {
            bId = b.id;
            bName = `${b.name}, ${b.municipality}`;
            break;
          }
        }
      }

      const primaryPhoto =
        selectedImages.length > 0 ? selectedImages[0] : undefined;
      const res = await Api.submitReport({
        reportType,
        description: description.trim(),
        latitude: coords?.latitude || 12.7081,
        longitude: coords?.longitude || 124.0325,
        locationDescription: fullLocationDescription,
        barangayId: bId,
        barangayName: bName,
        imageUrl: primaryPhoto,
        photoUrl: primaryPhoto,
        photos: selectedImages,
      });

      await incrementDailyQuota();

      // Reset form inputs cleanly
      setStreetLocation("");
      setNearbyLandmark("");
      setDescription("");
      setSelectedImages([]);

      // Show persistent Custom Thank You & Pending Modal (no auto-close, no redirect)
      setShowSuccessToast(true);
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      if (
        msg.includes("internet") ||
        msg.includes("koneksyon") ||
        msg.includes("network") ||
        msg.includes("failed to fetch") ||
        msg.includes("timeout") ||
        msg.includes("offline")
      ) {
        Alert.alert(
          language === "tl"
            ? "Walang Koneksyon sa Internet ⚠️"
            : "No Internet Connection ⚠️",
          language === "tl"
            ? "Kailangan ng aktibong internet connection upang maipadala ang ulat sa MDRRMO Operations Command. Pakisubukang muli kapag online na."
            : "An active internet connection is required to submit a report to MDRRMO Operations Center. Please retry when online."
        );
      } else {
        Alert.alert(
          "Submission Error ❌",
          err?.message || "Hindi maipadala ang report sa MDRRMO server.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const types: {
    type: ReportType;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { type: "FLOODING", label: "Baha / Flooding", icon: "water-outline" },
    {
      type: "BLOCKED_ROAD",
      label: "Baradong Daan (Puno/Poste)",
      icon: "construct-outline",
    },
    {
      type: "DAMAGED_ROAD",
      label: "Sirang Kalsada / Bitak",
      icon: "warning-outline",
    },
    {
      type: "LANDSLIDE",
      label: "Landslide / Guho",
      icon: "alert-circle-outline",
    },
    {
      type: "DAMAGED_EVACUATION_CENTER",
      label: "Sirang Evacuation Center",
      icon: "home-outline",
    },
    {
      type: "UNSAFE_ROUTE",
      label: "Mapanganib na Rota",
      icon: "navigate-outline",
    },
    {
      type: "OTHER",
      label: "Iba Pang Perwisyo",
      icon: "document-text-outline",
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {/* Aesthetic Minimal Top Header Gradient */}
      <LinearGradient
        colors={
          theme === "light"
            ? ["#bae6fd", "#e0f2fe", "#f0f9ff", colors.bg]
            : ["rgba(2, 132, 199, 0.18)", "rgba(56, 189, 248, 0.05)", colors.bg]
        }
        locations={[0, 0.35, 0.7, 1]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 280,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Header */}
          <View
            style={{
              paddingBottom: 8,
              borderBottomWidth: 0,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(239, 68, 68, 0.25)",
                }}
              >
                <Ionicons name="megaphone" size={22} color="#ef4444" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {language === "tl"
                    ? "Mag-ulat ng Insidente"
                    : "Submit Disaster Report"}
                </Text>
                <Text style={[styles.sub, { color: colors.textSecondary }]}>
                  {language === "tl"
                    ? "Direktang ulat sa MDRRMO Command Center"
                    : "Direct report to MDRRMO Command Center"}
                </Text>
              </View>
            </View>
          </View>

          {/* 1. Category Selector Dropdown Button */}
          <Text style={[styles.label, { color: colors.text }]}>
            1. Uri ng Perwisyo / Hazard *
          </Text>
          <TouchableOpacity
            style={[
              styles.dropdownBtn,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={() => setShowTypeModal(true)}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Ionicons
                name={
                  types.find((t) => t.type === reportType)?.icon ||
                  "alert-circle-outline"
                }
                size={18}
                color={colors.primaryLight}
              />
              <Text style={[styles.dropdownBtnText, { color: colors.text }]}>
                {types.find((t) => t.type === reportType)?.label ||
                  "Pumili ng Uri"}
              </Text>
            </View>
            <Ionicons
              name="chevron-down-outline"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {/* 2. Title ABOVE the GPS button */}
          <Text style={[styles.label, { color: colors.text, marginTop: 4 }]}>
            {language === "tl"
              ? "2. Lokasyon ng Insidente *"
              : "2. Incident Location *"}
          </Text>

          {/* Full-Width GPS Auto-Detect Button */}
          <TouchableOpacity
            style={[
              styles.fullGpsBtn,
              {
                backgroundColor: colors.primaryBg,
                borderColor: colors.primaryLight,
              },
            ]}
            onPress={handleUseCurrentGpsLocation}
            disabled={detectingGps}
          >
            {detectingGps ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <ActivityIndicator size="small" color={colors.primaryLight} />
                <Text
                  style={[
                    styles.fullGpsBtnText,
                    { color: colors.primaryLight },
                  ]}
                >
                  Kinukuha ang lokasyon ng insidente mula sa GPS...
                </Text>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons
                  name="navigate-circle-outline"
                  size={20}
                  color={colors.primaryLight}
                />
                <Text
                  style={[
                    styles.fullGpsBtnText,
                    { color: colors.primaryLight },
                  ]}
                >
                  {language === "tl"
                    ? "📍 Pindutin para kunin ang lokasyon ng insidente (GPS)"
                    : "📍 Click to get the incident location via GPS"}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Paalala Label directly below GPS button */}
          <Text style={[styles.paalalaText, { color: colors.textSecondary }]}>
            💡{" "}
            <Text style={{ fontWeight: "700", color: colors.primaryLight }}>
              Paalala:
            </Text>{" "}
            {language === "tl"
              ? "Maaari mong baguhin o i-edit ang address sa kahon sa ibaba kung sa tingin mo ay mali o kulang ang nakuha ng GPS."
              : "You can edit or correct the location in the box below if the GPS detected address needs adjustment."}
          </Text>

          {/* Location Input Box */}
          <TextInput
            ref={streetInputRef}
            selection={streetSelection}
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                color: colors.text,
              },
            ]}
            value={streetLocation}
            onChangeText={setStreetLocation}
            placeholder="Hal. Purok 1, Brgy. San Jose, Bulusan"
            placeholderTextColor={colors.textMuted}
          />

          {/* Quick Purok Selector Chips (Shown only when incident location is filled) */}
          {!!streetLocation.trim() && (
            <View style={{ marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: colors.textSecondary,
                  marginBottom: 6,
                }}
              >
                Add Purok:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6 }}
              >
                {["Purok 1", "Purok 2", "Purok 3"].map((purok) => (
                  <TouchableOpacity
                    key={purok}
                    style={[
                      styles.quickPurokChip,
                      {
                        backgroundColor: streetLocation.includes(purok)
                          ? colors.primaryLight
                          : colors.card,
                        borderColor: streetLocation.includes(purok)
                          ? colors.primaryLight
                          : colors.cardBorder,
                      },
                    ]}
                    onPress={() => {
                      if (!streetLocation) {
                        setStreetLocation(purok);
                      } else if (streetLocation.includes(purok)) {
                        // Already has this purok
                      } else {
                        const cleaned = streetLocation
                          .replace(/Purok\s*\d+/gi, "")
                          .replace(/,\s*,/g, ",")
                          .replace(/^\s*,\s*/, "")
                          .trim();
                        setStreetLocation(`${purok}, ${cleaned}`);
                      }
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: streetLocation.includes(purok)
                          ? "#ffffff"
                          : colors.text,
                      }}
                    >
                      {purok}
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* Custom Chip */}
                <TouchableOpacity
                  style={[
                    styles.quickPurokChip,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.primaryLight,
                      borderStyle: "dashed",
                    },
                  ]}
                  onPress={handleCustomPurokPress}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons
                      name="create-outline"
                      size={13}
                      color={colors.primaryLight}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: colors.primaryLight,
                      }}
                    >
                      Custom
                    </Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* 3. Manual Nearby Landmark Input */}
          <Text style={[styles.label, { color: colors.text }]}>
            3. Malapit na Landmark (Tandaan) *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                color: colors.text,
              },
            ]}
            value={nearbyLandmark}
            onChangeText={setNearbyLandmark}
            placeholder="Hal. Tapat ng Simbahan, San Francisco Bridge, o Kanto"
            placeholderTextColor={colors.textMuted}
          />

          {/* 4. Detailed Description */}
          <Text style={[styles.label, { color: colors.text }]}>
            4. Deskripsyon ng Pinsala & Babala *
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                color: colors.text,
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Ilarawan ang lalim ng baha, laki ng natumbang puno, o kung nadadaanan pa ng motorsiklo..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
          />

          {/* 5. Photo Attachment */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              marginTop: 4,
            }}
          >
            <Text style={[styles.label, { color: colors.text }]}>
              5. Litrato ng Perwisyo
            </Text>
          </View>

          {selectedImages.length === 0 && (
            <TouchableOpacity
              style={[
                styles.photoPickerBtn,
                {
                  borderColor: colors.primaryLight,
                  backgroundColor: colors.primaryBg,
                },
              ]}
              onPress={handlePickImage}
            >
              <Ionicons
                name="camera-outline"
                size={22}
                color={colors.primaryLight}
              />
              <Text
                style={[styles.photoPickerText, { color: colors.primaryLight }]}
              >
                Mag-attach ng Litrato
              </Text>
            </TouchableOpacity>
          )}

          {/* Photo Processing Indicator */}
          {isProcessingPhotos && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primaryBg,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.primaryLight,
                borderStyle: "dashed",
                marginBottom: 10,
                gap: 10,
              }}
            >
              <ActivityIndicator size="small" color={colors.primaryLight} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primaryLight }}>
                Processing image...
              </Text>
            </View>
          )}

          {/* Thumbnails Row */}
          {selectedImages.length > 0 && (
            <View style={styles.imageGrid}>
              {selectedImages.map((uri, idx) => (
                <View key={idx} style={styles.thumbWrapper}>
                  <Image
                    source={{ uri }}
                    style={[
                      styles.thumbImage,
                      { borderColor: colors.cardBorder },
                    ]}
                  />
                  <TouchableOpacity
                    style={styles.removeBadge}
                    onPress={() => removePhoto(idx)}
                    disabled={isProcessingPhotos}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={20}
                      color="#ef4444"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: colors.primary },
              (submitting || isProcessingPhotos) && { opacity: 0.6 },
            ]}
            onPress={handleSubmit}
            disabled={submitting || isProcessingPhotos}
          >
            {submitting ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.submitBtnText}>
                  Ipinapadala sa MDRRMO...
                </Text>
              </View>
            ) : isProcessingPhotos ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.submitBtnText}>
                  Processing...
                </Text>
              </View>
            ) : (
              <Text style={styles.submitBtnText}>
                I-submit ang Ulat sa MDRRMO
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* TYPE SELECTOR MODAL */}
      <Modal visible={showTypeModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Pumili ng Uri ng Perwisyo
              </Text>
              <TouchableOpacity onPress={() => setShowTypeModal(false)}>
                <Ionicons
                  name="close-circle-outline"
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <FlatList
              data={types}
              keyExtractor={(item) => item.type}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.barangayItem,
                    { borderBottomColor: colors.cardBorder },
                    reportType === item.type && [
                      styles.barangayItemActive,
                      { backgroundColor: colors.primaryBg },
                    ],
                  ]}
                  onPress={() => {
                    setReportType(item.type);
                    setShowTypeModal(false);
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={
                        reportType === item.type
                          ? colors.primaryLight
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.barangayItemText,
                        { color: colors.textSecondary },
                        reportType === item.type && {
                          color: colors.primaryLight,
                          fontWeight: "800",
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  {reportType === item.type && (
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color={colors.primaryLight}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Custom Outlined Photo Picker Modal */}
      <Modal
        visible={showPickerSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPickerSheet(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowPickerSheet(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.65)",
            justifyContent: "flex-end",
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.cardBorder,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="images-outline" size={20} color={colors.primaryLight} />
                <Text style={{ fontSize: 15, fontWeight: "900", color: colors.text }}>
                  {language === "tl" ? "Mag-attach ng Litrato" : "Attach Photo"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowPickerSheet(false)} style={{ padding: 4 }}>
                <Ionicons name="close-outline" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleLaunchCamera}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: colors.inputBg,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                marginBottom: 10,
              }}
            >
              <Ionicons name="camera-outline" size={22} color={colors.primaryLight} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: "800", color: colors.text }}>
                  {language === "tl" ? "Kumuha gamit ang Camera" : "Take Photo with Camera"}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                  {language === "tl" ? "Kumuha ng live na litrato sa lokasyon" : "Capture live photo on location"}
                </Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLaunchGallery}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: colors.inputBg,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                marginBottom: 14,
              }}
            >
              <Ionicons name="image-outline" size={22} color={colors.primaryLight} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: "800", color: colors.text }}>
                  {language === "tl" ? "Pumili mula sa Gallery" : "Choose from Gallery"}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                  {language === "tl" ? "Pumili ng litrato mula sa iyong gallery" : "Select image from your album"}
                </Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowPickerSheet(false)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: colors.inputBg,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textSecondary }}>
                {language === "tl" ? "Kanselahin" : "Cancel"}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      {/* GPS Location Loader & Accuracy Reminder Modal */}
      <Modal
        visible={detectingGps}
        transparent
        animationType="fade"
        onRequestClose={() => setDetectingGps(false)}
      >
        <View style={styles.gpsModalBackdrop}>
          <View
            style={[
              styles.gpsModalCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View
              style={[
                styles.gpsModalIconCircle,
                { backgroundColor: colors.primaryBg, borderColor: colors.primaryLight },
              ]}
            >
              <Ionicons name="navigate" size={30} color={colors.primaryLight} />
            </View>

            <ActivityIndicator size="small" color={colors.primaryLight} style={{ marginVertical: 12 }} />

            <Text style={[styles.gpsModalTitle, { color: colors.text }]}>
              {language === "tl" ? "Kinukuha ang iyong GPS Lokasyon..." : "Acquiring GPS Location..."}
            </Text>

            <Text style={[styles.gpsModalSubtitle, { color: colors.textSecondary }]}>
              {language === "tl"
                ? "Hinahanap ang eksaktong kalsada at barangay para sa ulat..."
                : "Detecting exact road and barangay for the report..."}
            </Text>

            {/* Paalala Tip Box */}
            <View
              style={[
                styles.gpsModalTipBox,
                { backgroundColor: "rgba(234, 88, 12, 0.08)", borderColor: "rgba(234, 88, 12, 0.25)" },
              ]}
            >
              <Ionicons name="information-circle-outline" size={19} color="#ea580c" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.gpsModalTipTitle}>
                  {language === "tl" ? "Paalala para sa Accurate na GPS:" : "Tip for Accurate GPS:"}
                </Text>
                <Text style={[styles.gpsModalTipText, { color: colors.textSecondary }]}>
                  {language === "tl"
                    ? "Siguraduhing nasa bukas na lugar (hindi sa loob ng saradong bahay o ilalim ng makakapal na puno) upang makuha ng satellite ang pinaka-accurate na koordinasyon ng insidente."
                    : "Make sure you are in an open area (not inside a closed house or under thick trees) so satellites can lock onto the most accurate coordinates."}
                </Text>
              </View>
            </View>
          </View>
        </View>
      {/* ── Custom Thank You & Pending Notification Modal ── */}
      <Modal
        visible={showSuccessToast}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessToast(false)}
      >
        <View style={styles.successModalOverlay}>
          <View
            style={[
              styles.successModalSheet,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            {/* Glowing Success Badge */}
            <View
              style={[
                styles.successIconCircle,
                { backgroundColor: theme === "dark" ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5", borderColor: "rgba(16, 185, 129, 0.3)" },
              ]}
            >
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            </View>

            <Text style={[styles.successModalTitle, { color: colors.text }]}>
              {language === "tl" ? "Maraming Salamat sa Iyong Pag-uulat! 🙏" : "Thank You for Your Report! 🙏"}
            </Text>

            <Text style={[styles.successModalSub, { color: colors.textSecondary }]}>
              {language === "tl"
                ? "Matagumpay na naitala ang iyong ulat sa aming Disaster Response Command Center."
                : "Your hazard report has been successfully logged in our Command Center."}
            </Text>

            {/* Pending & Response Team Explanation Card */}
            <View
              style={[
                styles.pendingNoticeCard,
                {
                  backgroundColor: theme === "dark" ? "rgba(245, 158, 11, 0.12)" : "#fffbeb",
                  borderColor: "rgba(245, 158, 11, 0.35)",
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <Ionicons name="time-outline" size={16} color="#d97706" />
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#d97706", letterSpacing: 0.3 }}>
                  {language === "tl" ? "KATAYUAN: PENDING VERIFICATION" : "STATUS: PENDING VERIFICATION"}
                </Text>
              </View>
              <Text style={[styles.pendingNoticeText, { color: theme === "dark" ? "#fde68a" : "#92400e" }]}>
                {language === "tl"
                  ? "Ang iyong ulat ay naka-pending at kasalukuyang sinusuri ng MDRRMO at Barangay Emergency Response Team upang kumpirmahin at agarang maisagawa ang pagtugon at clearing operations sa lugar."
                  : "Your report is pending and currently being reviewed by the MDRRMO & Barangay Emergency Response Team for confirmation and immediate dispatch of clearing operations."}
              </Text>
            </View>

            {/* Confirm & Close Button */}
            <TouchableOpacity
              style={[styles.successCloseBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowSuccessToast(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.successCloseBtnText}>
                {language === "tl" ? "Sige, Naiintindihan Ko" : "Okay, Understood"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 16 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  backBtnText: { fontSize: 14, fontWeight: "700" },
  title: { fontSize: 20, fontWeight: "900", marginBottom: 4 },
  sub: { fontSize: 13, marginBottom: 16 },

  quotaBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  quotaBannerActive: {
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  quotaBannerFull: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  quotaTitle: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  quotaSub: { fontSize: 12, lineHeight: 18 },

  gpsBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  gpsTitle: { color: "#10b981", fontSize: 14, fontWeight: "800" },
  gpsSub: { fontSize: 12, marginBottom: 4 },
  coordsText: { fontSize: 12 },

  label: { fontSize: 14, fontWeight: "800", marginBottom: 8 },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeChipActive: {},
  typeText: { fontSize: 13, fontWeight: "700" },

  dropdownBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  dropdownBtnText: { fontSize: 15, fontWeight: "800" },

  fullGpsBtn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 6,
  },
  fullGpsBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  paalalaText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 8,
  },
  quickPurokChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  textArea: { height: 90, textAlignVertical: "top" },

  photoPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginBottom: 12,
  },
  photoPickerText: { fontSize: 14, fontWeight: "800" },

  imageGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  thumbWrapper: { position: "relative" },
  thumbImage: { width: 90, height: 75, borderRadius: 10, borderWidth: 1 },
  removeBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#0f172a",
    borderRadius: 10,
  },

  submitBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 14,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "900" },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: "75%",
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: "900" },
  barangayItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  barangayItemActive: { borderRadius: 8 },
  barangayItemText: { fontSize: 15, fontWeight: "600" },

  // GPS Accuracy Loader Modal Styles
  gpsModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  gpsModalCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  gpsModalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  gpsModalTitle: {
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 4,
  },
  gpsModalSubtitle: {
    fontSize: 12.5,
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 17,
  },
  gpsModalTipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
  },
  gpsModalTipTitle: {
    color: "#ea580c",
    fontSize: 11.5,
    fontWeight: "800",
    marginBottom: 2,
  },
  gpsModalTipText: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "500",
  },

  // Custom Success & Pending Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  successModalSheet: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 6,
  },
  successModalSub: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  pendingNoticeCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  pendingNoticeText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  successCloseBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  successCloseBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
});
