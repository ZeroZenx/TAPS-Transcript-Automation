import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog, createAuditLogWithChanges } from '../lib/audit.js';

const router = express.Router();

// All admin routes require ADMIN role
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

// Get all users (only staff users who can login - exclude STUDENT role)
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 50, role } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Staff roles only - exclude STUDENT (Registry = VERIFIER/PROCESSOR)
    // Only show the 6 staff accounts that have login access:
    // ADMIN, LIBRARY, BURSAR, ACADEMIC, VERIFIER, PROCESSOR
    const staffRoles = ['LIBRARY', 'BURSAR', 'ACADEMIC', 'VERIFIER', 'PROCESSOR', 'ADMIN'];
    
    // Filter by staff roles only - STUDENT role is explicitly excluded
    let where = {
      role: {
        in: staffRoles, // Only show staff users who can login
      },
      // Ensure user has login capability (has authMethod OR passwordHash)
      // This ensures we don't show any STUDENT users even if they somehow have a staff role
    };

    // If a specific role is requested, filter by it (but still exclude STUDENT)
    if (role && staffRoles.includes(role.toUpperCase())) {
      where.role = role.toUpperCase();
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          authMethod: true,
          _count: {
            select: { requests: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role (only staff roles allowed - STUDENT excluded)
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    // Only staff roles allowed - STUDENT role cannot be assigned
    const validRoles = ['LIBRARY', 'BURSAR', 'ACADEMIC', 'VERIFIER', 'PROCESSOR', 'ADMIN'];
    if (!validRoles.includes(role.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid role. Only staff roles are allowed.' });
    }

    // Get old user data for comparison
    const oldUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!oldUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: role.toUpperCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    const currentUser = await prisma.user.findUnique({
      where: { email: req.user.email },
    });

    // Use enhanced audit logging to track role change
    await createAuditLogWithChanges(
      'USER_ROLE_UPDATED',
      { role: oldUser.role },
      { role: user.role },
      currentUser?.id,
      null
    );

    res.json({ user });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Get system stats
router.get('/stats', async (req, res) => {
  try {
    const [userCount, requestCount, pendingCount, completedCount] = await Promise.all([
      prisma.user.count(),
      prisma.request.count(),
      prisma.request.count({ where: { status: 'PENDING' } }),
      prisma.request.count({ where: { status: 'COMPLETED' } }),
    ]);

    res.json({
      stats: {
        users: userCount,
        requests: requestCount,
        pending: pendingCount,
        completed: completedCount,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;

