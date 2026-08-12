import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';

export const MoreScreen = ({ navigation }: any) => {
  const [pushToken, setPushToken] = useState<string>('Fetching token...');
  const [permissionStatus, setPermissionStatus] = useState<string>('Checking...');

  useEffect(() => {
    fetchDeviceToken();
  }, []);

  const fetchDeviceToken = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        setPermissionStatus(req.status);
        if (req.status !== 'granted') {
          setPushToken('Permission DENIED on device');
          return;
        }
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId ??
        'a055f98d-7d56-47b6-87cc-ed5af96f5e9f';

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      setPushToken(tokenData.data || 'No token returned');
    } catch (err: any) {
      setPushToken(`Error: ${err.message}`);
    }
  };

  const copyTokenToClipboard = async () => {
    if (pushToken && pushToken.startsWith('ExponentPushToken')) {
      await Clipboard.setStringAsync(pushToken);
      Alert.alert('Token Copied! 📋', 'You can now paste this token into the Admin Dashboard "Add Push Token Manually" field.');
    } else {
      Alert.alert('Notice', 'Device token is not ready or failed to fetch.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>System Profile & Settings</Text>
        <Text style={styles.sub}>Irosin Disaster Safety App v1.0</Text>
      </View>

      <ScrollView style={styles.container}>
        {/* Device Push Token Diagnostic Card */}
        <View style={[styles.card, { borderColor: '#0284c7' }]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="notifications-circle-outline" size={20} color="#38bdf8" />
            <Text style={[styles.cardHeader, { color: '#38bdf8' }]}>Device Push Token Diagnostics</Text>
          </View>

          <Text style={styles.valSub}>Permission Status: <Text style={{ color: permissionStatus === 'granted' ? '#10b981' : '#f43f5e', fontWeight: 'bold' }}>{permissionStatus.toUpperCase()}</Text></Text>

          <View style={styles.tokenBox}>
            <Text style={styles.tokenText} numberOfLines={2} selectTextOnPress>
              {pushToken}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TouchableOpacity style={styles.miniBtn} onPress={copyTokenToClipboard}>
              <Ionicons name="copy-outline" size={14} color="#ffffff" />
              <Text style={styles.miniBtnText}>Copy Token</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.miniBtn, { backgroundColor: '#334155' }]} onPress={fetchDeviceToken}>
              <Ionicons name="refresh-outline" size={14} color="#ffffff" />
              <Text style={styles.miniBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Selected Barangay Profile Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="location-outline" size={18} color="#38bdf8" />
            <Text style={styles.cardHeader}>Selected Barangay Profile</Text>
          </View>
          <Text style={styles.valTitle}>Barangay Monbon</Text>
          <Text style={styles.valSub}>Municipality of Irosin, Province of Sorsogon</Text>
          <Text style={styles.valDetail}>Assigned Evacuation Center: Irosin Central Gym / Monbon Hub</Text>
        </View>

        {/* Offline Cache Status */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="cloud-offline-outline" size={18} color="#10b981" />
            <Text style={styles.cardHeader}>Offline Data Support</Text>
          </View>
          <Text style={styles.valDetail}>✓ Emergency Contacts Cached locally</Text>
          <Text style={styles.valDetail}>✓ Preparedness Guides Cached locally</Text>
          <Text style={styles.valDetail}>✓ Evacuation Center Directory Cached locally</Text>
          <Text style={styles.valDetail}>✓ Official Safe Routes Cached locally</Text>
        </View>

        {/* System Info & Credits */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#38bdf8" />
            <Text style={styles.cardHeader}>LGU System Credentials</Text>
          </View>
          <Text style={styles.valSub}>Issued by: MDRRMO Irosin Disaster Response Operations</Text>
          <Text style={styles.valSub}>Covered Barangays: Monbon, San Agustin, Gabao, San Julian, Buenavista</Text>
        </View>

        {/* Action Button: Submit Report */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('ReportDisaster')}
        >
          <Ionicons name="megaphone-outline" size={20} color="#ffffff" />
          <Text style={styles.actionBtnText}>Submit Ground Hazard Report</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  header: { padding: 16, backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '900' },
  sub: { color: '#38bdf8', fontSize: 12, marginTop: 2 },

  container: { flex: 1, padding: 16 },
  card: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  cardHeader: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
  valTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  valSub: { color: '#38bdf8', fontSize: 12, marginBottom: 4 },
  valDetail: { color: '#cbd5e1', fontSize: 12, marginTop: 4 },

  tokenBox: { backgroundColor: '#020617', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b', marginTop: 6 },
  tokenText: { color: '#f8fafc', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  miniBtn: { backgroundColor: '#0284c7', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  actionBtn: { backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  actionBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' }
});
