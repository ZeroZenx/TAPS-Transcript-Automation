import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { asyncHandler, ValidationError, NotFoundError } from '../lib/errors.js';
import { createAuditLog } from '../lib/audit.js';
import logger from '../lib/logger.js';
import { uploadFileToSharePoint } from '../lib/sharepoint.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`File type ${file.mimetype} is not allowed`));
    }
  },
});

// Upload file for a request
router.post('/:requestId',
  authenticateToken,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    // Verify request exists
    const request = await prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      throw new NotFoundError('Request');
    }

    let fileUrl = req.file.path;
    const filename = req.file.filename;
    const originalFilename = req.file.originalname;

    // Try to upload to SharePoint if configured
    try {
      if (process.env.SHAREPOINT_SITE_ID && process.env.SHAREPOINT_DRIVE_ID) {
        const sharePointUrl = await uploadFileToSharePoint(
          req.file.path,
          originalFilename,
          requestId
        );
        if (sharePointUrl) {
          fileUrl = sharePointUrl;
          // Delete local file after successful SharePoint upload
          fs.unlinkSync(req.file.path);
        }
      }
    } catch (error) {
      logger.error('SharePoint upload failed, using local storage:', error);
      // Continue with local storage
    }

    // Save file record to database
    const fileRecord = await prisma.file.create({
      data: {
        requestId,
        filename,
        originalFilename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        uploadedBy: req.user.id,
      },
    });

    await createAuditLog('FILE_UPLOADED', {
      requestId,
      filename: originalFilename,
      size: req.file.size,
    }, req.user.id);

    logger.info(`File uploaded: ${originalFilename} for request ${requestId} by ${req.user.email}`);

    res.status(201).json({
      file: fileRecord,
      message: 'File uploaded successfully',
    });
  })
);

// Get files for a request
router.get('/:requestId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { requestId } = req.params;

    // Verify request exists
    const request = await prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundError('Request');
    }

    // Check permissions - students can only see their own requests
    if (req.user.role === 'STUDENT' && request.studentEmail !== req.user.email) {
      throw new ValidationError('Access denied');
    }

    const files = await prisma.file.findMany({
      where: { requestId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        request: {
          select: {
            id: true,
            requestId: true,
            studentEmail: true,
          },
        },
      },
    });

    res.json({ files });
  })
);

// Delete file
router.delete('/:fileId',
  authenticateToken,
  requireRole('ADMIN', 'VERIFIER', 'PROCESSOR'),
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: { request: true },
    });

    if (!file) {
      throw new NotFoundError('File');
    }

    // Delete physical file
    try {
      if (fs.existsSync(file.url) && !file.url.startsWith('http')) {
        fs.unlinkSync(file.url);
      }
    } catch (error) {
      logger.warn(`Failed to delete physical file: ${file.url}`, error);
    }

    // Delete database record
    await prisma.file.delete({
      where: { id: fileId },
    });

    await createAuditLog('FILE_DELETED', {
      requestId: file.requestId,
      filename: file.originalFilename,
    }, req.user.id);

    logger.info(`File deleted: ${file.originalFilename} by ${req.user.email}`);

    res.json({ message: 'File deleted successfully' });
  })
);

// Download file
router.get('/:fileId/download',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: { request: true },
    });

    if (!file) {
      throw new NotFoundError('File');
    }

    // Check permissions
    if (req.user.role === 'STUDENT' && file.request.studentEmail !== req.user.email) {
      throw new ValidationError('Access denied');
    }

    // If it's a SharePoint URL, redirect
    if (file.url.startsWith('http')) {
      return res.redirect(file.url);
    }

    // Serve local file
    if (!fs.existsSync(file.url)) {
      throw new NotFoundError('File not found on server');
    }

    res.download(file.url, file.originalFilename, (err) => {
      if (err) {
        logger.error('Error downloading file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download file' });
        }
      }
    });
  })
);

export default router;

