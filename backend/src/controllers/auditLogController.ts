import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../config/firebase';

export class AuditLogController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const cursor = req.query.cursor as string;
      const limitParam = parseInt(req.query.limit as string, 10);
      const limit = !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 20;

      if (!db) {
        return res.json({ auditLogs: [], nextCursor: null, hasMore: false, limit });
      }

      let query: FirebaseFirestore.Query = db.collection('audit_logs')
        .orderBy('timestamp', 'desc');

      if (cursor) {
        query = query.startAfter(cursor);
      }

      const snapshot = await query.limit(limit + 1).get();
      const docs = snapshot.docs;
      const hasMore = docs.length > limit;
      const resultDocs = hasMore ? docs.slice(0, limit) : docs;

      const auditLogs = resultDocs.map(doc => ({ id: doc.id, ...doc.data() }));
      const nextCursor = resultDocs.length > 0
        ? (resultDocs[resultDocs.length - 1].data().timestamp || resultDocs[resultDocs.length - 1].id)
        : null;

      return res.json({ auditLogs, nextCursor, hasMore, limit });
    } catch (err: any) {
      console.warn('[AuditLogController] Warning:', err?.message);
      return res.json({ auditLogs: [], nextCursor: null, hasMore: false, limit: 20 });
    }
  }
}
