import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { mockStore } from '../utils/mockStore';
import { EvacuationCenterSchema } from '../validators';
import { logAudit } from '../utils/logger';
import { db } from '../config/firebase';

export class EvacuationCenterController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const barangayId = req.query.barangayId as string;
    let centers = mockStore.evacuationCenters;
    if (db) {
      try {
        const snapshot = await db.collection('evacuation_centers').get();
        if (!snapshot.empty) {
          const firestoreCenters: any[] = [];
          snapshot.forEach(doc => firestoreCenters.push(doc.data()));
          centers = firestoreCenters;
          mockStore.evacuationCenters = centers;
        }
      } catch (e) {
        console.warn('Firestore fetch fallback:', e);
      }
    }
    if (barangayId) {
      centers = centers.filter(c => c.barangayId === barangayId);
    }
    return res.json({ evacuationCenters: centers });
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const center = mockStore.evacuationCenters.find(c => c.id === req.params.id);
    if (!center) return res.status(404).json({ error: 'Evacuation center not found' });
    return res.json({ evacuationCenter: center });
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = EvacuationCenterSchema.parse(req.body);
      const barangay = mockStore.barangays.find(b => b.id === validated.barangayId);

      const newCenter = {
        id: 'center-' + Date.now(),
        ...validated,
        barangayName: barangay ? barangay.name : 'Unknown Barangay',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: req.user?.id
      };

      mockStore.evacuationCenters.push(newCenter);

      if (db) {
        await db.collection('evacuation_centers').doc(newCenter.id).set(newCenter);
      }

      logAudit('CREATE_EVACUATION_CENTER', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'evacuation_centers', newCenter.id, `Created center ${newCenter.name}`);

      return res.status(201).json({ message: 'Evacuation center created', evacuationCenter: newCenter });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
      return res.status(500).json({ error: err.message });
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const center = mockStore.evacuationCenters.find(c => c.id === req.params.id);
      if (!center) return res.status(404).json({ error: 'Evacuation center not found' });

      const validated = EvacuationCenterSchema.partial().parse(req.body);
      
      if (validated.barangayId) {
        const barangay = mockStore.barangays.find(b => b.id === validated.barangayId);
        if (barangay) center.barangayName = barangay.name;
      }

      Object.assign(center, validated, {
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.id
      });

      logAudit('UPDATE_EVACUATION_CENTER', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'evacuation_centers', center.id, `Updated center ${center.name}`);

      return res.json({ message: 'Evacuation center updated', evacuationCenter: center });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    const index = mockStore.evacuationCenters.findIndex(c => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Evacuation center not found' });

    const [deleted] = mockStore.evacuationCenters.splice(index, 1);
    logAudit('DELETE_EVACUATION_CENTER', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'evacuation_centers', deleted.id, `Deleted center ${deleted.name}`);

    return res.json({ message: 'Evacuation center deleted' });
  }
}
