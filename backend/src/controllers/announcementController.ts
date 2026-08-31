import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { ExpoPushService } from '../services/pushNotificationService';
import { mockStore } from '../utils/mockStore';
import { emitRealtimeEvent } from '../services/socketService';

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

  public static ensure5W1HContent(item: any): string {
    const raw = (item.content || '').trim();
    if (/(?:^|\n)\s*(what|ano)\s*:/i.test(raw) && /(?:^|\n)\s*(when|kailan|where|saan)\s*:/i.test(raw)) {
      return raw;
    }

    const title = item.title || 'Opisyal na Anunsyo';
    const dateStr = item.eventDate ? `${item.eventDate}${item.startTime ? ` – ${item.startTime}` : ''}` : 'Kasalukuyan at Agaran';
    const brgyStr = Array.isArray(item.affectedBarangays) && item.affectedBarangays.length > 0 
      ? item.affectedBarangays.join(', ') 
      : 'Lahat ng 28 Barangay sa Bayan ng Irosin';

    let what = title;
    let when = dateStr;
    let where = brgyStr;
    let who = 'Lahat ng Residente at BDRRMC Responders';
    let why = 'Paghahanda at kaligtasan ng buong komunidad';
    let desc = raw || 'Sundin ang mga opisyal na tagubilin ng MDRRMO at lokal na pamahalaan.';

    const cat = (item.category || '').toLowerCase();
    if (cat.includes('pasok') || cat.includes('class') || cat.includes('suspension')) {
      what = `Pansamantalang Suspende ng Klase: ${title}`;
      who = 'Lahat ng mag-aaral mula Pre-School hanggang Senior High School';
      why = 'Banta ng malalakas na buhos ng ulan at posibleng pagbaha dulot ng sama ng panahon';
      desc = 'Manatili sa loob ng ligtas na tahanan at subaybayan ang mga susunod na opisyal na abiso.';
    } else if (cat.includes('kuryente') || cat.includes('power')) {
      what = `SORECO II Scheduled Power Interruption: ${title}`;
      who = 'Lahat ng residente, establisyemento, at konsumidores sa apektadong feeder';
      why = 'Pagsasaayos ng mga linya ng kuryente at clearing ng mga nakalaylay na sanga';
      desc = 'I-charge nang maaga ang mga flashlights, powerbanks, at emergency devices bago ang brownout.';
    } else if (cat.includes('ayuda') || cat.includes('relief')) {
      what = `Pamamahagi ng Ayuda at Relief Assistance: ${title}`;
      who = 'Mga apektadong pamilya at residente sa low-lying areas';
      why = 'Tulong at suportang pangkagipitan mula sa Pamahalaang Bayan at DSWD';
      desc = 'Magdala ng Valid ID o Barangay Certificate of Residency sa distribution site.';
    } else if (cat.includes('tubig') || cat.includes('water')) {
      what = `Irosin Water District Service Advisory: ${title}`;
      who = 'Mga konsumidores ng tubig sa sakop na barangay';
      why = 'Emergency repair ng pipeline at pagsasaayos ng water pump station';
      desc = 'Mag-ipon nang sapat na malinis na tubig para sa inumin at gamit sa bahay.';
    }

    return `What: ${what}\nWhen: ${when}\nWhere: ${where}\nWho: ${who}\nWhy: ${why}\n\n${desc}`;
  }

  /**
   * Get all official announcements with automatic 5W structure formatting
   */
  public static async getAll(req: Request, res: Response) {
    try {
      const DEFAULT_5W1H_ANNOUNCEMENTS = [
        {
          id: 'announcement-seed-1',
          title: 'Community Flood Preparedness Drill',
          category: 'Pangkalahatan',
          content: `What: Community Flood Preparedness Drill\nWhen: September 5, 2026 – 8:00 AM\nWhere: Barangay Covered Court\nWho: All residents\nWhy: To prepare residents for possible flooding\n\nResidents will follow the designated evacuation route. Magdala ng emergency bag at sumunod sa mga opisyal.`,
          affectedBarangays: ['San Agustin', 'Monbon', 'Gabao', 'San Julian'],
          imageUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800',
          status: 'ACTIVE',
          issuedBy: 'MDRRMO Irosin Operations Command',
          notedCount: 18,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'announcement-seed-2',
          title: 'SORECO II Scheduled Power Interruption',
          category: 'Kuryente',
          content: `What: Scheduled Power Line Maintenance & Tree Trimming\nWhen: September 6, 2026 – 8:00 AM hanggang 5:00 PM\nWhere: Monbon, San Agustin, Gabao, Tinampo, Bacolod\nWho: Lahat ng konsumidores sa apektadong 69kV feeder line\nWhy: Pagpapalit ng mga lumang poste at clearing ng mga sanga ng kahoy\n\nI-charge nang maaga ang mga emergency flashlights at mobile phones bago mag-alas otso ng umaga.`,
          affectedBarangays: ['Monbon', 'San Agustin', 'Gabao', 'Tinampo', 'Bacolod'],
          imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800',
          status: 'ACTIVE',
          issuedBy: 'SORECO II & MDRRMO Irosin',
          notedCount: 24,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'announcement-seed-3',
          title: 'Pansamantalang Walang Pasok sa Lahat ng Antas',
          category: 'Walang Pasok',
          content: `What: Suspende ng Klase sa Lahat ng Antas (Public at Private)\nWhen: September 7, 2026 – Buong Araw\nWhere: Lahat ng 28 Barangay sa Bayan ng Irosin\nWho: Mag-aaral mula Pre-School hanggang Tertiary Level\nWhy: Banta ng malalakas na pag-ulan at pagbaha dulot ng Low Pressure Area\n\nManatili sa ligtas na tahanan at patuloy na subaybayan ang weather updates sa MDRRMO app.`,
          affectedBarangays: ['Lahat ng Barangay sa Irosin'],
          imageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800',
          status: 'ACTIVE',
          issuedBy: 'Office of the Municipal Mayor & MDRRMO',
          notedCount: 42,
          createdAt: new Date(Date.now() - 10800000).toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'announcement-seed-4',
          title: 'Pamamahagi ng DSWD Family Food Packs & Relief',
          category: 'Ayuda at Relief',
          content: `What: Pamamahagi ng Emergency Relief Goods & Food Packs\nWhen: September 8, 2026 – 9:00 AM\nWhere: Irosin Municipal Covered Gymnasium\nWho: Mga residenteng nasa Low-Lying at High-Risk Flood Zones\nWhy: Suporta at tulong sa mga pamilyang naapektuhan ng pagbaha\n\nDalhin ang Valid Government ID o Barangay Certification upang makuha ang relief pack.`,
          affectedBarangays: ['San Julian', 'Buenavista', 'Bacolod', 'Cawayan'],
          imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800',
          status: 'ACTIVE',
          issuedBy: 'MSWDO & MDRRMO Irosin',
          notedCount: 15,
          createdAt: new Date(Date.now() - 14400000).toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      if (db) {
        const snapshot = await db.collection('announcements').get();
        if (snapshot.empty) {
          // Seed default 5W1H announcements into database
          for (const item of DEFAULT_5W1H_ANNOUNCEMENTS) {
            await db.collection('announcements').doc(item.id).set(item).catch(() => {});
          }
          return res.json({ announcements: DEFAULT_5W1H_ANNOUNCEMENTS });
        }

        const items = snapshot.docs.map(d => {
          const data: any = d.data();
          const formattedContent = AnnouncementController.ensure5W1HContent(data);
          
          // If content was updated to 5W1H, save back to Firestore
          if (formattedContent !== data.content) {
            db.collection('announcements').doc(d.id).update({ content: formattedContent }).catch(() => {});
          }

          return {
            id: d.id,
            ...data,
            content: formattedContent
          };
        });

        items.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        return res.json({ announcements: items });
      }

      return res.json({ announcements: DEFAULT_5W1H_ANNOUNCEMENTS });
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

      // Deduplicate by unique imageUrl so the same picture never appears twice
      const combined = [...defaultPresets, ...uploadedImages];
      const seenUrls = new Set<string>();
      const deduplicated: any[] = [];

      for (const item of combined) {
        const url = (item.imageUrl || '').trim();
        if (url && !seenUrls.has(url)) {
          seenUrls.add(url);
          deduplicated.push(item);
        }
      }

      return res.json({
        mediaLibrary: deduplicated
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
        emitRealtimeEvent('ANNOUNCEMENTS_CHANGED', { action: 'UPDATE', id, announcement: { id, ...doc.data(), ...updatedData } });
        return res.json({ message: 'Announcement updated', announcement: { id, ...doc.data(), ...updatedData } });
      }

      return res.status(500).json({ error: 'Database not initialized' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Delete announcement
   */
  public static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (db) {
        await db.collection('announcements').doc(id).delete();
        emitRealtimeEvent('ANNOUNCEMENTS_CHANGED', { action: 'DELETE', id });
        return res.json({ success: true, message: 'Announcement deleted successfully' });
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
