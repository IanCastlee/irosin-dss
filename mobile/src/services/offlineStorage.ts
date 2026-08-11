import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  BARANGAYS: '@irosin_cache_barangays',
  CENTERS: '@irosin_cache_centers',
  HAZARDS: '@irosin_cache_hazards',
  ROUTES: '@irosin_cache_routes',
  CONTACTS: '@irosin_cache_contacts',
  GUIDES: '@irosin_cache_guides',
  ALERTS: '@irosin_cache_alerts',
  LAST_UPDATE: '@irosin_cache_timestamp'
};

export const OfflineStorage = {
  async saveCache(key: keyof typeof KEYS, data: any) {
    try {
      await AsyncStorage.setItem(KEYS[key], JSON.stringify(data));
      await AsyncStorage.setItem(KEYS.LAST_UPDATE, new Date().toISOString());
    } catch (err) {
      console.warn('[OfflineStorage] Error saving cache:', err);
    }
  },

  async getCache<T>(key: keyof typeof KEYS): Promise<T | null> {
    try {
      const stored = await AsyncStorage.getItem(KEYS[key]);
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.warn('[OfflineStorage] Error reading cache:', err);
      return null;
    }
  },

  async getLastCacheTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.LAST_UPDATE);
    } catch {
      return null;
    }
  }
};
