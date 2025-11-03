import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All SLA routes require ADMIN role
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

/**
 * Create or update SLA metric when request enters a department
 */
export async function createSLAMetric(requestId, department, targetHours = 48) {
  try {
    const existing = await prisma.sLAMetric.findFirst({
      where: {
        requestId,
        department,
        status: 'PENDING',
      },
    });

    if (existing) return existing;

    return await prisma.sLAMetric.create({
      data: {
        requestId,
        department,
        targetHours,
        startTime: new Date(),
        status: 'PENDING',
      },
    });
  } catch (error) {
    console.error('Error creating SLA metric:', error);
    return null;
  }
}

/**
 * Update SLA metric when request is processed
 */
export async function updateSLAMetric(requestId, department, completedTime) {
  try {
    const metric = await prisma.sLAMetric.findFirst({
      where: {
        requestId,
        department,
        status: 'PENDING',
      },
    });

    if (!metric) return null;

    const actualHours = (new Date(completedTime) - new Date(metric.startTime)) / (1000 * 60 * 60);
    const breached = actualHours > metric.targetHours;
    const status = breached ? 'BREACHED' : 'MET';

    return await prisma.sLAMetric.update({
      where: { id: metric.id },
      data: {
        actualHours,
        completedTime: new Date(completedTime),
        status,
        breached,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error updating SLA metric:', error);
    return null;
  }
}

/**
 * Get SLA metrics and compliance stats
 */
router.get('/', async (req, res) => {
  try {
    const { department, status, startDate, endDate } = req.query;
    
    const whereClause = {};
    if (department) whereClause.department = department;
    if (status) whereClause.status = status;
    if (startDate || endDate) {
      whereClause.startTime = {};
      if (startDate) whereClause.startTime.gte = new Date(startDate);
      if (endDate) whereClause.startTime.lte = new Date(endDate);
    }

    const metrics = await prisma.sLAMetric.findMany({
      where: whereClause,
      include: {
        request: {
          select: {
            requestId: true,
            studentId: true,
            studentEmail: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
      take: 100,
    });

    // Calculate compliance statistics
    const total = metrics.length;
    const met = metrics.filter(m => m.status === 'MET').length;
    const breached = metrics.filter(m => m.status === 'BREACHED').length;
    const pending = metrics.filter(m => m.status === 'PENDING').length;
    const complianceRate = total > 0 ? (met / (met + breached)) * 100 : 0;

    // Calculate by department
    const byDepartment = {};
    metrics.forEach(metric => {
      if (!byDepartment[metric.department]) {
        byDepartment[metric.department] = { total: 0, met: 0, breached: 0, pending: 0 };
      }
      byDepartment[metric.department].total++;
      if (metric.status === 'MET') byDepartment[metric.department].met++;
      if (metric.status === 'BREACHED') byDepartment[metric.department].breached++;
      if (metric.status === 'PENDING') byDepartment[metric.department].pending++;
    });

    res.json({
      metrics,
      statistics: {
        total,
        met,
        breached,
        pending,
        complianceRate: Math.round(complianceRate * 100) / 100,
      },
      byDepartment,
    });
  } catch (error) {
    console.error('Get SLA metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch SLA metrics' });
  }
});

/**
 * Get SLA compliance dashboard data
 */
router.get('/compliance', async (req, res) => {
  try {
    const metrics = await prisma.sLAMetric.findMany({
      where: {
        status: { in: ['MET', 'BREACHED'] },
      },
    });

    const byDepartment = {};
    ['LIBRARY', 'BURSAR', 'ACADEMIC', 'PROCESSOR'].forEach(dept => {
      const deptMetrics = metrics.filter(m => m.department === dept);
      const deptMet = deptMetrics.filter(m => m.status === 'MET').length;
      const deptTotal = deptMetrics.length;
      
      byDepartment[dept] = {
        complianceRate: deptTotal > 0 ? (deptMet / deptTotal) * 100 : 0,
        total: deptTotal,
        met: deptMet,
        breached: deptTotal - deptMet,
        avgProcessingHours: deptMetrics.length > 0 
          ? deptMetrics.reduce((sum, m) => sum + (m.actualHours || 0), 0) / deptMetrics.length 
          : 0,
      };
    });

    // Current pending requests approaching SLA breach
    const pendingMetrics = await prisma.sLAMetric.findMany({
      where: { status: 'PENDING' },
    });

    const approachingBreach = pendingMetrics.filter(metric => {
      const elapsed = (Date.now() - new Date(metric.startTime)) / (1000 * 60 * 60);
      const percentOfTarget = (elapsed / metric.targetHours) * 100;
      return percentOfTarget >= 75 && percentOfTarget < 100; // Between 75-100% of target
    });

    const breachedPending = pendingMetrics.filter(metric => {
      const elapsed = (Date.now() - new Date(metric.startTime)) / (1000 * 60 * 60);
      return elapsed > metric.targetHours;
    });

    res.json({
      byDepartment,
      pending: {
        total: pendingMetrics.length,
        approachingBreach: approachingBreach.length,
        breached: breachedPending.length,
      },
    });
  } catch (error) {
    console.error('Get SLA compliance error:', error);
    res.status(500).json({ error: 'Failed to fetch SLA compliance data' });
  }
});

/**
 * Check and update pending SLAs (for cron job)
 */
router.post('/check-pending', async (req, res) => {
  try {
    const pendingMetrics = await prisma.sLAMetric.findMany({
      where: { status: 'PENDING' },
    });

    let updated = 0;
    for (const metric of pendingMetrics) {
      const elapsed = (Date.now() - new Date(metric.startTime)) / (1000 * 60 * 60);
      
      // Mark as warning if approaching breach (75% of target)
      if (elapsed >= metric.targetHours * 0.75 && elapsed < metric.targetHours && !metric.warningSent) {
        await prisma.sLAMetric.update({
          where: { id: metric.id },
          data: {
            status: 'WARNING',
            warningSent: true,
          },
        });
        updated++;
      }
      
      // Mark as breached if past target time
      if (elapsed > metric.targetHours && !metric.breached) {
        await prisma.sLAMetric.update({
          where: { id: metric.id },
          data: {
            status: 'BREACHED',
            breached: true,
            actualHours: elapsed,
          },
        });
        updated++;
      }
    }

    res.json({ updated, checked: pendingMetrics.length });
  } catch (error) {
    console.error('Check pending SLAs error:', error);
    res.status(500).json({ error: 'Failed to check pending SLAs' });
  }
});

export default router;
