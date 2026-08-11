import { Router } from 'express';
import { PreparednessController } from '../controllers/preparednessController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', PreparednessController.getAll);
router.get('/:id', PreparednessController.getById);

router.post('/', authenticateToken, requireRole(['MDRRMO_ADMIN']), PreparednessController.create);
router.put('/:id', authenticateToken, requireRole(['MDRRMO_ADMIN']), PreparednessController.update);
router.delete('/:id', authenticateToken, requireRole(['MDRRMO_ADMIN']), PreparednessController.delete);

export default router;
