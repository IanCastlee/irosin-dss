import { Router } from 'express';
import { HazardController } from '../controllers/hazardController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', HazardController.getAll);
router.get('/:id', HazardController.getById);

router.post('/', authenticateToken, requireRole(['MDRRMO_ADMIN']), HazardController.create);
router.put('/:id', authenticateToken, requireRole(['MDRRMO_ADMIN']), HazardController.update);
router.delete('/:id', authenticateToken, requireRole(['MDRRMO_ADMIN']), HazardController.delete);

export default router;
