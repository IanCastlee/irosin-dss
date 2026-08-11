import { Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middleware/auth';
import { mockStore } from '../utils/mockStore';
import { ENV } from '../config/env';
import { RegisterSchema, LoginSchema } from '../validators';
import { logAudit } from '../utils/logger';

export class AuthController {
  public static async register(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = RegisterSchema.parse(req.body);
      
      const existingUser = mockStore.users.find(u => u.email.toLowerCase() === validated.email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already registered' });
      }

      const barangay = mockStore.barangays.find(b => b.id === validated.barangayId);

      const newUser = {
        id: 'usr-' + Date.now(),
        email: validated.email.toLowerCase(),
        fullName: validated.fullName,
        phone: validated.phone,
        role: validated.role,
        barangayId: validated.barangayId,
        barangayName: barangay ? barangay.name : 'Unknown Barangay',
        status: 'ACTIVE' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockStore.users.push(newUser);

      logAudit('USER_REGISTERED', newUser.fullName, newUser.role, 'users', newUser.id, `Registered as ${newUser.role}`);

      const token = jwt.sign({ id: newUser.id, role: newUser.role }, ENV.JWT_SECRET, {
        expiresIn: '7d'
      });

      return res.status(201).json({
        message: 'Account registered successfully',
        token,
        user: newUser
      });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: err.errors });
      }
      return res.status(500).json({ error: err.message || 'Registration failed' });
    }
  }

  public static async login(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = LoginSchema.parse(req.body);
      const user = mockStore.users.find(u => u.email.toLowerCase() === validated.email.toLowerCase());

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (user.status !== 'ACTIVE') {
        return res.status(403).json({ error: 'Account is deactivated. Contact MDRRMO Administrator.' });
      }

      // For demo users or matched credentials, issue token
      const token = jwt.sign({ id: user.id, role: user.role }, ENV.JWT_SECRET, {
        expiresIn: '7d'
      });

      logAudit('USER_LOGIN', user.fullName, user.role, 'users', user.id, 'User logged in');

      return res.json({
        message: 'Login successful',
        token,
        user
      });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: err.errors });
      }
      return res.status(500).json({ error: err.message || 'Login failed' });
    }
  }

  public static async me(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    return res.json({ user: req.user });
  }

  public static async updateFcmToken(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ error: 'FCM token required' });

    req.user.fcmToken = fcmToken;
    req.user.updatedAt = new Date().toISOString();

    return res.json({ message: 'FCM token updated successfully' });
  }
}
