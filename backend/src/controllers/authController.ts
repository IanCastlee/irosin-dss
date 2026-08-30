import { Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middleware/auth';
import { ENV } from '../config/env';
import { RegisterSchema, LoginSchema, ResponderRegisterSchema, ResponderLoginSchema } from '../validators';
import { logAudit } from '../utils/logger';
import { db } from '../config/firebase';
import { mockStore } from '../utils/mockStore';

const USERS_COL = 'users';

export class AuthController {
  public static async register(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = RegisterSchema.parse(req.body);

      // Check duplicate email in Firestore
      const existing = await db.collection(USERS_COL)
        .where('email', '==', validated.email.toLowerCase())
        .limit(1)
        .get();

      if (!existing.empty) {
        return res.status(400).json({ error: 'Email is already registered' });
      }

      // Resolve barangay name
      let barangayName = 'Unknown Barangay';
      if (validated.barangayId) {
        try {
          const brgyDoc = await db.collection('barangays').doc(validated.barangayId).get();
          if (brgyDoc.exists) barangayName = (brgyDoc.data() as any).name || barangayName;
        } catch {}
      }

      const id = 'usr-' + Date.now();
      const now = new Date().toISOString();
      const passwordHash = await bcrypt.hash(validated.password || '', 10);

      const newUser = {
        id,
        email: validated.email.toLowerCase(),
        fullName: validated.fullName,
        phone: validated.phone,
        role: validated.role,
        roleTitle: validated.roleTitle || validated.role,
        barangayId: validated.barangayId,
        barangayName,
        passwordHash,
        status: 'ACTIVE' as const,
        createdAt: now,
        updatedAt: now
      };

      await db.collection(USERS_COL).doc(id).set(newUser);
      logAudit('USER_REGISTERED', newUser.fullName, newUser.role, USERS_COL, id, `Registered as ${newUser.role}`);

      const token = jwt.sign({ id: newUser.id, role: newUser.role }, ENV.JWT_SECRET, { expiresIn: '8h' });

      // Don't return passwordHash to client
      const { passwordHash: _, ...safeUser } = newUser;
      return res.status(201).json({ message: 'Account registered successfully', token, user: safeUser });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
      return res.status(500).json({ error: err.message || 'Registration failed' });
    }
  }

  public static async responderRegister(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = ResponderRegisterSchema.parse(req.body);
      const cleanUsername = validated.username.toLowerCase().trim();

      // Check duplicate username in Firestore
      const existingUser = await db.collection(USERS_COL)
        .where('username', '==', cleanUsername)
        .limit(1)
        .get();

      if (!existingUser.empty) {
        return res.status(400).json({ error: 'Ang username na ito ay ginagamit na. Mangyaring pumili ng ibang username.' });
      }

      // Resolve barangay name and municipal-wide jurisdiction
      let barangayName = validated.barangayName?.trim() || 'Irosin';
      let isMunicipalWide = false;
      let jurisdiction = 'SPECIFIC_BARANGAY';

      if (
        validated.barangayId === 'all' ||
        barangayName.toLowerCase().includes('all') ||
        barangayName.toLowerCase().includes('lahat')
      ) {
        barangayName = 'All Barangays';
        isMunicipalWide = true;
        jurisdiction = 'ALL_BARANGAYS';
      } else if (validated.barangayId && validated.barangayId !== 'brgy-1') {
        try {
          const brgyDoc = await db.collection('barangays').doc(validated.barangayId).get();
          if (brgyDoc.exists) barangayName = (brgyDoc.data() as any).name || barangayName;
        } catch {}
      }

      const id = 'resp-' + Date.now();
      const now = new Date().toISOString();
      const passwordHash = await bcrypt.hash(validated.password, 10);

      const newResponder = {
        id,
        username: cleanUsername,
        fullName: validated.fullName.trim(),
        phone: validated.phone.trim(),
        role: 'RESPONDER' as const,
        roleTitle: validated.roleTitle.trim(),
        barangayId: isMunicipalWide ? 'all' : validated.barangayId,
        barangayName,
        isMunicipalWide,
        jurisdiction,
        passwordHash,
        fcmToken: validated.fcmToken || '',
        status: 'PENDING_APPROVAL' as const,
        createdAt: now,
        updatedAt: now
      };

      await db.collection(USERS_COL).doc(id).set(newResponder);
      logAudit('RESPONDER_REGISTERED', newResponder.fullName, 'RESPONDER', USERS_COL, id, `Responder (@${cleanUsername}) registered for ${barangayName}. Pending Admin Approval.`);

      const { passwordHash: _, ...safeUser } = newResponder;
      return res.status(201).json({
        success: true,
        message: 'Matagumpay na nairehistro ang iyong responder account. Mangyaring maghintay ng pagsusuri at pag-apruba mula sa MDRRMO Admin.',
        user: safeUser
      });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        const msg = err.errors?.[0]?.message || 'Maling impormasyon';
        return res.status(400).json({ error: msg, details: err.errors });
      }
      return res.status(500).json({ error: err.message || 'Registration failed' });
    }
  }

  public static async responderLogin(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = ResponderLoginSchema.parse(req.body);
      const cleanUsername = validated.username.toLowerCase().trim();

      // Look up by username first, fallback to email
      let userDoc: any = null;
      const snapUser = await db.collection(USERS_COL)
        .where('username', '==', cleanUsername)
        .limit(1)
        .get();

      if (!snapUser.empty) {
        userDoc = snapUser.docs[0];
      } else {
        const snapEmail = await db.collection(USERS_COL)
          .where('email', '==', cleanUsername)
          .limit(1)
          .get();
        if (!snapEmail.empty) {
          userDoc = snapEmail.docs[0];
        }
      }

      if (!userDoc) {
        return res.status(401).json({ error: 'Hindi natagpuan ang username o maling password.' });
      }

      const user = { id: userDoc.id, ...userDoc.data() } as any;

      // Verify password
      let passwordOk = false;
      if (user.passwordHash) {
        passwordOk = await bcrypt.compare(validated.password, user.passwordHash);
      } else {
        passwordOk = validated.password === 'admin123';
      }

      if (!passwordOk) {
        return res.status(401).json({ error: 'Maling username o password.' });
      }

      // Check account approval status
      if (user.status === 'PENDING_APPROVAL') {
        return res.status(403).json({
          status: 'PENDING_APPROVAL',
          error: 'Naka-pending pa ang iyong account para sa pagsusuri at pag-apruba ng MDRRMO Admin.',
          user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            roleTitle: user.roleTitle,
            barangayName: user.barangayName,
            status: user.status
          }
        });
      }

      if (user.status === 'REJECTED') {
        return res.status(403).json({
          status: 'REJECTED',
          error: 'Tinanggihan ang iyong aplikasyon bilang responder. Makipag-ugnayan sa MDRRMO Admin para sa karagdagang impormasyon.',
          user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            roleTitle: user.roleTitle,
            barangayName: user.barangayName,
            status: user.status
          }
        });
      }

      if (user.status !== 'ACTIVE') {
        return res.status(403).json({
          status: user.status,
          error: 'Ang account na ito ay kasalukuyang hindi aktibo. Makipag-ugnayan sa MDRRMO Admin.'
        });
      }

      // Update FCM token if supplied on login
      if (validated.fcmToken) {
        await db.collection(USERS_COL).doc(user.id).set(
          { fcmToken: validated.fcmToken, updatedAt: new Date().toISOString() },
          { merge: true }
        );
        user.fcmToken = validated.fcmToken;

        // Also save to push_tokens with location metadata
        try {
          const docId = validated.fcmToken.replace(/[^a-zA-Z0-9_-]/g, '_');
          await db.collection('push_tokens').doc(docId).set({
            token: validated.fcmToken,
            userId: user.id,
            role: user.role || 'RESPONDER',
            barangayId: user.barangayId || '',
            barangayName: user.barangayName || '',
            registeredAt: new Date().toISOString()
          }, { merge: true });

          if (!mockStore.pushTokens.some(t => t.token === validated.fcmToken)) {
            mockStore.pushTokens.push({
              token: validated.fcmToken,
              registeredAt: new Date().toISOString()
            });
          }
        } catch (tokErr) {
          console.warn('[AuthController] Token sync to push_tokens warning:', tokErr);
        }
      }

      const token = jwt.sign({ id: user.id, role: user.role }, ENV.JWT_SECRET, { expiresIn: '30d' });
      logAudit('RESPONDER_LOGIN', user.fullName, user.role, USERS_COL, user.id, `Responder @${user.username || user.email} logged in successfully`);

      const { passwordHash: _, ...safeUser } = user;
      return res.json({
        success: true,
        message: 'Maligayang pagdating, Responder!',
        token,
        user: safeUser
      });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ error: 'Maling impormasyon', details: err.errors });
      return res.status(500).json({ error: err.message || 'Login failed' });
    }
  }

  public static async login(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = LoginSchema.parse(req.body);

      const identifier = (validated.email || validated.username || '').toLowerCase();
      if (!identifier) {
        return res.status(400).json({ error: 'Email or username is required' });
      }

      // Look up user in Firestore
      let userDoc: any = null;
      const snapEmail = await db.collection(USERS_COL)
        .where('email', '==', identifier)
        .limit(1)
        .get();

      if (!snapEmail.empty) {
        userDoc = snapEmail.docs[0];
      } else {
        const snapUser = await db.collection(USERS_COL)
          .where('username', '==', identifier)
          .limit(1)
          .get();
        if (!snapUser.empty) {
          userDoc = snapUser.docs[0];
        }
      }

      if (!userDoc) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = { id: userDoc.id, ...userDoc.data() } as any;

      if (user.status === 'PENDING_APPROVAL') {
        return res.status(403).json({ error: 'Account is pending approval from MDRRMO Administrator.' });
      }

      if (user.status !== 'ACTIVE') {
        return res.status(403).json({ error: 'Account is deactivated. Contact MDRRMO Administrator.' });
      }

      // Verify password — support both hashed (Firestore) and legacy seed users
      let passwordOk = false;
      if (user.passwordHash) {
        passwordOk = await bcrypt.compare(validated.password, user.passwordHash);
      } else {
        // Legacy seed admin: accept if no hash stored (first login seeded via mockStore)
        passwordOk = validated.password === 'admin123';
      }

      if (!passwordOk) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ id: user.id, role: user.role }, ENV.JWT_SECRET, { expiresIn: '8h' });
      logAudit('USER_LOGIN', user.fullName, user.role, USERS_COL, user.id, 'User logged in');

      const { passwordHash: _, ...safeUser } = user;
      return res.json({ message: 'Login successful', token, user: safeUser });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
      return res.status(500).json({ error: err.message || 'Login failed' });
    }
  }

  public static async me(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    return res.json({ user: req.user });
  }

  public static async updateFcmToken(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ error: 'FCM token required' });

    try {
      await db.collection(USERS_COL).doc(req.user.id).set(
        { fcmToken, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      return res.json({ message: 'FCM token updated successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
