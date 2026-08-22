import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { authLimiter, registrationLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', registrationLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.post('/responder/register', registrationLimiter, AuthController.responderRegister);
router.post('/responder/login', authLimiter, AuthController.responderLogin);
router.get('/me', authenticateToken, AuthController.me);
router.post('/fcm-token', authenticateToken, AuthController.updateFcmToken);

export default router;
