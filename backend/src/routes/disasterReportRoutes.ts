import { Router } from 'express';
import { DisasterReportController } from '../controllers/disasterReportController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, DisasterReportController.getAll);
router.get('/:id', authenticateToken, DisasterReportController.getById);

router.post('/', authenticateToken, DisasterReportController.submit);
router.put('/:id/status', authenticateToken, requireRole(['MDRRMO_ADMIN']), DisasterReportController.verifyOrUpdateStatus);

export default router;
