import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { createAuditLog } from '../lib/audit.js';
import { asyncHandler, ValidationError, AuthenticationError, ConflictError } from '../lib/errors.js';
import { validate, schemas } from '../middleware/validation.js';
import { z } from 'zod';
import logger from '../lib/logger.js';
import { sendVerificationEmail } from '../lib/email.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'taps-secret-key-change-in-production';

// Validation schemas
const registerSchema = z.object({
  email: schemas.email,
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  password: schemas.password,
  role: schemas.role.optional().default('STUDENT'),
});

const loginSchema = z.object({
  email: schemas.email,
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  email: schemas.email,
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: schemas.password,
});

// Register new user (local)
router.post('/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, name, password, role } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        authMethod: 'LOCAL',
        role,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    await createAuditLog('USER_CREATED_LOCAL', { email, name }, user.id);

    // Send verification email
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
      await sendVerificationEmail(user.email, user.name, verificationUrl);
      logger.info(`Verification email sent to: ${user.email}`);
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      // Don't fail registration if email fails
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      user,
      token,
      message: 'User created successfully. Please check your email to verify your account.',
      emailVerificationRequired: true,
    });
  })
);

// Login (local)
router.post('/login-local',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check if user has local authentication
    if (user.authMethod !== 'LOCAL' || !user.passwordHash) {
      throw new AuthenticationError('This account uses Azure AD authentication. Please use "Sign in with Microsoft".');
    }

    // Check email verification (optional - can be made required)
    if (!user.emailVerified) {
      logger.warn(`Login attempt with unverified email: ${user.email}`);
      // Still allow login but warn - you can make this required by throwing an error
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await createAuditLog('USER_LOGIN_LOCAL', { email }, user.id);
    logger.info(`User logged in: ${user.email}`);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      token,
    });
  })
);

// Change password
router.post('/change-password',
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { email, currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.authMethod !== 'LOCAL' || !user.passwordHash) {
      throw new ValidationError('User not found or not using local authentication');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Update password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { passwordHash: newPasswordHash },
    });

    await createAuditLog('PASSWORD_CHANGED', { email }, user.id);
    logger.info(`Password changed for user: ${user.email}`);

    res.json({ message: 'Password changed successfully' });
  })
);

export default router;

