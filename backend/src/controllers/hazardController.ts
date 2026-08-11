import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { mockStore } from '../utils/mockStore';
import { HazardZoneSchema } from '../validators';
import { logAudit } from '../utils/logger';
import { db } from '../config/firebase';

export class HazardController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const barangayId = req.query.barangayId as string;
    let hazards = mockStore.hazardZones;

    if (db) {
      try {
        const snapshot = await db.collection('hazard_zones').get();
        if (!snapshot.empty) {
          const firestoreHazards: any[] = [];
          snapshot.forEach(doc => firestoreHazards.push(doc.data()));
          hazards = firestoreHazards;
          mockStore.hazardZones = hazards;
        }
      } catch (e) {
        console.warn('Firestore fetch fallback:', e);
      }
    }

    if (barangayId) {
      hazards = hazards.filter(h => h.affectedBarangayIds.includes(barangayId));
    }
    return res.json({ hazardZones: hazards });
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const hazard = mockStore.hazardZones.find(h => h.id === req.params.id);
    if (!hazard) return res.status(404).json({ error: 'Hazard zone not found' });
    return res.json({ hazardZone: hazard });
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = HazardZoneSchema.parse(req.body);
      const barangayNames = validated.affectedBarangayIds.map(id => {
        const b = mockStore.barangays.find(brgy => brgy.id === id);
        return b ? b.name : id;
      });

      const newHazard = {
        id: 'hazard-' + Date.now(),
        ...validated,
        affectedBarangayNames: barangayNames,
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: req.user?.id
      };

      mockStore.hazardZones.push(newHazard);

      if (db) {
        await db.collection('hazard_zones').doc(newHazard.id).set(newHazard);
      }

      logAudit('CREATE_HAZARD_ZONE', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'hazard_zones', newHazard.id, `Created hazard zone ${newHazard.name}`);

      return res.status(201).json({ message: 'Hazard zone created', hazardZone: newHazard });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
      return res.status(500).json({ error: err.message });
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const hazard = mockStore.hazardZones.find(h => h.id === req.params.id);
      if (!hazard) return res.status(404).json({ error: 'Hazard zone not found' });

      const validated = HazardZoneSchema.partial().parse(req.body);

      if (validated.affectedBarangayIds) {
        hazard.affectedBarangayNames = validated.affectedBarangayIds.map(id => {
          const b = mockStore.barangays.find(brgy => brgy.id === id);
          return b ? b.name : id;
        });
      }

      Object.assign(hazard, validated, {
        lastUpdated: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.id
      });

      if (db) {
        await db.collection('hazard_zones').doc(hazard.id).set(hazard, { merge: true });
      }

      logAudit('UPDATE_HAZARD_ZONE', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'hazard_zones', hazard.id, `Updated hazard zone ${hazard.name}`);

      return res.json({ message: 'Hazard zone updated', hazardZone: hazard });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    const index = mockStore.hazardZones.findIndex(h => h.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Hazard zone not found' });

    const [deleted] = mockStore.hazardZones.splice(index, 1);
    if (db) {
      await db.collection('hazard_zones').doc(req.params.id).delete();
    }
    logAudit('DELETE_HAZARD_ZONE', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'hazard_zones', deleted.id, `Deleted hazard zone ${deleted.name}`);

    return res.json({ message: 'Hazard zone deleted' });
  }
}
