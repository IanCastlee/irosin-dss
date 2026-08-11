import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { mockStore } from '../utils/mockStore';
import { EmergencyContactSchema } from '../validators';
import { logAudit } from '../utils/logger';
import { db } from '../config/firebase';

export class EmergencyContactController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const category = req.query.category as string;
    let contacts = mockStore.emergencyContacts;

    if (db) {
      try {
        const snapshot = await db.collection('emergency_contacts').get();
        if (!snapshot.empty) {
          const firestoreContacts: any[] = [];
          snapshot.forEach(doc => firestoreContacts.push(doc.data()));
          contacts = firestoreContacts;
          mockStore.emergencyContacts = contacts;
        }
      } catch (e) {
        console.warn('Firestore fetch fallback:', e);
      }
    }

    if (category) {
      contacts = contacts.filter(c => c.category === category);
    }
    return res.json({ emergencyContacts: contacts });
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const contact = mockStore.emergencyContacts.find(c => c.id === req.params.id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    return res.json({ emergencyContact: contact });
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = EmergencyContactSchema.parse(req.body);
      const newContact = {
        id: 'contact-' + Date.now(),
        ...validated,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: req.user?.id
      };
      mockStore.emergencyContacts.push(newContact);

      if (db) {
        await db.collection('emergency_contacts').doc(newContact.id).set(newContact);
      }

      logAudit('CREATE_EMERGENCY_CONTACT', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'emergency_contacts', newContact.id, `Added emergency contact ${newContact.organization}`);

      return res.status(201).json({ message: 'Emergency contact created', emergencyContact: newContact });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
      return res.status(500).json({ error: err.message });
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const contact = mockStore.emergencyContacts.find(c => c.id === req.params.id);
      if (!contact) return res.status(404).json({ error: 'Contact not found' });

      const validated = EmergencyContactSchema.partial().parse(req.body);
      Object.assign(contact, validated, {
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.id
      });

      if (db) {
        await db.collection('emergency_contacts').doc(contact.id).set(contact, { merge: true });
      }

      logAudit('UPDATE_EMERGENCY_CONTACT', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'emergency_contacts', contact.id, `Updated contact ${contact.organization}`);

      return res.json({ message: 'Emergency contact updated', emergencyContact: contact });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    const index = mockStore.emergencyContacts.findIndex(c => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Contact not found' });

    const [deleted] = mockStore.emergencyContacts.splice(index, 1);
    if (db) {
      await db.collection('emergency_contacts').doc(req.params.id).delete();
    }
    logAudit('DELETE_EMERGENCY_CONTACT', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'emergency_contacts', deleted.id, `Deleted contact ${deleted.organization}`);

    return res.json({ message: 'Emergency contact deleted' });
  }
}
