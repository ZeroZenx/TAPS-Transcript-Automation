import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All analytics routes require ADMIN role
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

/**
 * Get department performance metrics (average processing time)
 */
router.get('/performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause = {};
    if (startDate || endDate) {
      whereClause.requestDate = {};
      if (startDate) whereClause.requestDate.gte = new Date(startDate);
      if (endDate) whereClause.requestDate.lte = new Date(endDate);
    }

    // Calculate Library average processing time
    const libraryRequests = await prisma.request.findMany({
      where: {
        ...whereClause,
        libraryStatus: { not: null, not: 'PENDING' },
      },
      select: {
        created: true,
        modified: true,
        libraryStatus: true,
      },
    });

    let libraryTotalHours = 0;
    let libraryCount = 0;
    
    for (const req of libraryRequests) {
      // Find when library status was first set (from audit logs)
      const libraryStatusLog = await prisma.auditLog.findFirst({
        where: {
          requestId: req.id,
          details: { contains: 'libraryStatus' },
        },
        orderBy: { timestamp: 'asc' },
      });
      
      if (libraryStatusLog) {
        const hours = (new Date(libraryStatusLog.timestamp) - new Date(req.created)) / (1000 * 60 * 60);
        libraryTotalHours += hours;
        libraryCount++;
      }
    }

    // Calculate Bursar average processing time
    const bursarRequests = await prisma.request.findMany({
      where: {
        ...whereClause,
        bursarStatus: { not: null, not: 'PENDING' },
      },
      select: {
        created: true,
        modified: true,
      },
    });

    let bursarTotalHours = 0;
    let bursarCount = 0;
    
    for (const req of bursarRequests) {
      const bursarStatusLog = await prisma.auditLog.findFirst({
        where: {
          requestId: req.id,
          details: { contains: 'bursarStatus' },
        },
        orderBy: { timestamp: 'asc' },
      });
      
      if (bursarStatusLog) {
        const hours = (new Date(bursarStatusLog.timestamp) - new Date(req.created)) / (1000 * 60 * 60);
        bursarTotalHours += hours;
        bursarCount++;
      }
    }

    // Calculate Academic average processing time
    const academicRequests = await prisma.request.findMany({
      where: {
        ...whereClause,
        academicStatus: { not: null, not: 'PENDING' },
      },
      select: {
        created: true,
        modified: true,
      },
    });

    let academicTotalHours = 0;
    let academicCount = 0;
    
    for (const req of academicRequests) {
      const academicStatusLog = await prisma.auditLog.findFirst({
        where: {
          requestId: req.id,
          details: { contains: 'academicStatus' },
        },
        orderBy: { timestamp: 'asc' },
      });
      
      if (academicStatusLog) {
        const hours = (new Date(academicStatusLog.timestamp) - new Date(req.created)) / (1000 * 60 * 60);
        academicTotalHours += hours;
        academicCount++;
      }
    }

    // Calculate Processor average processing time
    const processorRequests = await prisma.request.findMany({
      where: {
        ...whereClause,
        status: 'COMPLETED',
      },
      select: {
        created: true,
        modified: true,
      },
    });

    let processorTotalHours = 0;
    let processorCount = 0;
    
    for (const req of processorRequests) {
      const completedLog = await prisma.auditLog.findFirst({
        where: {
          requestId: req.id,
          details: { contains: '"status":"COMPLETED"' },
        },
        orderBy: { timestamp: 'asc' },
      });
      
      if (completedLog) {
        const hours = (new Date(completedLog.timestamp) - new Date(req.created)) / (1000 * 60 * 60);
        processorTotalHours += hours;
        processorCount++;
      }
    }

    res.json({
      library: {
        avgProcessingTimeHours: libraryCount > 0 ? libraryTotalHours / libraryCount : 0,
        totalProcessed: libraryCount,
      },
      bursar: {
        avgProcessingTimeHours: bursarCount > 0 ? bursarTotalHours / bursarCount : 0,
        totalProcessed: bursarCount,
      },
      academic: {
        avgProcessingTimeHours: academicCount > 0 ? academicTotalHours / academicCount : 0,
        totalProcessed: academicCount,
      },
      processor: {
        avgProcessingTimeHours: processorCount > 0 ? processorTotalHours / processorCount : 0,
        totalProcessed: processorCount,
      },
    });
  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

/**
 * Get request volume trends
 */
router.get('/volume-trends', async (req, res) => {
  try {
    const { period = '30', groupBy = 'day' } = req.query; // period in days
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    
    const requests = await prisma.request.findMany({
      where: {
        requestDate: { gte: startDate },
      },
      select: {
        requestDate: true,
        status: true,
        libraryStatus: true,
        bursarStatus: true,
        academicStatus: true,
      },
      orderBy: { requestDate: 'asc' },
    });

    // Group by date
    const trends = {};
    
    requests.forEach(req => {
      let dateKey;
      const date = new Date(req.requestDate);
      
      if (groupBy === 'day') {
        dateKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!trends[dateKey]) {
        trends[dateKey] = {
          date: dateKey,
          total: 0,
          completed: 0,
          pending: 0,
          cancelled: 0,
          libraryPending: 0,
          bursarPending: 0,
          academicPending: 0,
        };
      }
      
      trends[dateKey].total++;
      if (req.status === 'COMPLETED') trends[dateKey].completed++;
      if (req.status === 'PENDING' || req.status === 'NEW') trends[dateKey].pending++;
      if (req.status === 'CANCELLED' || req.status === 'Cancelled') trends[dateKey].cancelled++;
      if (req.libraryStatus === 'PENDING') trends[dateKey].libraryPending++;
      if (req.bursarStatus === 'PENDING') trends[dateKey].bursarPending++;
      if (req.academicStatus === 'PENDING') trends[dateKey].academicPending++;
    });

    const result = Object.values(trends).sort((a, b) => a.date.localeCompare(b.date));
    
    res.json({ trends: result });
  } catch (error) {
    console.error('Get volume trends error:', error);
    res.status(500).json({ error: 'Failed to fetch volume trends' });
  }
});

/**
 * Identify bottlenecks
 */
router.get('/bottlenecks', async (req, res) => {
  try {
    // Find requests stuck in each department
    const libraryPending = await prisma.request.count({
      where: { libraryStatus: 'PENDING' },
    });
    
    const bursarPending = await prisma.request.count({
      where: { bursarStatus: 'PENDING' },
    });
    
    const academicPending = await prisma.request.count({
      where: { academicStatus: 'PENDING' },
    });

    // Find old pending requests (more than 48 hours)
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 48);

    const oldLibraryPending = await prisma.request.count({
      where: {
        libraryStatus: 'PENDING',
        created: { lte: cutoffDate },
      },
    });

    const oldBursarPending = await prisma.request.count({
      where: {
        bursarStatus: 'PENDING',
        created: { lte: cutoffDate },
      },
    });

    const oldAcademicPending = await prisma.request.count({
      where: {
        academicStatus: 'PENDING',
        created: { lte: cutoffDate },
      },
    });

    // Calculate average wait times
    const libraryRequests = await prisma.request.findMany({
      where: { libraryStatus: 'PENDING' },
      select: { created: true },
    });
    
    let libraryTotalWait = 0;
    libraryRequests.forEach(req => {
      libraryTotalWait += (Date.now() - new Date(req.created)) / (1000 * 60 * 60);
    });
    
    const bursarRequests = await prisma.request.findMany({
      where: { bursarStatus: 'PENDING' },
      select: { created: true },
    });
    
    let bursarTotalWait = 0;
    bursarRequests.forEach(req => {
      bursarTotalWait += (Date.now() - new Date(req.created)) / (1000 * 60 * 60);
    });

    const academicRequests = await prisma.request.findMany({
      where: { academicStatus: 'PENDING' },
      select: { created: true },
    });
    
    let academicTotalWait = 0;
    academicRequests.forEach(req => {
      academicTotalWait += (Date.now() - new Date(req.created)) / (1000 * 60 * 60);
    });

    res.json({
      bottlenecks: [
        {
          department: 'LIBRARY',
          pendingCount: libraryPending,
          oldPendingCount: oldLibraryPending,
          avgWaitHours: libraryRequests.length > 0 ? libraryTotalWait / libraryRequests.length : 0,
          severity: oldLibraryPending > 10 ? 'HIGH' : oldLibraryPending > 5 ? 'MEDIUM' : 'LOW',
        },
        {
          department: 'BURSAR',
          pendingCount: bursarPending,
          oldPendingCount: oldBursarPending,
          avgWaitHours: bursarRequests.length > 0 ? bursarTotalWait / bursarRequests.length : 0,
          severity: oldBursarPending > 10 ? 'HIGH' : oldBursarPending > 5 ? 'MEDIUM' : 'LOW',
        },
        {
          department: 'ACADEMIC',
          pendingCount: academicPending,
          oldPendingCount: oldAcademicPending,
          avgWaitHours: academicRequests.length > 0 ? academicTotalWait / academicRequests.length : 0,
          severity: oldAcademicPending > 10 ? 'HIGH' : oldAcademicPending > 5 ? 'MEDIUM' : 'LOW',
        },
      ],
    });
  } catch (error) {
    console.error('Get bottlenecks error:', error);
    res.status(500).json({ error: 'Failed to identify bottlenecks' });
  }
});

