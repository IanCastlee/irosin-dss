import { Router } from 'express';
import { DisasterReportController } from '../controllers/disasterReportController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', DisasterReportController.getAll);
router.get('/:id', DisasterReportController.getById);

// Public / Resident hazard report submission
router.post('/', DisasterReportController.submit);
router.post('/:id/noted', DisasterReportController.toggleNoted);

router.put('/:id/status', authenticateToken, requireRole(['MDRRMO_ADMIN']), DisasterReportController.verifyOrUpdateStatus);
router.put('/:id/responder-action', DisasterReportController.responderAction);
router.delete('/:id', authenticateToken, requireRole(['MDRRMO_ADMIN']), DisasterReportController.delete);

export default router;
