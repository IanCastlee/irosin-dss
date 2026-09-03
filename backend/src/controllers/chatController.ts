import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../config/firebase';
import { emitToUser, emitRealtimeEvent } from '../services/socketService';

const CHATS_COL = 'chats';
const USERS_COL = 'users';
const RESPONDER_TOKENS_COL = 'responder_push_tokens';

/** Deterministic chat ID for any two participants */
export function getChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/** Robust Expo push notification to a specific user */
async function sendPushToUser(recipientId: string, title: string, body: string, data: Record<string, any>) {
  try {
    const tokensToNotify = new Set<string>();

    // 1. Check responder_push_tokens collection
    try {
      const tokenDoc = await db.collection(RESPONDER_TOKENS_COL).doc(recipientId).get();
      if (tokenDoc.exists) {
        const t = (tokenDoc.data() as any)?.token;
        if (t && (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['))) {
          tokensToNotify.add(t);
        }
      }
    } catch {}

    // 2. Fallback / supplementary check on users collection (fcmToken / pushToken field)
    try {
      const userDoc = await db.collection(USERS_COL).doc(recipientId).get();
      if (userDoc.exists) {
        const uData = userDoc.data() as any;
        if (uData?.fcmToken && (uData.fcmToken.startsWith('ExponentPushToken[') || uData.fcmToken.startsWith('ExpoPushToken['))) {
          tokensToNotify.add(uData.fcmToken);
        }
        if (uData?.pushToken && (uData.pushToken.startsWith('ExponentPushToken[') || uData.pushToken.startsWith('ExpoPushToken['))) {
          tokensToNotify.add(uData.pushToken);
        }
      }
    } catch {}

    // 3. Fallback / supplementary check on push_tokens collection
    try {
      const snap = await db.collection('push_tokens').where('userId', '==', recipientId).get();
      snap.docs.forEach(d => {
        const t = (d.data() as any)?.token;
        if (t && (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['))) {
          tokensToNotify.add(t);
        }
      });
    } catch {}

    const tokenList = Array.from(tokensToNotify);
    if (tokenList.length === 0) {
      console.log(`[Chat] No registered push tokens found for recipient ${recipientId}`);
      return;
    }

    const messages = tokenList.map(token => ({
      to: token,
      title,
      body,
      data: {
        ...(data || {}),
        channelId: 'irosin-chat-messages',
      },
      sound: 'default',
      channelId: 'irosin-chat-messages',
      priority: 'high',
    }));

    const resp = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    console.log(`[Chat] Push notification dispatched to ${tokenList.length} device(s) for recipient ${recipientId} (Status: ${resp.status})`);
  } catch (err) {
    console.warn('[Chat] Push notification warning:', err);
  }
}

export class ChatController {
  /**
   * GET /chat/responders?q=&cursor=&limit=50
   * List/search active responders from Firestore.
   */
  static async listResponders(req: AuthenticatedRequest, res: Response) {
    try {
      const currentUserId = req.user?.id || (req.query.currentUserId as string) || '';
      const q = ((req.query.q as string) || '').toLowerCase().trim();
      const pageLimit = Math.min(Number(req.query.limit || 50), 100);

      const snap = await db.collection(USERS_COL).get();

      let docs = snap.docs
        .map(d => {
          const data = d.data();
          return {
            id: d.id,
            email: (data.email || '').toLowerCase().trim(),
            fullName: data.fullName || data.username || 'Responder',
            roleTitle: data.roleTitle || (data.role === 'MDRRMO_ADMIN' ? 'MDRRMO Admin' : 'Barangay Responder'),
            barangayName: data.barangayName || (data.isMunicipalWide ? 'Lahat ng Barangay' : 'Irosin'),
            role: data.role || 'RESPONDER',
            status: data.status || 'ACTIVE',
            isMunicipalWide: data.isMunicipalWide === true,
            phone: data.phone || '',
          };
        })
        .filter(u => {
          const isChiefAdmin =
            u.id === 'usr-admin' ||
            u.email === 'mdrmo.admin@irosin.gov.ph' ||
            u.role === 'MDRRMO_ADMIN' ||
            u.fullName.toLowerCase().includes('mdrrmo chief admin officer');
          return u.id !== currentUserId && u.status !== 'REJECTED' && u.status !== 'INACTIVE' && !isChiefAdmin;
        });

      // Client-side filter for search
      if (q) {
        docs = docs.filter(u =>
          u.fullName.toLowerCase().includes(q) ||
          u.barangayName.toLowerCase().includes(q) ||
          u.roleTitle.toLowerCase().includes(q)
        );
      }

      docs.sort((a, b) => a.fullName.localeCompare(b.fullName));

      const hasMore = docs.length > pageLimit;
      const results = docs.slice(0, pageLimit);
      const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].fullName : null;

      return res.json({ responders: results, nextCursor, hasMore });
    } catch (err: any) {
      console.error('[Chat] listResponders error:', err);
      return res.status(500).json({ error: err.message || 'Failed to list responders' });
    }
  }

  /**
   * GET /chat/conversations?cursor=&limit=50
   * Get the authenticated user's conversation list (Index-Safe Firestore fetch).
   */
  static async getConversations(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || (req.query.userId as string);
      if (!userId) {
        return res.status(401).json({ error: 'User identification required' });
      }

      const pageLimit = Math.min(Number(req.query.limit || 50), 100);

      const snap = await db.collection(CHATS_COL).get();
      const userChats = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(d => Array.isArray(d.participantIds) && d.participantIds.includes(userId));

      userChats.sort((a, b) => {
        const timeA = a.lastMessageAt?.toDate ? a.lastMessageAt.toDate().getTime() : new Date(a.lastMessageAt || 0).getTime();
        const timeB = b.lastMessageAt?.toDate ? b.lastMessageAt.toDate().getTime() : new Date(b.lastMessageAt || 0).getTime();
        return timeB - timeA;
      });

      const docs = userChats.slice(0, pageLimit);

      const conversations = docs.map(data => {
        const otherParticipantId = (data.participantIds as string[]).find(id => id !== userId) || '';
        const otherParticipant = (data.participants || {})[otherParticipantId] || {};

        let lastTimeStr: string | null = null;
        if (data.lastMessageAt?.toDate) {
          lastTimeStr = data.lastMessageAt.toDate().toISOString();
        } else if (typeof data.lastMessageAt === 'string') {
          lastTimeStr = data.lastMessageAt;
        }

        return {
          chatId: data.id,
          recipientId: otherParticipantId,
          recipientName: otherParticipant.fullName || 'Responder',
          recipientRoleTitle: otherParticipant.roleTitle || '',
          recipientBarangay: otherParticipant.barangayName || '',
          lastMessage: data.lastMessage || '',
          lastMessageAt: lastTimeStr,
          lastSenderId: data.lastSenderId || '',
          unreadCount: (data.unreadCounts || {})[userId] || 0,
        };
      });

      return res.json({ conversations, nextCursor: null, hasMore: userChats.length > pageLimit });
    } catch (err: any) {
      console.error('[Chat] getConversations error:', err);
      return res.status(500).json({ error: err.message || 'Failed to load conversations' });
    }
  }

  /**
   * GET /chat/:chatId/messages?cursor=&limit=50
   * Get paginated messages for a chat (newest first).
   */
  static async getMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId } = req.params;
      const cursor = req.query.cursor as string | undefined;
      const pageLimit = Math.min(Number(req.query.limit || 50), 100);

      const chatDoc = await db.collection(CHATS_COL).doc(chatId).get();
      if (!chatDoc.exists) {
        return res.json({ messages: [], nextCursor: null, hasMore: false });
      }

      let query: FirebaseFirestore.Query = db.collection(CHATS_COL)
        .doc(chatId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(pageLimit + 1);

      if (cursor) {
        query = query.startAfter(new Date(cursor));
      }

      const snap = await query.get();
      const hasMore = snap.docs.length > pageLimit;
      const docs = snap.docs.slice(0, pageLimit);

      const messages = docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          senderId: data.senderId,
          senderName: data.senderName || 'Responder',
          text: data.text || null,
          imageUrl: data.imageUrl || null,
          type: data.type || 'text',
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
          isSeen: data.isSeen === true || (Array.isArray(data.readBy) && data.readBy.length > 1),
          isEdited: data.isEdited === true,
          editedAt: data.editedAt || null,
          reactions: data.reactions || {},
          replyTo: data.replyTo || null,
        };
      });

      const nextCursor =
        hasMore && docs.length > 0
          ? (docs[docs.length - 1].data().createdAt?.toDate?.()?.toISOString?.() || null)
          : null;

      return res.json({ messages, nextCursor, hasMore });
    } catch (err: any) {
      console.error('[Chat] getMessages error:', err);
      return res.status(500).json({ error: err.message || 'Failed to load messages' });
    }
  }

  /**
   * POST /chat/send
   * Send a text or image message with replyTo support, real-time delivery and push notification.
   */
  static async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { recipientId, text, imageUrl, type = 'text', senderId: bodySenderId, senderName: bodySenderName, replyTo } = req.body;
      const sender = req.user;

      const senderId = sender?.id || bodySenderId;
      if (!senderId) {
        return res.status(401).json({ error: 'Sender identification required' });
      }

      if (!recipientId || typeof recipientId !== 'string') {
        return res.status(400).json({ error: 'recipientId is required' });
      }
      if (type === 'text' && (!text || !text.trim())) {
        return res.status(400).json({ error: 'text is required for text messages' });
      }
      if (type === 'image') {
        if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required for image messages' });
        if (!imageUrl.startsWith('data:image/webp;base64,') && !imageUrl.startsWith('data:image/jpeg;base64,')) {
          return res.status(400).json({ error: 'Invalid image format. Only WebP and JPEG are accepted.' });
        }
      }

      // Fetch sender details if missing
      let finalSenderName = sender?.fullName || bodySenderName || 'Responder';
      let finalSenderRole = sender?.roleTitle || sender?.role || 'Responder';
      let finalSenderBarangay = sender?.barangayName || '';

      if (!sender?.fullName) {
        try {
          const sDoc = await db.collection(USERS_COL).doc(senderId).get();
          if (sDoc.exists) {
            const sData = sDoc.data() as any;
            finalSenderName = sData.fullName || finalSenderName;
            finalSenderRole = sData.roleTitle || sData.role || finalSenderRole;
            finalSenderBarangay = sData.barangayName || finalSenderBarangay;
          }
        } catch {}
      }

      // Fetch recipient info
      const recipientDoc = await db.collection(USERS_COL).doc(recipientId).get();
      if (!recipientDoc.exists) {
        return res.status(404).json({ error: 'Recipient not found' });
      }
      const recipientData = recipientDoc.data() as any;

      const chatId = getChatId(senderId, recipientId);
      const now = new Date();
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const lastMessagePreview = type === 'image' ? '📷 Nagpadala ng larawan' : (text?.trim()?.slice(0, 100) || '');

      const messageData: Record<string, any> = {
        senderId,
        senderName: finalSenderName,
        type,
        createdAt: now,
        readBy: [senderId],
        isSeen: false,
        reactions: {},
      };
      if (type === 'text') messageData.text = text.trim();
      if (type === 'image') messageData.imageUrl = imageUrl;
      if (replyTo && typeof replyTo === 'object') {
        messageData.replyTo = {
          id: replyTo.id,
          senderName: replyTo.senderName || 'Responder',
          text: replyTo.text || null,
          type: replyTo.type || 'text',
        };
      }

      const batch = db.batch();

      // 1. Add message document to chat's subcollection
      const msgRef = db.collection(CHATS_COL).doc(chatId).collection('messages').doc(msgId);
      batch.set(msgRef, messageData);

      // 2. Create or update chat document
      const chatRef = db.collection(CHATS_COL).doc(chatId);
      const chatDoc = await chatRef.get();

      if (!chatDoc.exists) {
        batch.set(chatRef, {
          participantIds: [senderId, recipientId].sort(),
          participants: {
            [senderId]: {
              fullName: finalSenderName,
              roleTitle: finalSenderRole,
              barangayName: finalSenderBarangay,
            },
            [recipientId]: {
              fullName: recipientData.fullName || 'Responder',
              roleTitle: recipientData.roleTitle || recipientData.role || 'Responder',
              barangayName: recipientData.barangayName || '',
            },
          },
          lastMessage: lastMessagePreview,
          lastMessageAt: now,
          lastSenderId: senderId,
          unreadCounts: {
            [senderId]: 0,
            [recipientId]: 1,
          },
          createdAt: now,
        });
      } else {
        const existingData = chatDoc.data() as any;
        const currentRecipientUnread = (existingData.unreadCounts || {})[recipientId] || 0;
        batch.update(chatRef, {
          lastMessage: lastMessagePreview,
          lastMessageAt: now,
          lastSenderId: senderId,
          [`unreadCounts.${recipientId}`]: currentRecipientUnread + 1,
          [`unreadCounts.${senderId}`]: 0,
        });
      }

      await batch.commit();

      const messageResponse = {
        id: msgId,
        senderId,
        senderName: finalSenderName,
        text: type === 'text' ? text.trim() : null,
        imageUrl: type === 'image' ? imageUrl : null,
        type,
        createdAt: now.toISOString(),
        isSeen: false,
        reactions: {},
        replyTo: messageData.replyTo || null,
      };

      const socketPayload = {
        chatId,
        message: messageResponse,
        senderName: finalSenderName,
        senderRoleTitle: finalSenderRole,
        senderBarangay: finalSenderBarangay,
      };

      // 1. Real-time delivery to recipient and sender personal rooms
      emitToUser(recipientId, 'chat:new_message', socketPayload);
      emitToUser(senderId, 'chat:new_message', socketPayload);

      // 2. Send high-priority Push Notification to recipient
      const pushBody = type === 'image' ? '📷 Nagpadala ng larawan' : (text?.trim()?.slice(0, 120) || '');
      sendPushToUser(recipientId, finalSenderName, pushBody, {
        type: 'chat',
        chatId,
        senderId,
      }).catch(() => {});

      return res.status(201).json({ message: messageResponse, chatId });
    } catch (err: any) {
      console.error('[Chat] sendMessage error:', err);
      return res.status(500).json({ error: err.message || 'Failed to send message' });
    }
  }

  /**
   * PUT /chat/:chatId/messages/:messageId/react
   * Add or toggle emoji reaction on a message.
   */
  static async reactToMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId, messageId } = req.params;
      const { emoji, userId: bodyUserId } = req.body;
      const userId = req.user?.id || bodyUserId;

      if (!userId) return res.status(401).json({ error: 'User ID required' });
      if (!emoji) return res.status(400).json({ error: 'Emoji required' });

      const msgRef = db.collection(CHATS_COL).doc(chatId).collection('messages').doc(messageId);
      const msgDoc = await msgRef.get();
      if (!msgDoc.exists) return res.status(404).json({ error: 'Message not found' });

      const msgData = msgDoc.data() as any;
      const reactions = { ...(msgData.reactions || {}) };

      if (reactions[userId] === emoji) {
        delete reactions[userId]; // Toggle off
      } else {
        reactions[userId] = emoji; // Add/Update
      }

      await msgRef.update({ reactions });

      const payload = { chatId, messageId, reactions, userId };
      const chatDoc = await db.collection(CHATS_COL).doc(chatId).get();
      if (chatDoc.exists) {
        const participantIds = (chatDoc.data() as any).participantIds || [];
        participantIds.forEach((pId: string) => {
          emitToUser(pId, 'chat:reaction_updated', payload);
        });
      }

      return res.json({ success: true, reactions });
    } catch (err: any) {
      console.error('[Chat] reactToMessage error:', err);
      return res.status(500).json({ error: err.message || 'Failed to react to message' });
    }
  }

  /**
   * PUT /chat/:chatId/messages/:messageId/edit
   * Edit a message only if not yet seen by the recipient, and update conversation preview.
   */
  static async editMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId, messageId } = req.params;
      const { text, userId: bodyUserId } = req.body;
      const userId = req.user?.id || bodyUserId;

      if (!userId) return res.status(401).json({ error: 'User ID required' });
      if (!text || !text.trim()) return res.status(400).json({ error: 'Updated text required' });

      const msgRef = db.collection(CHATS_COL).doc(chatId).collection('messages').doc(messageId);
      const msgDoc = await msgRef.get();
      if (!msgDoc.exists) return res.status(404).json({ error: 'Message not found' });

      const msgData = msgDoc.data() as any;
      if (msgData.senderId !== userId) {
        return res.status(403).json({ error: 'Maaari mo lamang i-edit ang iyong sariling mensahe.' });
      }

      // Check if already seen
      if (msgData.isSeen === true || (Array.isArray(msgData.readBy) && msgData.readBy.length > 1)) {
        return res.status(400).json({ error: 'Hindi na maaaring i-edit ang mensahe dahil nabasa/na-seen na ito ng recipient.' });
      }

      const nowIso = new Date().toISOString();
      const updatedText = text.trim();
      await msgRef.update({
        text: updatedText,
        isEdited: true,
        editedAt: nowIso,
      });

      // Update conversation preview if this was the latest message
      const chatRef = db.collection(CHATS_COL).doc(chatId);
      const chatDoc = await chatRef.get();
      if (chatDoc.exists) {
        const cData = chatDoc.data() as any;
        if (cData.lastMessage === msgData.text || cData.lastSenderId === userId) {
          await chatRef.update({
            lastMessage: updatedText.slice(0, 100),
          });
        }
      }

      const payload = { chatId, messageId, text: updatedText, isEdited: true, editedAt: nowIso };

      // Broadcast edit to all participants
      if (chatDoc.exists) {
        const participantIds = (chatDoc.data() as any).participantIds || [];
        participantIds.forEach((pId: string) => {
          emitToUser(pId, 'chat:message_edited', payload);
          emitToUser(pId, 'chat:conversation_updated', {
            chatId,
            lastMessage: updatedText.slice(0, 100),
          });
        });
      }

      return res.json({ success: true, message: payload });
    } catch (err: any) {
      console.error('[Chat] editMessage error:', err);
      return res.status(500).json({ error: err.message || 'Failed to edit message' });
    }
  }

  /**
   * DELETE /chat/:chatId/messages/:messageId
   * Unsend a message only if not yet seen by the recipient, and update conversation preview.
   */
  static async unsendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId, messageId } = req.params;
      const userId = req.user?.id || (req.query.userId as string) || req.body?.userId;

      if (!userId) return res.status(401).json({ error: 'User ID required' });

      const msgRef = db.collection(CHATS_COL).doc(chatId).collection('messages').doc(messageId);
      const msgDoc = await msgRef.get();
      if (!msgDoc.exists) return res.status(404).json({ error: 'Message not found' });

      const msgData = msgDoc.data() as any;
      if (msgData.senderId !== userId) {
        return res.status(403).json({ error: 'Maaari mo lamang bawiin ang iyong sariling mensahe.' });
      }

      // Check if already seen
      if (msgData.isSeen === true || (Array.isArray(msgData.readBy) && msgData.readBy.length > 1)) {
        return res.status(400).json({ error: 'Hindi na maaaring bawiin ang mensahe dahil nabasa/na-seen na ito ng recipient.' });
      }

      // Delete message document
      await msgRef.delete();

      // Find new latest message in messages subcollection
      const chatRef = db.collection(CHATS_COL).doc(chatId);
      const chatDoc = await chatRef.get();
      let newLastMsg = '';
      let newLastTime = new Date();
      let newLastSender = '';

      if (chatDoc.exists) {
        const latestSnap = await chatRef.collection('messages').orderBy('createdAt', 'desc').limit(1).get();
        if (!latestSnap.empty) {
          const latestData = latestSnap.docs[0].data() as any;
          newLastMsg = latestData.type === 'image' ? '📷 Nagpadala ng larawan' : (latestData.text || '');
          newLastTime = latestData.createdAt;
          newLastSender = latestData.senderId;
        }

        await chatRef.update({
          lastMessage: newLastMsg,
          lastMessageAt: newLastTime,
          lastSenderId: newLastSender,
        });

        const payload = { chatId, messageId, senderId: userId };
        const participantIds = (chatDoc.data() as any).participantIds || [];
        participantIds.forEach((pId: string) => {
          emitToUser(pId, 'chat:message_unsent', payload);
          emitToUser(pId, 'chat:conversation_updated', {
            chatId,
            lastMessage: newLastMsg,
            lastMessageAt: newLastTime,
            lastSenderId: newLastSender,
          });
        });
      }

      return res.json({ success: true, messageId });
    } catch (err: any) {
      console.error('[Chat] unsendMessage error:', err);
      return res.status(500).json({ error: err.message || 'Failed to unsend message' });
    }
  }

  /**
   * PUT /chat/:chatId/read
   * Reset unread count for the user and mark incoming messages as SEEN.
   */
  static async markRead(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId } = req.params;
      const userId = req.user?.id || req.body?.userId;

      if (!userId) return res.status(401).json({ error: 'User ID required' });

      const chatRef = db.collection(CHATS_COL).doc(chatId);
      const chatDoc = await chatRef.get();
      if (!chatDoc.exists) return res.status(404).json({ error: 'Chat not found' });

      await chatRef.update({ [`unreadCounts.${userId}`]: 0 });

      // Mark unread messages in this chat as seen
      try {
        const msgsSnap = await chatRef.collection('messages')
          .where('isSeen', '==', false)
          .limit(20)
          .get();

        const batch = db.batch();
        let hasUpdates = false;

        msgsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.senderId !== userId) {
            batch.update(doc.ref, {
              isSeen: true,
              seenAt: new Date().toISOString(),
            });
            hasUpdates = true;
          }
        });

        if (hasUpdates) {
          await batch.commit();

          const participantIds = (chatDoc.data() as any).participantIds || [];
          const otherUserId = participantIds.find((id: string) => id !== userId);
          if (otherUserId) {
            emitToUser(otherUserId, 'chat:messages_seen', { chatId, seenBy: userId });
          }
        }
      } catch (seenErr) {
        console.warn('[Chat] markSeen batch notice:', seenErr);
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error('[Chat] markRead error:', err);
      return res.status(500).json({ error: err.message || 'Failed to mark as read' });
    }
  }

  /**
   * POST /chat/register-push-token
   * Associates a push token with the user for chat notifications.
   */
  static async registerPushToken(req: AuthenticatedRequest, res: Response) {
    try {
      const { token } = req.body;
      const userId = req.user?.id || req.body?.userId;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'token is required' });
      }
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      await db.collection(RESPONDER_TOKENS_COL).doc(userId).set({
        token,
        userId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return res.json({ success: true });
    } catch (err: any) {
      console.error('[Chat] registerPushToken error:', err);
      return res.status(500).json({ error: err.message || 'Failed to register push token' });
    }
  }
}
