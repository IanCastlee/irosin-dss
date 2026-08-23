import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_CACHE_VERSION = 'v1.0.5_prod_clean_release';
const CACHE_VERSION_KEY = '@irosin_app_cache_version';

const KEYS = {
  BARANGAYS: '@irosin_cache_barangays',
  CENTERS: '@irosin_cache_centers',
  ROUTES: '@irosin_cache_routes',
  CONTACTS: '@irosin_cache_contacts',
  GUIDES: '@irosin_cache_guides',
  ALERTS: '@irosin_cache_alerts',
  VERIFIED_REPORTS: '@irosin_cache_verified_reports',
  ALL_REPORTS: '@irosin_cache_all_reports',
  POWER_INTERRUPTIONS: '@irosin_cache_power_interruptions',
  ANNOUNCEMENTS: '@irosin_cache_announcements',
  ROAD_HAZARDS: '@irosin_cache_road_hazards',
  IROSIN_WEATHER: '@irosin_cache_weather',
  APP_CONFIG: '@irosin_cache_app_config',
  LAST_UPDATE: '@irosin_cache_timestamp'
};

export const OfflineStorage = {
  /**
   * Mandatory check on app launch: if this is a fresh install, reinstall,
   * or new app version, automatically wipe all stale caches clean.
   */
  async ensureCleanCacheOnInstallOrUpgrade(): Promise<boolean> {
    try {
      const currentStoredVer = await AsyncStorage.getItem(CACHE_VERSION_KEY);
      if (currentStoredVer !== APP_CACHE_VERSION) {
        console.log(`[OfflineStorage] 🧹 Fresh install or update detected (was: ${currentStoredVer}, now: ${APP_CACHE_VERSION}). Wiping all stale cache...`);
        const allKeys = Object.values(KEYS);
        await AsyncStorage.multiRemove(allKeys);
        await AsyncStorage.setItem(CACHE_VERSION_KEY, APP_CACHE_VERSION);
        await AsyncStorage.setItem(KEYS.LAST_UPDATE, new Date().toISOString());
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[OfflineStorage] Error ensuring clean cache:', err);
      return false;
    }
  },

  async saveCache(key: keyof typeof KEYS, data: any) {
    try {
      let sanitizedData = data;
      // If saving report arrays, keep cache lightweight to prevent SQLite CursorWindow 2MB overflow
      if (Array.isArray(data)) {
        sanitizedData = data.map((item: any) => {
          if (item && typeof item === 'object') {
            const copy = { ...item };
            if (Array.isArray(copy.photos) && copy.photos.length > 1) {
              copy.photos = copy.photos.slice(0, 1);
            }
            if (Array.isArray(copy.photoItems) && copy.photoItems.length > 1) {
              copy.photoItems = copy.photoItems.slice(0, 1);
            }
            return copy;
          }
          return item;
        });
      }
      const str = JSON.stringify(sanitizedData);
      // Guard: do not save if serialized cache exceeds 1MB
      if (str.length > 1024 * 1024) {
        console.warn(`[OfflineStorage] Skipping oversized cache write for ${key} (${str.length} bytes)`);
        return;
      }
      await AsyncStorage.setItem(KEYS[key], str);
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
      console.warn('[OfflineStorage] Error reading cache (auto-purging bloated key):', err);
      try {
        await AsyncStorage.removeItem(KEYS[key]);
      } catch {}
      return null;
    }
  },

  async removeCache(key: keyof typeof KEYS): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS[key]);
    } catch (err) {
      console.warn(`[OfflineStorage] Error removing cache for ${key}:`, err);
    }
  },

  async clearAllCache(): Promise<void> {
    try {
      const allKeys = Object.values(KEYS);
      await AsyncStorage.multiRemove(allKeys);
      await AsyncStorage.setItem(CACHE_VERSION_KEY, APP_CACHE_VERSION);
    } catch (err) {
      console.warn('[OfflineStorage] Error clearing all cache:', err);
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
