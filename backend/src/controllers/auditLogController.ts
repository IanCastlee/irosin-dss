import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { mockStore } from '../utils/mockStore';

export class AuditLogController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    return res.json({ auditLogs: mockStore.auditLogs });
  }
}
