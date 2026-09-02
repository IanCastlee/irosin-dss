import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { PreparednessGuideSchema } from '../validators';
import { logAudit } from '../utils/logger';
import { db } from '../config/firebase';
import { emitRealtimeEvent } from '../services/socketService';

const COL = 'preparedness_guides';

export class PreparednessController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const hazardType = req.query.hazardType as string;
      const category = req.query.category as string;

      const snapshot = await db.collection(COL).get();
      let guides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      // In-memory filter so Firestore never requires composite indexes
      guides = guides.filter(g => g.isPublished !== false);
      if (hazardType && hazardType !== 'ALL') {
        guides = guides.filter(g => g.hazardType === hazardType);
      }
      if (category) {
        guides = guides.filter(g => g.category === category);
      }

      guides.sort((a, b) => (a.priority || 1) - (b.priority || 1));

      return res.json({ preparednessGuides: guides });
    } catch (err: any) {
      console.error('[Preparedness] Error fetching guides:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const doc = await db.collection(COL).doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Guide not found' });
      return res.json({ preparednessGuide: { id: doc.id, ...doc.data() } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = PreparednessGuideSchema.parse(req.body);
      const id = 'guide-' + Date.now();
      const now = new Date().toISOString();
      const newGuide = {
        id,
        ...validated,
        createdAt: now,
        updatedAt: now,
        createdBy: req.user?.id
      };

      await db.collection(COL).doc(id).set(newGuide);
      logAudit('CREATE_PREPAREDNESS_GUIDE', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', COL, id, `Created guide ${newGuide.title}`);

      // Realtime WebSocket Broadcast to all connected residents & admins
      try {
        emitRealtimeEvent('PREPAREDNESS_GUIDES_UPDATED', newGuide);
        emitRealtimeEvent('GUIDE_CREATED', newGuide);
      } catch (sockErr) {
        console.warn('[Socket] Preparedness create emit warning:', sockErr);
      }

      return res.status(201).json({ message: 'Preparedness guide created', preparednessGuide: newGuide });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
      return res.status(500).json({ error: err.message });
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const ref = db.collection(COL).doc(req.params.id);
      const existing = await ref.get();
      if (!existing.exists) return res.status(404).json({ error: 'Guide not found' });

      const validated = PreparednessGuideSchema.partial().parse(req.body);
      const updates = { ...validated, updatedAt: new Date().toISOString(), updatedBy: req.user?.id };

      await ref.set(updates, { merge: true });
      const updated = { id: req.params.id, ...existing.data(), ...updates };

      logAudit('UPDATE_PREPAREDNESS_GUIDE', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', COL, req.params.id, `Updated guide ${updated.title}`);

      // Realtime WebSocket Broadcast to all connected residents & admins
      try {
        emitRealtimeEvent('PREPAREDNESS_GUIDES_UPDATED', updated);
        emitRealtimeEvent('GUIDE_UPDATED', updated);
      } catch (sockErr) {
        console.warn('[Socket] Preparedness update emit warning:', sockErr);
      }

      return res.json({ message: 'Preparedness guide updated', preparednessGuide: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const ref = db.collection(COL).doc(req.params.id);
      const existing = await ref.get();
      if (!existing.exists) return res.status(404).json({ error: 'Guide not found' });

      const data = existing.data() as any;
      await ref.delete();
      logAudit('DELETE_PREPAREDNESS_GUIDE', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', COL, req.params.id, `Deleted guide ${data?.title}`);

      // Realtime WebSocket Broadcast to all connected residents & admins
      try {
        emitRealtimeEvent('PREPAREDNESS_GUIDES_UPDATED', { id: req.params.id });
        emitRealtimeEvent('GUIDE_DELETED', { id: req.params.id });
      } catch (sockErr) {
        console.warn('[Socket] Preparedness delete emit warning:', sockErr);
      }

      return res.json({ message: 'Preparedness guide deleted' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
