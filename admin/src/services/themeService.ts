export type AdminTheme = 'dark' | 'light';

const THEME_KEY = 'irosin_admin_theme';

class ThemeService {
  private theme: AdminTheme;
  private listeners: Set<(theme: AdminTheme) => void> = new Set();

  constructor() {
    const saved = localStorage.getItem(THEME_KEY) as AdminTheme;
    this.theme = saved === 'light' ? 'light' : 'dark';
    this.applyTheme(this.theme);
  }

  public getTheme(): AdminTheme {
    return this.theme;
  }

  public setTheme(newTheme: AdminTheme) {
    this.theme = newTheme;
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
    this.applyTheme(newTheme);
    this.notify();
  }

  public toggleTheme() {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  private applyTheme(theme: AdminTheme) {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }

  public subscribe(callback: (theme: AdminTheme) => void): () => void {
    this.listeners.add(callback);
    callback(this.getTheme());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    const current = this.getTheme();
    this.listeners.forEach((cb) => cb(current));
  }
}

export const themeService = new ThemeService();
