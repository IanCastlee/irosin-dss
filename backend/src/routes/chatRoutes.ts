import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// All chat routes require authentication
// Accessible to RESPONDER and MDRRMO_ADMIN roles
const chatAuth = [authenticateToken, requireRole(['RESPONDER', 'MDRRMO_ADMIN'])];

router.get('/responders', chatAuth, ChatController.listResponders);
router.get('/conversations', chatAuth, ChatController.getConversations);
router.get('/:chatId/messages', chatAuth, ChatController.getMessages);
router.post('/send', chatAuth, ChatController.sendMessage);
router.put('/:chatId/messages/:messageId/react', chatAuth, ChatController.reactToMessage);
router.put('/:chatId/messages/:messageId/edit', chatAuth, ChatController.editMessage);
router.delete('/:chatId/messages/:messageId', chatAuth, ChatController.unsendMessage);
router.put('/:chatId/read', chatAuth, ChatController.markRead);
router.post('/register-push-token', chatAuth, ChatController.registerPushToken);

export default router;
