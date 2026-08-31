import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { UserRole, User } from '../types';
import { mockStore } from '../utils/mockStore';
import { db } from '../config/firebase';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as { id: string; role: UserRole };

    // 1. Try in-memory mockStore first (fast path — MDRRMO_ADMIN, etc.)
    const mockUser = mockStore.users.find(u => u.id === decoded.id && u.status === 'ACTIVE');
    if (mockUser) {
      req.user = mockUser;
      return next();
    }

    // 2. Firestore fallback — covers RESPONDER accounts stored in Firestore
    try {
      const firestoreDoc = await db.collection('users').doc(decoded.id).get();
      if (firestoreDoc.exists) {
        const data = firestoreDoc.data() as any;
        const status = (data.status || 'ACTIVE').toUpperCase();
        // Allow ACTIVE, APPROVED, or anything that is not REJECTED / INACTIVE
        if (status !== 'REJECTED' && status !== 'INACTIVE') {
          const userRole: UserRole = (data.role as UserRole) || 'RESPONDER';
          req.user = {
            id: decoded.id,
            email: data.email,
            username: data.username,
            fullName: data.fullName || data.username || 'Responder',
            phone: data.phone || '',
            role: userRole,
            roleTitle: data.roleTitle || (userRole === 'MDRRMO_ADMIN' ? 'MDRRMO Admin' : 'Barangay Responder'),
            barangayId: data.barangayId || '',
            barangayName: data.barangayName || (data.isMunicipalWide ? 'Lahat ng Barangay' : 'Irosin'),
            isMunicipalWide: data.isMunicipalWide === true,
            jurisdiction: data.jurisdiction || (data.isMunicipalWide ? 'ALL_BARANGAYS' : 'BARANGAY'),
            status: data.status || 'ACTIVE',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          };
          return next();
        }
      }
    } catch (fsErr) {
      console.warn('[Auth] Firestore user lookup warning:', fsErr);
    }

    // 3. Valid Signed JWT Fallback for Admins & Responders
    if (decoded && (decoded.id || decoded.role)) {
      req.user = {
        id: decoded.id || 'usr-admin',
        role: decoded.role || 'MDRRMO_ADMIN',
        fullName: 'MDRRMO Admin',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any;
      return next();
    }

    return res.status(403).json({ error: 'User account is invalid or deactivated' });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // If allowedRoles contains RESPONDER, also permit any responder role
    const currentRole = req.user.role || 'RESPONDER';
    if (
      allowedRoles.includes(currentRole) ||
      (allowedRoles.includes('RESPONDER') && (currentRole === 'RESPONDER' || currentRole === 'MDRRMO_ADMIN' || !req.user.role))
    ) {
      return next();
    }

    return res.status(403).json({
      error: `Permission denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
    });
  };
}
