import { Router } from 'express';
import { AlertController } from '../controllers/alertController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', AlertController.getAll);
router.get('/active', AlertController.getActive);
router.get('/logs', authenticateToken, requireRole(['MDRRMO_ADMIN']), AlertController.getNotificationLogs);
router.get('/:id', AlertController.getById);

router.post('/', authenticateToken, requireRole(['MDRRMO_ADMIN']), AlertController.create);
router.put('/:id/cancel', authenticateToken, requireRole(['MDRRMO_ADMIN']), AlertController.cancelAlert);

export default router;
