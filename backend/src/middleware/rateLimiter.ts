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
  max: 300, // Max 300 rapid requests per minute to allow active dashboard & live maps
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  validate: { xForwardedForHeader: false, default: false },
  handler: (req, res) => {
    const ip = getClientIp(req);
    securityService.recordThreat(
      ip,
      'DDOS_BURST',
      `Rapid flood attempt: Lagpas sa 300 requests/min sa endpoint ${req.originalUrl || req.path}`,
      req.originalUrl || req.path
    );
    return res.status(429).json({
      error: 'Masyadong mabilis ang mga kahilingan (Rate limit exceeded). Pakihintay ang ilang sandali.'
    });
  }
});

// 🛡️ 2. General API Rate Limiter
export const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes window
  max: 3000, // High capacity for multi-page dashboard, map pins & live polling
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  validate: { xForwardedForHeader: false, default: false },
  message: {
    error: 'Too many requests from this IP, please try again after a minute.'
  }
});

// 🛡️ 3. Strict Auth / Brute-Force Login Shield (Mitigates password guessing & bot attacks)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Allow 50 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
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
