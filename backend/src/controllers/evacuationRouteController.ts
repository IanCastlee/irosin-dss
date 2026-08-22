import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { EvacuationRouteSchema } from '../validators';
import { logAudit } from '../utils/logger';
import { db } from '../config/firebase';

const COL = 'evacuation_routes';

export class EvacuationRouteController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const barangayId = req.query.barangayId as string;
      const centerId = req.query.destinationCenterId as string;

      let query: FirebaseFirestore.Query = db.collection(COL).orderBy('createdAt', 'desc');
      if (barangayId) query = query.where('barangayId', '==', barangayId);
      if (centerId) query = query.where('destinationCenterId', '==', centerId);

      const snapshot = await query.get();
      const routes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json({ evacuationRoutes: routes });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const doc = await db.collection(COL).doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Evacuation route not found' });
      return res.json({ evacuationRoute: { id: doc.id, ...doc.data() } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = EvacuationRouteSchema.parse(req.body);

      // Resolve names from Firestore
      let barangayName = 'Unknown Barangay';
      let destinationCenterName = 'Unknown Evacuation Center';
      try {
        const [brgyDoc, centerDoc] = await Promise.all([
          db.collection('barangays').doc(validated.barangayId).get(),
          db.collection('evacuation_centers').doc(validated.destinationCenterId).get()
        ]);
        if (brgyDoc.exists) barangayName = (brgyDoc.data() as any).name || barangayName;
        if (centerDoc.exists) destinationCenterName = (centerDoc.data() as any).name || destinationCenterName;
      } catch {}

      const id = 'route-' + Date.now();
      const now = new Date().toISOString();
      const newRoute = {
        id,
        ...validated,
        barangayName,
        destinationCenterName,
        lastVerifiedDate: now.split('T')[0],
        createdAt: now,
        updatedAt: now,
        createdBy: req.user?.id
      };

      await db.collection(COL).doc(id).set(newRoute);
      logAudit('CREATE_EVACUATION_ROUTE', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', COL, id, `Created route ${newRoute.routeName}`);

      return res.status(201).json({ message: 'Evacuation route created', evacuationRoute: newRoute });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
      return res.status(500).json({ error: err.message });
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const ref = db.collection(COL).doc(req.params.id);
      const existing = await ref.get();
      if (!existing.exists) return res.status(404).json({ error: 'Evacuation route not found' });

      const validated = EvacuationRouteSchema.partial().parse(req.body);
      const updates: any = { ...validated, updatedAt: new Date().toISOString(), updatedBy: req.user?.id };

      // Resolve updated names if IDs changed
      const lookups: Promise<void>[] = [];
      if (validated.barangayId) {
        lookups.push(db.collection('barangays').doc(validated.barangayId).get().then(d => {
          if (d.exists) updates.barangayName = (d.data() as any).name;
        }).catch(() => {}));
      }
      if (validated.destinationCenterId) {
        lookups.push(db.collection('evacuation_centers').doc(validated.destinationCenterId).get().then(d => {
          if (d.exists) updates.destinationCenterName = (d.data() as any).name;
        }).catch(() => {}));
      }
      await Promise.all(lookups);

      await ref.set(updates, { merge: true });
      const updated = { id: req.params.id, ...existing.data(), ...updates };

      logAudit('UPDATE_EVACUATION_ROUTE', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', COL, req.params.id, `Updated route ${updated.routeName}`);
      return res.json({ message: 'Evacuation route updated', evacuationRoute: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const ref = db.collection(COL).doc(req.params.id);
      const existing = await ref.get();
      if (!existing.exists) return res.status(404).json({ error: 'Evacuation route not found' });

      const data = existing.data() as any;
      await ref.delete();
      logAudit('DELETE_EVACUATION_ROUTE', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', COL, req.params.id, `Deleted route ${data?.routeName}`);
      return res.json({ message: 'Evacuation route deleted' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
