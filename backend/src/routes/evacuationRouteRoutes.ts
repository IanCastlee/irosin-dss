import { Router } from 'express';
import { EvacuationRouteController } from '../controllers/evacuationRouteController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', EvacuationRouteController.getAll);
router.get('/:id', EvacuationRouteController.getById);

router.post('/', authenticateToken, requireRole(['MDRRMO_ADMIN']), EvacuationRouteController.create);
router.put('/:id', authenticateToken, requireRole(['MDRRMO_ADMIN']), EvacuationRouteController.update);
router.delete('/:id', authenticateToken, requireRole(['MDRRMO_ADMIN']), EvacuationRouteController.delete);

export default router;
