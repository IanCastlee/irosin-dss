import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { usePreferences } from "../context/PreferencesContext";
import { Api } from "../services/api";
import { Barangay, User } from "../types";
import { LinearGradient } from "expo-linear-gradient";

const ALL_BARANGAY_LIST = [
  { id: "brgy-all", name: "All Barangays", municipality: "Irosin", label: "All Barangays (Municipal-wide / MDRRMO HQ)" },
  // Irosin (28 Barangays)
  { id: "brgy-irosin-1", name: "Bacolod", municipality: "Irosin", label: "Bacolod, Irosin" },
  { id: "brgy-irosin-2", name: "Bagsangan", municipality: "Irosin", label: "Bagsangan, Irosin" },
  { id: "brgy-irosin-3", name: "Batang", municipality: "Irosin", label: "Batang, Irosin" },
  { id: "brgy-irosin-4", name: "Bolos", municipality: "Irosin", label: "Bolos, Irosin" },
  { id: "brgy-irosin-5", name: "Buenavista", municipality: "Irosin", label: "Buenavista, Irosin" },
  { id: "brgy-irosin-6", name: "Bulawan", municipality: "Irosin", label: "Bulawan, Irosin" },
  { id: "brgy-irosin-7", name: "Carriedo", municipality: "Irosin", label: "Carriedo, Irosin" },
  { id: "brgy-irosin-8", name: "Casiguran", municipality: "Irosin", label: "Casiguran, Irosin" },
  { id: "brgy-irosin-9", name: "Cawayan", municipality: "Irosin", label: "Cawayan, Irosin" },
  { id: "brgy-irosin-10", name: "Cogon", municipality: "Irosin", label: "Cogon, Irosin" },
  { id: "brgy-irosin-11", name: "Gabao", municipality: "Irosin", label: "Gabao, Irosin" },
  { id: "brgy-irosin-12", name: "Gulang-Gulang", municipality: "Irosin", label: "Gulang-Gulang, Irosin" },
  { id: "brgy-irosin-13", name: "Gumapia", municipality: "Irosin", label: "Gumapia, Irosin" },
  { id: "brgy-irosin-14", name: "Liang", municipality: "Irosin", label: "Liang, Irosin" },
  { id: "brgy-irosin-15", name: "Macawayan", municipality: "Irosin", label: "Macawayan, Irosin" },
  { id: "brgy-irosin-16", name: "Mapaso", municipality: "Irosin", label: "Mapaso, Irosin" },
  { id: "brgy-irosin-17", name: "Monbon", municipality: "Irosin", label: "Monbon, Irosin" },
  { id: "brgy-irosin-18", name: "Patag", municipality: "Irosin", label: "Patag, Irosin" },
  { id: "brgy-irosin-19", name: "Salvacion", municipality: "Irosin", label: "Salvacion, Irosin" },
  { id: "brgy-irosin-20", name: "San Agustin", municipality: "Irosin", label: "San Agustin, Irosin" },
  { id: "brgy-irosin-21", name: "San Bartolome", municipality: "Irosin", label: "San Bartolome, Irosin" },
  { id: "brgy-irosin-22", name: "San Isidro", municipality: "Irosin", label: "San Isidro, Irosin" },
  { id: "brgy-irosin-23", name: "San Jose", municipality: "Irosin", label: "San Jose, Irosin" },
  { id: "brgy-irosin-24", name: "San Julian", municipality: "Irosin", label: "San Julian, Irosin" },
  { id: "brgy-irosin-25", name: "San Pedro", municipality: "Irosin", label: "San Pedro, Irosin" },
  { id: "brgy-irosin-26", name: "Santo Domingo", municipality: "Irosin", label: "Santo Domingo, Irosin" },
  { id: "brgy-irosin-27", name: "Tabon-Tabon", municipality: "Irosin", label: "Tabon-Tabon, Irosin" },
  { id: "brgy-irosin-28", name: "Tinampo", municipality: "Irosin", label: "Tinampo, Irosin" },

  // Bulusan (24 Barangays)
  { id: "brgy-bulusan-1", name: "Bagacay", municipality: "Bulusan", label: "Bagacay, Bulusan" },
  { id: "brgy-bulusan-2", name: "Central", municipality: "Bulusan", label: "Central, Bulusan" },
  { id: "brgy-bulusan-3", name: "Cogon", municipality: "Bulusan", label: "Cogon, Bulusan" },
  { id: "brgy-bulusan-4", name: "Dancalan", municipality: "Bulusan", label: "Dancalan, Bulusan" },
  { id: "brgy-bulusan-5", name: "Dapdap", municipality: "Bulusan", label: "Dapdap, Bulusan" },
  { id: "brgy-bulusan-6", name: "Lalud", municipality: "Bulusan", label: "Lalud, Bulusan" },
  { id: "brgy-bulusan-7", name: "Looban", municipality: "Bulusan", label: "Looban, Bulusan" },
  { id: "brgy-bulusan-8", name: "Mabuhay", municipality: "Bulusan", label: "Mabuhay, Bulusan" },
  { id: "brgy-bulusan-9", name: "Madlawon", municipality: "Bulusan", label: "Madlawon, Bulusan" },
  { id: "brgy-bulusan-10", name: "Poctol", municipality: "Bulusan", label: "Poctol, Bulusan" },
  { id: "brgy-bulusan-11", name: "Porog", municipality: "Bulusan", label: "Porog, Bulusan" },
  { id: "brgy-bulusan-12", name: "Sabang", municipality: "Bulusan", label: "Sabang, Bulusan" },
  { id: "brgy-bulusan-13", name: "Salvacion", municipality: "Bulusan", label: "Salvacion, Bulusan" },
  { id: "brgy-bulusan-14", name: "San Antonio", municipality: "Bulusan", label: "San Antonio, Bulusan" },
  { id: "brgy-bulusan-15", name: "San Bernardo", municipality: "Bulusan", label: "San Bernardo, Bulusan" },
  { id: "brgy-bulusan-16", name: "San Francisco", municipality: "Bulusan", label: "San Francisco, Bulusan" },
  { id: "brgy-bulusan-17", name: "San Isidro", municipality: "Bulusan", label: "San Isidro, Bulusan" },
  { id: "brgy-bulusan-18", name: "San Jose", municipality: "Bulusan", label: "San Jose, Bulusan" },
  { id: "brgy-bulusan-19", name: "San Rafael", municipality: "Bulusan", label: "San Rafael, Bulusan" },
  { id: "brgy-bulusan-20", name: "San Roque", municipality: "Bulusan", label: "San Roque, Bulusan" },
  { id: "brgy-bulusan-21", name: "San Vicente", municipality: "Bulusan", label: "San Vicente, Bulusan" },
  { id: "brgy-bulusan-22", name: "Santa Barbara", municipality: "Bulusan", label: "Santa Barbara, Bulusan" },
  { id: "brgy-bulusan-23", name: "Sapngan", municipality: "Bulusan", label: "Sapngan, Bulusan" },
  { id: "brgy-bulusan-24", name: "Tinampo", municipality: "Bulusan", label: "Tinampo, Bulusan" },
];

