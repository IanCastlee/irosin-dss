import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { db } from '../config/firebase';
import { logAudit } from '../utils/logger';

const router = Router();
const USERS_COL = 'users';

// 1. Get all registered users (Admin only)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const snap = await db.collection(USERS_COL).get();
    const users = snap.docs.map(d => {
      const data = d.data();
      const { passwordHash: _, ...safeUser } = data;
      return { id: d.id, ...safeUser };
    });

    // Sort newest first
    users.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Approve, Reject, or Update User Status (Admin only)
router.put('/:id/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!['ACTIVE', 'PENDING_APPROVAL', 'REJECTED', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required: ACTIVE, PENDING_APPROVAL, REJECTED, INACTIVE' });
    }

    const docRef = db.collection(USERS_COL).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const current = doc.data() as any;

    await docRef.set({
      status,
      adminNotes: adminNotes || '',
      reviewedBy: req.user?.fullName || 'MDRRMO Admin',
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    logAudit('USER_STATUS_UPDATED', req.user?.fullName || 'MDRRMO Admin', req.user?.role || 'MDRRMO_ADMIN', USERS_COL, id, `Updated ${current.fullName} status to ${status}`);

    // If responder approved and has fcmToken, send push alert
    if (status === 'ACTIVE' && current.fcmToken) {
      try {
        const { ExpoPushService } = await import('../services/pushNotificationService');
        await ExpoPushService.sendToTokens(
          [current.fcmToken],
          '🛡️ APROBADO: MDRRMO Duty Responder Access',
          'Magandang araw! Naaprubahan na ng MDRRMO Admin ang iyong responder account. Maaari ka nang mag-login at pumasok sa Responder Portal.',
          { type: 'RESPONDER_STATUS_UPDATE', status: 'ACTIVE' }
        );
      } catch {}
    }

    return res.json({
      success: true,
      message: `User status updated to ${status}`,
      user: { id, ...current, status, adminNotes }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Update User Jurisdiction (Municipal-Wide / All Barangays vs Specific Barangay)
router.put('/:id/jurisdiction', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isMunicipalWide, jurisdiction, barangayName, barangayId } = req.body;

    const docRef = db.collection(USERS_COL).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const current = doc.data() as any;

    const updatePayload: any = {
      isMunicipalWide: isMunicipalWide === true,
      jurisdiction: isMunicipalWide ? 'ALL_BARANGAYS' : (jurisdiction || 'BARANGAY'),
      updatedAt: new Date().toISOString()
    };

    if (barangayName) updatePayload.barangayName = barangayName;
    if (barangayId) updatePayload.barangayId = barangayId;

    await docRef.set(updatePayload, { merge: true });

    // ⚡ Real-Time WebSocket Notification
    try {
      const { emitRealtimeEvent } = await import('../services/socketService');
      emitRealtimeEvent('RESPONDER_JURISDICTION_UPDATED', {
        userId: id,
        isMunicipalWide: isMunicipalWide === true,
        jurisdiction: updatePayload.jurisdiction,
        barangayName: updatePayload.barangayName || current.barangayName,
        barangayId: updatePayload.barangayId || current.barangayId,
      });
    } catch {}

    logAudit(
      'USER_JURISDICTION_UPDATED',
      req.user?.fullName || 'MDRRMO Admin',
      req.user?.role || 'MDRRMO_ADMIN',
      USERS_COL,
      id,
      `Updated ${current.fullName} coverage to ${isMunicipalWide ? 'ALL BARANGAYS (Municipal-Wide)' : (barangayName || current.barangayName || 'Specific Barangay')}`
    );

    return res.json({
      success: true,
      message: `Updated jurisdiction for ${current.fullName}`,
      user: { id, ...current, ...updatePayload }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Delete user account
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const docRef = db.collection(USERS_COL).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = doc.data() as any;
    await docRef.delete();
    logAudit('USER_DELETED', req.user?.fullName || 'MDRRMO Admin', req.user?.role || 'MDRRMO_ADMIN', USERS_COL, id, `Deleted user account ${userData.fullName}`);

    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
