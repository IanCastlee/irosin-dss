import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { EmergencyContactSchema } from '../validators';
import { logAudit } from '../utils/logger';
import { db } from '../config/firebase';

const COL = 'emergency_contacts';

export class EmergencyContactController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const category = req.query.category as string;
      let query: FirebaseFirestore.Query = db.collection(COL).orderBy('organization', 'asc');
      if (category) query = query.where('category', '==', category);

      const snapshot = await query.get();
      const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json({ emergencyContacts: contacts });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const doc = await db.collection(COL).doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Contact not found' });
      return res.json({ emergencyContact: { id: doc.id, ...doc.data() } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = EmergencyContactSchema.parse(req.body);
      const id = 'contact-' + Date.now();
      const now = new Date().toISOString();
      const newContact = {
        id,
        ...validated,
        createdAt: now,
        updatedAt: now,
        createdBy: req.user?.id
      };

      await db.collection(COL).doc(id).set(newContact);
      logAudit('CREATE_EMERGENCY_CONTACT', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', COL, id, `Added contact ${newContact.organization}`);

      return res.status(201).json({ message: 'Emergency contact created', emergencyContact: newContact });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
      return res.status(500).json({ error: err.message });
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const ref = db.collection(COL).doc(req.params.id);
      const existing = await ref.get();
      if (!existing.exists) return res.status(404).json({ error: 'Contact not found' });

      const validated = EmergencyContactSchema.partial().parse(req.body);
      const updates = { ...validated, updatedAt: new Date().toISOString(), updatedBy: req.user?.id };

      await ref.set(updates, { merge: true });
      const updated = { id: req.params.id, ...existing.data(), ...updates };

      logAudit('UPDATE_EMERGENCY_CONTACT', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', COL, req.params.id, `Updated contact ${updated.organization}`);
      return res.json({ message: 'Emergency contact updated', emergencyContact: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const ref = db.collection(COL).doc(req.params.id);
      const existing = await ref.get();
      if (!existing.exists) return res.status(404).json({ error: 'Contact not found' });

      const data = existing.data() as any;
      await ref.delete();
      logAudit('DELETE_EMERGENCY_CONTACT', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', COL, req.params.id, `Deleted contact ${data?.organization}`);
      return res.json({ message: 'Emergency contact deleted' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
