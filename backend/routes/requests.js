import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../lib/audit.js';
import { uploadFileToSharePoint } from '../lib/sharepoint.js';
import { triggerPowerAutomateWebhook } from '../lib/powerautomate.js';

const router = express.Router();

// Get all requests (role-based filtering)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 20, role } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where = {};

    // Role-based filtering
    if (req.user.role === 'STUDENT') {
      where.studentEmail = req.user.email;
    } else if (req.user.role === 'LIBRARY') {
      where.libraryStatus = 'PENDING';
    } else if (req.user.role === 'BURSAR') {
      where.bursarStatus = 'PENDING';
    } else if (req.user.role === 'ACADEMIC') {
      where.academicStatus = 'PENDING';
    }

    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { requestDate: 'desc' },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.request.count({ where }),
    ]);

    res.json({
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Get my requests (for students)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const requests = await prisma.request.findMany({
      where: { studentEmail: req.user.email },
      orderBy: { requestDate: 'desc' },
      include: {
        auditLogs: {
          orderBy: { timestamp: 'desc' },
          take: 10,
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    });

    res.json({ requests });
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Get single request
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const request = await prisma.request.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { name: true, email: true },
        },
        auditLogs: {
          orderBy: { timestamp: 'desc' },
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check permissions
    if (req.user.role === 'STUDENT' && request.studentEmail !== req.user.email) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ request });
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// Create new transcript request
router.post('/', authenticateToken, requireRole('STUDENT'), async (req, res) => {
  try {
    const { studentId, studentEmail, program, files } = req.body;

    if (!studentId || !studentEmail || !program) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let filesUrl = null;

    // Upload files to SharePoint if provided
    if (files && files.length > 0) {
      try {
        const uploadPromises = files.map(async (file) => {
          const fileBuffer = Buffer.from(file.content, 'base64');
          return uploadFileToSharePoint(file.name, fileBuffer);
        });

        const uploadResults = await Promise.all(uploadPromises);
        filesUrl = JSON.stringify(uploadResults);
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(500).json({ error: 'Failed to upload files' });
      }
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: req.user.email },
    });

    // Create request
    const request = await prisma.request.create({
      data: {
        studentId,
        studentEmail,
        program,
        filesUrl,
        userId: user?.id,
        status: 'PENDING',
        academicStatus: 'PENDING',
        libraryStatus: 'PENDING',
        bursarStatus: 'PENDING',
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    await createAuditLog('REQUEST_CREATED', { requestId: request.id }, user?.id, request.id);
    await triggerPowerAutomateWebhook('REQUEST_CREATED', { requestId: request.id, studentEmail });

    res.status(201).json({ request });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// Update request status
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, academicStatus, libraryStatus, bursarStatus, verifierNotes, processorNotes, notes } = req.body;
    const requestId = req.params.id;

    // Get current request
    const currentRequest = await prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!currentRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check permissions based on role
    const user = await prisma.user.findUnique({
      where: { email: req.user.email },
    });

    const updateData = {};
    const auditDetails = {};

    // Role-based updates
    if (req.user.role === 'ACADEMIC' && academicStatus !== undefined) {
      updateData.academicStatus = academicStatus;
      auditDetails.academicStatus = academicStatus;
      if (notes) {
        updateData.academicNote = notes;
        auditDetails.academicNote = notes;
      }
    }

    if (req.user.role === 'LIBRARY' && libraryStatus !== undefined) {
      updateData.libraryStatus = libraryStatus;
      auditDetails.libraryStatus = libraryStatus;
      if (notes) {
        updateData.libraryNote = notes;
        auditDetails.libraryNote = notes;
      }
    }

    if (req.user.role === 'BURSAR' && bursarStatus !== undefined) {
      updateData.bursarStatus = bursarStatus;
      auditDetails.bursarStatus = bursarStatus;
      if (notes) {
        updateData.bursarNote = notes;
        auditDetails.bursarNote = notes;
      }
    }

    if (req.user.role === 'VERIFIER' && verifierNotes !== undefined) {
      updateData.verifierNotes = verifierNotes;
      auditDetails.verifierNotes = verifierNotes;
    }

    if (req.user.role === 'VERIFIER' && status !== undefined) {
      updateData.status = status;
      auditDetails.status = status;
    }

    if (req.user.role === 'PROCESSOR' && processorNotes !== undefined) {
      updateData.processorNotes = processorNotes;
      auditDetails.processorNotes = processorNotes;
    }

    if (status !== undefined && (req.user.role === 'PROCESSOR' || req.user.role === 'ADMIN')) {
      updateData.status = status;
      auditDetails.status = status;
    }

    // Update request
    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: updateData,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    await createAuditLog('REQUEST_UPDATED', auditDetails, user?.id, requestId);
    await triggerPowerAutomateWebhook('REQUEST_UPDATED', {
      requestId,
      updates: auditDetails,
    });

    res.json({ request: updatedRequest });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

export default router;

