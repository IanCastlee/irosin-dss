import { Router } from 'express';
import { AlertController } from '../controllers/alertController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', AlertController.getAll);
router.get('/active', AlertController.getActive);
router.get('/logs', authenticateToken, requireRole(['MDRRMO_ADMIN']), AlertController.getNotificationLogs);
router.get('/test-push', authenticateToken, requireRole(['MDRRMO_ADMIN']), AlertController.testPush);
router.get('/earthquake/sync', async (req, res) => {
  const { EarthquakeMonitorService } = await import('../services/earthquakeMonitorService');
  const result = await EarthquakeMonitorService.checkForEarthquakes();
  return res.json({ message: 'Earthquake scan complete', ...result });
});
router.post('/push-token', AlertController.registerPushToken);
router.get('/:id', AlertController.getById);

router.post('/', authenticateToken, requireRole(['MDRRMO_ADMIN']), AlertController.create);
router.put('/:id/cancel', authenticateToken, requireRole(['MDRRMO_ADMIN']), AlertController.cancelAlert);
router.delete('/:id', authenticateToken, requireRole(['MDRRMO_ADMIN']), AlertController.deleteAlert);

export default router;
