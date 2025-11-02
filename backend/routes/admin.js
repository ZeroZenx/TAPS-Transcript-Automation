import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../lib/audit.js';

const router = express.Router();

// All admin routes require ADMIN role
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 50, role } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = role ? { role } : {};

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

// Update user role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    const validRoles = ['STUDENT', 'LIBRARY', 'BURSAR', 'ACADEMIC', 'VERIFIER', 'PROCESSOR', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
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

    await createAuditLog('USER_ROLE_UPDATED', {
      targetUserId: userId,
      targetUserEmail: user.email,
      newRole: role,
    }, currentUser?.id);

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

