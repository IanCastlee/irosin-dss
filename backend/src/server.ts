import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

// Route Imports
import authRoutes from './routes/authRoutes';
import barangayRoutes from './routes/barangayRoutes';
import evacuationCenterRoutes from './routes/evacuationCenterRoutes';
import hazardRoutes from './routes/hazardRoutes';
import evacuationRouteRoutes from './routes/evacuationRouteRoutes';
import emergencyContactRoutes from './routes/emergencyContactRoutes';
import preparednessRoutes from './routes/preparednessRoutes';
import alertRoutes from './routes/alertRoutes';
import disasterReportRoutes from './routes/disasterReportRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import reportsRoutes from './routes/reportsRoutes';

const app = express();

// Security & Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    system: 'Irosin Disaster Preparedness API',
    location: 'Irosin, Sorsogon, Philippines',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/barangays', barangayRoutes);
app.use('/api/v1/evacuation-centers', evacuationCenterRoutes);
app.use('/api/v1/hazards', hazardRoutes);
app.use('/api/v1/evacuation-routes', evacuationRouteRoutes);
app.use('/api/v1/emergency-contacts', emergencyContactRoutes);
app.use('/api/v1/preparedness', preparednessRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/reports', disasterReportRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/summary-reports', reportsRoutes);

// Centralized Error Handler
app.use(errorHandler);

const PORT = parseInt(ENV.PORT, 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  IROSIN DISASTER PREPAREDNESS API BACKEND SERVER`);
  console.log(`  Running on: http://localhost:${PORT}`);
  console.log(`  Environment: ${ENV.NODE_ENV}`);
  console.log(`  Barangays In Scope: Selected Barangays in Irosin, Sorsogon`);
  console.log(`=======================================================`);
});
