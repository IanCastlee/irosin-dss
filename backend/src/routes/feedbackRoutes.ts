import { Router } from 'express';
import { FeedbackController } from '../controllers/feedbackController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Public: Citizens can submit feedback without login
router.post('/', FeedbackController.submitFeedback);

// Admin-only routes
router.get('/', authenticateToken, requireRole(['MDRRMO_ADMIN']), FeedbackController.getAllFeedbacks);
router.patch('/:id/status', authenticateToken, requireRole(['MDRRMO_ADMIN']), FeedbackController.updateStatus);
router.delete('/:id', authenticateToken, requireRole(['MDRRMO_ADMIN']), FeedbackController.deleteFeedback);

export default router;
