import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { mockStore } from '../utils/mockStore';
import { DisasterAlertSchema } from '../validators';
import { logAudit } from '../utils/logger';
import { SMSService } from '../services/smsService';
import { NotificationService } from '../services/notificationService';
import { ExpoPushService } from '../services/pushNotificationService';
import { db } from '../config/firebase';


export class AlertController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const barangayId = req.query.barangayId as string;
    let alerts = mockStore.alerts;
    
    if (db) {
      try {
        const snapshot = await db.collection('alerts').get();
        const firestoreAlerts: any[] = [];
        snapshot.forEach(doc => firestoreAlerts.push(doc.data()));
        alerts = firestoreAlerts;
        mockStore.alerts = alerts;
      } catch (e) {
        console.warn('Firestore fetch fallback:', e);
      }
    }

    if (barangayId) {
      alerts = alerts.filter(a => a.affectedBarangayIds.length === 0 || a.affectedBarangayIds.includes(barangayId));
    }

    return res.json({ alerts });
  }

  public static async getActive(req: AuthenticatedRequest, res: Response) {
    let alerts = mockStore.alerts;
    if (db) {
      try {
        const snapshot = await db.collection('alerts').get();
        const firestoreAlerts: any[] = [];
        snapshot.forEach(doc => firestoreAlerts.push(doc.data()));
        alerts = firestoreAlerts;
        mockStore.alerts = alerts;
      } catch (e) {
        console.warn('Firestore fetch fallback:', e);
      }
    }
    const active = alerts.filter(a => a.status === 'ACTIVE');
    return res.json({ alerts: active });
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const alert = mockStore.alerts.find(a => a.id === req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    return res.json({ alert });
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = DisasterAlertSchema.parse(req.body);
      
      const barangayNames = validated.affectedBarangayIds.map(id => {
        const b = mockStore.barangays.find(brgy => brgy.id === id);
        return b ? b.name : id;
      });

      const sendSMS = req.body.sendSMS === true;

      const defaultExpires = new Date(Date.now() + 86400000).toISOString();
      const newAlert = {
        id: 'alert-' + Date.now(),
        ...validated,
        expiresAt: validated.expiresAt || defaultExpires,
        affectedBarangayNames: barangayNames,
        startTime: new Date().toISOString(),
        status: 'ACTIVE' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: req.user?.id
      };

      mockStore.alerts.unshift(newAlert);

      if (db) {
        await db.collection('alerts').doc(newAlert.id).set(newAlert);
      }

      logAudit('CREATE_ALERT', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'alerts', newAlert.id, `Created ${newAlert.alertLevel}: ${newAlert.title}`);

      // ─── REAL PUSH NOTIFICATIONS via Expo Push Service → FCM → User Phone ───
      // Always send push notifications for every alert, regardless of sendPush flag
      const dispatchSummary = { pushCount: 0, smsCount: 0 };
      try {
        let tokens: string[] = [];

        // Fetch all registered device push tokens from Firestore
        if (db) {
          const tokenSnapshot = await db.collection('push_tokens').get();
          tokenSnapshot.forEach(doc => {
            const token = doc.data().token;
            if (token) tokens.push(token);
          });
        }

        if (tokens.length > 0) {
          const pushTitle = `🚨 [${newAlert.alertLevel}] ${newAlert.title}`;
          const pushBody = `${newAlert.message}\n\n⚠️ Action: ${newAlert.recommendedAction}`;
          await ExpoPushService.sendToTokens(tokens, pushTitle, pushBody, {
            alertId: newAlert.id,
            disasterType: newAlert.disasterType,
            alertLevel: newAlert.alertLevel
          });
          dispatchSummary.pushCount = tokens.length;
          console.log(`[Alert] Real push notifications sent to ${tokens.length} devices.`);
        } else {
          console.warn('[Alert] No push tokens found. Skipping push notification.');
        }
      } catch (pushErr) {
        console.error('[Alert] Push notification error (non-fatal):', pushErr);
      }

      if (sendSMS) {
        let targetUsers = mockStore.users.filter(u => u.phone);
        if (validated.affectedBarangayIds.length > 0) {
          targetUsers = targetUsers.filter(u => validated.affectedBarangayIds.includes(u.barangayId));
        }
        const smsText = `MDRRMO IROSIN [${newAlert.alertLevel}]: ${newAlert.title}. ${newAlert.recommendedAction}`;
        const targetPhones = targetUsers.map(u => u.phone);
        await SMSService.broadcastSMS(targetPhones, smsText, newAlert.id);
        dispatchSummary.smsCount = targetPhones.length;
      }

      return res.status(201).json({
        message: 'Emergency alert created and broadcasted successfully',
        alert: newAlert,
        dispatchSummary
      });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
      return res.status(500).json({ error: err.message });
    }
  }


  public static async cancelAlert(req: AuthenticatedRequest, res: Response) {
    const alert = mockStore.alerts.find(a => a.id === req.params.id);
    if (alert) {
      alert.status = 'CANCELLED';
      alert.updatedAt = new Date().toISOString();
    }

    if (db) {
      await db.collection('alerts').doc(req.params.id).update({
        status: 'CANCELLED',
        updatedAt: new Date().toISOString()
      });
    }

    logAudit('CANCEL_ALERT', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'alerts', req.params.id, `Cancelled alert`);

    return res.json({ message: 'Alert cancelled successfully', alert });
  }

  public static async getNotificationLogs(req: AuthenticatedRequest, res: Response) {
    return res.json({ notificationLogs: mockStore.notificationLogs });
  }
}
