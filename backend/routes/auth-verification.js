import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { createAuditLog } from '../lib/audit.js';
import { asyncHandler, ValidationError, NotFoundError, AuthenticationError } from '../lib/errors.js';
import { validate, schemas } from '../middleware/validation.js';
import { z } from 'zod';
import logger from '../lib/logger.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email.js';

const router = express.Router();

// Email verification schema
const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

// Request password reset schema
const requestPasswordResetSchema = z.object({
  email: schemas.email,
});

// Reset password schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: schemas.password,
});

// Verify email
router.post('/verify-email', 
  validate(verifyEmailSchema),
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new NotFoundError('Invalid verification token');
    }

    if (user.emailVerificationExpires && new Date() > user.emailVerificationExpires) {
      throw new ValidationError('Verification token has expired. Please request a new one.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    await createAuditLog('EMAIL_VERIFIED', { email: user.email }, user.id);

    logger.info(`Email verified for user: ${user.email}`);

    res.json({
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: true,
      },
    });
  })
);

// Resend verification email
router.post('/resend-verification',
  validate(z.object({ email: schemas.email })),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return res.json({
        message: 'If an account exists with this email, a verification email has been sent.',
      });
    }

    if (user.emailVerified) {
      return res.json({
        message: 'Email is already verified',
      });
    }

    // Generate new verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // 24 hours

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: token,
        emailVerificationExpires: expires,
      },
    });

    // Send verification email
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
      await sendVerificationEmail(user.email, user.name, verificationUrl);
      logger.info(`Verification email sent to: ${user.email}`);
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      // Don't fail the request if email fails
    }

    res.json({
      message: 'If an account exists with this email, a verification email has been sent.',
    });
  })
);

// Request password reset
router.post('/forgot-password',
  validate(requestPasswordResetSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.authMethod !== 'LOCAL' || !user.passwordHash) {
      // Don't reveal if user exists
      return res.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires,
      },
    });

    // Send password reset email
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
      logger.info(`Password reset email sent to: ${user.email}`);
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      // Don't fail the request if email fails
    }

    await createAuditLog('PASSWORD_RESET_REQUESTED', { email: user.email }, user.id);

    res.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  })
);

// Reset password
router.post('/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new NotFoundError('Invalid reset token');
    }

    if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
      throw new ValidationError('Reset token has expired. Please request a new one.');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await createAuditLog('PASSWORD_RESET_COMPLETED', { email: user.email }, user.id);

    logger.info(`Password reset completed for user: ${user.email}`);

    res.json({
      message: 'Password reset successfully. You can now login with your new password.',
    });
  })
);

export default router;

