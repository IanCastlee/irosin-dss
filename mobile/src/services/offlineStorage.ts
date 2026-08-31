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
            // Sanitize raw large base64 data URIs from photos to keep storage fast and tiny
            if (Array.isArray(copy.photos)) {
              copy.photos = copy.photos
                .filter((p: any) => typeof p === 'string' && p.trim())
                .map((p: string) => (p.length > 500 && p.startsWith('data:') ? '' : p))
                .filter(Boolean)
                .slice(0, 2);
            }
            if (typeof copy.imageUrl === 'string' && copy.imageUrl.length > 500 && copy.imageUrl.startsWith('data:')) {
              copy.imageUrl = '';
            }
            if (typeof copy.photoUrl === 'string' && copy.photoUrl.length > 500 && copy.photoUrl.startsWith('data:')) {
              copy.photoUrl = '';
            }
            if (Array.isArray(copy.photoItems)) {
              copy.photoItems = copy.photoItems.slice(0, 2).map((pi: any) => {
                if (pi && pi.uri && pi.uri.length > 500 && pi.uri.startsWith('data:')) {
                  return { ...pi, uri: '' };
                }
                return pi;
              });
            }
            return copy;
          }
          return item;
        });
      }
      const str = JSON.stringify(sanitizedData);
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
