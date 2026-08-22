import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { usePreferences } from '../context/PreferencesContext';

interface OfflineBannerProps {
  isOffline?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline = false }) => {
  const { theme, language } = usePreferences();
  const [isNetConnected, setIsNetConnected] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // If internet reachable or connected is true, auto-dismiss
      setIsNetConnected(state.isConnected && state.isInternetReachable !== false);
    });
    return () => unsubscribe();
  }, []);

  // Show only if NetInfo detects offline OR isOffline prop is true and not clearly reconnected
  const shouldShow = isNetConnected === false || (isOffline && isNetConnected !== true);

  if (!shouldShow) return null;

  const isDark = theme === 'dark';

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: isDark ? '#1e293b' : '#f8fafc',
          borderBottomColor: isDark ? '#334155' : '#e2e8f0',
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: isDark ? '#94a3b8' : '#64748b' },
        ]}
      >
        {language === 'tl' ? 'Offline Mode • Nakatagong datos ang ipinapakita' : 'Offline Mode • Showing cached data'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
