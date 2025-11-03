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

// Enhanced audit logging with field-level changes
export const createAuditLogWithChanges = async (
  action,
  oldData,
  newData,
  userId = null,
  requestId = null
) => {
  try {
    const changes = {};
    const changedFields = [];
    
    // Compare old and new data to find changes
    if (oldData && newData) {
      const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
      
      allKeys.forEach(key => {
        const oldValue = oldData[key];
        const newValue = newData[key];
        
        // Compare values (handle dates, nulls, etc.)
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes[key] = {
            old: oldValue,
            new: newValue,
          };
          changedFields.push(key);
        }
      });
    }
    
    const details = {
      changes,
      changedFields,
      summary: changedFields.length > 0 
        ? `Updated ${changedFields.length} field(s): ${changedFields.slice(0, 3).join(', ')}${changedFields.length > 3 ? '...' : ''}`
        : 'No changes detected',
    };
    
    await prisma.auditLog.create({
      data: {
        action,
        details: JSON.stringify(details),
        userId,
        requestId,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log with changes:', error);
  }
};

