import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { mockStore } from '../utils/mockStore';
import { DisasterAlertSchema } from '../validators';
import { logAudit } from '../utils/logger';
import { SMSService } from '../services/smsService';
import { ExpoPushService } from '../services/pushNotificationService';
import { db } from '../config/firebase';

export class AlertController {
  /**
   * Helper to retrieve all registered device tokens from Firestore and MockStore
   */
  private static async getRegisteredTokens(): Promise<string[]> {
    const tokensSet = new Set<string>();

    // 1. Fetch from Firestore if Firebase active
    if (db) {
      try {
        const snapshot = await db.collection('push_tokens').get();
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data?.token && typeof data.token === 'string') {
            tokensSet.add(data.token);
          }
        });
      } catch (err) {
        console.warn('[AlertController] Firestore fetch push_tokens warning:', err);
      }
    }

    // 2. Fetch from MockStore
    if (Array.isArray(mockStore.pushTokens)) {
      mockStore.pushTokens.forEach(t => {
        if (t?.token && typeof t.token === 'string') {
          tokensSet.add(t.token);
        }
      });
    }

    return Array.from(tokensSet);
  }

  /**
   * GET /api/v1/alerts
   */
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const barangayId = req.query.barangayId as string;
    let alerts = mockStore.alerts;

    if (db) {
      try {
        const snapshot = await db.collection('alerts').orderBy('createdAt', 'desc').get();
        if (!snapshot.empty) {
          alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        }
      } catch {
        // Fallback to mockStore
      }
    }

    if (barangayId) {
      alerts = alerts.filter(a =>
        a.affectedBarangayIds.length === 0 || a.affectedBarangayIds.includes(barangayId)
      );
    }

    return res.json({ alerts });
  }

  /**
   * GET /api/v1/alerts/active
   */
  public static async getActive(req: AuthenticatedRequest, res: Response) {
    const now = new Date().toISOString();
    let alerts = mockStore.alerts.filter(a => a.status === 'ACTIVE' && a.expiresAt > now);

    if (db) {
      try {
        const snapshot = await db.collection('alerts')
          .where('status', '==', 'ACTIVE')
          .where('expiresAt', '>', now)
          .get();
        if (!snapshot.empty) {
          alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        }
      } catch {
        // Fallback to mockStore
      }
    }

    return res.json({ alerts });
  }

  /**
   * GET /api/v1/alerts/:id
   */
  public static async getById(req: AuthenticatedRequest, res: Response) {
    const alert = mockStore.alerts.find(a => a.id === req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    return res.json({ alert });
  }

  /**
   * POST /api/v1/alerts
   */
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
        try {
          await db.collection('alerts').doc(newAlert.id).set(newAlert);
        } catch (e) {
          console.warn('[AlertController] Firestore alert save warning:', e);
        }
      }

      logAudit('CREATE_ALERT', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'alerts', newAlert.id, `Created ${newAlert.alertLevel}: ${newAlert.title}`);

      // Dispatch Real Push Notifications
      const tokens = await AlertController.getRegisteredTokens();
      const pushTitle = `🚨 [${newAlert.alertLevel}] ${newAlert.title}`;
      const pushBody = `${newAlert.message}\n\n⚠️ Action: ${newAlert.recommendedAction}`;

      const pushDiagnostics = await ExpoPushService.sendToTokens(tokens, pushTitle, pushBody, {
        alertId: newAlert.id,
        disasterType: newAlert.disasterType,
        alertLevel: newAlert.alertLevel
      });

      // Dispatch SMS if requested
      let smsCount = 0;
      if (sendSMS) {
        let targetUsers = mockStore.users.filter(u => u.phone);
        if (validated.affectedBarangayIds.length > 0) {
          targetUsers = targetUsers.filter(u => validated.affectedBarangayIds.includes(u.barangayId));
        }
        const smsText = `MDRRMO IROSIN [${newAlert.alertLevel}]: ${newAlert.title}. ${newAlert.recommendedAction}`;
        const targetPhones = targetUsers.map(u => u.phone);
        await SMSService.broadcastSMS(targetPhones, smsText, newAlert.id);
        smsCount = targetPhones.length;
      }

      return res.status(201).json({
        message: 'Emergency alert created and broadcasted successfully',
        alert: newAlert,
        dispatchSummary: {
          pushCount: pushDiagnostics.validTokensCount,
          smsCount
        },
        pushDiagnostics
      });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: err.errors });
      }
      return res.status(500).json({ error: err.message || 'Server error creating alert' });
    }
  }

  /**
   * POST /api/v1/alerts/push-token
   */
  public static async registerPushToken(req: AuthenticatedRequest, res: Response) {
    try {
      const { token, platform } = req.body;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Valid token string is required' });
      }

      const docData = {
        token: token.trim(),
        platform: platform || 'android',
        registeredAt: new Date().toISOString()
      };

      // Save to mockStore
      if (!mockStore.pushTokens.some(t => t.token === docData.token)) {
        mockStore.pushTokens.push(docData);
      }

      // Save to Firestore if available
      if (db) {
        try {
          const docId = docData.token.replace(/[^a-zA-Z0-9_-]/g, '_');
          await db.collection('push_tokens').doc(docId).set(docData, { merge: true });
        } catch (e) {
          console.warn('[PushToken] Firestore save warning:', e);
        }
      }

      console.log(`[PushToken] Registered token successfully: ${docData.token}`);

      return res.json({
        message: 'Push token registered successfully',
        token: docData.token,
        totalTokensStored: mockStore.pushTokens.length
      });
    } catch (err: any) {
      console.error('[PushToken] Registration error:', err);
      return res.status(500).json({ error: err.message || 'Server error registering push token' });
    }
  }

  /**
   * GET /api/v1/alerts/test-push
   */
  public static async testPush(req: AuthenticatedRequest, res: Response) {
    try {
      const tokens = await AlertController.getRegisteredTokens();

      const pushDiagnostics = await ExpoPushService.sendToTokens(
        tokens,
        '🚨 TEST PUSH NOTIFICATION',
        `Test push sent at ${new Date().toLocaleTimeString()} from MDRRMO Admin. If you see this, push notifications are working!`,
        { type: 'TEST_PUSH', timestamp: Date.now() }
      );

      return res.json({
        message: 'Test push execution finished successfully',
        tokensFoundCount: tokens.length,
        tokensInDatabase: tokens,
        diagnostics: pushDiagnostics
      });
    } catch (err: any) {
      console.error('[TestPush] Error:', err);
      return res.status(500).json({ error: err.message || 'Server error executing test push' });
    }
  }

  /**
   * PUT /api/v1/alerts/:id/cancel
   */
  public static async cancelAlert(req: AuthenticatedRequest, res: Response) {
    const alert = mockStore.alerts.find(a => a.id === req.params.id);
    if (alert) {
      alert.status = 'CANCELLED';
      alert.updatedAt = new Date().toISOString();
    }

    if (db) {
      try {
        await db.collection('alerts').doc(req.params.id).update({
          status: 'CANCELLED',
          updatedAt: new Date().toISOString()
        });
      } catch {}
    }

    logAudit('CANCEL_ALERT', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'alerts', req.params.id, `Cancelled alert`);
    return res.json({ message: 'Alert cancelled successfully', alert });
  }

  /**
   * DELETE /api/v1/alerts/:id
   */
  public static async deleteAlert(req: AuthenticatedRequest, res: Response) {
    const id = req.params.id;

    const index = mockStore.alerts.findIndex(a => a.id === id);
    if (index !== -1) {
      mockStore.alerts.splice(index, 1);
    }

    if (db) {
      try {
        await db.collection('alerts').doc(id).delete();
      } catch {}
    }

    logAudit('DELETE_ALERT', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'alerts', id, `Permanently deleted alert`);
    return res.json({ message: 'Alert deleted permanently' });
  }

  /**
   * GET /api/v1/alerts/logs
   */
  public static async getNotificationLogs(req: AuthenticatedRequest, res: Response) {
    return res.json({ notificationLogs: mockStore.notificationLogs });
  }
}
