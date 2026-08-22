import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { ExpoPushService } from '../services/pushNotificationService';
import { mockStore } from '../utils/mockStore';

export type AnnouncementCategory =
  | 'POWER'
  | 'WATER'
  | 'CLASS_SUSPENSION'
  | 'RELIEF_ASSISTANCE'
  | 'HEALTH_MEDICAL'
  | 'TRAFFIC_ROAD'
  | 'GENERAL';

export class AnnouncementController {
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
        console.warn('[AnnouncementController] Firestore fetch push_tokens warning:', err);
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

  /**
   * Get all official announcements
   */
  public static async getAll(req: Request, res: Response) {
    try {
      if (db) {
        const snapshot = await db.collection('announcements').get();
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        items.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        return res.json({ announcements: items });
      }
      return res.json({ announcements: [] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get reusable media library images (to save storage and reuse banners)
   */
  public static async getMediaLibrary(req: Request, res: Response) {
    try {
      const defaultPresets = [
        {
          id: 'preset-soreco',
          title: 'SORECO II Official Power Advisory Banner',
          category: 'POWER',
          imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800'
        },
        {
          id: 'preset-water',
          title: 'Irosin Water District Service Advisory Banner',
          category: 'WATER',
          imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=800'
        },
        {
          id: 'preset-suspension',
          title: 'Walang Pasok / Suspension of Classes Banner',
          category: 'CLASS_SUSPENSION',
          imageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800'
        },
        {
          id: 'preset-relief',
          title: 'DSWD / LGU Relief & Ayuda Distribution Banner',
          category: 'RELIEF_ASSISTANCE',
          imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800'
        },
        {
          id: 'preset-health',
          title: 'MDRRMO & RHU Medical & Vaccination Mission Banner',
          category: 'HEALTH_MEDICAL',
          imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800'
        },
        {
          id: 'preset-general',
          title: 'MDRRMO Irosin General Official Notice Banner',
          category: 'GENERAL',
          imageUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800'
        }
      ];

      const uploadedImages: any[] = [];
      if (db) {
        try {
          const mediaSnap = await db.collection('media_library').get();
          mediaSnap.forEach(d => {
            uploadedImages.push({ id: d.id, ...d.data() });
          });
        } catch (e) {
          console.warn('[MediaLibrary] Firestore fetch error:', e);
        }
      }

      return res.json({
        mediaLibrary: [...uploadedImages, ...defaultPresets]
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Create an announcement and broadcast push notification
   */
  public static async create(req: Request, res: Response) {
    try {
      const {
        title,
        category,
        content,
        summary,
        affectedBarangays,
        eventDate,
        startTime,
        endTime,
        imageUrl,
        photoUrl,
        photos,
        status,
        issuedBy,
        isPinned
      } = req.body;

      const now = new Date().toISOString();
      const id = `announcement-${Date.now()}`;

      const finalImageUrl = imageUrl || photoUrl || (Array.isArray(photos) && photos.length > 0 ? photos[0] : '');

      const newAnnouncement = {
        id,
        title: title || 'MDRRMO Irosin Official Announcement',
        category: category || 'GENERAL',
        content: content || '',
        summary: summary || content?.substring(0, 120) || '',
        affectedBarangays: Array.isArray(affectedBarangays) && affectedBarangays.length > 0 ? affectedBarangays : ['Lahat ng Barangay sa Irosin'],
        eventDate: eventDate || now.split('T')[0],
        startTime: startTime || '',
        endTime: endTime || '',
        imageUrl: finalImageUrl,
        photos: finalImageUrl ? [finalImageUrl] : [],
        status: status || 'ACTIVE', // ACTIVE | SCHEDULED | ARCHIVED
        issuedBy: issuedBy || 'MDRRMO Irosin / LGU Sorsogon',
        isPinned: !!isPinned,
        notedCount: 0,
        createdAt: now,
        updatedAt: now
      };

      if (db) {
        await db.collection('announcements').doc(id).set(newAnnouncement);

        // Also save image to reusable media library if provided and not a default preset
        if (finalImageUrl && !finalImageUrl.includes('unsplash.com/photo-default')) {
          const mediaId = `media-${Date.now()}`;
          await db.collection('media_library').doc(mediaId).set({
            id: mediaId,
            title: title || 'Uploaded Announcement Banner',
            category: category || 'GENERAL',
            imageUrl: finalImageUrl,
            createdAt: now
          }).catch(() => {});
        }
      }

      // Broadcast Push Notification
      const tokens = await AnnouncementController.getRegisteredTokens();
      if (tokens.length > 0) {
        const categoryLabel = newAnnouncement.category || 'Opisyal na Anunsyo';
        await ExpoPushService.sendToTokens(
          tokens,
          `📢 [${categoryLabel}] ${newAnnouncement.title}`,
          newAnnouncement.content ? (newAnnouncement.content.length > 130 ? `${newAnnouncement.content.substring(0, 130)}...` : newAnnouncement.content) : 'Pindutin upang mabasa ang buong anunsyo.',
          { type: 'ANNOUNCEMENT', announcementId: id, category: newAnnouncement.category }
        );
      }

      return res.status(201).json({
        message: 'Announcement posted and push notifications broadcasted successfully',
        announcement: newAnnouncement
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Update announcement status or details
   */
  public static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const now = new Date().toISOString();

      if (db) {
        const docRef = db.collection('announcements').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) return res.status(404).json({ error: 'Announcement not found' });

        const updatedData = {
          ...updates,
          updatedAt: now
        };

        await docRef.update(updatedData);
        return res.json({ message: 'Announcement updated', announcement: { id, ...doc.data(), ...updatedData } });
      }

      return res.status(500).json({ error: 'Database not initialized' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * 1-Action per device Noted counter
   */
  public static async toggleNoted(req: Request, res: Response) {
    try {
      const { id } = req.params;
      let count = 1;
      if (db) {
        const docRef = db.collection('announcements').doc(id);
        const doc = await docRef.get();
        if (doc.exists) {
          count = (doc.data()?.notedCount || 0) + 1;
          await docRef.update({ notedCount: count });
        }
      }
      return res.json({ success: true, notedCount: count });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