/**
 * Forecasting - predict future request volumes
 */
router.get('/forecast', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Get historical data for last 90 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    
    const requests = await prisma.request.findMany({
      where: {
        requestDate: { gte: startDate },
      },
      select: {
        requestDate: true,
      },
      orderBy: { requestDate: 'asc' },
    });

    // Group by day
    const dailyCounts = {};
    requests.forEach(req => {
      const dateKey = new Date(req.requestDate).toISOString().split('T')[0];
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
    });

    const values = Object.values(dailyCounts);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    
    // Simple linear regression for trend
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const sortedDates = Object.keys(dailyCounts).sort();
    sortedDates.forEach((date, index) => {
      const x = index;
      const y = dailyCounts[date];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });
    
    const n = sortedDates.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Forecast future days
    const forecast = [];
    for (let i = 0; i < parseInt(days); i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      const predicted = Math.max(0, Math.round(intercept + slope * (n + i)));
      
      forecast.push({
        date: futureDate.toISOString().split('T')[0],
        predicted: predicted,
        confidence: 'MEDIUM', // Simplified confidence level
      });
    }

    res.json({
      forecast,
      historicalAverage: Math.round(avg),
      trend: slope > 0 ? 'INCREASING' : slope < 0 ? 'DECREASING' : 'STABLE',
    });
  } catch (error) {
    console.error('Get forecast error:', error);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

/**
 * Get custom analytics report
 */
router.post('/custom-report', async (req, res) => {
  try {
    const { filters, dateRange, groupBy } = req.body;
    
    let whereClause = {};
    
    if (dateRange?.startDate) {
      whereClause.requestDate = { gte: new Date(dateRange.startDate) };
    }
    if (dateRange?.endDate) {
      whereClause.requestDate = {
        ...whereClause.requestDate,
        lte: new Date(dateRange.endDate),
      };
    }
    
    if (filters?.status) {
      whereClause.status = filters.status;
    }
    if (filters?.department) {
      if (filters.department === 'LIBRARY') {
        whereClause.libraryStatus = filters.departmentStatus || 'PENDING';
      } else if (filters.department === 'BURSAR') {
        whereClause.bursarStatus = filters.departmentStatus || 'PENDING';
      } else if (filters.department === 'ACADEMIC') {
        whereClause.academicStatus = filters.departmentStatus || 'PENDING';
      }
    }
    if (filters?.program) {
      // SQLite doesn't support mode, use contains which is case-sensitive
      whereClause.program = { contains: filters.program };
    }

    const requests = await prisma.request.findMany({
      where: whereClause,
      select: {
        id: true,
        requestId: true,
        studentId: true,
        studentEmail: true,
        program: true,
        status: true,
        libraryStatus: true,
        bursarStatus: true,
        academicStatus: true,
        requestDate: true,
        modified: true,
      },
    });

    // Group results if requested
    let groupedResults = {};
    
    if (groupBy === 'status') {
      requests.forEach(req => {
        const status = req.status || 'UNKNOWN';
        if (!groupedResults[status]) groupedResults[status] = [];
        groupedResults[status].push(req);
      });
    } else if (groupBy === 'program') {
      requests.forEach(req => {
        const program = req.program || 'UNKNOWN';
        if (!groupedResults[program]) groupedResults[program] = [];
        groupedResults[program].push(req);
      });
    } else if (groupBy === 'department') {
      requests.forEach(req => {
        if (req.libraryStatus) {
          if (!groupedResults['LIBRARY']) groupedResults['LIBRARY'] = [];
          groupedResults['LIBRARY'].push(req);
        }
        if (req.bursarStatus) {
          if (!groupedResults['BURSAR']) groupedResults['BURSAR'] = [];
          groupedResults['BURSAR'].push(req);
        }
        if (req.academicStatus) {
          if (!groupedResults['ACADEMIC']) groupedResults['ACADEMIC'] = [];
          groupedResults['ACADEMIC'].push(req);
        }
      });
    } else {
      groupedResults = { all: requests };
    }

    res.json({
      total: requests.length,
      grouped: groupedResults,
      summary: {
        byStatus: requests.reduce((acc, req) => {
          const status = req.status || 'UNKNOWN';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {}),
        byProgram: requests.reduce((acc, req) => {
          const program = req.program || 'UNKNOWN';
          acc[program] = (acc[program] || 0) + 1;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error('Get custom report error:', error);
    res.status(500).json({ error: 'Failed to generate custom report' });
  }
});

export default router;
