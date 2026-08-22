import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { ExpoPushService } from '../services/pushNotificationService';
import { mockStore } from '../utils/mockStore';

export class PowerInterruptionController {
  private static async getRegisteredTokens(): Promise<string[]> {
    const tokensSet = new Set<string>();
    if (db) {
      try {
        const snapshot = await db.collection('push_tokens').get();
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data?.token && typeof data.token === 'string') {
            tokensSet.add(data.token);
          }
        });
      } catch (err) {
        console.warn('[PowerController] Firestore fetch push_tokens warning:', err);
      }
    }
    if (Array.isArray(mockStore.pushTokens)) {
      mockStore.pushTokens.forEach(t => {
        if (t?.token && typeof t.token === 'string') {
          tokensSet.add(t.token);
        }
      });
    }
    return Array.from(tokensSet);
  }

  public static async getAll(req: Request, res: Response) {
    try {
      if (db) {
        const snapshot = await db.collection('power_interruptions').get();
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        items.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        return res.json({ powerInterruptions: items });
      }
      return res.json({ powerInterruptions: [] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async create(req: Request, res: Response) {
    try {
      const { title, affectedBarangays, startTime, endTime, reason, status, issuedBy } = req.body;
      const now = new Date().toISOString();
      const id = `power-${Date.now()}`;

      const newAdvisory = {
        id,
        title: title || 'SORECO II Power Interruption Advisory',
        affectedBarangays: Array.isArray(affectedBarangays) ? affectedBarangays : ['All Irosin Feeders'],
        startTime: startTime || now,
        endTime: endTime || now,
        reason: reason || 'Scheduled preventive maintenance and line clearing.',
        status: status || 'SCHEDULED', // SCHEDULED | ONGOING | RESTORED
        issuedBy: issuedBy || 'SORECO II / MDRRMO Irosin',
        createdAt: now,
        updatedAt: now
      };

      if (db) {
        await db.collection('power_interruptions').doc(id).set(newAdvisory);
      }

      // Broadcast Push Notification to all devices
      const tokens = await PowerInterruptionController.getRegisteredTokens();
      if (tokens.length > 0) {
        const barangayList = newAdvisory.affectedBarangays.join(', ');
        await ExpoPushService.sendToTokens(
          tokens,
          `⚡ SORECO II Power Advisory: ${newAdvisory.title}`,
          `Apektadong Barangay: ${barangayList}. Dahilan: ${newAdvisory.reason}`,
          { type: 'POWER_INTERRUPTION', advisoryId: id }
        );
      }

      return res.status(201).json({ message: 'Power interruption advisory created and broadcasted', powerInterruption: newAdvisory });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const now = new Date().toISOString();

      if (db) {
        const docRef = db.collection('power_interruptions').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) return res.status(404).json({ error: 'Advisory not found' });

        const updatedData = {
          status,
          ...(reason ? { reason } : {}),
          updatedAt: now
        };

        await docRef.update(updatedData);

        // Send Push Notification if restored
        if (status === 'RESTORED') {
          const tokens = await PowerInterruptionController.getRegisteredTokens();
          if (tokens.length > 0) {
            await ExpoPushService.sendToTokens(
              tokens,
              '💡 Kuryente Naibalik Na (Power Restored)',
              `Naibalik na ang suplay ng kuryente para sa: ${doc.data()?.title}`,
              { type: 'POWER_RESTORED', advisoryId: id }
            );
          }
        }

        return res.json({ message: 'Status updated', powerInterruption: { id, ...doc.data(), ...updatedData } });
      }

      return res.status(500).json({ error: 'Database not initialized' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
