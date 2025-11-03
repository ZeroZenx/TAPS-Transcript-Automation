import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { createAuditLog } from '../lib/audit.js';

const router = express.Router();

// Login callback from Azure AD
router.post('/login', async (req, res) => {
  try {
    const { email, name, token } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new user with default STUDENT role
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          role: 'STUDENT',
          authMethod: 'AZURE',
        },
      });

      await createAuditLog('USER_CREATED', { email, name }, user.id);
    } else {
      // Log login for existing users
      await createAuditLog('USER_LOGIN_AZURE', { email, name: user.name, role: user.role }, user.id);
    }

    // Return user info (token handled by frontend)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    let user;
    
    // Try to find by email first
    if (req.user?.email) {
      user = await prisma.user.findUnique({
        where: { email: req.user.email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });
    }
    
    // If not found by email, try by ID
    if (!user && req.user?.id) {
      user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await createAuditLog('USER_LOGOUT', { email: req.user?.email || 'unknown' }, req.user?.id);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
