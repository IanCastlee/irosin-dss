import { Router } from 'express';
import { ReportsController } from '../controllers/reportsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/summary', authenticateToken, requireRole(['MDRRMO_ADMIN']), ReportsController.getSummary);
router.get('/export', authenticateToken, requireRole(['MDRRMO_ADMIN']), ReportsController.exportCsv);

export default router;
