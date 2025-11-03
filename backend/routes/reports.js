import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get comprehensive reports
router.get('/', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status,
      department,
      program,
      studentEmail,
      format = 'json',
    } = req.query;

    const where = {};

    // Date range filter
    if (startDate || endDate) {
      where.requestDate = {};
      if (startDate) {
        where.requestDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.requestDate.lte = new Date(endDate);
      }
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Department filter
    if (department) {
      if (department === 'LIBRARY') {
        where.libraryStatus = { not: null };
      } else if (department === 'BURSAR') {
        where.bursarStatus = { not: null };
      } else if (department === 'ACADEMIC') {
        where.academicStatus = { not: null };
      }
    }

    // Program filter
    if (program) {
      where.program = {
        contains: program,
      };
    }

    // Student email filter
    if (studentEmail) {
      where.studentEmail = {
        contains: studentEmail,
      };
    }

    const requests = await prisma.request.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { requestDate: 'desc' },
    });

    // Generate summary statistics
    const stats = {
      total: requests.length,
      byStatus: {},
      byDepartment: {
        library: { total: 0, pending: 0, approved: 0, rejected: 0 },
        bursar: { total: 0, pending: 0, approved: 0, rejected: 0 },
        academic: { total: 0, pending: 0, approved: 0, rejected: 0 },
      },
      byProgram: {},
      dateRange: {
        start: startDate || null,
        end: endDate || null,
      },
    };

    requests.forEach(request => {
      // Count by status
      const status = request.status || 'UNKNOWN';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Count by program
      const prog = request.program || 'Unknown';
      stats.byProgram[prog] = (stats.byProgram[prog] || 0) + 1;

      // Count by department
      if (request.libraryStatus) {
        stats.byDepartment.library.total++;
        if (request.libraryStatus === 'PENDING' || request.libraryStatus === 'Awaiting Payment') {
          stats.byDepartment.library.pending++;
        } else if (request.libraryStatus === 'Approved' || request.libraryStatus === 'Due cleared') {
          stats.byDepartment.library.approved++;
        } else {
          stats.byDepartment.library.rejected++;
        }
      }

      if (request.bursarStatus) {
        stats.byDepartment.bursar.total++;
        if (request.bursarStatus === 'PENDING' || request.bursarStatus === 'Awaiting Payment') {
          stats.byDepartment.bursar.pending++;
        } else if (request.bursarStatus === 'Approved') {
          stats.byDepartment.bursar.approved++;
        } else {
          stats.byDepartment.bursar.rejected++;
        }
      }

      if (request.academicStatus) {
        stats.byDepartment.academic.total++;
        if (request.academicStatus === 'PENDING' || request.academicStatus === 'Outstanding') {
          stats.byDepartment.academic.pending++;
        } else if (request.academicStatus === 'Approved' || request.academicStatus === 'Completed') {
          stats.byDepartment.academic.approved++;
        } else {
          stats.byDepartment.academic.rejected++;
        }
      }
    });

    // Export format handling
    if (format === 'csv') {
      // Simple CSV export
      const csvHeader = [
        'Request ID',
        'Student ID',
        'Student Email',
        'Program',
        'Request Date',
        'Status',
        'Library Status',
        'Bursar Status',
        'Academic Status',
        'Total Due',
      ].join(',');

      const csvRows = requests.map(r => [
        r.requestId || r.id.substring(0, 8),
        r.studentId || '',
        r.studentEmail || '',
        r.program || '',
        r.requestDate?.toISOString().split('T')[0] || '',
        r.status || '',
        r.libraryStatus || '',
        r.bursarStatus || '',
        r.academicStatus || '',
        r.totalDue || '',
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=requests-report-${Date.now()}.csv`);
      res.send([csvHeader, ...csvRows].join('\n'));
      return;
    }

    res.json({
      requests,
      stats,
      filters: {
        startDate,
        endDate,
        status,
        department,
        program,
        studentEmail,
      },
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Get dashboard summary statistics
router.get('/summary', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};

    if (startDate || endDate) {
      where.requestDate = {};
      if (startDate) {
        where.requestDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.requestDate.lte = new Date(endDate);
      }
    }

    const [
      totalRequests,
      byStatus,
      byDepartment,
      recentRequests,
      averageProcessingTime,
    ] = await Promise.all([
      prisma.request.count({ where }),
      prisma.request.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      prisma.request.findMany({
        where,
        select: {
          libraryStatus: true,
          bursarStatus: true,
          academicStatus: true,
        },
      }),
      prisma.request.findMany({
        where,
        take: 10,
        orderBy: { requestDate: 'desc' },
        select: {
          id: true,
          requestId: true,
          studentEmail: true,
          program: true,
          status: true,
          requestDate: true,
        },
      }),
      // Calculate average processing time (from requestDate to modified)
      prisma.request.findMany({
        where: {
          AND: [
            { requestDate: { not: null } },
            { modified: { not: null } },
            { status: 'COMPLETED' },
          ],
        },
        select: {
          requestDate: true,
          modified: true,
        },
      }),
    ]);

    // Calculate department stats
    const deptStats = {
      library: {
        total: 0,
        pending: 0,
        approved: 0,
      },
      bursar: {
        total: 0,
        pending: 0,
        approved: 0,
      },
      academic: {
        total: 0,
        pending: 0,
        approved: 0,
      },
    };

    byDepartment.forEach(req => {
      if (req.libraryStatus) {
        deptStats.library.total++;
        if (req.libraryStatus === 'Approved' || req.libraryStatus === 'Due cleared') {
          deptStats.library.approved++;
        } else {
          deptStats.library.pending++;
        }
      }
      if (req.bursarStatus) {
        deptStats.bursar.total++;
        if (req.bursarStatus === 'Approved') {
          deptStats.bursar.approved++;
        } else {
          deptStats.bursar.pending++;
        }
      }
      if (req.academicStatus) {
        deptStats.academic.total++;
        if (req.academicStatus === 'Approved' || req.academicStatus === 'Completed') {
          deptStats.academic.approved++;
        } else {
          deptStats.academic.pending++;
        }
      }
    });

    // Calculate average processing time
    let avgProcessingTime = null;
    if (averageProcessingTime.length > 0) {
      const totalMs = averageProcessingTime.reduce((sum, req) => {
        const diff = new Date(req.modified).getTime() - new Date(req.requestDate).getTime();
        return sum + diff;
      }, 0);
      avgProcessingTime = Math.round(totalMs / averageProcessingTime.length / (1000 * 60 * 60 * 24)); // days
    }

    res.json({
      totalRequests,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status || 'UNKNOWN'] = item._count.status;
        return acc;
      }, {}),
      byDepartment: deptStats,
      recentRequests,
      averageProcessingTimeDays: avgProcessingTime,
      dateRange: {
        start: startDate || null,
        end: endDate || null,
      },
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

export default router;

