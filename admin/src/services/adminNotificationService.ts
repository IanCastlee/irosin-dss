import { Api } from './api';

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

class AdminNotificationService {
  private isInitialized = false;
  private isFirstRun = true;
  private notifiedReportIds = new Set<string>();
  private swRegistration: ServiceWorkerRegistration | null = null;
  // No more polling — WebSocket via ReportCreated event only

  public async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Load already notified IDs from storage
    try {
      const stored = localStorage.getItem('irosin_admin_notified_reports');
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
          arr.forEach(id => this.notifiedReportIds.add(id));
        }
      }
    } catch {}

    // 2. Register Service Worker & Background Web Push
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('[AdminPush] ServiceWorker registered:', this.swRegistration.scope);

        if ('Notification' in window && Notification.permission === 'granted') {
          await this.subscribeToWebPush();
        }
      } catch (err) {
        console.warn('[AdminPush] ServiceWorker registration warning:', err);
      }
    }

    // 3. Seed existing known reports ONCE on load — no recurring polling
    this.seedKnownReports();
  }

  /** Called once on boot to mark existing reports as "already seen" — prevents false alarms */
  private async seedKnownReports() {
    try {
      const token = localStorage.getItem('irosin_admin_token');
      if (!token) return;
      const res = await Api.getDisasterReports(undefined, 20);
      const reports = res?.disasterReports || [];
      reports.forEach(r => this.notifiedReportIds.add(r.id));
      this.saveNotifiedIds();
      this.isFirstRun = false;
    } catch {
      // Silently ignore seed failure
    }
  }

  /**
   * Called by the Admin Dashboard when a WebSocket NEW_REPORT event arrives.
   * No polling needed — real-time only.
   */
  public handleNewReport(report: any) {
    if (!report || !report.id) return;
    if (this.notifiedReportIds.has(report.id)) return;

    this.notifiedReportIds.add(report.id);
    this.saveNotifiedIds();

    const loc = report.streetLocation || report.locationDescription || `Brgy. ${report.barangayName || 'Irosin'}`;
    const typeName = report.reportType ? report.reportType.replace(/_/g, ' ') : 'PERWISYO';

    this.triggerSystemNotification({
      title: `🚨 BAGONG DISASTER REPORT: ${typeName}`,
      body: `📍 ${loc}\n📝 ${report.description || 'Walang karagdagang detalye'}`,
      tag: `report-${report.id}`,
      url: '/disaster-reports'
    });
  }

  public async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!('Notification' in window)) return 'unsupported';
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        await this.subscribeToWebPush();
      }
      return perm;
    } catch {
      return 'denied';
    }
  }

  public async subscribeToWebPush(): Promise<boolean> {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('[AdminPush] PushManager not supported in this browser.');
        return false;
      }

      if (!this.swRegistration) {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }

      const res = await Api.getVapidPublicKey();
      const publicKey = res?.publicKey;
      if (!publicKey) return false;

      let subscription = await this.swRegistration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(publicKey)
        });
      }

      await Api.subscribeWebPush(subscription.toJSON());
      console.log('[AdminPush] Admin browser successfully registered for Background Web Push!');
      return true;
    } catch (err) {
      console.error('[AdminPush] Failed to register background Web Push:', err);
      return false;
    }
  }

  public triggerSystemNotification(options: {
    title: string;
    body: string;
    tag?: string;
    url?: string;
  }) {
    // 1. Play alert chime
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {}

    // 2. Trigger OS Native Push Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        if (this.swRegistration && 'showNotification' in this.swRegistration) {
          this.swRegistration.showNotification(options.title, {
            body: options.body,
            tag: options.tag || 'mdrrmo-' + Date.now(),
            data: { url: options.url || '/disaster-reports' }
          }).catch(() => {});
        } else {
          const notif = new Notification(options.title, {
            body: options.body,
            tag: options.tag || 'mdrrmo-' + Date.now()
          });
          notif.onclick = () => {
            window.focus();
            if (options.url) window.location.href = options.url;
          };
        }
      } catch (err) {
        console.warn('[AdminPush] Failed showing local notification:', err);
      }
    }
  }

  private saveNotifiedIds() {
    try {
      const arr = Array.from(this.notifiedReportIds).slice(-100);
      localStorage.setItem('irosin_admin_notified_reports', JSON.stringify(arr));
    } catch {}
  }

  public destroy() {
    // No intervals to clear — nothing to destroy
  }
}

export const adminNotificationService = new AdminNotificationService();
