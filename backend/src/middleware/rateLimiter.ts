import rateLimit from 'express-rate-limit';
import { securityService } from '../services/securityService';

// Helper to extract clean client IP
export const getClientIp = (req: any): string => {
  const forwarded = req.headers['x-forwarded-for'];
  let rawIp = '';
  if (forwarded) {
    rawIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
  } else {
    rawIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  }
  return securityService.cleanIp(rawIp);
};

// 🛡️ 1. Global DDoS / Rapid Request Flooding Shield (Per minute burst limiter)
export const ddosShield = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 120, // Max 120 rapid requests per minute to block malicious flooding
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  validate: { xForwardedForHeader: false, default: false },
  handler: (req, res) => {
    const ip = getClientIp(req);
    securityService.recordThreat(
      ip,
      'DDOS_BURST',
      `Rapid flood attempt: Lagpas sa 120 requests/min sa endpoint ${req.originalUrl || req.path}`,
      req.originalUrl || req.path
    );
    return res.status(429).json({
      error: 'Masyadong mabilis ang iyong mga kahilingan (Rate limit exceeded). Naitala ang insidenteng ito sa MDRRMO Security Firewall.'
    });
  }
});

// 🛡️ 2. General API Rate Limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  validate: { xForwardedForHeader: false, default: false },
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

// 🛡️ 3. Strict Auth / Brute-Force Login Shield (Mitigates password guessing & bot attacks)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => getClientIp(req),
  validate: { xForwardedForHeader: false, default: false },
  handler: (req, res) => {
    const ip = getClientIp(req);
    securityService.recordThreat(
      ip,
      'BRUTE_FORCE',
      `Paulit-ulit na login attempts (10 failed attempts sa loob ng 15 minuto)`,
      req.originalUrl || req.path
    );
    return res.status(429).json({
      error: 'Masyadong maraming beses na sinubukang mag-login. Naitala ang insidente sa MDRRMO Security Center.'
    });
  }
});

// 🛡️ 4. High-Security Responder Registration Limiter (Spam Account Creation Prevention)
export const registrationLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // Max 5 account registrations per 30 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  validate: { xForwardedForHeader: false, default: false },
  handler: (req, res) => {
    const ip = getClientIp(req);
    securityService.recordThreat(
      ip,
      'SPAM_REGISTRATION',
      `Registration flood: Mahigit 5 registration attempts sa loob ng 30 minuto`,
      req.originalUrl || req.path
    );
    return res.status(429).json({
      error: 'Limit sa rehistrasyon naabot. Naitala ang iyong IP sa Security Logs.'
    });
  }
});