export const MoreScreen = ({ navigation }: any) => {
  const { colors, language, setLanguage, setTheme, theme, appConfig, t } = usePreferences();

  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [responderUser, setResponderUser] = useState<User | null>(null);

  // Modals
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Login Form
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register Form
  const [regFullName, setRegFullName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regRoleTitle, setRegRoleTitle] = useState("");
  const [regBarangayId, setRegBarangayId] = useState("");
  const [regBarangayName, setRegBarangayName] = useState("");
  const [showBrgySuggestions, setShowBrgySuggestions] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  // Dynamic Autocomplete Barangay Suggestions (Only shows when user starts typing)
  const brgySuggestions = useMemo(() => {
    const q = (regBarangayName || "").trim().toLowerCase();
    if (!q) {
      return [];
    }
    return ALL_BARANGAY_LIST.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.label.toLowerCase().includes(q) ||
        b.municipality.toLowerCase().includes(q)
    );
  }, [regBarangayName]);

  useEffect(() => {
    loadSession();
    loadBarangays();
  }, []);

  const loadBarangays = async () => {
    try {
      const res = await Api.getBarangays();
      if (res.data && res.data.length > 0) {
        setBarangays(res.data);
      }
    } catch {}
  };

  const loadSession = async () => {
    try {
      const [saved, rememberedRaw] = await AsyncStorage.multiGet([
        "@responder_user_session",
        "@responder_remembered_credentials",
      ]);
      if (saved[1]) {
        setResponderUser(JSON.parse(saved[1]));
      }
      if (rememberedRaw[1]) {
        const creds = JSON.parse(rememberedRaw[1]);
        if (creds?.username) {
          setLoginUsername(creds.username);
          if (creds?.password) setLoginPassword(creds.password);
          setRememberMe(true);
        }
      }
    } catch {}
  };

  const getPushToken = async (): Promise<string> => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === "granted") {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: "a055f98d-7d56-47b6-87cc-ed5af96f5e9f",
        });
        return tokenData?.data || "";
      }
    } catch {}
    return "";
  };

  const handleLogin = async () => {
    if (!loginUsername.trim() || !loginPassword) {
      Alert.alert("Kailangan ang Impormasyon", "Mangyaring ilagay ang iyong username at password.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const fcmToken = await getPushToken();
      const res = await Api.responderLogin({
        username: loginUsername.trim().toLowerCase(),
        password: loginPassword,
        fcmToken,
      });

      if (res.success && res.user) {
        const user = res.user;
        setResponderUser(user);
        await AsyncStorage.setItem("@responder_user_session", JSON.stringify(user));
        if (res.token) {
          await AsyncStorage.setItem("@responder_jwt_token", res.token);
        }

        if (rememberMe) {
          await AsyncStorage.setItem(
            "@responder_remembered_credentials",
            JSON.stringify({ username: loginUsername.trim(), password: loginPassword.trim(), rememberMe: true })
          );
        } else {
          await AsyncStorage.removeItem("@responder_remembered_credentials");
        }

        setShowLoginModal(false);
        if (!rememberMe) {
          setLoginPassword("");
        }
        Alert.alert(
          "✅ Matagumpay na Naka-login",
          `Maligayang pagbabalik, ${user.fullName}! May awtoridad ka nang pumasok sa BDRRMC Action Portal.`
        );
      } else if (res.status === "PENDING_APPROVAL") {
        const user = res.user;
        setResponderUser(user);
        await AsyncStorage.setItem("@responder_user_session", JSON.stringify(user));
        setShowLoginModal(false);
        setLoginPassword("");
        Alert.alert(
          "⏳ Naghihintay ng Pag-apruba",
          "Naka-pending pa ang iyong account para sa pagsusuri at pag-apruba ng MDRRMO Admin sa dashboard."
        );
      } else {
        Alert.alert("Hindi Makapasok", res.error || "Maling username o password.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Hindi makakonekta sa MDRRMO server.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async () => {
    if (!regFullName.trim() || !regUsername.trim() || !regPassword || !regConfirmPassword || !regPhone.trim()) {
      Alert.alert("Kailangan ang Lahat ng Impormasyon", "Mangyaring punan ang lahat ng kinakailangang impormasyon.");
      return;
    }
    if (regUsername.trim().length < 3) {
      Alert.alert("Masyadong Maikli ang Username", "Ang username ay dapat hindi bababa sa 3 characters.");
      return;
    }
    if (regPassword.length < 6) {
      Alert.alert("Masyadong Maikli ang Password", "Ang password ay dapat hindi bababa sa 6 na characters.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      Alert.alert(
        "Hindi Tumutugma ang Password 🔒",
        "Mangyaring tiyakin na magkapareho ang Password at Kumpirmasyon ng Password."
      );
      return;
    }

    const cleanedPhone = regPhone.replace(/\D/g, "");
    if (!/^09\d{9}$/.test(cleanedPhone)) {
      Alert.alert(
        "Maling Format ng Telepono 📱",
        "Ang contact number ay dapat magsimula sa '09' at may eksaktong 11 numero (hal. 09171234567)."
      );
      return;
    }

    setIsRegistering(true);
    try {
      const fcmToken = await getPushToken();
      const res = await Api.responderRegister({
        fullName: regFullName.trim(),
        username: regUsername.trim().toLowerCase(),
        password: regPassword,
        phone: cleanedPhone,
        barangayId: regBarangayId || "brgy-1",
        barangayName: regBarangayName || "Irosin",
        roleTitle: regRoleTitle.trim(),
        fcmToken,
      });

      if (res.success) {
        setShowRegisterModal(false);
        setRegPassword("");
        setRegConfirmPassword("");
        if (res.user) {
          setResponderUser(res.user);
          await AsyncStorage.setItem("@responder_user_session", JSON.stringify(res.user));
        }
        Alert.alert(
          "✅ Matagumpay na Nairehistro",
          "Naipadala na sa MDRRMO Admin ang iyong account registration. Kapag naaprubahan sa dashboard, maaari ka nang mag-login gamit ang iyong username at buksan ang Action Portal!"
        );
      }
    } catch (err: any) {
      Alert.alert("Registration Error", err.message || "Hindi maiproseso ang rehistrasyon.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!responderUser) return;
    setIsRefreshingStatus(true);
    try {
      // Re-login quietly with stored credentials if possible or trigger token check
      const fcmToken = await getPushToken();
      const res = await Api.checkResponderStatus(fcmToken);
      if (res && res.status === "APPROVED") {
        const updated = { ...responderUser, status: "ACTIVE" as const };
        setResponderUser(updated);
        await AsyncStorage.setItem("@responder_user_session", JSON.stringify(updated));
        Alert.alert("🎉 Aprobado na!", "Naaprubahan na ng MDRRMO Admin ang iyong responder account!");
      } else if (res && res.status === "REJECTED") {
        const updated = { ...responderUser, status: "REJECTED" as const };
        setResponderUser(updated);
        await AsyncStorage.setItem("@responder_user_session", JSON.stringify(updated));
        Alert.alert("Status", "Tinanggihan ang aplikasyon. Makipag-ugnayan sa MDRRMO Admin.");
      } else {
        Alert.alert("Status", "Kasalukuyan pa ring sinusuri ng MDRRMO Admin ang iyong account.");
      }
    } catch {
      Alert.alert("Status", "Hindi makakonekta sa MDRRMO server.");
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Mag-Logout", "Sigurado ka bang nais mong mag-logout sa iyong responder account?", [
      { text: "Kanselahin", style: "cancel" },
      {
        text: "Mag-Logout",
        style: "destructive",
        onPress: async () => {
          setResponderUser(null);
          await AsyncStorage.removeItem("@responder_user_session");
          await AsyncStorage.removeItem("@responder_jwt_token");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {/* Aesthetic Minimal Top Header Gradient (Light Mode) */}
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

      <View
        style={[
          styles.header,
          {
            backgroundColor: "transparent",
            borderBottomWidth: 0,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          },
        ]}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: theme === "light" ? "rgba(2, 132, 199, 0.12)" : "rgba(56, 189, 248, 0.15)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme === "light" ? "rgba(2, 132, 199, 0.22)" : "rgba(56, 189, 248, 0.25)",
          }}
        >
          <Ionicons name="grid" size={22} color={colors.primaryLight} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>
            {language === "tl" ? "Iba Pang Serbisyo at Profile" : "System Services & Profile"}
          </Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            {language === "tl" ? "Mga serbisyo, responder portal at gabay" : "System services, responder portal & guides"}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* 1. Dedicated BDRRMC Responder Action Portal Card (ACTIVE / APPROVED) */}
        {responderUser?.status === "ACTIVE" && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: "#10b981",
                borderWidth: 1.5,
                shadowColor: "#10b981",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 6,
                elevation: 3,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="shield-checkmark" size={20} color="#10b981" />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "900",
                    color: "#10b981",
                    textTransform: "uppercase",
                  }}
                >
                  {language === "tl" ? "OPISYAL NA RESPONDER" : "OFFICIAL RESPONDER"}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#10b98122",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "900", color: "#10b981" }}>
                  APPROVED
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text, marginBottom: 2 }}>
              {responderUser.fullName || "Barangay Responder"}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: colors.primaryLight,
                marginBottom: 4,
              }}
            >
              {responderUser.roleTitle || "BDRRMC Officer"} • {responderUser.barangayName || "Irosin"}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 12 }}>
              {language === "tl"
                ? `May awtoridad kang umaksyon, mag-apruba, at mag-update sa mga ulat sa ${responderUser.barangayName || "iyong asignasyon"}.`
                : `You have authority to take action, verify, and resolve incident reports in ${responderUser.barangayName || "your jurisdiction"}.`}
            </Text>

            <TouchableOpacity
              onPress={() => navigation.navigate("ResponderPortal")}
              style={{
                backgroundColor: "#0284c7",
                paddingVertical: 12,
                borderRadius: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Ionicons name="shield-outline" size={18} color="#ffffff" />
              <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 14 }}>
                {language === "tl" ? "Buksan ang BDRRMC Action Portal" : "Open BDRRMC Action Portal"}
              </Text>
              <Ionicons name="chevron-forward-outline" size={16} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              style={{
                paddingVertical: 8,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Ionicons name="log-out-outline" size={16} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700" }}>
                Mag-Logout sa Responder Account
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. Pending Approval Notice Card */}
        {responderUser?.status === "PENDING_APPROVAL" && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: "#f59e0b",
                borderWidth: 1.5,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="time-outline" size={18} color="#f59e0b" />
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#f59e0b" }}>
                  {language === "tl" ? "HINIHINTAY ANG PAG-APRUBA" : "PENDING ADMIN APPROVAL"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleRefreshStatus}
                disabled={isRefreshingStatus}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "#f59e0b22",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                {isRefreshingStatus ? (
                  <ActivityIndicator size="small" color="#f59e0b" />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={12} color="#f59e0b" />
                    <Text style={{ fontSize: 10, fontWeight: "800", color: "#f59e0b" }}>
                      {language === "tl" ? "I-refresh" : "Refresh"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text, marginBottom: 2 }}>
              {responderUser.fullName}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.primaryLight,
                marginBottom: 6,
              }}
            >
              {responderUser.roleTitle || "Responder"} • {responderUser.barangayName || "Irosin"}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 10 }}>
              {language === "tl"
                ? `Nai-save na ang iyong account sa database. Kasalukuyang naghihintay ng pag-apruba mula sa MDRRMO Admin sa web dashboard bago ma-activate ang Action Portal.`
                : `Your responder account is registered in the database and currently awaiting MDRRMO Admin approval.`}
            </Text>

            <TouchableOpacity
              onPress={handleLogout}
              style={{
                paddingVertical: 6,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Ionicons name="log-out-outline" size={14} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: "700" }}>
                Mag-Logout
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 3. Responder Portal Access Card (When NOT logged in or Rejected) */}
        {(!responderUser || responderUser.status === "REJECTED") && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                borderWidth: 1,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <Ionicons name="shield-outline" size={20} color={colors.primaryLight} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: colors.text,
                  textTransform: "uppercase",
                }}
              >
                {language === "tl" ? "BDRRMC / MDRRMO Responder Portal" : "Responder Access Portal"}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                marginBottom: 12,
                lineHeight: 17,
              }}
            >
              {language === "tl"
                ? "Para sa mga Barangay Tanod, Opisyal, at MDRRMO Responders: Mag-login o mag-register upang magkaroon ng awtoridad na maaksyunan at ma-update ang mga emergency reports."
                : "For Barangay Tanods and MDRRMO Responders: Log in or register to manage ground disaster reports."}
            </Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowLoginModal(true)}
                style={{
                  flex: 1,
                  backgroundColor: colors.primary,
                  paddingVertical: 11,
                  borderRadius: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Ionicons name="log-in-outline" size={16} color="#ffffff" />
                <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 13 }}>
                  Mag-Login
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowRegisterModal(true)}
                style={{
                  flex: 1,
                  backgroundColor: colors.inputBg,
                  borderColor: colors.cardBorder,
                  borderWidth: 1,
                  paddingVertical: 11,
                  borderRadius: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Ionicons name="person-add-outline" size={16} color={colors.text} />
                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 13 }}>
                  Mag-Register
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Selected Barangay Profile Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="location-outline" size={18} color={colors.primaryLight} />
            <Text style={[styles.cardHeader, { color: colors.textSecondary }]}>
              {language === "tl" ? "Profile ng Nasasakupan" : "Jurisdiction Profile"}
            </Text>
          </View>
          <Text style={[styles.valTitle, { color: colors.text }]}>Municipality of Irosin</Text>
          <Text style={[styles.valSub, { color: colors.primaryLight }]}>
            Province of Sorsogon, Region V (Bicol)
          </Text>
          <Text style={[styles.valDetail, { color: colors.textSecondary }]}>
            {language === "tl"
              ? "Lahat ng 28 barangays ay sakop ng MDRRMO 24/7 Command Center."
              : "All barangays covered by MDRRMO 24/7 Command Center."}
          </Text>
        </View>

        {/* Offline Cache Status */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.success} />
            <Text style={[styles.cardHeader, { color: colors.textSecondary }]}>
              {t("offlineCache")}
            </Text>
          </View>
          <Text style={[styles.valDetail, { color: colors.textSecondary }]}>
            ✓ {language === "tl" ? "Pangalan at Patakaran (App Config) naka-save sa device (0ms)" : "App Configuration cached locally (0ms)"}
          </Text>
          <Text style={[styles.valDetail, { color: colors.textSecondary }]}>
            ✓ {language === "tl" ? "Emergency Hotlines naka-save sa device" : "Emergency Hotlines cached locally"}
          </Text>
          <Text style={[styles.valDetail, { color: colors.textSecondary }]}>
            ✓ {language === "tl" ? "Gabay sa Sakuna naka-save sa device" : "Preparedness Guides cached locally"}
          </Text>
          <Text style={[styles.valDetail, { color: colors.textSecondary }]}>
            ✓ {language === "tl" ? "Evacuation Centers naka-save sa device" : "Evacuation Centers cached locally"}
          </Text>
        </View>

        {/* ⚙️ Action Button: Settings & Preferences */}
        <TouchableOpacity
          style={[styles.menuCardBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => navigation.navigate("Settings")}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: "#8b5cf618" }]}>
            <Ionicons name="settings" size={20} color="#8b5cf6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuBtnTitle, { color: colors.text }]}>
              {language === "tl" ? "Mga Setting (Settings)" : "Settings & Preferences"}
            </Text>
            <Text style={[styles.menuBtnSub, { color: colors.textSecondary }]}>
              {language === "tl" ? "Wika (Language), Tema (Theme), Notipikasyon" : "Language, Theme, Notifications & Audio"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Action Button: Emergency Contacts */}
        <TouchableOpacity
          style={[styles.menuCardBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => navigation.navigate("Contacts")}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: "#0284c718" }]}>
            <Ionicons name="call" size={20} color="#0284c7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuBtnTitle, { color: colors.text }]}>{t("emergencyHotlines")}</Text>
            <Text style={[styles.menuBtnSub, { color: colors.textSecondary }]}>
              {language === "tl" ? "MDRRMO, PNP, BFP, RHU Hotlines" : "MDRRMO, Police, Fire & Health Hotlines"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* ℹ️ Action Button: About the App & Developers */}
        <TouchableOpacity
          style={[styles.menuCardBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => setShowAboutModal(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: "#3b82f618" }]}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuBtnTitle, { color: colors.text }]}>
              {language === "tl" ? "Tungkol sa Sistema (About)" : "About System & Developers"}
            </Text>
            <Text style={[styles.menuBtnSub, { color: colors.textSecondary }]}>
              {language === "tl" ? "Layunin, MDRRMO partnership, research team" : "Purpose, authority, research & dev team"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* 🔒 Action Button: Privacy Notice (RA 10173) */}
        <TouchableOpacity
          style={[styles.menuCardBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => setShowPrivacyModal(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: "#10b98118" }]}>
            <Ionicons name="shield-checkmark" size={20} color="#10b981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuBtnTitle, { color: colors.text }]}>
              {language === "tl" ? "Patakaran sa Privacy (Data Privacy)" : "Data Privacy Notice (RA 10173)"}
            </Text>
            <Text style={[styles.menuBtnSub, { color: colors.textSecondary }]}>
              {language === "tl" ? "Proteksyon ng data at mga karapatan" : "Data protection & user privacy rights"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* 📜 Action Button: Terms & Conditions */}
        <TouchableOpacity
          style={[
            styles.menuCardBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              marginBottom: 14,
            },
          ]}
          onPress={() => setShowTermsModal(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: "#f59e0b18" }]}>
            <Ionicons name="document-text" size={20} color="#f59e0b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuBtnTitle, { color: colors.text }]}>
              {language === "tl" ? "Kasunduan at Tuntunin (Terms)" : "Terms of Service"}
            </Text>
            <Text style={[styles.menuBtnSub, { color: colors.textSecondary }]}>
              {language === "tl" ? "Responsableng paggamit at legal disclaimers" : "Responsible use & safety disclaimers"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Footer App Info */}
        <View style={{ alignItems: "center", marginTop: 10, marginBottom: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted }}>
            Irosin Disaster Safety App
          </Text>
          <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
            Version 1.0.0 (Release) • Irosin, Sorsogon
          </Text>
        </View>
      </ScrollView>

      {/* 🔑 LOGIN MODAL (Full-Screen & Scrollable) */}
      <Modal
        visible={showLoginModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setShowLoginModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom", "left", "right"]}>
          <StatusBar style={theme === "dark" ? "light" : "dark"} backgroundColor="transparent" translucent />

          {/* Top Bar */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.cardBorder,
              backgroundColor: colors.card,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.primaryBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="log-in" size={20} color={colors.primaryLight} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>
                Responder Login
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowLoginModal(false)}
              style={{
                padding: 6,
                borderRadius: 10,
                backgroundColor: colors.inputBg,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  padding: 20,
                  gap: 12,
                }}
              >
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 6, lineHeight: 18 }}>
                  Mag-login gamit ang iyong rehistradong responder account para mabuksan ang Action Portal.
                </Text>

                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>
                  USERNAME
                </Text>
                <TextInput
                  value={loginUsername}
                  onChangeText={setLoginUsername}
                  placeholder="Hal. juan_tanod o responder_mdrrmo"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.cardBorder }]}
                />

                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>
                  PASSWORD
                </Text>
                <TextInput
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  placeholder="Ilagay ang iyong password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.cardBorder }]}
                />

                {/* Remember Me Checkbox Card */}
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    backgroundColor: colors.bg,
                    borderColor: rememberMe ? colors.primaryLight : colors.cardBorder,
                    marginVertical: 4,
                  }}
                  onPress={() => setRememberMe(prev => !prev)}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 2,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: rememberMe ? colors.primaryLight : "transparent",
                      borderColor: rememberMe ? colors.primaryLight : colors.textSecondary,
                    }}
                  >
                    {rememberMe && <Ionicons name="checkmark" size={15} color="#ffffff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>
                      {language === "tl" ? "Tandaan ang Account (Remember Me)" : "Remember Account"}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                      {language === "tl"
                        ? "I-save ang credentials para sa mabilisang login"
                        : "Keep credentials saved on this device"}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={isLoggingIn}
                  style={{
                    backgroundColor: colors.primary,
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  {isLoggingIn ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="log-in" size={20} color="#ffffff" />
                      <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 15 }}>
                        Mag-Login sa Portal
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* 📝 REGISTER MODAL (Full-Screen & Scrollable) */}
      <Modal
        visible={showRegisterModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setShowRegisterModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom", "left", "right"]}>
          <StatusBar style={theme === "dark" ? "light" : "dark"} backgroundColor="transparent" translucent />
          {/* Top Bar */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.cardBorder,
              backgroundColor: colors.card,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.primaryBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="person-add" size={20} color={colors.primaryLight} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>
                Responder Registration
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowRegisterModal(false)}
              style={{
                padding: 6,
                borderRadius: 10,
                backgroundColor: colors.inputBg,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  padding: 20,
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8, lineHeight: 18 }}>
                  Ilagay ang iyong opisyal na impormasyon para mai-save sa database at masuri ng MDRRMO Admin.
                </Text>

                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>
                  BUONG PANGALAN *
                </Text>
                <TextInput
                  value={regFullName}
                  onChangeText={setRegFullName}
                  placeholder="Hal. Juan Dela Cruz"
                  placeholderTextColor="#64748b"
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.cardBorder }]}
                />

                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>
                  USERNAME (WALANG KAPAREHO) *
                </Text>
                <TextInput
                  value={regUsername}
                  onChangeText={setRegUsername}
                  placeholder="Hal. juan_tanod (letra, numero, underscore)"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.cardBorder }]}
                />

                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>
                  PASSWORD *
                </Text>
                <TextInput
                  value={regPassword}
                  onChangeText={setRegPassword}
                  placeholder="Hindi bababa sa 6 na characters"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.cardBorder }]}
                />

                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>
                  KUMPIRMAHIN ANG PASSWORD *
                </Text>
                <TextInput
                  value={regConfirmPassword}
                  onChangeText={setRegConfirmPassword}
                  placeholder="Ulitin ang password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bg,
                      color: colors.text,
                      borderColor:
                        regConfirmPassword && regConfirmPassword !== regPassword
                          ? "#ef4444"
                          : colors.cardBorder,
                    },
                  ]}
                />
                {regConfirmPassword.length > 0 && regConfirmPassword !== regPassword && (
                  <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "700", marginTop: -6, marginBottom: 6 }}>
                    ⚠️ Hindi tumutugma sa password sa itaas
                  </Text>
                )}

                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>
                  CONTACT NUMBER (09XXXXXXXXX) *
                </Text>
                <TextInput
                  value={regPhone}
                  onChangeText={(txt) => setRegPhone(txt.replace(/\D/g, "").slice(0, 11))}
                  placeholder="Hal. 09171234567"
                  keyboardType="numeric"
                  maxLength={11}
                  placeholderTextColor="#64748b"
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bg,
                      color: colors.text,
                      borderColor:
                        regPhone && regPhone.length >= 2 && !regPhone.startsWith("09")
                          ? "#f59e0b"
                          : colors.cardBorder,
                    },
                  ]}
                />
                {regPhone.length >= 2 && !regPhone.startsWith("09") && (
                  <Text style={{ color: "#f59e0b", fontSize: 11, fontWeight: "700", marginTop: -6, marginBottom: 6 }}>
                    ⚠️ Dapat magsimula sa "09"
                  </Text>
                )}
                {regPhone.startsWith("09") && regPhone.length > 0 && regPhone.length < 11 && (
                  <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "600", marginTop: -6, marginBottom: 6 }}>
                    Kulang pa ng {11 - regPhone.length} numero ({regPhone.length}/11)
                  </Text>
                )}

                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>
                  TUNGKULIN / POSISYON *
                </Text>
                <TextInput
                  value={regRoleTitle}
                  onChangeText={setRegRoleTitle}
                  placeholder="Hal. Barangay Tanod, BDRRMC Officer"
                  placeholderTextColor="#64748b"
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.cardBorder }]}
                />

                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>
                  BARANGAY NA ASIGNASYON *
                </Text>
                <View style={{ position: "relative", marginBottom: showBrgySuggestions ? 8 : 10 }}>
                  <View
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.bg,
                        borderColor: showBrgySuggestions ? colors.primaryLight : colors.cardBorder,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 0,
                      },
                    ]}
                  >
                    <Ionicons name="location" size={16} color={colors.primaryLight} />
                    <TextInput
                      value={regBarangayName}
                      onChangeText={(txt) => {
                        setRegBarangayName(txt);
                        setRegBarangayId(
                          txt.toLowerCase().includes("all")
                            ? "all"
                            : txt.toLowerCase().replace(/[^a-z0-9]/g, "-") || "brgy-1"
                        );
                        setShowBrgySuggestions(true);
                      }}
                      onFocus={() => {
                        if (regBarangayName.trim().length > 0) {
                          setShowBrgySuggestions(true);
                        }
                      }}
                      placeholder="Hal. San Julian, Irosin"
                      placeholderTextColor="#64748b"
                      style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: "700", padding: 0 }}
                    />
                    {regBarangayName ? (
                      <TouchableOpacity
                        onPress={() => {
                          setRegBarangayName("");
                          setRegBarangayId("");
                          setShowBrgySuggestions(false);
                        }}
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          backgroundColor: "rgba(239, 68, 68, 0.12)",
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "800" }}>Clear</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* 📋 Autocomplete Suggestions Popover */}
                  {showBrgySuggestions && regBarangayName.trim().length > 0 && brgySuggestions.length > 0 && (
                    <View
                      style={{
                        marginTop: 4,
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                        borderRadius: 12,
                        maxHeight: 180,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 6,
                        elevation: 6,
                        overflow: "hidden",
                      }}
                    >
                      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {brgySuggestions.map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            onPress={() => {
                              setRegBarangayName(item.label);
                              setRegBarangayId(item.id);
                              setShowBrgySuggestions(false);
                            }}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              borderBottomWidth: StyleSheet.hairlineWidth,
                              borderBottomColor: colors.cardBorder,
                              backgroundColor:
                                regBarangayName === item.label
                                  ? colors.primaryBg
                                  : "transparent",
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                              <Ionicons
                                name={item.id === "brgy-all" ? "globe-outline" : "location-outline"}
                                size={15}
                                color={colors.primaryLight}
                              />
                              <Text
                                style={{
                                  fontSize: 12.5,
                                  fontWeight: item.id === "brgy-all" ? "900" : "700",
                                  color: item.id === "brgy-all" ? colors.primaryLight : colors.text,
                                }}
                              >
                                {item.label}
                              </Text>
                            </View>
                            {regBarangayName === item.label && (
                              <Ionicons name="checkmark-circle" size={16} color={colors.primaryLight} />
                            )}
                          </TouchableOpacity>
                        ))}
                        {brgySuggestions.length === 0 && (
                          <View style={{ padding: 12, alignItems: "center" }}>
                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                              Walang tugmang barangay. Pwede mong ituloy ang pag-type.
                            </Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  onPress={handleRegister}
                  disabled={isRegistering}
                  style={{
                    backgroundColor: colors.primary,
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {isRegistering ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={18} color="#ffffff" />
                      <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 15 }}>
                        I-submit ang Rehistrasyon
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ℹ️ ABOUT SYSTEM & DEVELOPERS MODAL (Full-Screen like Emergency Hotlines Screen) */}
      <Modal
        visible={showAboutModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setShowAboutModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom", "left", "right"]}>
          <StatusBar style={theme === "dark" ? "light" : "dark"} backgroundColor="transparent" translucent />

          {/* Aesthetic Minimal Top Header Gradient (Same as Emergency Contacts) */}
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

          {/* Header */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: "rgba(2, 132, 199, 0.12)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(2, 132, 199, 0.25)",
              }}
            >
              <Ionicons name="information-circle" size={24} color="#0284c7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>
                {language === "tl" ? "Tungkol sa App" : "About the System"}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {language === "tl" ? "Impormasyon sa sistema at mga developer" : "System info & developers"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowAboutModal(false)}
              style={{
                padding: 8,
                borderRadius: 12,
                backgroundColor: colors.inputBg,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 }}
          >
            {/* App Identity Banner */}
            <View
              style={{
                alignItems: "center",
                paddingVertical: 16,
                backgroundColor: colors.card,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Image
                source={require("../../assets/icon.png")}
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 34,
                  marginBottom: 10,
                  borderWidth: 2,
                  borderColor: colors.primaryLight,
                }}
              />
              <Text style={{ fontSize: 17, fontWeight: "900", color: colors.text, textAlign: "center" }}>
                IROSIN DISASTER SAFETY SYSTEM
              </Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primaryLight, marginTop: 3 }}>
                Decision Support & Early Warning System (Irosin, Sorsogon)
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
                Release Version 1.0.0 • Mobile Client
              </Text>
            </View>

            {/* 1. Layunin ng Sistema */}
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text style={[styles.aboutSectionTitle, { color: colors.primaryLight, marginBottom: 6 }]}>
                {language === "tl" ? "🎯 LAYUNIN NG SISTEMA" : "🎯 PURPOSE & SCOPE"}
              </Text>
              <Text style={[styles.aboutSectionText, { color: colors.textSecondary, lineHeight: 20 }]}>
                {appConfig?.aboutDescription ||
                  "Ang application na ito ay dinisenyo upang magbigay ng mabilis, maaasahan, at realtime na impormasyon sa panahon ng sakuna at kalamidad sa Munisipalidad ng Irosin at mga karatig-bayan sa Lalawigan ng Sorsogon."}
              </Text>
            </View>

            {/* 2. Awtoridad at Kasosyo */}
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text style={[styles.aboutSectionTitle, { color: colors.primaryLight, marginBottom: 6 }]}>
                {language === "tl" ? "🏛️ AWTORIDAD AT PARTNERSHIP" : "🏛️ AUTHORITY & PARTNERSHIP"}
              </Text>
              <Text style={[styles.aboutSectionText, { color: colors.text, fontWeight: "800", fontSize: 13.5 }]}>
                {appConfig?.authority || "Municipal Disaster Risk Reduction & Management Office (MDRRMO)"}
              </Text>
              <Text style={[styles.aboutSectionText, { color: colors.textSecondary, marginTop: 3 }]}>
                Local Government Unit of Irosin, Sorsogon, Philippines
              </Text>
              <Text style={[styles.aboutSectionText, { color: colors.textSecondary, marginTop: 4, fontWeight: "600" }]}>
                Hotlines: {appConfig?.commandCenterHotline || "0917-123-4567 / MDRRMO 24/7 Operations"}
              </Text>
            </View>

            {/* 3. Research & Development Proponents */}
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text style={[styles.aboutSectionTitle, { color: colors.primaryLight, marginBottom: 6 }]}>
                {language === "tl" ? "👥 DEVELOPMENT & RESEARCH TEAM" : "👥 DEVELOPMENT TEAM"}
              </Text>
              <Text style={[styles.aboutSectionText, { color: colors.text, fontWeight: "800", fontSize: 13.5 }]}>
                {appConfig?.developmentTeam || "Project Development & Research Team, BSIT"}
              </Text>
              <Text style={[styles.aboutSectionText, { color: colors.textSecondary, marginTop: 3 }]}>
                Bachelor of Science in Information Technology (BSIT) Capstone Research
              </Text>
              <Text style={[styles.aboutSectionText, { color: colors.textSecondary, marginTop: 2 }]}>
                Academic Year: {appConfig?.academicYear || "2025 - 2026"}
              </Text>
            </View>

            {/* 4. Integrated Data Sources & APIs */}
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text style={[styles.aboutSectionTitle, { color: colors.primaryLight, marginBottom: 6 }]}>
                {language === "tl" ? "📡 MGA GINAMIT NA DATA SOURCES AT APIS" : "📡 INTEGRATED DATA SOURCES & APIS"}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 10, lineHeight: 17 }}>
                {language === "tl"
                  ? "Opisyal na integrasyon sa mga mapagkakatiwalaang scientific data feeds para sa real-time na kaligtasan:"
                  : "Official integrations with authoritative scientific and geographic data providers:"}
              </Text>

              <View style={{ gap: 8 }}>
                {(appConfig?.apiIntegrations && appConfig.apiIntegrations.length > 0
                  ? appConfig.apiIntegrations
                  : [
                      {
                        id: "api-1",
                        name: "Open-Meteo Weather API",
                        category: "Live Weather & Satellite Models",
                        provider: "Open-Meteo, ECMWF & NOAA GFS",
                        purpose: "Real-time temperature, rainfall, humidity, wind radar, at 5-day extended forecasts para sa Irosin at karatig-bayan.",
                        status: "ACTIVE"
                      },
                      {
                        id: "api-2",
                        name: "USGS Earthquake Hazards Feed",
                        category: "Real-Time Seismic Monitoring",
                        provider: "United States Geological Survey (USGS)",
                        purpose: "250km radius live seismic monitoring sa paligid ng Bulkang Bulusan at Irosin faults (M3.5+ earthquake alerts).",
                        status: "ACTIVE"
                      },
                      {
                        id: "api-3",
                        name: "OpenStreetMap & Nominatim Geocoding",
                        category: "Geographic Map & Reverse Geocoding",
                        provider: "OpenStreetMap Foundation & Contributors",
                        purpose: "High-resolution road maps, barangay boundary resolution, at disaster incident location reverse geocoding.",
                        status: "ACTIVE"
                      },
                      {
                        id: "api-4",
                        name: "Google Maps Navigation Intent Engine",
                        category: "Turn-by-Turn GPS Navigation",
                        provider: "Google Maps Navigation Engine",
                        purpose: "Live interactive turn-by-turn routing patungo sa pinakamalapit na ligtas na evacuation center.",
                        status: "ACTIVE"
                      },
                      {
                        id: "api-5",
                        name: "Expo Push Notification Service",
                        category: "Emergency Broadcast & Push Alerts",
                        provider: "Expo Application Services & Google Firebase",
                        purpose: "High-priority push alert dispatch para sa disaster advisories at critical evacuation orders.",
                        status: "ACTIVE"
                      }
                    ]
                ).map((api: any) => (
                  <View
                    key={api.id}
                    style={{
                      padding: 12,
                      backgroundColor: colors.inputBg,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text }}>
                        {api.name}
                      </Text>
                      <View
                        style={{
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: api.status === "ACTIVE" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9.5,
                            fontWeight: "900",
                            color: api.status === "ACTIVE" ? "#10b981" : "#f59e0b",
                          }}
                        >
                          {api.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primaryLight, marginBottom: 3 }}>
                      {api.category} • {api.provider}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 17 }}>
                      {api.purpose}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 5. Core Technologies & Development Tools */}
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text style={[styles.aboutSectionTitle, { color: colors.primaryLight, marginBottom: 8 }]}>
                {language === "tl" ? "⚡ MGA GINAMIT NA TEKNOLOHIYA (TECH STACK)" : "⚡ CORE TECH STACK & FRAMEWORKS"}
              </Text>

              <View style={{ gap: 8 }}>
                {(appConfig?.techStack && appConfig.techStack.length > 0
                  ? appConfig.techStack
                  : [
                      {
                        id: "tech-1",
                        name: "React Native & TypeScript",
                        category: "Frontend Mobile Framework",
                        description: "Native cross-platform mobile application para sa Android at iOS na may type-safe state management."
                      },
                      {
                        id: "tech-2",
                        name: "Node.js & Express REST API",
                        category: "Backend Gateway",
                        description: "Modular RESTful microservices para sa authentication, disaster report triage, at automated weather sync."
                      },
                      {
                        id: "tech-3",
                        name: "Socket.IO WebSockets",
                        category: "Real-time Sync",
                        description: "Zero-latency real-time bidirectional synchronization sa pagitan ng MDRRMO Admin Command Center at Mobile Responders."
                      },
                      {
                        id: "tech-4",
                        name: "Google Firebase Cloud Firestore",
                        category: "Cloud NoSQL Database",
                        description: "Real-time cloud document store para sa disaster reports, evacuation centers, at responder user registry."
                      },
                      {
                        id: "tech-5",
                        name: "Leaflet.js & WebView Engine",
                        category: "Geospatial Engine",
                        description: "Custom interactive mapping na may pulsing GPS beacon glow rings at safe evacuation routing."
                      }
                    ]
                ).map((tech: any) => (
                  <View
                    key={tech.id}
                    style={{
                      padding: 12,
                      backgroundColor: colors.inputBg,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text }}>
                        {tech.name}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primaryLight }}>
                        {tech.category}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 17 }}>
                      {tech.description}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
                marginBottom: 10,
              }}
              onPress={() => setShowAboutModal(false)}
            >
              <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 15 }}>
                {language === "tl" ? "Naiintindihan Ko (Isara)" : "Close"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 🔒 PRIVACY MODAL (Full-Screen) */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom", "left", "right"]}>
          <StatusBar style={theme === "dark" ? "light" : "dark"} backgroundColor="transparent" translucent />

          {/* Header */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: 1,
              borderBottomColor: colors.cardBorder,
              backgroundColor: colors.card,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(16, 185, 129, 0.25)",
                }}
              >
                <Ionicons name="shield-checkmark" size={22} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: "900", color: colors.text }}>
                  {language === "tl" ? "Data Privacy Notice (RA 10173)" : "Data Privacy Notice"}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  {language === "tl" ? "Proteksyon at privacy ng datos" : "Data protection & privacy"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowPrivacyModal(false)}
              style={{
                padding: 8,
                borderRadius: 12,
                backgroundColor: colors.inputBg,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 18, paddingBottom: 24 }}
          >
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                padding: 18,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 13.5, lineHeight: 22, color: colors.textSecondary }}>
                {appConfig?.privacyNoticeContent ||
                  "Alinsunod sa Republic Act No. 10173 o Data Privacy Act of 2012 ng Pilipinas, ang Irosin Disaster Safety App at ang MDRRMO ay nangangakong poprotektahan ang iyong personal na impormasyon."}
              </Text>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
              }}
              onPress={() => setShowPrivacyModal(false)}
            >
              <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 15 }}>
                {language === "tl" ? "Naiintindihan Ko (Isara)" : "Close"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 📜 TERMS MODAL (Full-Screen) */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setShowTermsModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom", "left", "right"]}>
          <StatusBar style={theme === "dark" ? "light" : "dark"} backgroundColor="transparent" translucent />

          {/* Header */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: 1,
              borderBottomColor: colors.cardBorder,
              backgroundColor: colors.card,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor: "rgba(2, 132, 199, 0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(2, 132, 199, 0.25)",
                }}
              >
                <Ionicons name="document-text" size={22} color="#0284c7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: "900", color: colors.text }}>
                  {language === "tl" ? "Kasunduan at Tuntunin" : "Terms of Service"}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  {language === "tl" ? "Alituntunin sa paggamit ng app" : "Guidelines on app usage"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowTermsModal(false)}
              style={{
                padding: 8,
                borderRadius: 12,
                backgroundColor: colors.inputBg,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 18, paddingBottom: 24 }}
          >
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                padding: 18,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 13.5, lineHeight: 22, color: colors.textSecondary }}>
                {appConfig?.termsContent ||
                  "1. PANGKALAHATANG LAYUNIN: Ang system na ito ay nilikha para sa pagpapalaganap ng maagang babala (early warning), impormasyon sa evacuation centers, lagay ng panahon, at pag-uulat ng mga emergency sa Irosin, Sorsogon."}
              </Text>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
              }}
              onPress={() => setShowTermsModal(false)}
            >
              <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 15 }}>
                {language === "tl" ? "Naiintindihan Ko (Isara)" : "Close"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 19, fontWeight: "900" },
  sub: { fontSize: 13, marginTop: 2, fontWeight: "700" },

  container: { flex: 1, padding: 16 },
  card: {
    borderRadius: 12,
    borderWidth: 0,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  cardHeader: { fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  valTitle: { fontSize: 17, fontWeight: "800", marginBottom: 2 },
  valSub: { fontSize: 13, marginBottom: 4 },
  valDetail: { fontSize: 13, marginTop: 4, lineHeight: 19 },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    marginBottom: 12,
  },

  menuCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuBtnTitle: {
    fontSize: 14.5,
    fontWeight: "800",
  },
  menuBtnSub: {
    fontSize: 11.5,
    marginTop: 2,
  },

  // Modal Backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },
  formModalContent: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  compactModalContent: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    maxHeight: "80%",
  },
  aboutModalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    height: "90%",
    maxHeight: "90%",
  },
  aboutSection: {
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 12,
  },
  aboutSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  aboutSectionText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});
