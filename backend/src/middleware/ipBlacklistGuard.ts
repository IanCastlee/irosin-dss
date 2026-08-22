import { Request, Response, NextFunction } from 'express';
import { securityService } from '../services/securityService';

// Endpoints that must remain accessible so the Admin is never locked out
const BYPASS_PATHS = [
  '/api/v1/auth/login',
  '/health',
];

export const ipBlacklistGuard = (req: Request, res: Response, next: NextFunction) => {
  // Allow essential admin recovery and health check routes
  if (BYPASS_PATHS.some(path => req.path.startsWith(path) || req.originalUrl?.startsWith(path))) {
    return next();
  }

  const clientIp = req.headers['x-forwarded-for']
    ? (req.headers['x-forwarded-for'] as string).split(',')[0].trim()
    : req.ip || req.socket.remoteAddress || '';

  if (securityService.isIpBlocked(clientIp)) {
    return res.status(403).json({
      blocked: true,
      error: 'ACCESS_DENIED_BY_FIREWALL',
      message: 'Ang iyong IP address ay opisyal na na-block ng MDRRMO Administrator dahil sa paulit-ulit na kahina-hinalang aktibidad o tangkang pag-atake sa system.'
    });
  }

  next();
};
