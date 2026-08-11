import { Router } from 'express';
import { EvacuationCenterController } from '../controllers/evacuationCenterController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', EvacuationCenterController.getAll);
router.get('/:id', EvacuationCenterController.getById);

router.post('/', authenticateToken, requireRole(['MDRRMO_ADMIN']), EvacuationCenterController.create);
router.put('/:id', authenticateToken, requireRole(['MDRRMO_ADMIN']), EvacuationCenterController.update);
router.delete('/:id', authenticateToken, requireRole(['MDRRMO_ADMIN']), EvacuationCenterController.delete);

export default router;
