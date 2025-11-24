import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { validateEnv } from './lib/env-validator.js';
import { errorHandler } from './lib/errors.js';
import logger from './lib/logger.js';

import authRouter from './routes/auth.js';
import authLocalRouter from './routes/auth-local.js';
import authVerificationRouter from './routes/auth-verification.js';
import requestsRouter from './routes/requests.js';
import adminRouter from './routes/admin.js';
import importRouter from './routes/import.js';
import filesRouter from './routes/files.js';
import conversationsRouter from './routes/conversations.js';
import auditRouter from './routes/audit.js';
import reportsRouter from './routes/reports.js';
import settingsRouter from './routes/settings.js';
import remindersRouter from './routes/reminders.js';
import analyticsRouter from './routes/analytics.js';
import slaRouter from './routes/sla.js';
import backupRouter from './routes/backup.js';
import monitoringRouter from './routes/monitoring.js';
import scheduledReportsRouter from './routes/scheduled-reports.js';

dotenv.config();

// Validate environment variables
try {
  validateEnv();
  logger.info('✅ Environment variables validated');
} catch (error) {
  logger.error('❌ Environment validation failed:', error.message);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    logger.warn('⚠️  Continuing in development mode with missing variables');
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);

// Security & performance middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
app.use(compression());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, static file requests, etc.)
    if (!origin) return callback(null, true);
    // Always allow localhost origins
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve frontend build - MUST BE BEFORE API ROUTES
const frontendDist = path.join(__dirname, '../frontend/dist');

    // Serve static assets (CSS, JS, images, etc.)
    if (fs.existsSync(frontendDist)) {
      app.use('/assets', express.static(path.join(frontendDist, 'assets'), {
        maxAge: '0', // No cache for assets during development
        etag: false,
        lastModified: false,
        setHeaders: (res, filePath) => {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=UTF-8');
          } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
          }
        }
      }));
  
      // Serve other static files
      app.use(express.static(frontendDist, {
        maxAge: '0', // No cache during development
        etag: false,
        lastModified: false,
        setHeaders: (res) => {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }));
} else {
  logger.warn(`Frontend directory not found: ${frontendDist}`);
}

// API routes
app.use('/api/auth', authRouter);
app.use('/api/auth', authLocalRouter); // Local authentication routes
app.use('/api/auth', authVerificationRouter); // Email verification and password reset
app.use('/api/requests', requestsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/import', importRouter);
app.use('/api/files', filesRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/sla', slaRouter);
app.use('/api/backup', backupRouter);
app.use('/api/monitoring', monitoringRouter);
app.use('/api/scheduled-reports', scheduledReportsRouter);

    // Serve index.html for all non-API routes (must be last)
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      if (!fs.existsSync(frontendDist)) {
        return res.status(500).send('Frontend not built. Run: cd frontend && npm run build');
      }
      // Disable cache for index.html
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
        if (err) {
          logger.error('Error serving index.html:', err);
          res.status(500).send('Error loading application');
        }
      });
    });

// Error handler must be last
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`🚀 TAPS Server listening on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 Serving frontend from: ${frontendDist}`);
});
