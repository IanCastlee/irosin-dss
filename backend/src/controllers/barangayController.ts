import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { mockStore } from '../utils/mockStore';
import { BarangaySchema } from '../validators';
import { logAudit } from '../utils/logger';

export class BarangayController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    return res.json({ barangays: mockStore.barangays });
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const barangay = mockStore.barangays.find(b => b.id === req.params.id);
    if (!barangay) return res.status(404).json({ error: 'Barangay not found' });
    return res.json({ barangay });
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = BarangaySchema.parse(req.body);
      const newBrgy = {
        id: 'brgy-' + Date.now(),
        ...validated,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: req.user?.id
      };
      mockStore.barangays.push(newBrgy);

      logAudit('CREATE_BARANGAY', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'barangays', newBrgy.id, `Created barangay ${newBrgy.name}`);

      return res.status(201).json({ message: 'Barangay created', barangay: newBrgy });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
      return res.status(500).json({ error: err.message });
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const brgy = mockStore.barangays.find(b => b.id === req.params.id);
      if (!brgy) return res.status(404).json({ error: 'Barangay not found' });

      const validated = BarangaySchema.partial().parse(req.body);
      Object.assign(brgy, validated, {
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.id
      });

      logAudit('UPDATE_BARANGAY', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'barangays', brgy.id, `Updated barangay ${brgy.name}`);

      return res.json({ message: 'Barangay updated', barangay: brgy });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    const index = mockStore.barangays.findIndex(b => b.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Barangay not found' });

    const [deleted] = mockStore.barangays.splice(index, 1);
    logAudit('DELETE_BARANGAY', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'barangays', deleted.id, `Deleted barangay ${deleted.name}`);

    return res.json({ message: 'Barangay deleted' });
  }
}
