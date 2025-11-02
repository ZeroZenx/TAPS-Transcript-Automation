import { msalClient } from '../lib/msal.js';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'taps-secret-key-change-in-production';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      // Try JWT token first (local auth)
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, name: true, role: true },
        });

        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
          return next();
        }
      } catch (jwtError) {
        // Not a JWT token, try Azure AD
      }

      // Try Azure AD token (fallback)
      // In production, use proper Azure AD token verification
      if (req.headers['x-user-email']) {
        req.user = {
          email: req.headers['x-user-email'],
          name: req.headers['x-user-name'] || 'User',
          role: req.headers['x-user-role'] || 'STUDENT',
        };
        return next();
      }

      return res.status(403).json({ error: 'Invalid or expired token' });
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

