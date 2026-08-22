import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { ENV } from './config/env';
import { apiLimiter, ddosShield } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

// Route Imports
import authRoutes from './routes/authRoutes';
import barangayRoutes from './routes/barangayRoutes';
import evacuationCenterRoutes from './routes/evacuationCenterRoutes';
import evacuationRouteRoutes from './routes/evacuationRouteRoutes';
import emergencyContactRoutes from './routes/emergencyContactRoutes';
import preparednessRoutes from './routes/preparednessRoutes';
import alertRoutes from './routes/alertRoutes';
import disasterReportRoutes from './routes/disasterReportRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import reportsRoutes from './routes/reportsRoutes';
import chatRoutes from './routes/chatRoutes';

const app = express();
app.set('trust proxy', 1);

// Allowed origins — add your deployed domain here for production
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  // Add production domain: 'https://admin.irosin-dss.gov.ph'
];

// Security & Middleware
import { ipBlacklistGuard } from './middleware/ipBlacklistGuard';
import securityRoutes from './routes/securityRoutes';
import { securityService } from './services/securityService';

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS policy: origin ${origin} is not allowed`));
  },
  credentials: true
}));
app.use(ipBlacklistGuard);                         // 🚫 Instant IP Firewall & Blacklist Guard
app.use(compression());                          // Gzip — ~70% smaller responses
app.use(express.json({ limit: '50mb' }));        // Large limit for Base64 photo uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(ddosShield);                             // 🛡️ Rapid DDoS burst shield
app.use(apiLimiter);                             // Global rate limiter

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    system: 'Irosin Disaster Preparedness API',
    location: 'Irosin, Sorsogon, Philippines',
    timestamp: new Date().toISOString()
  });
});

import powerInterruptionRoutes from './routes/powerInterruptionRoutes';
import announcementRoutes from './routes/announcementRoutes';

import adminPushRoutes from './routes/adminPushRoutes';

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/barangays', barangayRoutes);
app.use('/api/v1/evacuation-centers', evacuationCenterRoutes);
app.use('/api/v1/evacuation-routes', evacuationRouteRoutes);
app.use('/api/v1/emergency-contacts', emergencyContactRoutes);
app.use('/api/v1/preparedness', preparednessRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/reports', disasterReportRoutes);
app.use('/api/v1/disaster-reports', disasterReportRoutes);
app.use('/api/v1/admin/push', adminPushRoutes);
app.use('/api/v1/power-interruptions', powerInterruptionRoutes);
app.use('/api/v1/announcements', announcementRoutes);
import weatherRoutes from './routes/weatherRoutes';
import appConfigRoutes from './routes/appConfigRoutes';
import userRoutes from './routes/userRoutes';

app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/summary-reports', reportsRoutes);
app.use('/api/v1/app-config', appConfigRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/security', securityRoutes);
app.use('/api/v1/chat', chatRoutes);

import http from 'http';
import { initSocketIO } from './services/socketService';

// Centralized Error Handler
app.use(errorHandler);

const httpServer = http.createServer(app);
initSocketIO(httpServer);

import { EarthquakeMonitorService } from './services/earthquakeMonitorService';

const PORT = parseInt(ENV.PORT, 10);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  IROSIN DISASTER PREPAREDNESS API — PRODUCTION`);
  console.log(`  Port: ${PORT} | Environment: ${ENV.NODE_ENV}`);
  console.log(`  Database: Cloud Firestore (Google)`);
  console.log(`  Realtime: Socket.IO WebSocket enabled`);
  console.log(`  Earthquake Monitor: Automated USGS Active`);
  console.log(`  Security Firewall: Active & Armed`);
  console.log(`  Compression: gzip enabled`);
  console.log(`=======================================================`);

  // Initialize Security Firewall & load blacklisted IPs into memory
  securityService.init();

  // Start automated earthquake monitor background worker
  EarthquakeMonitorService.start();
});
