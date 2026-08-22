import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { mockStore } from '../utils/mockStore';
import { DisasterReportSchema } from '../validators';
import { logAudit } from '../utils/logger';

export class DisasterReportController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const barangayId = req.query.barangayId as string;
      const barangayName = req.query.barangayName as string;
      const status = req.query.status as string;
      const cursor = req.query.cursor as string;
      const limitParam = parseInt(req.query.limit as string, 10);
      const limit = !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 20;

      let reportsMap = new Map<string, any>();
      mockStore.disasterReports.forEach(r => reportsMap.set(r.id, r));

      // 1. Fetch from Firestore with 10s timeout protection (prevents 300s DEADLINE_EXCEEDED hang)
      try {
        const { db, isFirebaseActive } = await import('../config/firebase');
        if (db && isFirebaseActive()) {
          const fetchPromise = db.collection('disaster_reports').get();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Firestore gRPC fetch timeout (10s)')), 10000)
          );
          const snapshot: any = await Promise.race([fetchPromise, timeoutPromise]);
          if (snapshot) {
            reportsMap.clear();
            if (!snapshot.empty) {
              snapshot.docs.forEach((d: any) => {
                const r = { id: d.id, ...d.data() };
                reportsMap.set(d.id, r);
              });
            }
            // Update in-memory cache so subsequent requests are instant and sync 100% with Firestore
            mockStore.disasterReports = Array.from(reportsMap.values());
          }
        }
      } catch (err: any) {
        console.warn('[DisasterReportController] ⚠️ Firestore notice:', err?.message);
      }

      let reports = Array.from(reportsMap.values());

      // Apply Filters
      let filtered = reports;
      if (barangayId) filtered = filtered.filter(r => r.barangayId === barangayId);
      if (barangayName) {
        const cleanName = barangayName.toLowerCase().trim();
        filtered = filtered.filter(r => {
          const rBrgy = (r.barangayName || '').toLowerCase();
          const rLoc = (r.locationDescription || '').toLowerCase();
          return rBrgy.includes(cleanName) || cleanName.includes(rBrgy) || rLoc.includes(cleanName);
        });
      }
      if (status) filtered = filtered.filter(r => r.status === status);

      // Sort descending by date
      filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      // Pagination
      let startIndex = 0;
      if (cursor) {
        const cursorIndex = filtered.findIndex(r => r.createdAt === cursor || r.id === cursor);
        if (cursorIndex !== -1) {
          startIndex = cursorIndex + 1;
        }
      }

      const paginated = filtered.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < filtered.length;
      const nextCursor = paginated.length > 0 ? (paginated[paginated.length - 1].createdAt || paginated[paginated.length - 1].id) : null;

      console.log(`📡 [GET /reports] Returning ${paginated.length} reports to client (Total stored: ${filtered.length})`);

      return res.json({
        disasterReports: paginated,
        nextCursor,
        hasMore,
        limit
      });
    } catch (err: any) {
      console.error('[DisasterReportController] ❌ Error in getAll:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      let report = mockStore.disasterReports.find(r => r.id === id);

      if (!report) {
        try {
          const { db, isFirebaseActive } = await import('../config/firebase');
          if (db && isFirebaseActive()) {
            const fetchPromise = db.collection('disaster_reports').doc(id).get();
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Firestore doc timeout (3.5s)')), 3500)
            );
            const doc: any = await Promise.race([fetchPromise, timeoutPromise]);
            if (doc && doc.exists) {
              report = { id: doc.id, ...doc.data() } as any;
            }
          }
        } catch {}
      }

      if (!report) return res.status(404).json({ error: 'Report not found' });
      return res.json({ disasterReport: report });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async submit(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = DisasterReportSchema.parse(req.body);
      const user = req.user;
      const isAdmin = user && ((user.role as string) === 'MDRRMO_ADMIN' || (user.role as string) === 'SUPER_ADMIN' || (user.role as string) === 'ADMIN');
      const barangay = mockStore.barangays.find(b => b.id === validated.barangayId);

      const reporterId = user ? user.id : (validated.reporterPhone || req.ip || 'citizen-anonymous');
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const initialStatus = isAdmin && req.body.status ? req.body.status : (isAdmin ? 'VERIFIED' : 'PENDING');
      const reportId = req.body.id || ('report-' + Date.now());
      const rawPhotos = Array.isArray(req.body.photos) ? req.body.photos : (validated.imageUrl ? [validated.imageUrl] : []);
      const cleanPhotos = Array.from(new Set(rawPhotos.filter((p: any) => typeof p === 'string' && p.trim())));

      const initialStage = initialStatus === 'PENDING' ? 'PENDING' : 'INCIDENT';
      const initialLabel = initialStatus === 'PENDING' ? '⏳ PENDING' : '🚨 INSIDENTE';

      const photoItems = cleanPhotos.map((uri: any) => ({
        uri: String(uri),
        stage: initialStage,
        label: initialLabel,
        uploadedBy: user ? user.fullName : (validated.reporterName || 'Residente'),
        createdAt: new Date().toISOString()
      }));

      const newReport: any = {
        id: reportId,
        ...validated,
        barangayName: barangay ? barangay.name : (req.body.barangayName || 'Barangay Monbon'),
        reportedBy: user ? user.id : reporterId,
        reporterName: user ? user.fullName : (validated.reporterName || 'MDRRMO Operations Command'),
        reporterPhone: user ? user.phone : (validated.reporterPhone || 'N/A'),
        reporterRole: (user ? user.role : 'RESIDENT') as any,
        status: initialStatus as any,
        verifiedBy: isAdmin ? (user?.fullName || 'MDRRMO Admin') : undefined,
        adminNotes: req.body.adminNotes || (isAdmin ? 'Direktang inisyu ng MDRRMO Command Center' : undefined),
        affectedRoute: req.body.affectedRoute || undefined,
        alternateRoute: req.body.alternateRoute || undefined,
        photos: cleanPhotos,
        photoItems,
        imageUrl: cleanPhotos.length > 0 ? cleanPhotos[0] : (validated.imageUrl || undefined),
        photoUrl: cleanPhotos.length > 0 ? cleanPhotos[0] : (validated.imageUrl || undefined),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockStore.disasterReports.unshift(newReport);

      console.log('====================================================');
      console.log(`📥 [NEW DISASTER REPORT RECEIVED]`);
      console.log(`ID: ${newReport.id}`);
      console.log(`Type: ${newReport.reportType}`);
      console.log(`Barangay: ${newReport.barangayName} (ID: ${newReport.barangayId})`);
      console.log(`Location: ${newReport.locationDescription}`);
      console.log(`Status: ${newReport.status}`);
      console.log(`Photos Count: ${cleanPhotos.length}`);
      console.log('====================================================');

      // Sync to Firebase Cloud Firestore
      try {
        const { db } = await import('../config/firebase');
        if (db) {
          try {
            await db.collection('disaster_reports').doc(newReport.id).set(newReport, { merge: true });
            console.log(`✅ [Firestore Sync] Report ${newReport.id} successfully written to Cloud Firestore`);
          } catch (writeErr: any) {
            console.warn('[Firebase] Initial write notice:', writeErr?.message);
          }
        }
      } catch (fbInitErr) {
        console.warn('[Firebase] Firestore init notice:', fbInitErr);
      }

      // If created directly by Admin as VERIFIED or UNDER_CLEARING, broadcast Push Notification
      if (isAdmin && ['VERIFIED', 'UNDER_CLEARING'].includes(newReport.status)) {
        try {
          const { ExpoPushService } = await import('../services/pushNotificationService');
          const tokensSet = new Set<string>();
          const { db } = await import('../config/firebase');
          if (db) {
            const tokenSnap = await db.collection('push_tokens').get();
            tokenSnap.forEach(d => {
              const t = d.data()?.token;
              if (t && typeof t === 'string') tokensSet.add(t);
            });
          }
          const tokens = Array.from(tokensSet);
          if (tokens.length > 0) {
            const statusPrefix = newReport.status === 'UNDER_CLEARING' ? '🚧 Kasalukuyang Inaayos' : '🚨 Opisyal na Ulat sa Daan';
            await ExpoPushService.sendToTokens(
              tokens,
              `${statusPrefix}: ${newReport.reportType.replace(/_/g, ' ')} (${newReport.barangayName})`,
              `${newReport.locationDescription}: ${newReport.description}`,
              { type: 'ROAD_HAZARD_UPDATE', reportId: newReport.id, status: newReport.status }
            );
          }
        } catch (pushErr) {
          console.warn('[Push] Error broadcasting admin report:', pushErr);
        }
      }

      // Notify all Admin Web Browsers via W3C Web Push (Wakes up closed Chrome/Edge tabs)
      try {
        const { WebPushService } = await import('../services/webPushService');
        WebPushService.notifyAdminsOfNewReport(newReport).catch(webPushErr => {
          console.warn('[WebPush] Error notifying admin browsers:', webPushErr);
        });
      } catch (err) {
        console.warn('[WebPush] Service import error:', err);
      }

      // Broadcast Mobile Push Notification directly to Authorized MDRRMO Responders in this Barangay and Admins
      try {
        const { ExpoPushService } = await import('../services/pushNotificationService');
        const tokensSet = new Set<string>();
        const { db, isFirebaseActive } = await import('../config/firebase');

        if (db && isFirebaseActive()) {
          // 1. Find all active Responders assigned to this barangay and MDRRMO Admins in users collection
          try {
            const usersSnap = await db.collection('users').get();
            usersSnap.forEach(d => {
              const u = d.data();
              if (u && u.fcmToken && typeof u.fcmToken === 'string' && u.fcmToken.trim()) {
                const uRole = (u.role || '').toUpperCase();
                const isAdmin = uRole === 'MDRRMO_ADMIN' || uRole === 'SUPER_ADMIN' || uRole === 'ADMIN';
                const isMunicipalWide = u.isMunicipalWide === true || u.jurisdiction === 'ALL_BARANGAYS' || (u.barangayName || '').toUpperCase() === 'ALL' || uRole.includes('MDRRMO');

                const clean = (s: string) => (s || '').toLowerCase().replace(/^brgy\.?\s*/i, '').trim();
                const extractMainBrgy = (s: string) => {
                  const parts = clean(s).split(/[,–-]/).map(x => x.trim()).filter(Boolean);
                  return parts[0] || clean(s);
                };

                const uMain = extractMainBrgy(u.barangayName);
                const rMain = extractMainBrgy(newReport.barangayName);

                const isBrgyMatch = (u.barangayId && u.barangayId === newReport.barangayId) ||
                  (uMain && rMain && (uMain === rMain || uMain.startsWith(rMain) || rMain.startsWith(uMain)));

                // Admins, Municipal-Wide Responders (QRT), OR matching Barangay Responders receive this
                if (isAdmin || isMunicipalWide || isBrgyMatch) {
                  tokensSet.add(u.fcmToken.trim());
                }
              }
            });
          } catch (usersErr) {
            console.warn('[Push] Error querying users for responder tokens:', usersErr);
          }

          // 2. Also check admin_push_tokens (MDRRMO Command Center)
          try {
            const adminSnap = await db.collection('admin_push_tokens').get();
            adminSnap.forEach(d => {
              const t = d.data()?.token;
              if (t && typeof t === 'string' && t.trim()) tokensSet.add(t.trim());
            });
          } catch {}

          // 3. Check push_tokens collection ONLY for explicit matching barangay
          try {
            const tokenSnap = await db.collection('push_tokens').get();
            tokenSnap.forEach(d => {
              const data = d.data();
              const t = data?.token;
              if (t && typeof t === 'string' && t.trim()) {
                if (data.barangayName || data.barangayId) {
                  const clean = (s: string) => (s || '').toLowerCase().replace(/^brgy\.?\s*/i, '').trim();
                  const extractMainBrgy = (s: string) => {
                    const parts = clean(s).split(/[,–-]/).map(x => x.trim()).filter(Boolean);
                    return parts[0] || clean(s);
                  };
                  const tMain = extractMainBrgy(data.barangayName);
                  const rMain = extractMainBrgy(newReport.barangayName);
                  const isMatch = (data.barangayId && data.barangayId === newReport.barangayId) ||
                    (tMain && rMain && (tMain === rMain || tMain.startsWith(rMain) || rMain.startsWith(tMain)));
                  if (isMatch) {
                    tokensSet.add(t.trim());
                  }
                }
              }
            });
          } catch {}
        }

        const tokens = Array.from(tokensSet);
        if (tokens.length > 0) {
          const loc = newReport.streetLocation || newReport.locationDescription || `Brgy. ${newReport.barangayName}`;
          const formattedType = (newReport.reportType || 'HAZARD').replace(/_/g, ' ');
          await ExpoPushService.sendToTokens(
            tokens,
            `🚨 BAGONG ULAT SA BRGY. ${newReport.barangayName.toUpperCase()}: ${formattedType}`,
            `📍 ${loc}\n📝 ${newReport.description || 'May bagong ulat ng sakuna/insidente sa inyong nasasakupan.'}`,
            {
              type: 'NEW_DISASTER_REPORT',
              reportId: newReport.id,
              barangayName: newReport.barangayName,
              barangayId: newReport.barangayId
            }
          );
          console.log(`📡 [Push Notification] Dispatched new report alert to ${tokens.length} responder device(s) for Brgy. ${newReport.barangayName}`);
        } else {
          console.log(`ℹ️ [Push Notification] No registered tokens found for Brgy. ${newReport.barangayName}`);
        }
      } catch (mobilePushErr) {
        console.warn('[Push] Error broadcasting new report to mobile devices:', mobilePushErr);
      }

      logAudit(
        'SUBMIT_REPORT',
        newReport.reporterName,
        newReport.reporterRole,
        'disaster_reports',
        newReport.id,
        `Submitted report of type ${newReport.reportType}`
      );

      return res.status(201).json({
        message: 'Disaster report recorded successfully.',
        disasterReport: newReport
      });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
      return res.status(500).json({ error: err.message });
    }
  }

  public static async verifyOrUpdateStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, adminNotes, affectedRoute, photos, photoUrl } = req.body;

      if (!['VERIFIED', 'UNDER_CLEARING', 'REJECTED', 'RESOLVED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be VERIFIED, UNDER_CLEARING, REJECTED, or RESOLVED' });
      }

      let report: any = mockStore.disasterReports.find(r => r.id === id);

      // If not in RAM, fetch from Firestore
      const { db } = await import('../config/firebase');
      if (!report && db) {
        const doc = await db.collection('disaster_reports').doc(id).get();
        if (doc.exists) {
          report = { id: doc.id, ...doc.data() };
          mockStore.disasterReports.unshift(report);
        }
      }

      if (!report) {
        report = {
          id,
          reportType: 'ROAD_HAZARD',
          title: 'Road & Hazard Incident',
          barangayName: 'Irosin',
          locationDescription: affectedRoute || 'Irosin, Sorsogon',
          description: adminNotes || 'Hazard report updated by admin',
          status: status || 'VERIFIED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        mockStore.disasterReports.unshift(report);
      }

      report.status = status;
      if (adminNotes !== undefined) report.adminNotes = adminNotes;
      if (affectedRoute !== undefined) report.affectedRoute = affectedRoute;
      report.verifiedBy = req.user?.fullName || req.user?.id || 'MDRRMO Admin';

      if (!Array.isArray(report.photoItems)) {
        const existingList = Array.isArray(report.photos) ? report.photos : (report.imageUrl ? [report.imageUrl] : []);
        report.photoItems = existingList.map((uri: string) => ({
          uri,
          stage: 'INCIDENT',
          label: '🚨 INSIDENTE',
          uploadedBy: report.reporterName || 'Residente',
          createdAt: report.createdAt || new Date().toISOString()
        }));
      } else {
        // When report is verified or higher, promote any previously PENDING photos to INCIDENT
        if (status !== 'PENDING') {
          report.photoItems.forEach((pi: any) => {
            if (pi.stage === 'PENDING') {
              pi.stage = 'INCIDENT';
              pi.label = '🚨 INSIDENTE';
            }
          });
        }
      }

      const adminPhotoList = Array.isArray(photos) ? photos : (photoUrl ? [photoUrl] : []);
      if (adminPhotoList.length > 0) {
        if (!Array.isArray(report.photos)) report.photos = [];
        const actionLabel =
          status === 'RESOLVED'
            ? '✅ LIGTAS NA'
            : status === 'UNDER_CLEARING'
            ? '🚧 CLEARING'
            : status === 'REJECTED'
            ? '❌ TINANGGIHAN'
            : '🚨 INSIDENTE';

        const photoStage = status === 'VERIFIED' ? 'INCIDENT' : (status || 'UNDER_CLEARING');

        adminPhotoList.forEach((p: string) => {
          if (p && typeof p === 'string' && p.trim()) {
            const clean = p.trim();
            if (!report.photos.includes(clean)) {
              report.photos.push(clean);
              report.photoItems.push({
                uri: clean,
                stage: photoStage,
                label: actionLabel,
                uploadedBy: report.verifiedBy || 'MDRRMO Admin',
                createdAt: new Date().toISOString()
              });
            }
          }
        });
      }

      report.updatedAt = new Date().toISOString();

      // Sync status update to Firestore
      if (db) {
        try {
          await db.collection('disaster_reports').doc(report.id).set(report, { merge: true });
        } catch (err: any) {
          console.warn('[Firebase] Firestore status update warning:', err?.message);
        }
      }

      // Send automated push notification when report is verified, clearing, or resolved
      if (['VERIFIED', 'UNDER_CLEARING', 'RESOLVED'].includes(status)) {
        try {
          const { ExpoPushService } = await import('../services/pushNotificationService');
          const tokensSet = new Set<string>();
          if (db) {
            const tokenSnap = await db.collection('push_tokens').get();
            tokenSnap.forEach(d => {
              const t = d.data()?.token;
              if (t && typeof t === 'string') tokensSet.add(t);
            });
          }
          if (Array.isArray(mockStore.pushTokens)) {
            mockStore.pushTokens.forEach(t => {
              if (t?.token && typeof t.token === 'string') tokensSet.add(t.token);
            });
          }
          const tokens = Array.from(tokensSet);
          if (tokens.length > 0) {
            const statusPrefix = status === 'RESOLVED' ? '✅ Ligtas Na' : (status === 'UNDER_CLEARING' ? '🚧 Kasalukuyang Inaayos' : '🚨 Na-verify na Perwisyo sa Daan');
            await ExpoPushService.sendToTokens(
              tokens,
              `${statusPrefix}: ${(report.reportType || 'Hazard').replace(/_/g, ' ')} (${report.barangayName || 'Irosin'})`,
              `${report.locationDescription || ''}: ${report.description || ''}`,
              { type: 'ROAD_HAZARD_UPDATE', reportId: report.id, status }
            );
          }
        } catch (pushErr) {
          console.warn('[Push] Push notification broadcast warning:', pushErr);
        }
      }

      logAudit(
        'VERIFY_REPORT',
        req.user?.fullName || 'Admin',
        req.user?.role || 'MDRRMO_ADMIN',
        'disaster_reports',
        report.id,
        `Updated status to ${status}. Admin notes: ${adminNotes || 'None'}`
      );

      return res.json({
        message: `Report status updated to ${status} by ${report.verifiedBy}`,
        disasterReport: report
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async responderAction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        status,
        responderNotes,
        actionTakenBy,
        roleTitle,
        barangayName,
        photoUrl,
        photos,
        requestBackup,
        alternateRoute,
        affectedRoute
      } = req.body;

      const validStatuses = ['VERIFIED', 'UNDER_CLEARING', 'RESOLVED', 'IMPASSABLE', 'PENDING'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }

      let report: any = mockStore.disasterReports.find(r => r.id === id);

      const { db } = await import('../config/firebase');
      if (!report && db) {
        const doc = await db.collection('disaster_reports').doc(id).get();
        if (doc.exists) {
          report = { id: doc.id, ...doc.data() };
          mockStore.disasterReports.unshift(report);
        }
      }

      if (!report) {
        // Automatically upsert legacy / mock report into Firestore
        report = {
          id,
          reportType: 'ROAD_HAZARD',
          title: 'Road & Hazard Incident',
          barangayName: barangayName || 'Irosin',
          locationDescription: affectedRoute || 'Irosin, Sorsogon',
          description: responderNotes || 'Hazard report updated by responder',
          status: status || 'UNDER_CLEARING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        mockStore.disasterReports.unshift(report);
      }

      if (status) report.status = status;
      if (responderNotes !== undefined) report.adminNotes = responderNotes;
      if (alternateRoute !== undefined) report.alternateRoute = alternateRoute;
      if (affectedRoute !== undefined) report.affectedRoute = affectedRoute;
      if (actionTakenBy) {
        const who = `${actionTakenBy}${roleTitle ? ` (${roleTitle})` : ''}${barangayName ? ` - ${barangayName}` : ''}`;
        report.verifiedBy = who;
      }
      if (Array.isArray(req.body.photoItems) && req.body.photoItems.length > 0) {
        report.photoItems = req.body.photoItems;
        if (status !== 'PENDING') {
          report.photoItems.forEach((pi: any) => {
            if (pi.stage === 'PENDING') {
              pi.stage = 'INCIDENT';
              pi.label = '🚨 INSIDENTE';
            }
          });
        }
        report.photos = req.body.photoItems.map((pi: any) => pi.uri);
      } else if (Array.isArray(photos) && photos.length > 0) {
        if (!Array.isArray(report.photos)) report.photos = [];
        if (!Array.isArray(report.photoItems)) {
          report.photoItems = report.photos.map((uri: string) => ({
            uri,
            stage: 'INCIDENT',
            label: '🚨 INSIDENTE',
            uploadedBy: report.reporterName || 'Residente',
            createdAt: report.createdAt || new Date().toISOString()
          }));
        } else if (status !== 'PENDING') {
          report.photoItems.forEach((pi: any) => {
            if (pi.stage === 'PENDING') {
              pi.stage = 'INCIDENT';
              pi.label = '🚨 INSIDENTE';
            }
          });
        }
        const actionLabel =
          status === 'RESOLVED'
            ? '✅ LIGTAS NA'
            : status === 'UNDER_CLEARING'
            ? '🚧 CLEARING'
            : status === 'REJECTED'
            ? '❌ TINANGGIHAN'
            : '🚨 INSIDENTE';

        const photoStage = status === 'VERIFIED' ? 'INCIDENT' : (status || 'UNDER_CLEARING');

        photos.forEach((p: string) => {
          if (p && typeof p === 'string' && p.trim()) {
            const clean = p.trim();
            if (!report.photos.includes(clean)) {
              report.photos.push(clean);
              report.photoItems.push({
                uri: clean,
                stage: photoStage,
                label: actionLabel,
                uploadedBy: report.verifiedBy || actionTakenBy || 'Responder',
                createdAt: new Date().toISOString()
              });
            }
          }
        });
      }
      if (requestBackup !== undefined) {
        report.requestBackup = !!requestBackup;
      }
      report.updatedAt = new Date().toISOString();

      if (db) {
        try {
          if (Array.isArray(report.photos) && report.photos.length > 10) {
            report.photos = report.photos.slice(-10);
          }
          if (Array.isArray(report.photoItems) && report.photoItems.length > 10) {
            report.photoItems = report.photoItems.slice(-10);
          }
          await db.collection('disaster_reports').doc(id).set(report, { merge: true });
        } catch (dbErr: any) {
          console.warn('[DisasterReportController] Firestore save fallback notice:', dbErr?.message);
        }
      }

      // Send automated push notification to all citizens/users when responder takes action
      if (['VERIFIED', 'UNDER_CLEARING', 'RESOLVED', 'IMPASSABLE'].includes(status)) {
        try {
          const { ExpoPushService } = await import('../services/pushNotificationService');
          const tokensSet = new Set<string>();
          if (db) {
            const tokenSnap = await db.collection('push_tokens').get();
            tokenSnap.forEach(d => {
              const t = d.data()?.token;
              if (t && typeof t === 'string') tokensSet.add(t);
            });
          }
          if (Array.isArray(mockStore.pushTokens)) {
            mockStore.pushTokens.forEach(t => {
              if (t?.token && typeof t.token === 'string') tokensSet.add(t.token);
            });
          }
          const tokens = Array.from(tokensSet);
          if (tokens.length > 0) {
            const statusPrefix =
              status === 'RESOLVED'
                ? '✅ Ligtas Na'
                : status === 'UNDER_CLEARING'
                ? '🚧 Kasalukuyang Nililinis'
                : status === 'IMPASSABLE'
                ? '⛔ Hindi Madaanan'
                : '🚨 Na-verify na Ulat';

            const notifTitle = `${statusPrefix}: ${(report.reportType || 'Hazard').replace(/_/g, ' ')} (${barangayName || report.barangayName || 'Irosin'})`;
            let notifBody = `${report.locationDescription || report.barangayName || ''}`;
            if (affectedRoute) notifBody += ` • Rota: ${affectedRoute}`;
            if (responderNotes) notifBody += ` • Aksyon: ${responderNotes}`;
            if (alternateRoute) notifBody += ` • Detour: ${alternateRoute}`;

            await ExpoPushService.sendToTokens(
              tokens,
              notifTitle,
              notifBody,
              { type: 'ROAD_HAZARD_UPDATE', reportId: report.id, status }
            );
            console.log(`[DisasterReport] Broadcasted responder action push notification to ${tokens.length} devices.`);
          }
        } catch (pushErr) {
          console.warn('[Push] Responder action push notification warning:', pushErr);
        }
      }

      // If backup is requested, notify MDRRMO Admin web dashboard and duty responders
      if (requestBackup) {
        try {
          const { WebPushService } = await import('../services/webPushService');
          await WebPushService.notifyAdminsOfNewReport({
            id: report.id,
            reportType: `🆘 BDRRMC BACKUP: ${report.reportType || 'HAZARD'}`,
            streetLocation: `${barangayName || report.barangayName || 'Barangay'} (${report.locationDescription || ''})`,
            description: `Humihingi ng tulong/heavy equipment si ${report.verifiedBy || 'BDRRMC Responder'}. Aksyon: ${responderNotes || 'Kailangan ng agarang tulong.'}`,
            createdAt: new Date().toISOString()
          });
        } catch (adminPushErr) {
          console.warn('[Push] Admin backup push notification warning:', adminPushErr);
        }
      }

      logAudit(
        'RESPONDER_ACTION',
        actionTakenBy || 'Barangay Responder',
        'BARANGAY_OFFICIAL',
        'disaster_reports',
        id,
        `Status updated to ${status} by ${report.verifiedBy}${requestBackup ? ' [BACKUP REQUESTED]' : ''}`
      );

      return res.status(200).json({
        message: 'Aksyon ng responder matagumpay na naitala at naibrodkast.',
        disasterReport: report
      });
    } catch (err: any) {
      console.error('[DisasterReport] Responder action error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async toggleNoted(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      let newCount = 1;

      try {
        const { db } = await import('../config/firebase');
        if (db) {
          const docRef = db.collection('disaster_reports').doc(id);
          const doc = await docRef.get();
          if (doc.exists) {
            newCount = (doc.data()?.notedCount || 0) + 1;
            await docRef.update({ notedCount: newCount });
          }
        }
      } catch (err: any) {
        console.warn('[Firebase] Firestore noted update error:', err?.message);
      }

      const report = mockStore.disasterReports.find(r => r.id === id);
      if (report) {
        report.notedCount = (report.notedCount || 0) + 1;
        newCount = report.notedCount;
      }

      return res.json({ success: true, notedCount: newCount });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user;

      try {
        const { db } = await import('../config/firebase');
        if (db) {
          await db.collection('disaster_reports').doc(id).delete();
        }
      } catch (err: any) {
        console.warn('[DisasterReportController] Firestore delete error:', err?.message);
      }

      mockStore.disasterReports = mockStore.disasterReports.filter(r => r.id !== id);

      logAudit(
        'DISASTER_REPORT_DELETED',
        user ? user.id : 'MDRRMO_ADMIN',
        (user ? user.role : 'MDRRMO_ADMIN') as any,
        'disaster_reports',
        id,
        `Deleted disaster report ${id}`
      );

      return res.json({ success: true, message: 'Disaster report successfully deleted' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
