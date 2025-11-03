import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import os from 'os';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// All monitoring routes require ADMIN role
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

/**
 * Get system health metrics
 */
router.get('/health', async (req, res) => {
  try {
    // Get recent health snapshots
    const recentHealth = await prisma.systemHealth.findMany({
      orderBy: { timestamp: 'desc' },
      take: 24, // Last 24 hours if hourly snapshots
    });

    // Calculate current metrics
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    // Calculate disk usage (for SQLite database)
    let diskUsage = null;
    try {
      const dbPath = join(__dirname, '../../dev.db');
      const stats = await fs.stat(dbPath);
      diskUsage = {
        dbSize: stats.size,
        dbSizeMB: (stats.size / 1024 / 1024).toFixed(2),
      };
    } catch (error) {
      // Database might not exist or path different
    }

    // Get database connection count (simplified - SQLite doesn't have connection pooling like PostgreSQL)
    const dbConnectionCount = 1; // SQLite is single connection

    // Get active users (users who logged in within last hour)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const activeUsers = await prisma.auditLog.count({
      where: {
        action: 'LOGIN',
        timestamp: { gte: oneHourAgo },
      },
    });

    // Calculate requests per minute
    const oneMinuteAgo = new Date();
    oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1);
    
    const recentRequests = await prisma.auditLog.count({
      where: {
        timestamp: { gte: oneMinuteAgo },
      },
    });

    // Get error count from last hour
    const errorCount = await prisma.errorLog.count({
      where: {
        resolved: false,
        createdAt: { gte: oneHourAgo },
      },
    });

    // Determine overall status
    let status = 'HEALTHY';
    const alerts = [];
    
    const memUsagePercent = ((totalMem - freeMem) / totalMem) * 100;
    if (memUsagePercent > 90) {
      status = 'CRITICAL';
      alerts.push('High memory usage');
    } else if (memUsagePercent > 75) {
      status = 'WARNING';
      alerts.push('Memory usage above 75%');
    }

    if (errorCount > 10) {
      status = status === 'HEALTHY' ? 'WARNING' : 'CRITICAL';
      alerts.push(`High error rate: ${errorCount} errors in last hour`);
    }

    if (recentRequests > 1000) {
      status = status === 'HEALTHY' ? 'WARNING' : status;
      alerts.push('High request volume');
    }

    // Save current health snapshot
    await prisma.systemHealth.create({
      data: {
        cpuUsage: memUsage.heapUsed / totalMem * 100, // Approximate CPU from process
        memoryUsage: memUsagePercent,
        diskUsage: diskUsage ? (diskUsage.dbSizeMB / 1024) : null, // Approximate
        dbConnectionCount,
        dbQueryTime: null, // Would need to measure query times
        activeUsers,
        requestsPerMinute: recentRequests,
        errorCount,
        status,
        alerts: alerts.length > 0 ? JSON.stringify(alerts) : null,
      },
    });

    res.json({
      current: {
        cpuUsage: memUsage.heapUsed / totalMem * 100,
        memoryUsage: memUsagePercent,
        diskUsage: diskUsage,
        dbConnectionCount,
        activeUsers,
        requestsPerMinute: recentRequests,
        errorCount,
        status,
        alerts,
      },
      history: recentHealth,
    });
  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

/**
 * Get error logs
 */
router.get('/errors', async (req, res) => {
  try {
    const { resolved, errorType, limit = 100 } = req.query;
    
    const whereClause = {};
    if (resolved !== undefined) whereClause.resolved = resolved === 'true';
    if (errorType) whereClause.errorType = errorType;

    const errors = await prisma.errorLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    const stats = {
      total: errors.length,
      resolved: errors.filter(e => e.resolved).length,
      unresolved: errors.filter(e => !e.resolved).length,
      byType: errors.reduce((acc, e) => {
        acc[e.errorType] = (acc[e.errorType] || 0) + 1;
        return acc;
      }, {}),
    };

    res.json({ errors, stats });
  } catch (error) {
    console.error('Get error logs error:', error);
    res.status(500).json({ error: 'Failed to fetch error logs' });
  }
});

/**
 * Log an error
 */
export async function logError(errorType, message, stackTrace, userId = null, requestId = null, endpoint = null, statusCode = null) {
  try {
    return await prisma.errorLog.create({
      data: {
        errorType,
        message,
        stackTrace,
        userId,
        requestId,
        endpoint,
        statusCode,
      },
    });
  } catch (error) {
    console.error('Failed to log error:', error);
    return null;
  }
}

/**
 * Mark error as resolved
 */
router.post('/errors/:id/resolve', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.user.email },
    });

    const error = await prisma.errorLog.update({
      where: { id: req.params.id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: user?.id,
      },
    });

    res.json({ error });
  } catch (error) {
    console.error('Resolve error error:', error);
    res.status(500).json({ error: 'Failed to resolve error' });
  }
});

/**
 * Get performance metrics
 */
router.get('/performance', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - parseInt(hours));

    const healthData = await prisma.systemHealth.findMany({
      where: {
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Calculate averages
    const metrics = {
      avgCpuUsage: healthData.length > 0 
        ? healthData.reduce((sum, h) => sum + (h.cpuUsage || 0), 0) / healthData.length 
        : 0,
      avgMemoryUsage: healthData.length > 0 
        ? healthData.reduce((sum, h) => sum + (h.memoryUsage || 0), 0) / healthData.length 
        : 0,
      avgResponseTime: healthData.length > 0 
        ? healthData.reduce((sum, h) => sum + (h.avgResponseTime || 0), 0) / healthData.length 
        : 0,
      totalErrors: healthData.reduce((sum, h) => sum + h.errorCount, 0),
      peakActiveUsers: Math.max(...healthData.map(h => h.activeUsers), 0),
      avgRequestsPerMinute: healthData.length > 0 
        ? healthData.reduce((sum, h) => sum + h.requestsPerMinute, 0) / healthData.length 
        : 0,
    };

    res.json({
      metrics,
      history: healthData,
    });
  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

export default router;
