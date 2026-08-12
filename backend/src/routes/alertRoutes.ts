import { Router } from 'express';
import { AlertController } from '../controllers/alertController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', AlertController.getAll);
router.get('/active', AlertController.getActive);
router.get('/logs', authenticateToken, requireRole(['MDRRMO_ADMIN']), AlertController.getNotificationLogs);
router.get('/test-push', authenticateToken, requireRole(['MDRRMO_ADMIN']), AlertController.testPush);
router.get('/:id', AlertController.getById);

router.post('/', authenticateToken, requireRole(['MDRRMO_ADMIN']), AlertController.create);
router.post('/push-token', AlertController.registerPushToken);
router.put('/:id/cancel', authenticateToken, requireRole(['MDRRMO_ADMIN']), AlertController.cancelAlert);
router.delete('/:id', authenticateToken, requireRole(['MDRRMO_ADMIN']), AlertController.deleteAlert);

export default router;
