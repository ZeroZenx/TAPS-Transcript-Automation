import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRouter from './routes/auth.js';
import authLocalRouter from './routes/auth-local.js';
import requestsRouter from './routes/requests.js';
import adminRouter from './routes/admin.js';

dotenv.config();

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
const frontendDist = path.join(__dirname, 'public');

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
  console.warn(`⚠️  Frontend directory not found: ${frontendDist}`);
}

// API routes
app.use('/api/auth', authRouter);
app.use('/api/auth', authLocalRouter); // Local authentication routes
app.use('/api/requests', requestsRouter);
app.use('/api/admin', adminRouter);

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
          console.error('Error serving index.html:', err);
          res.status(500).send('Error loading application');
        }
      });
    });

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 TAPS Server listening on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 Serving frontend from: ${path.join(__dirname, 'public')}`);
  }
});
