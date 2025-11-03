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

    // Role-based filtering - ADMIN, VERIFIER, PROCESSOR see all requests
    if (req.user.role === 'STUDENT') {
      where.studentEmail = req.user.email;
    } else if (req.user.role === 'LIBRARY') {
      where.libraryStatus = 'PENDING';
    } else if (req.user.role === 'BURSAR') {
      where.bursarStatus = 'PENDING';
    } else if (req.user.role === 'ACADEMIC') {
      where.academicStatus = 'PENDING';
    }
    // ADMIN, VERIFIER, PROCESSOR see all requests (no where clause added)

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
    const { studentId, studentEmail, program, requestor, parchmentCode, requestDate, files } = req.body;

    if (!studentId || !studentEmail || !requestor || !parchmentCode) {
      return res.status(400).json({ error: 'Missing required fields: studentId, studentEmail, requestor, and parchmentCode are required' });
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

    // Generate Request ID (8-digit format similar to Power App: e.g., 94870211)
    const timestamp = Date.now();
    const requestId = `${timestamp.toString().slice(-8)}`;

    // Parse request date if provided, otherwise use current date
    let parsedRequestDate = new Date();
    if (requestDate) {
      parsedRequestDate = new Date(requestDate);
      if (isNaN(parsedRequestDate.getTime())) {
        parsedRequestDate = new Date();
      }
    }

    // Create request
    const request = await prisma.request.create({
      data: {
        requestId,
        studentId,
        studentEmail,
        program: program || null,
        requestor,
        parchmentCode,
        requestDate: parsedRequestDate,
        filesUrl,
        userId: user?.id,
        status: 'NEW',
        academicStatus: 'PENDING',
        libraryStatus: 'PENDING',
        bursarStatus: 'PENDING',
        createdBy: user?.name || requestor,
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    await createAuditLog('REQUEST_CREATED', { requestId: request.requestId || request.id }, user?.id, request.id);
    await triggerPowerAutomateWebhook('REQUEST_CREATED', { requestId: request.requestId || request.id, studentEmail });

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
    if (req.user.role === 'ACADEMIC') {
      if (academicStatus !== undefined) {
        updateData.academicStatus = academicStatus;
        auditDetails.academicStatus = academicStatus;
      }
      if (notes !== undefined) {
        updateData.academicNote = notes;
        auditDetails.academicNote = notes;
      }
      // Handle new Academic-specific fields
      if (req.body.responsibleDeptForAcademicIssues !== undefined) {
        updateData.responsibleDeptForAcademicIssues = req.body.responsibleDeptForAcademicIssues;
        auditDetails.responsibleDeptForAcademicIssues = req.body.responsibleDeptForAcademicIssues;
      }
      if (req.body.academicVerifierComments !== undefined) {
        updateData.academicVerifierComments = req.body.academicVerifierComments;
        auditDetails.academicVerifierComments = req.body.academicVerifierComments;
      }
      if (req.body.academicCorrectionAddressed !== undefined) {
        updateData.academicCorrectionAddressed = req.body.academicCorrectionAddressed;
        auditDetails.academicCorrectionAddressed = req.body.academicCorrectionAddressed;
      }
      if (req.body.academicCorrectionComments !== undefined) {
        updateData.academicCorrectionComments = req.body.academicCorrectionComments;
        auditDetails.academicCorrectionComments = req.body.academicCorrectionComments;
      }
      // Handle academicHistory as well (synonym for academicStatus)
      if (req.body.academicHistory !== undefined) {
        updateData.academicHistory = req.body.academicHistory;
        auditDetails.academicHistory = req.body.academicHistory;
        // Also set academicStatus if not already set
        if (!academicStatus) {
          updateData.academicStatus = req.body.academicHistory;
          auditDetails.academicStatus = req.body.academicHistory;
        }
      }
    }

    if (req.user.role === 'LIBRARY') {
      if (libraryStatus !== undefined) {
        updateData.libraryStatus = libraryStatus;
        auditDetails.libraryStatus = libraryStatus;
      }
      if (notes !== undefined) {
        updateData.libraryNote = notes;
        auditDetails.libraryNote = notes;
      }
      // Handle new Library-specific fields
      if (req.body.libraryDeptDueAmount !== undefined) {
        updateData.libraryDeptDueAmount = req.body.libraryDeptDueAmount;
        auditDetails.libraryDeptDueAmount = req.body.libraryDeptDueAmount;
      }
      if (req.body.libraryDeptDueDetails !== undefined) {
        updateData.libraryDeptDueDetails = req.body.libraryDeptDueDetails;
        auditDetails.libraryDeptDueDetails = req.body.libraryDeptDueDetails;
      }
    }

    if (req.user.role === 'BURSAR') {
      if (bursarStatus !== undefined) {
        updateData.bursarStatus = bursarStatus;
        auditDetails.bursarStatus = bursarStatus;
      }
      if (notes !== undefined) {
        updateData.bursarNote = notes;
        auditDetails.bursarNote = notes;
      }
      // Handle new Bursar-specific fields
      if (req.body.officeOfBursarDueAmount !== undefined) {
        updateData.officeOfBursarDueAmount = req.body.officeOfBursarDueAmount;
        auditDetails.officeOfBursarDueAmount = req.body.officeOfBursarDueAmount;
      }
      if (req.body.officeOfBursarDueDetails !== undefined) {
        updateData.officeOfBursarDueDetails = req.body.officeOfBursarDueDetails;
        auditDetails.officeOfBursarDueDetails = req.body.officeOfBursarDueDetails;
      }
      if (req.body.bursarsConfirmationForLibraryDuePayment !== undefined) {
        updateData.bursarsConfirmationForLibraryDuePayment = req.body.bursarsConfirmationForLibraryDuePayment;
        auditDetails.bursarsConfirmationForLibraryDuePayment = req.body.bursarsConfirmationForLibraryDuePayment;
      }
    }

    if (req.user.role === 'VERIFIER') {
      if (verifierNotes !== undefined) {
        updateData.verifierNotes = verifierNotes;
        auditDetails.verifierNotes = verifierNotes;
      }
      if (status !== undefined) {
        updateData.status = status;
        auditDetails.status = status;
      }
      // Handle Verifier-specific fields (same as Academic but from Verifier role)
      if (req.body.academicHistory !== undefined) {
        updateData.academicHistory = req.body.academicHistory;
        auditDetails.academicHistory = req.body.academicHistory;
      }
      if (req.body.responsibleDeptForAcademicIssues !== undefined) {
        updateData.responsibleDeptForAcademicIssues = req.body.responsibleDeptForAcademicIssues;
        auditDetails.responsibleDeptForAcademicIssues = req.body.responsibleDeptForAcademicIssues;
      }
      if (req.body.academicVerifierComments !== undefined) {
        updateData.academicVerifierComments = req.body.academicVerifierComments;
        auditDetails.academicVerifierComments = req.body.academicVerifierComments;
        // Also update verifierNotes for compatibility
        updateData.verifierNotes = req.body.academicVerifierComments;
      }
      if (req.body.academicCorrectionAddressed !== undefined) {
        updateData.academicCorrectionAddressed = req.body.academicCorrectionAddressed;
        auditDetails.academicCorrectionAddressed = req.body.academicCorrectionAddressed;
      }
      if (req.body.academicCorrectionComments !== undefined) {
        updateData.academicCorrectionComments = req.body.academicCorrectionComments;
        auditDetails.academicCorrectionComments = req.body.academicCorrectionComments;
      }
      // Handle request detail fields
      if (req.body.gpaRecalculation !== undefined) {
        updateData.gpaRecalculation = req.body.gpaRecalculation;
        auditDetails.gpaRecalculation = req.body.gpaRecalculation;
      }
      if (req.body.changeOfProgramme !== undefined) {
        updateData.changeOfProgramme = req.body.changeOfProgramme;
        auditDetails.changeOfProgramme = req.body.changeOfProgramme;
      }
      if (req.body.degreeToBeAwarded !== undefined) {
        updateData.degreeToBeAwarded = req.body.degreeToBeAwarded;
        auditDetails.degreeToBeAwarded = req.body.degreeToBeAwarded;
      }
      if (req.body.inProgressCoursesForPriorSemester !== undefined) {
        updateData.inProgressCoursesForPriorSemester = req.body.inProgressCoursesForPriorSemester;
        auditDetails.inProgressCoursesForPriorSemester = req.body.inProgressCoursesForPriorSemester;
      }
      if (req.body.transcriptTemplateIssue !== undefined) {
        updateData.transcriptTemplateIssue = req.body.transcriptTemplateIssue;
        auditDetails.transcriptTemplateIssue = req.body.transcriptTemplateIssue;
      }
      if (req.body.addressFormat !== undefined) {
        updateData.addressFormat = req.body.addressFormat;
        auditDetails.addressFormat = req.body.addressFormat;
      }
      if (req.body.other !== undefined) {
        updateData.other = req.body.other;
        auditDetails.other = req.body.other;
      }
    }

    if (req.user.role === 'PROCESSOR') {
      if (processorNotes !== undefined) {
        updateData.processorNotes = processorNotes;
        auditDetails.processorNotes = processorNotes;
      }
      if (status !== undefined) {
        updateData.status = status;
        auditDetails.status = status;
      }
      // Handle request detail fields that Processor can update
      if (req.body.gpaRecalculation !== undefined) {
        updateData.gpaRecalculation = req.body.gpaRecalculation;
        auditDetails.gpaRecalculation = req.body.gpaRecalculation;
      }
      if (req.body.changeOfProgramme !== undefined) {
        updateData.changeOfProgramme = req.body.changeOfProgramme;
        auditDetails.changeOfProgramme = req.body.changeOfProgramme;
      }
      if (req.body.degreeToBeAwarded !== undefined) {
        updateData.degreeToBeAwarded = req.body.degreeToBeAwarded;
        auditDetails.degreeToBeAwarded = req.body.degreeToBeAwarded;
      }
      if (req.body.inProgressCoursesForPriorSemester !== undefined) {
        updateData.inProgressCoursesForPriorSemester = req.body.inProgressCoursesForPriorSemester;
        auditDetails.inProgressCoursesForPriorSemester = req.body.inProgressCoursesForPriorSemester;
      }
      if (req.body.transcriptTemplateIssue !== undefined) {
        updateData.transcriptTemplateIssue = req.body.transcriptTemplateIssue;
        auditDetails.transcriptTemplateIssue = req.body.transcriptTemplateIssue;
      }
      if (req.body.addressFormat !== undefined) {
        updateData.addressFormat = req.body.addressFormat;
        auditDetails.addressFormat = req.body.addressFormat;
      }
      if (req.body.other !== undefined) {
        updateData.other = req.body.other;
        auditDetails.other = req.body.other;
      }
    }

    // ADMIN can update everything
    if (req.user.role === 'ADMIN') {
      if (status !== undefined) {
        updateData.status = status;
        auditDetails.status = status;
      }
      // Allow admin to update any field
      const adminUpdatableFields = [
        'gpaRecalculation', 'changeOfProgramme', 'degreeToBeAwarded',
        'inProgressCoursesForPriorSemester', 'transcriptTemplateIssue',
        'addressFormat', 'other',
        'academicHistory', 'academicStatus', 'responsibleDeptForAcademicIssues',
        'academicVerifierComments', 'academicCorrectionAddressed', 'academicCorrectionComments',
        'libraryStatus', 'libraryDeptDueAmount', 'libraryDeptDueDetails', 'libraryNote',
        'bursarStatus', 'officeOfBursarDueAmount', 'officeOfBursarDueDetails',
        'bursarsConfirmationForLibraryDuePayment', 'bursarNote'
      ];
      
      adminUpdatableFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
          auditDetails[field] = req.body[field];
        }
      });
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

