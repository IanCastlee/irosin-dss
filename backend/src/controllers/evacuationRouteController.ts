import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { mockStore } from '../utils/mockStore';
import { EvacuationRouteSchema } from '../validators';
import { logAudit } from '../utils/logger';
import { db } from '../config/firebase';

export class EvacuationRouteController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const barangayId = req.query.barangayId as string;
    const centerId = req.query.destinationCenterId as string;
    
    let routes = mockStore.evacuationRoutes;
    if (db) {
      try {
        const snapshot = await db.collection('evacuation_routes').get();
        if (!snapshot.empty) {
          const firestoreRoutes: any[] = [];
          snapshot.forEach(doc => firestoreRoutes.push(doc.data()));
          routes = firestoreRoutes;
          mockStore.evacuationRoutes = routes;
        }
      } catch (e) {
        console.warn('Firestore fetch fallback:', e);
      }
    }

    if (barangayId) {
      routes = routes.filter(r => r.barangayId === barangayId);
    }
    if (centerId) {
      routes = routes.filter(r => r.destinationCenterId === centerId);
    }

    return res.json({ evacuationRoutes: routes });
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const route = mockStore.evacuationRoutes.find(r => r.id === req.params.id);
    if (!route) return res.status(404).json({ error: 'Evacuation route not found' });
    return res.json({ evacuationRoute: route });
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = EvacuationRouteSchema.parse(req.body);
      const barangay = mockStore.barangays.find(b => b.id === validated.barangayId);
      const center = mockStore.evacuationCenters.find(c => c.id === validated.destinationCenterId);

      const newRoute = {
        id: 'route-' + Date.now(),
        ...validated,
        barangayName: barangay ? barangay.name : 'Unknown Barangay',
        destinationCenterName: center ? center.name : 'Unknown Evacuation Center',
        lastVerifiedDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: req.user?.id
      };

      mockStore.evacuationRoutes.push(newRoute);

      if (db) {
        await db.collection('evacuation_routes').doc(newRoute.id).set(newRoute);
      }

      logAudit('CREATE_EVACUATION_ROUTE', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'evacuation_routes', newRoute.id, `Created official route ${newRoute.routeName}`);

      return res.status(201).json({ message: 'Evacuation route created', evacuationRoute: newRoute });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
      return res.status(500).json({ error: err.message });
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const route = mockStore.evacuationRoutes.find(r => r.id === req.params.id);
      if (!route) return res.status(404).json({ error: 'Evacuation route not found' });

      const validated = EvacuationRouteSchema.partial().parse(req.body);

      if (validated.barangayId) {
        const barangay = mockStore.barangays.find(b => b.id === validated.barangayId);
        if (barangay) route.barangayName = barangay.name;
      }
      if (validated.destinationCenterId) {
        const center = mockStore.evacuationCenters.find(c => c.id === validated.destinationCenterId);
        if (center) route.destinationCenterName = center.name;
      }

      Object.assign(route, validated, {
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.id
      });

      if (db) {
        await db.collection('evacuation_routes').doc(route.id).set(route, { merge: true });
      }

      logAudit('UPDATE_EVACUATION_ROUTE', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'evacuation_routes', route.id, `Updated route ${route.routeName}`);

      return res.json({ message: 'Evacuation route updated', evacuationRoute: route });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    const index = mockStore.evacuationRoutes.findIndex(r => r.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Evacuation route not found' });

    const [deleted] = mockStore.evacuationRoutes.splice(index, 1);
    if (db) {
      await db.collection('evacuation_routes').doc(req.params.id).delete();
    }
    logAudit('DELETE_EVACUATION_ROUTE', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'evacuation_routes', deleted.id, `Deleted route ${deleted.routeName}`);

    return res.json({ message: 'Evacuation route deleted' });
  }
}
