import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog, createAuditLogWithChanges } from '../lib/audit.js';
import { uploadFileToSharePoint } from '../lib/sharepoint.js';
import { triggerPowerAutomateWebhook } from '../lib/powerautomate.js';

const router = express.Router();

// Get all requests (role-based filtering)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, academicStatus, libraryStatus, bursarStatus, page = 1, limit = 20, role } = req.query;
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
    if (academicStatus) {
      where.academicStatus = academicStatus;
    }
    if (libraryStatus) {
      where.libraryStatus = libraryStatus;
    }
    if (bursarStatus) {
      where.bursarStatus = bursarStatus;
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
    const { studentId, studentEmail, contactNumber, program, requestor, parchmentCode, requestDate, files } = req.body;

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
        contactNumber: contactNumber || null,
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

    // Log request creation with full details
    await createAuditLog('REQUEST_CREATED', {
      requestId: request.requestId,
      studentId: request.studentId,
      studentEmail: request.studentEmail,
      contactNumber: request.contactNumber,
      program: request.program,
      requestor: request.requestor,
      parchmentCode: request.parchmentCode,
      status: request.status,
    }, user?.id, request.id);
    await triggerPowerAutomateWebhook('REQUEST_CREATED', { requestId: request.requestId || request.id, studentEmail });

    // Send immediate notifications to Library and Bursar
    const { sendLibraryQueueNotification, sendBursarQueueNotification } = await import('../lib/queueNotifications.js');
    try {
      await sendLibraryQueueNotification(request);
      await sendBursarQueueNotification(request);
    } catch (emailError) {
      console.error('Error sending queue notifications:', emailError);
      // Don't fail the request creation if email fails
    }

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

    // Handle file attachments (for all roles that can update)
    if (req.body.files && Array.isArray(req.body.files) && req.body.files.length > 0) {
      try {
        // Get existing files
        let existingFiles = [];
        if (currentRequest.filesUrl) {
          try {
            existingFiles = typeof currentRequest.filesUrl === 'string' 
              ? JSON.parse(currentRequest.filesUrl) 
              : currentRequest.filesUrl;
          } catch (e) {
            existingFiles = [];
          }
        }

        // Upload new files to SharePoint
        const uploadPromises = req.body.files.map(async (file) => {
          const fileBuffer = Buffer.from(file.content, 'base64');
          return uploadFileToSharePoint(file.name, fileBuffer);
        });

        const uploadResults = await Promise.all(uploadPromises);
        
        // Merge existing files with new files
        const allFiles = [...existingFiles, ...uploadResults];
        updateData.filesUrl = JSON.stringify(allFiles);
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        // Don't fail the entire update if file upload fails
      }
    }

    // Prepare old data for comparison (only fields that will be updated)
    const oldData = {};
    Object.keys(updateData).forEach(key => {
      if (currentRequest[key] !== undefined) {
        oldData[key] = currentRequest[key];
      }
    });

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

    // Build new data object for comparison
    const newData = {};
    Object.keys(updateData).forEach(key => {
      newData[key] = updateData[key];
    });

    // Use enhanced audit logging with field-level change tracking
    await createAuditLogWithChanges(
      'REQUEST_UPDATED',
      oldData,
      newData,
      user?.id,
      requestId
    );

    // Check if Library status changed - notify Bursar AND TAPS system email
    if (currentRequest.libraryStatus !== updatedRequest.libraryStatus) {
      // Notify Bursar when Library changes from PENDING
      if (currentRequest.libraryStatus === 'PENDING' && updatedRequest.libraryStatus !== 'PENDING') {
        try {
          const { sendLibraryStatusChangeNotification } = await import('../lib/queueNotifications.js');
          await sendLibraryStatusChangeNotification(
            updatedRequest,
            currentRequest.libraryStatus,
            updatedRequest.libraryStatus
          );
        } catch (emailError) {
          console.error('Error sending Library status change notification:', emailError);
          // Don't fail the update if email fails
        }
      }
      
      // Always notify TAPS system email of Library status changes
      try {
        const { sendLibraryStatusChangeToTAPS } = await import('../lib/queueNotifications.js');
        await sendLibraryStatusChangeToTAPS(
          updatedRequest,
          currentRequest.libraryStatus,
          updatedRequest.libraryStatus
        );
      } catch (emailError) {
        console.error('Error sending Library status change notification to TAPS:', emailError);
        // Don't fail the update if email fails
      }
    }

    // Check if Bursar status changed - notify TAPS system email
    if (currentRequest.bursarStatus !== updatedRequest.bursarStatus) {
      // Always notify TAPS system email of Bursar status changes
      try {
        const { sendBursarStatusChangeNotification } = await import('../lib/queueNotifications.js');
        await sendBursarStatusChangeNotification(
          updatedRequest,
          currentRequest.bursarStatus,
          updatedRequest.bursarStatus
        );
      } catch (emailError) {
        console.error('Error sending Bursar status change notification:', emailError);
        // Don't fail the update if email fails
      }
    }

    // Check if Academic status changed - notify TAPS system email
    if (currentRequest.academicStatus !== updatedRequest.academicStatus) {
      try {
        const { sendAcademicStatusChangeToTAPS } = await import('../lib/queueNotifications.js');
        await sendAcademicStatusChangeToTAPS(
          updatedRequest,
          currentRequest.academicStatus,
          updatedRequest.academicStatus
        );
      } catch (emailError) {
        console.error('Error sending Academic status change notification to TAPS:', emailError);
        // Don't fail the update if email fails
      }
    }

    // Check if general request status changed - notify TAPS system email
    if (currentRequest.status !== updatedRequest.status) {
      try {
        const { sendRequestStatusChangeToTAPS } = await import('../lib/queueNotifications.js');
        await sendRequestStatusChangeToTAPS(
          updatedRequest,
          currentRequest.status,
          updatedRequest.status
        );
      } catch (emailError) {
        console.error('Error sending Request status change notification to TAPS:', emailError);
        // Don't fail the update if email fails
      }
    }

    // Check if Library and Bursar have both confirmed, then notify Academic
    if (updatedRequest.libraryStatus && updatedRequest.libraryStatus !== 'PENDING' &&
        updatedRequest.bursarStatus && updatedRequest.bursarStatus !== 'PENDING' &&
        updatedRequest.academicStatus === 'PENDING') {
      try {
        const { checkAndNotifyAcademic } = await import('../lib/queueNotifications.js');
        await checkAndNotifyAcademic(updatedRequest);
      } catch (emailError) {
        console.error('Error checking and notifying Academic:', emailError);
        // Don't fail the update if email fails
      }
    }

    // Check if Academic status changed to COMPLETED - notify Processor
    if (currentRequest.academicStatus !== updatedRequest.academicStatus && 
        updatedRequest.academicStatus === 'COMPLETED') {
      try {
        const { sendAcademicCompletedNotification } = await import('../lib/queueNotifications.js');
        await sendAcademicCompletedNotification(updatedRequest);
      } catch (emailError) {
        console.error('Error sending Academic completed notification:', emailError);
        // Don't fail the update if email fails
      }
    }

    // Check if Academic status changed to CORRECTIONS_REQUIRED - notify Processor
    if (currentRequest.academicStatus !== updatedRequest.academicStatus && 
        updatedRequest.academicStatus === 'CORRECTIONS_REQUIRED') {
      try {
        const { sendAcademicCorrectionNotification } = await import('../lib/queueNotifications.js');
        await sendAcademicCorrectionNotification(updatedRequest);
      } catch (emailError) {
        console.error('Error sending Academic correction notification:', emailError);
        // Don't fail the update if email fails
      }
    }

    await triggerPowerAutomateWebhook('REQUEST_UPDATED', {
      requestId,
      updates: updateData,
    });

    res.json({ request: updatedRequest });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

export default router;

