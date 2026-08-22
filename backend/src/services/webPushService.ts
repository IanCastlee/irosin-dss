import webpush from 'web-push';
import { db } from '../config/firebase';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZ_F9HK50m5_Qz3iK948k8t4XFhU0z6-Dq976k4';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '5yE_p7rL6m1q-0u0-V420aCqQ-8rZ_yT4k3s0a-9dEw';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:mdrrmo.irosin.sorsogon@gmail.com';

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export class WebPushService {
  public static getPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  /**
   * Save an Admin browser subscription in Firestore
   */
  public static async saveSubscription(subscription: any, user: any): Promise<boolean> {
    if (!subscription || !subscription.endpoint) return false;
    try {
      const docId = Buffer.from(subscription.endpoint).toString('base64url').slice(-80);
      await db.collection('admin_push_subscriptions').doc(docId).set({
        subscription,
        userId: user?.id || 'admin',
        userName: user?.fullName || 'MDRRMO Admin',
        userRole: user?.role || 'MDRRMO_ADMIN',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('[WebPush] Failed to save subscription:', err);
      return false;
    }
  }

  /**
   * Remove a subscription if user opts out or expired
   */
  public static async removeSubscription(endpoint: string): Promise<void> {
    if (!endpoint) return;
    try {
      const docId = Buffer.from(endpoint).toString('base64url').slice(-80);
      await db.collection('admin_push_subscriptions').doc(docId).delete();
    } catch {}
  }

  /**
   * Broadcast a Web Push notification to all Admin browser subscriptions
   * (Wakes up closed Chrome/Edge windows on PC/Android)
   */
  public static async notifyAdminsOfNewReport(report: any): Promise<void> {
    try {
      const snap = await db.collection('admin_push_subscriptions').get();
      if (snap.empty) {
        console.log('[WebPush] No admin browser subscriptions registered yet.');
        return;
      }

      const typeName = report.reportType ? report.reportType.replace(/_/g, ' ') : 'PERWISYO';
      const loc = report.streetLocation || report.locationDescription || `Brgy. ${report.barangayName || 'Irosin'}`;

      const payload = JSON.stringify({
        title: `🚨 BAGONG DISASTER REPORT: ${typeName}`,
        body: `📍 ${loc}\n📝 ${report.description || 'May bagong ulat ng sakuna mula sa residente.'}`,
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: `report-${report.id}`,
        data: { url: '/disaster-reports', reportId: report.id }
      });

      const promises = snap.docs.map(async (docSnap) => {
        const data = docSnap.data();
        if (!data.subscription) return;

        try {
          await webpush.sendNotification(data.subscription, payload, {
            TTL: 86400, // 24 hours
            urgency: 'high'
          });
          console.log(`[WebPush] Delivered to admin: ${data.userName || docSnap.id}`);
        } catch (err: any) {
          // If status code 410 or 404, subscription has expired
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`[WebPush] Subscription expired (${err.statusCode}), deleting: ${docSnap.id}`);
            await docSnap.ref.delete();
          } else {
            console.error(`[WebPush] Failed sending to ${docSnap.id}:`, err?.message || err);
          }
        }
      });

      await Promise.allSettled(promises);
    } catch (err) {
      console.error('[WebPush] Broadcast error:', err);
    }
  }
}
