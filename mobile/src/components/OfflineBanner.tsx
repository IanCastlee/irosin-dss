import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const OfflineBanner: React.FC<{ isOffline: boolean }> = ({ isOffline }) => {
  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        ⚠️ Offline — showing previously cached information.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#b45309',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fef3c7',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
