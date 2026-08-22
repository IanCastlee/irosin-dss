import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { BarangaySchema } from '../validators';
import { logAudit } from '../utils/logger';
import { db } from '../config/firebase';

const COL = 'barangays';

export class BarangayController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const snapshot = await db.collection(COL).orderBy('name', 'asc').get();
      const barangays = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json({ barangays });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const doc = await db.collection(COL).doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Barangay not found' });
      return res.json({ barangay: { id: doc.id, ...doc.data() } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = BarangaySchema.parse(req.body);
      const id = 'brgy-' + Date.now();
      const now = new Date().toISOString();
      const newBrgy = {
        id,
        ...validated,
        createdAt: now,
        updatedAt: now,
        createdBy: req.user?.id
      };

      await db.collection(COL).doc(id).set(newBrgy);
      logAudit('CREATE_BARANGAY', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', COL, id, `Created barangay ${newBrgy.name}`);

      return res.status(201).json({ message: 'Barangay created', barangay: newBrgy });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
      return res.status(500).json({ error: err.message });
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const ref = db.collection(COL).doc(req.params.id);
      const existing = await ref.get();
      if (!existing.exists) return res.status(404).json({ error: 'Barangay not found' });

      const validated = BarangaySchema.partial().parse(req.body);
      const updates = { ...validated, updatedAt: new Date().toISOString(), updatedBy: req.user?.id };

      await ref.set(updates, { merge: true });
      const updated = { id: req.params.id, ...existing.data(), ...updates };

      logAudit('UPDATE_BARANGAY', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', COL, req.params.id, `Updated barangay ${updated.name}`);
      return res.json({ message: 'Barangay updated', barangay: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const ref = db.collection(COL).doc(req.params.id);
      const existing = await ref.get();
      if (!existing.exists) return res.status(404).json({ error: 'Barangay not found' });

      const data = existing.data() as any;
      await ref.delete();
      logAudit('DELETE_BARANGAY', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', COL, req.params.id, `Deleted barangay ${data?.name}`);
      return res.json({ message: 'Barangay deleted' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
