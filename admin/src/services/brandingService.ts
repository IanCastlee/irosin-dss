export interface AdminBranding {
  orgName: string;
  orgSubtitle: string;
  municipality: string;
  province: string;
  logoUrl: string | null;
  systemTag: string;
}

const STORAGE_KEY = 'irosin_admin_branding';

export const DEFAULT_BRANDING: AdminBranding = {
  orgName: 'MDRRMO Irosin',
  orgSubtitle: 'Disaster Command',
  municipality: 'Municipality of Irosin',
  province: 'Sorsogon',
  logoUrl: null,
  systemTag: 'MDRRMO SYSTEM V2.0',
};

class BrandingService {
  private branding: AdminBranding;
  private listeners: Set<(branding: AdminBranding) => void> = new Set();

  constructor() {
    this.branding = this.loadInitialBranding();
  }

  private loadInitialBranding(): AdminBranding {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_BRANDING, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to parse branding from localStorage:', e);
    }
    return DEFAULT_BRANDING;
  }

  public getBranding(): AdminBranding {
    return { ...this.branding };
  }

  public saveBranding(updates: Partial<AdminBranding>) {
    this.branding = { ...this.branding, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.branding));
    } catch (e) {
      console.warn('Failed to save branding to localStorage:', e);
    }
    this.notify();
  }

  public resetToDefault() {
    this.branding = { ...DEFAULT_BRANDING };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to remove branding from localStorage:', e);
    }
    this.notify();
  }

  public subscribe(callback: (branding: AdminBranding) => void): () => void {
    this.listeners.add(callback);
    callback(this.getBranding());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    const current = this.getBranding();
    this.listeners.forEach((cb) => cb(current));
  }
}

export const brandingService = new BrandingService();
