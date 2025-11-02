import prisma from './prisma.js';

export const createAuditLog = async (action, details, userId = null, requestId = null) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        details: JSON.stringify(details),
        userId,
        requestId,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging failures shouldn't break the flow
  }
};

