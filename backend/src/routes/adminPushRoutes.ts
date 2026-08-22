import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { WebPushService } from '../services/webPushService';

const router = Router();

// Get VAPID Public Key for client subscription
router.get('/vapid-public-key', (_req, res: Response) => {
  res.json({ publicKey: WebPushService.getPublicKey() });
});

// Save Admin browser subscription
router.post('/subscribe', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subscription } = req.body;
    if (!subscription) {
      return res.status(400).json({ error: 'Subscription object is required' });
    }

    const saved = await WebPushService.saveSubscription(subscription, req.user);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save subscription' });
    }

    return res.json({ success: true, message: 'Admin browser subscribed to real-time Web Push' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Register Mobile Phone as Authorized MDRRMO Responder
router.post('/register-mobile-device', async (req, res: Response) => {
  try {
    const { token, deviceName, isResponder } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Device push token is required' });
    }

    const { db } = await import('../config/firebase');
    if (db) {
      const docId = encodeURIComponent(token.replace(/[^a-zA-Z0-9_-]/g, '_'));
      if (isResponder) {
        await db.collection('admin_push_tokens').doc(docId).set({
          token,
          deviceName: deviceName || 'MDRRMO Responder Phone',
          role: 'MDRRMO_ADMIN',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else {
        await db.collection('admin_push_tokens').doc(docId).delete().catch(() => {});
      }
    }

    return res.json({
      success: true,
      message: isResponder ? 'Phone successfully tagged as MDRRMO Duty Responder' : 'Responder mode deactivated'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 1. Submit Responder Access Request from Mobile App
router.post('/request-responder-access', async (req, res: Response) => {
  try {
    const { token, fullName, roleTitle, phone, barangayName } = req.body;
    if (!token || !fullName) {
      return res.status(400).json({ error: 'Device token and Full Name are required' });
    }

    const { db } = await import('../config/firebase');
    if (!db) return res.status(500).json({ error: 'Database unavailable' });

    const docId = encodeURIComponent(token.replace(/[^a-zA-Z0-9_-]/g, '_'));
    const requestData = {
      id: docId,
      token,
      fullName,
      roleTitle: roleTitle || 'MDRRMO Volunteer / Responder',
      phone: phone || 'N/A',
      barangayName: barangayName || 'Irosin',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('responder_requests').doc(docId).set(requestData, { merge: true });

    return res.status(201).json({
      success: true,
      message: 'Naipadala na ang iyong kahilingan sa MDRRMO Admin. Mangyaring maghintay ng kumpirmasyon.',
      request: requestData
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Check Device Status from Mobile App
router.get('/check-responder-status', async (req, res: Response) => {
  try {
    const token = req.query.token as string;
    if (!token) return res.json({ status: 'NONE' });

    const { db } = await import('../config/firebase');
    if (!db) return res.json({ status: 'NONE' });

    const docId = encodeURIComponent(token.replace(/[^a-zA-Z0-9_-]/g, '_'));
    const doc = await db.collection('responder_requests').doc(docId).get();

    if (!doc.exists) {
      return res.json({ status: 'NONE' });
    }

    const data = doc.data();
    return res.json({
      status: data?.status || 'PENDING',
      requestData: { id: doc.id, ...data }
    });
  } catch {
    return res.json({ status: 'NONE' });
  }
});

// 3. Admin: Get all Responder Requests
router.get('/responder-requests', authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { db } = await import('../config/firebase');
    if (!db) return res.json({ requests: [] });

    const snap = await db.collection('responder_requests').get();
    const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Sort descending by date
    requests.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return res.json({ requests });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Admin: Approve or Reject a Responder Request
router.put('/responder-requests/:id/review', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }

    const { db } = await import('../config/firebase');
    if (!db) return res.status(500).json({ error: 'Database unavailable' });

    const docRef = db.collection('responder_requests').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const current = doc.data();
    const token = current?.token;

    await docRef.update({
      status,
      adminNotes: adminNotes || '',
      reviewedBy: req.user?.fullName || 'MDRRMO Admin',
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // If APPROVED, save to active admin_push_tokens
    if (status === 'APPROVED' && token) {
      await db.collection('admin_push_tokens').doc(id).set({
        token,
        fullName: current.fullName,
        roleTitle: current.roleTitle,
        phone: current.phone,
        barangayName: current.barangayName,
        role: 'MDRRMO_ADMIN',
        approvedBy: req.user?.fullName || 'MDRRMO Admin',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Notify the mobile phone
      try {
        const { ExpoPushService } = await import('../services/pushNotificationService');
        await ExpoPushService.sendToTokens(
          [token],
          '🛡️ APROBADO: MDRRMO Duty Responder Access',
          'Magandang araw! Naaprubahan na ng MDRRMO Admin ang iyong responder access. Makakatanggap ka na ng live incident reports.',
          { type: 'RESPONDER_STATUS_UPDATE', status: 'APPROVED' }
        );
      } catch {}
    } else if (status === 'REJECTED' && token) {
      // Remove from admin_push_tokens
      await db.collection('admin_push_tokens').doc(id).delete().catch(() => {});

      // Notify the mobile phone
      try {
        const { ExpoPushService } = await import('../services/pushNotificationService');
        await ExpoPushService.sendToTokens(
          [token],
          '⚠️ Update sa Responder Access Request',
          'Ang iyong responder access request ay tinanggihan o binawi ng MDRRMO Admin.',
          { type: 'RESPONDER_STATUS_UPDATE', status: 'REJECTED' }
        );
      } catch {}
    }

    return res.json({
      success: true,
      message: `Responder request ${status === 'APPROVED' ? 'Approved' : 'Rejected'} successfully.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Test trigger for admin
router.post('/test', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await WebPushService.notifyAdminsOfNewReport({
      id: 'test-' + Date.now(),
      reportType: 'FLOODING',
      streetLocation: 'Purok 1, Brgy. San Jose, Bulusan',
      description: 'Ito ay isang test alert mula sa MDRRMO System.',
      createdAt: new Date().toISOString()
    });

    return res.json({ success: true, message: 'Test push notification dispatched to registered admin browsers.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
