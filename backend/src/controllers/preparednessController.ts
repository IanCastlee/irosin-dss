import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { mockStore } from '../utils/mockStore';
import { PreparednessGuideSchema } from '../validators';
import { logAudit } from '../utils/logger';

export class PreparednessController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const hazardType = req.query.hazardType as string;
    const category = req.query.category as string;
    
    let guides = mockStore.preparednessGuides.filter(g => g.isPublished);
    if (hazardType) guides = guides.filter(g => g.hazardType === hazardType);
    if (category) guides = guides.filter(g => g.category === category);
    guides.sort((a, b) => a.priority - b.priority);

    return res.json({ preparednessGuides: guides });
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const guide = mockStore.preparednessGuides.find(g => g.id === req.params.id);
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    return res.json({ preparednessGuide: guide });
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = PreparednessGuideSchema.parse(req.body);
      const newGuide = {
        id: 'guide-' + Date.now(),
        ...validated,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: req.user?.id
      };
      mockStore.preparednessGuides.push(newGuide);

      logAudit('CREATE_PREPAREDNESS_GUIDE', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'preparedness_guides', newGuide.id, `Created guide ${newGuide.title}`);

      return res.status(201).json({ message: 'Preparedness guide created', preparednessGuide: newGuide });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
      return res.status(500).json({ error: err.message });
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const guide = mockStore.preparednessGuides.find(g => g.id === req.params.id);
      if (!guide) return res.status(404).json({ error: 'Guide not found' });

      const validated = PreparednessGuideSchema.partial().parse(req.body);
      Object.assign(guide, validated, {
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.id
      });

      logAudit('UPDATE_PREPAREDNESS_GUIDE', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'preparedness_guides', guide.id, `Updated guide ${guide.title}`);

      return res.json({ message: 'Preparedness guide updated', preparednessGuide: guide });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    const index = mockStore.preparednessGuides.findIndex(g => g.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Guide not found' });

    const [deleted] = mockStore.preparednessGuides.splice(index, 1);
    logAudit('DELETE_PREPAREDNESS_GUIDE', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'preparedness_guides', deleted.id, `Deleted guide ${deleted.title}`);

    return res.json({ message: 'Preparedness guide deleted' });
  }
}
