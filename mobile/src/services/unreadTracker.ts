import AsyncStorage from '@react-native-async-storage/async-storage';
import { Api } from './api';

type Category = 'power' | 'alert' | 'road';

type Listener = () => void;

class UnreadTrackerService {
  private listeners: Set<Listener> = new Set();

  public subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.warn('[UnreadTracker] Listener error:', err);
      }
    });
  }

  private getKey(category: Category): string {
    return `@viewed_items_${category}`;
  }

  public async getViewedIds(category: Category): Promise<Set<string>> {
    try {
      const raw = await AsyncStorage.getItem(this.getKey(category));
      if (!raw) return new Set();
      const parsed: string[] = JSON.parse(raw);
      return new Set(parsed);
    } catch {
      return new Set();
    }
  }

  public async isViewed(category: Category, id: string): Promise<boolean> {
    const set = await this.getViewedIds(category);
    return set.has(id);
  }

  public async markViewed(category: Category, id: string): Promise<void> {
    try {
      const set = await this.getViewedIds(category);
      if (!set.has(id)) {
        set.add(id);
        await AsyncStorage.setItem(this.getKey(category), JSON.stringify(Array.from(set)));
        this.notify();
      }
    } catch (err) {
      console.warn(`[UnreadTracker] Error marking viewed for ${category}/${id}:`, err);
    }
  }

  public async markAllViewed(category: Category, ids: string[]): Promise<void> {
    try {
      const set = await this.getViewedIds(category);
      let changed = false;
      ids.forEach(id => {
        if (!set.has(id)) {
          set.add(id);
          changed = true;
        }
      });
      if (changed) {
        await AsyncStorage.setItem(this.getKey(category), JSON.stringify(Array.from(set)));
        this.notify();
      }
    } catch (err) {
      console.warn(`[UnreadTracker] Error marking all viewed:`, err);
    }
  }

  /**
   * Calculates unread counts across Power, Alerts, and Road hazards
   */
  public async getUnreadCounts(): Promise<{ power: number; alerts: number; road: number; total: number }> {
    try {
      const [viewedPower, viewedAlerts, viewedRoad] = await Promise.all([
        this.getViewedIds('power'),
        this.getViewedIds('alert'),
        this.getViewedIds('road')
      ]);

      const [announcementRes, alertsRes, roadRes] = await Promise.all([
        Api.getAnnouncements().catch(() => ({ data: [] })),
        Api.getAlerts().catch(() => ({ data: [] })),
        Api.getVerifiedDisasterReports().catch(() => ({ data: [] }))
      ]);

      const unreadPower = (announcementRes.data || []).filter((p: any) => p.id && !viewedPower.has(p.id)).length;
      const unreadAlerts = (alertsRes.data || []).filter((a: any) => a.id && !viewedAlerts.has(a.id)).length;
      const unreadRoad = (roadRes.data || []).filter((r: any) => r.id && !viewedRoad.has(r.id)).length;

      return {
        power: unreadPower,
        alerts: unreadAlerts,
        road: unreadRoad,
        total: unreadPower + unreadAlerts + unreadRoad
      };
    } catch (err) {
      return { power: 0, alerts: 0, road: 0, total: 0 };
    }
  }
}

export const UnreadTracker = new UnreadTrackerService();
