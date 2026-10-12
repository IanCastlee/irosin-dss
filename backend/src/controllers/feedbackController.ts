import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { emitRealtimeEvent } from '../services/socketService';

export class FeedbackController {
  /**
   * Public endpoint: Citizens submit feedback or suggestion
   * POST /api/v1/feedback
   */
  static async submitFeedback(req: Request, res: Response) {
    try {
      const { name, message, contactNumber, barangayName, category } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Kailangan ang pangalan ng nagpapadala.' });
      }

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Kailangan ang nilalaman o mensahe ng feedback.' });
      }

      const feedbackId = `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();

      const newFeedback = {
        id: feedbackId,
        name: name.trim(),
        message: message.trim(),
        contactNumber: contactNumber ? String(contactNumber).trim() : '',
        barangayName: barangayName ? String(barangayName).trim() : 'Irosin',
        category: category || 'SUGGESTION', // SUGGESTION, COMPLAINT, INQUIRY, COMMENDATION, OTHER
        status: 'NEW', // NEW, REVIEWED, RESOLVED
        createdAt: nowIso,
        updatedAt: nowIso
      };

      if (db) {
        await db.collection('user_feedbacks').doc(feedbackId).set(newFeedback);
      }

      // Notify Admin in real-time via Socket.IO
      try {
        emitRealtimeEvent('new_citizen_feedback', newFeedback);
      } catch (sockErr) {
        console.warn('[Feedback] Socket emit warning:', sockErr);
      }

      return res.status(201).json({
        success: true,
        message: 'Matagumpay na naipadala ang inyong puna at suhestiyon sa MDRRMO. Maraming salamat!',
        feedback: newFeedback
      });
    } catch (error: any) {
      console.error('[Feedback] Submit error:', error);
      return res.status(500).json({ error: error?.message || 'Hindi naipadala ang feedback. Pakisubukang muli.' });
    }
  }

  /**
   * Admin endpoint: Get all feedbacks
   * GET /api/v1/feedback
   */
  static async getAllFeedbacks(req: Request, res: Response) {
    try {
      if (!db) {
        return res.json({ success: true, feedbacks: [] });
      }

      const snapshot = await db.collection('user_feedbacks').orderBy('createdAt', 'desc').limit(150).get();
      const feedbacks: any[] = [];
      snapshot.forEach(doc => {
        feedbacks.push({ id: doc.id, ...doc.data() });
      });

      return res.json({ success: true, feedbacks });
    } catch (error: any) {
      console.error('[Feedback] Get feedbacks error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to fetch feedbacks' });
    }
  }

  /**
   * Admin endpoint: Update feedback status
   * PATCH /api/v1/feedback/:id/status
   */
  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      if (!['NEW', 'REVIEWED', 'RESOLVED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }

      if (!db) {
        return res.status(500).json({ error: 'Database unavailable' });
      }

      const docRef = db.collection('user_feedbacks').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Feedback not found' });
      }

      const updateData: any = {
        status,
        updatedAt: new Date().toISOString()
      };
      if (adminNotes !== undefined) {
        updateData.adminNotes = adminNotes;
      }

      await docRef.update(updateData);

      // Realtime notification of status change
      try {
        emitRealtimeEvent('citizen_feedback_status_updated', { id, status, adminNotes });
      } catch {}

      return res.json({ success: true, message: 'Status updated', id, status });
    } catch (error: any) {
      console.error('[Feedback] Update status error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to update status' });
    }
  }

  /**
   * Admin endpoint: Delete feedback
   * DELETE /api/v1/feedback/:id
   */
  static async deleteFeedback(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!db) {
        return res.status(500).json({ error: 'Database unavailable' });
      }

      await db.collection('user_feedbacks').doc(id).delete();

      try {
        emitRealtimeEvent('citizen_feedback_deleted', { id });
      } catch {}

      return res.json({ success: true, message: 'Feedback deleted' });
    } catch (error: any) {
      console.error('[Feedback] Delete error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to delete feedback' });
    }
  }
}
