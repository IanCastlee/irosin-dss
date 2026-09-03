import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  Vibration,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { usePreferences } from '../context/PreferencesContext';
import { Api } from '../services/api';
import { OfflineStorage } from '../services/offlineStorage';
import { soundService } from '../services/soundService';
import { LinearGradient } from 'expo-linear-gradient';

export const syncNotificationChannelSettings = async (
  soundEnabled?: boolean,
  vibrateEnabled?: boolean,
  chatSoundEnabled?: boolean,
  chatPushEnabled?: boolean
) => {
  if (Platform.OS === 'android') {
    try {
      let sound = soundEnabled;
      let vibrate = vibrateEnabled;
      let chatSound = chatSoundEnabled;
      let chatPush = chatPushEnabled;

      if (sound === undefined) {
        const soundVal = await AsyncStorage.getItem('@setting_notif_sound');
        sound = soundVal !== null ? JSON.parse(soundVal) : true;
      }
      if (vibrate === undefined) {
        const vibVal = await AsyncStorage.getItem('@setting_notif_vibrate');
        vibrate = vibVal !== null ? JSON.parse(vibVal) : true;
      }
      if (chatSound === undefined) {
        const chatSoundVal = await AsyncStorage.getItem('@setting_chat_sound');
        chatSound = chatSoundVal !== null ? JSON.parse(chatSoundVal) : true;
      }
      if (chatPush === undefined) {
        const chatPushVal = await AsyncStorage.getItem('@setting_chat_push_notif');
        chatPush = chatPushVal !== null ? JSON.parse(chatPushVal) : true;
      }

      // 1. Emergency Alerts Channel (MAX importance, siren & alerts)
      await Notifications.setNotificationChannelAsync('emergency-alerts', {
        name: 'Emergency Alerts & Warnings',
        importance: sound || vibrate ? Notifications.AndroidImportance.MAX : Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: vibrate ? [0, 500, 250, 500, 250, 500] : undefined,
        lightColor: '#FF0000',
        sound: sound ? 'default' : null,
        enableVibrate: !!vibrate,
        enableLights: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: !!sound,
      });

      // 2. Dedicated Chat Messages Channel (MAX importance for background sound)
      await Notifications.setNotificationChannelAsync('chat-messages', {
        name: 'Responder Chat Messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#0EA5E9',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch (err) {
      console.warn('[NotificationChannel] Sync channel warning:', err);
    }
  }
};

export const SettingsScreen = ({ navigation }: any) => {
  const { theme, language, colors, setTheme, setLanguage, t } = usePreferences();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);
  const [sirenEnabled, setSirenEnabled] = useState(true);
  const [offlineCacheEnabled, setOfflineCacheEnabled] = useState(true);
  const [chatSoundEnabled, setChatSoundEnabled] = useState(true);
  const [chatPushEnabled, setChatPushEnabled] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const soundVal = await AsyncStorage.getItem('@setting_notif_sound');
      if (soundVal !== null) setSoundEnabled(JSON.parse(soundVal));

      const vibVal = await AsyncStorage.getItem('@setting_notif_vibrate');
      if (vibVal !== null) setVibrateEnabled(JSON.parse(vibVal));

      const sirenVal = await AsyncStorage.getItem('@setting_siren');
      if (sirenVal !== null) setSirenEnabled(JSON.parse(sirenVal));

      const cacheVal = await AsyncStorage.getItem('@setting_offline_cache');
      if (cacheVal !== null) setOfflineCacheEnabled(JSON.parse(cacheVal));

      const chatSoundVal = await AsyncStorage.getItem('@setting_chat_sound');
      if (chatSoundVal !== null) setChatSoundEnabled(JSON.parse(chatSoundVal));

      const chatPushVal = await AsyncStorage.getItem('@setting_chat_push_notif');
      if (chatPushVal !== null) setChatPushEnabled(JSON.parse(chatPushVal));
    } catch {}
  };

  const toggleSound = async (val: boolean) => {
    setSoundEnabled(val);
    await AsyncStorage.setItem('@setting_notif_sound', JSON.stringify(val));
    if (!val) {
      soundService.stopAllSounds().catch(() => {});
    }
    await syncNotificationChannelSettings(val, vibrateEnabled);
  };

  const toggleVibrate = async (val: boolean) => {
    setVibrateEnabled(val);
    await AsyncStorage.setItem('@setting_notif_vibrate', JSON.stringify(val));
    if (val) {
      Vibration.vibrate([0, 300, 200, 300]);
    } else {
      Vibration.cancel();
    }
    await syncNotificationChannelSettings(soundEnabled, val);
  };

  const toggleSiren = async (val: boolean) => {
    setSirenEnabled(val);
    await AsyncStorage.setItem('@setting_siren', JSON.stringify(val));
  };

  const toggleOfflineCache = async (val: boolean) => {
    setOfflineCacheEnabled(val);
    await AsyncStorage.setItem('@setting_offline_cache', JSON.stringify(val));
  };

  const toggleChatSound = async (val: boolean) => {
    setChatSoundEnabled(val);
    await AsyncStorage.setItem('@setting_chat_sound', JSON.stringify(val));
    await syncNotificationChannelSettings(soundEnabled, vibrateEnabled, val, chatPushEnabled);
  };

  const toggleChatPush = async (val: boolean) => {
    setChatPushEnabled(val);
    await AsyncStorage.setItem('@setting_chat_push_notif', JSON.stringify(val));
    await syncNotificationChannelSettings(soundEnabled, vibrateEnabled, chatSoundEnabled, val);
  };

  const updateNotificationChannel = async (sound: boolean, vibrate: boolean) => {
    await syncNotificationChannelSettings(sound, vibrate);
  };

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

      {/* Header */}
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
        <TouchableOpacity
          style={{ padding: 4 }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: "rgba(100, 116, 139, 0.12)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(100, 116, 139, 0.25)",
          }}
        >
          <Ionicons name="settings" size={22} color="#64748b" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t('settings')}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            {language === 'tl' ? 'Wika, tema, at preferences' : 'Theme, language, & preferences'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Section 1: Appearance & Language */}
        <Text style={[styles.sectionHeader, { color: colors.primaryLight }]}>
          {language === 'tl' ? 'Hitsura at Wika' : 'Appearance & Language'}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Theme Selector */}
          <View style={styles.settingCol}>
            <View style={{ marginBottom: 8 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>{t('theme')}</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                {theme === 'dark' ? 'Naka-set sa Madilim na Tema (Dark Mode)' : 'Naka-set sa Maliwanag na Tema (Light Mode)'}
              </Text>
            </View>

            {/* Segmented Button: Dark vs Light */}
            <View style={[styles.segmentContainer, { backgroundColor: theme === 'light' ? '#f1f5f9' : '#090d16', borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  theme === 'dark' && [styles.segmentBtnActive, { backgroundColor: colors.primary }]
                ]}
                onPress={() => setTheme('dark')}
              >
                <Ionicons name="moon-outline" size={14} color={theme === 'dark' ? '#ffffff' : colors.textSecondary} />
                <Text style={[styles.segmentBtnText, { color: theme === 'dark' ? '#ffffff' : colors.textSecondary }]}>
                  {t('darkMode')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  theme === 'light' && [styles.segmentBtnActive, { backgroundColor: colors.primary }]
                ]}
                onPress={() => setTheme('light')}
              >
                <Ionicons name="sunny-outline" size={14} color={theme === 'light' ? '#ffffff' : colors.textSecondary} />
                <Text style={[styles.segmentBtnText, { color: theme === 'light' ? '#ffffff' : colors.textSecondary }]}>
                  {t('lightMode')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          {/* Language Selector */}
          <View style={styles.settingCol}>
            <View style={{ marginBottom: 8 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>{t('language')}</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                {language === 'tl' ? 'Kasalukuyang wika: Tagalog (Filipino)' : 'Current language: English'}
              </Text>
            </View>

            {/* Segmented Button: Tagalog vs English */}
            <View style={[styles.segmentContainer, { backgroundColor: theme === 'light' ? '#f1f5f9' : '#090d16', borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  language === 'tl' && [styles.segmentBtnActive, { backgroundColor: colors.primary }]
                ]}
                onPress={() => setLanguage('tl')}
              >
                <Text style={[styles.segmentBtnText, { color: language === 'tl' ? '#ffffff' : colors.textSecondary }]}>
                  🇵🇭 {t('tagalog')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  language === 'en' && [styles.segmentBtnActive, { backgroundColor: colors.primary }]
                ]}
                onPress={() => setLanguage('en')}
              >
                <Text style={[styles.segmentBtnText, { color: language === 'en' ? '#ffffff' : colors.textSecondary }]}>
                  🌐 {t('english')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Section 2: Notification & Sounds */}
        <Text style={[styles.sectionHeader, { color: colors.primaryLight, marginTop: 20 }]}>
          {language === 'tl' ? 'Mga Notification at Tunog' : 'Emergency Notifications & Sounds'}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>{t('alertSound')}</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                {language === 'tl' ? 'Magpatunog ng alert chime para sa disaster warnings & updates' : 'Play alert chime for disaster warnings & evacuation orders'}
              </Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={toggleSound}
              trackColor={{ false: '#334155', true: colors.primary }}
              thumbColor={soundEnabled ? '#ffffff' : '#94a3b8'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.settingRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>{t('vibration')}</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                {language === 'tl' ? 'Mag-vibrate ang telepono kapag may kritikal na abiso' : 'Vibrate device on critical alerts even when in pocket'}
              </Text>
            </View>
            <Switch
              value={vibrateEnabled}
              onValueChange={toggleVibrate}
              trackColor={{ false: '#334155', true: colors.primary }}
              thumbColor={vibrateEnabled ? '#ffffff' : '#94a3b8'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.settingRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>{t('siren')}</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                {language === 'tl' ? 'Pula at kumukutitap na alert banner sa Evacuation Orders' : 'Flash screen header with red hazard banner on Evacuation Orders'}
              </Text>
            </View>
            <Switch
              value={sirenEnabled}
              onValueChange={toggleSiren}
              trackColor={{ false: '#334155', true: colors.danger }}
              thumbColor={sirenEnabled ? '#ffffff' : '#94a3b8'}
            />
          </View>
        </View>

        {/* Section 3: Storage & Offline Mode */}
        <Text style={[styles.sectionHeader, { color: colors.primaryLight, marginTop: 20 }]}>
          {language === 'tl' ? 'Data at Offline Storage' : 'Data & Offline Storage'}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>{t('offlineCache')}</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                {language === 'tl' ? 'I-save ang mga evacuation centers at emergency numbers para magamit kahit walang signal' : 'Keep emergency guides & centers saved on phone storage for no-signal scenarios'}
              </Text>
            </View>
            <Switch
              value={offlineCacheEnabled}
              onValueChange={toggleOfflineCache}
              trackColor={{ false: '#334155', true: colors.success }}
              thumbColor={offlineCacheEnabled ? '#ffffff' : '#94a3b8'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 4,
            }}
            onPress={() => {
              Alert.alert(
                language === 'tl' ? 'I-clear ang Offline Cache?' : 'Clear Offline Storage?',
                language === 'tl'
                  ? 'Lahat ng naka-cache na data sa telepono ay buburahin at muling ida-download mula sa opisyal na MDRRMO cloud server.'
                  : 'All cached emergency data on this phone will be cleared and fresh data will be downloaded from the MDRRMO cloud server.',
                [
                  { text: language === 'tl' ? 'Kanselahin' : 'Cancel', style: 'cancel' },
                  {
                    text: language === 'tl' ? 'I-clear Ngayon' : 'Clear Now',
                    style: 'destructive',
                    onPress: async () => {
                      await OfflineStorage.clearAllCache();
                      Alert.alert(
                        '✅ Matagumpay na Na-clear',
                        language === 'tl'
                          ? 'Na-clear na ang lahat ng lumang cache. Maglo-load na ang sariwang datos.'
                          : 'All offline cache has been reset to fresh state.'
                      );
                    },
                  },
                ]
              );
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="trash-bin-outline" size={16} color="#ef4444" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#ef4444' }}>
                {language === 'tl' ? 'I-clear ang Lahat ng Cache' : 'Clear All Local Cache'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>


        {/* Section 5: System Info */}
        <Text style={[styles.sectionHeader, { color: colors.primaryLight, marginTop: 20 }]}>
          {language === 'tl' ? 'Munisipalidad at Command Center' : 'System & Authority'}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Lokal na Pamahalaan' : 'Jurisdiction'}
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>Municipality of Irosin, Sorsogon</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Operasyon' : 'Command Center'}
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>MDRRMO Irosin Operations Command</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Bersyon ng App' : 'App Engine'}
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>v2.6.0 (Theme & Multi-Language)</Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  backBtn: {
    padding: 8,
    borderRadius: 10
  },
  title: { fontSize: 19, fontWeight: '900' },
  sub: { fontSize: 13, marginTop: 2 },
  container: { flex: 1, padding: 14 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  card: {
    borderRadius: 12,
    borderWidth: 0,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  settingCol: {
    paddingVertical: 4
  },
  settingTitle: { fontSize: 15, fontWeight: '800' },
  settingDesc: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  divider: {
    height: 1,
    marginVertical: 12
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 6,
    marginTop: 4
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '800'
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6
  },
  testBtnText: { fontSize: 14, fontWeight: '800' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '700' }
});
