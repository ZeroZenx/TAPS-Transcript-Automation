import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler, ValidationError, NotFoundError } from '../lib/errors.js';
import { validate, schemas } from '../middleware/validation.js';
import { z } from 'zod';
import { createAuditLog } from '../lib/audit.js';
import logger from '../lib/logger.js';
import { sendEmail } from '../lib/email.js';

const router = express.Router();

// Validation schemas
const createConversationSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000, 'Message too long'),
  recipient: z.string().email().optional(),
  sentTo: z.string().optional(),
});

// Get conversations for a request
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

    const conversations = await prisma.conversation.findMany({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
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

    res.json({ conversations });
  })
);

// Create new conversation message
router.post('/:requestId',
  authenticateToken,
  validate(createConversationSchema),
  asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { message, recipient, sentTo } = req.body;

    // Verify request exists
    const request = await prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundError('Request');
    }

    // Check permissions
    if (req.user.role === 'STUDENT' && request.studentEmail !== req.user.email) {
      throw new ValidationError('Access denied');
    }

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        requestId,
        userId: req.user.id,
        message,
        recipient: recipient || null,
        sentTo: sentTo || null,
      },
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
            studentEmail: true,
          },
        },
      },
    });

    // Update request's recent message
    await prisma.request.update({
      where: { id: requestId },
      data: {
        recentMessage: message,
        conversations: JSON.stringify([...JSON.parse(request.conversations || '[]'), {
          id: conversation.id,
          message,
          user: conversation.user,
          createdAt: conversation.createdAt,
        }]),
      },
    });

    // Send email if recipient is specified
    if (recipient) {
      try {
        const emailSubject = `New message on Request ${request.requestId || requestId}`;
        const emailBody = `
          <p>You have a new message regarding your transcript request:</p>
          <p><strong>From:</strong> ${req.user.name} (${req.user.email})</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/requests/${requestId}">View Request</a></p>
        `;

        await sendEmail({
          to: recipient,
          subject: emailSubject,
          htmlBody: emailBody,
          textBody: message,
        });

        logger.info(`Conversation email sent to ${recipient} for request ${requestId}`);
      } catch (error) {
        logger.error('Failed to send conversation email:', error);
        // Don't fail the request if email fails
      }
    }

    await createAuditLog('CONVERSATION_CREATED', {
      requestId,
      messageLength: message.length,
      recipient,
    }, req.user.id);

    logger.info(`Conversation created for request ${requestId} by ${req.user.email}`);

    res.status(201).json({
      conversation,
      message: 'Message sent successfully',
    });
  })
);

// Delete conversation message (admin only)
router.delete('/:conversationId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { conversationId } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { request: true },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation');
    }

    // Only allow deletion if user is admin or the message author
    if (req.user.role !== 'ADMIN' && conversation.userId !== req.user.id) {
      throw new ValidationError('Access denied');
    }

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    await createAuditLog('CONVERSATION_DELETED', {
      requestId: conversation.requestId,
      conversationId,
    }, req.user.id);

    logger.info(`Conversation deleted: ${conversationId} by ${req.user.email}`);

    res.json({ message: 'Message deleted successfully' });
  })
);

export default router;

