import { Router } from 'express';
import { PowerInterruptionController } from '../controllers/powerInterruptionController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', PowerInterruptionController.getAll);
router.post('/', authenticateToken, requireRole(['MDRRMO_ADMIN']), PowerInterruptionController.create);
router.put('/:id/status', authenticateToken, requireRole(['MDRRMO_ADMIN']), PowerInterruptionController.updateStatus);

export default router;
