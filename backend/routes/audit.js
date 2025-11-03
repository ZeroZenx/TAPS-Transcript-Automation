import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get audit logs with filters
router.get('/', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const {
      requestId,
      userId,
      action,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (requestId) {
      where.requestId = requestId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = {
        contains: action,
      };
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          request: {
            select: {
              id: true,
              requestId: true,
              studentId: true,
              studentEmail: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Parse details JSON
    const logsWithParsedDetails = logs.map(log => ({
      ...log,
      details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details,
    }));

    res.json({
      logs: logsWithParsedDetails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get audit logs for a specific request
router.get('/request/:requestId', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { requestId: req.params.requestId },
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const logsWithParsedDetails = logs.map(log => ({
      ...log,
      details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details,
    }));

    res.json({ logs: logsWithParsedDetails });
  } catch (error) {
    console.error('Get request audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get audit statistics
router.get('/stats', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    const [
      totalLogs,
      logsByAction,
      logsByUser,
      recentActivity,
    ] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: { userId: true },
      }),
      prisma.auditLog.findMany({
        where,
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    // Get user details for logsByUser
    const userIds = logsByUser.map(l => l.userId).filter(Boolean);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const logsByUserWithDetails = logsByUser.map(l => ({
      ...l,
      user: l.userId ? userMap.get(l.userId) : null,
    }));

    res.json({
      totalLogs,
      logsByAction,
      logsByUser: logsByUserWithDetails,
      recentActivity: recentActivity.map(log => ({
        ...log,
        details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details,
      })),
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({ error: 'Failed to fetch audit statistics' });
  }
});

export default router;

