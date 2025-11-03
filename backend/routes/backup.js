import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// All backup routes require ADMIN role
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

const BACKUP_DIR = path.join(__dirname, '../../backups');

// Ensure backup directory exists
(async () => {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create backup directory:', error);
  }
})();

/**
 * Create a backup
 */
router.post('/create', async (req, res) => {
  try {
    const { backupType = 'FULL' } = req.body;
    const user = await prisma.user.findUnique({
      where: { email: req.user.email },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${backupType.toLowerCase()}-${timestamp}.db`;
    const filePath = path.join(BACKUP_DIR, filename);

    // Create backup record
    const backup = await prisma.backup.create({
      data: {
        filename,
        filePath,
        backupType,
        sizeBytes: 0,
        status: 'PENDING',
        createdBy: user?.id,
      },
    });

    // Perform backup (copy database file)
    try {
      const dbPath = path.join(__dirname, '../../dev.db');
      const dbData = await fs.readFile(dbPath);
      await fs.writeFile(filePath, dbData);
      
      const stats = await fs.stat(filePath);
      
      // Count records
      const requestCount = await prisma.request.count();
      const userCount = await prisma.user.count();
      const auditLogCount = await prisma.auditLog.count();
      const totalRecords = requestCount + userCount + auditLogCount;

      // Update backup record
      const completedBackup = await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: 'COMPLETED',
          sizeBytes: stats.size,
          recordCount: totalRecords,
          completedAt: new Date(),
        },
      });

      res.json({ backup: completedBackup, message: 'Backup created successfully' });
    } catch (backupError) {
      await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: 'FAILED',
          errorMessage: backupError.message,
        },
      });
      
      throw backupError;
    }
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ error: 'Failed to create backup', details: error.message });
  }
});

/**
 * Get all backups
 */
router.get('/', async (req, res) => {
  try {
    const { status, backupType } = req.query;
    
    const whereClause = {};
    if (status) whereClause.status = status;
    if (backupType) whereClause.backupType = backupType;

    const backups = await prisma.backup.findMany({
      where: whereClause,
      orderBy: { startedAt: 'desc' },
    });

    res.json({ backups });
  } catch (error) {
    console.error('Get backups error:', error);
    res.status(500).json({ error: 'Failed to fetch backups' });
  }
});

/**
 * Restore from backup
 */
router.post('/restore/:id', async (req, res) => {
  try {
    const backup = await prisma.backup.findUnique({
      where: { id: req.params.id },
    });

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    if (backup.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Cannot restore from incomplete backup' });
    }

    // Check if file exists
    try {
      await fs.access(backup.filePath);
    } catch {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    // Create a backup of current database before restore
    const currentDbPath = path.join(__dirname, '../../dev.db');
    const preRestoreBackupPath = path.join(BACKUP_DIR, `pre-restore-${Date.now()}.db`);
    try {
      const currentDb = await fs.readFile(currentDbPath);
      await fs.writeFile(preRestoreBackupPath, currentDb);
    } catch (error) {
      console.warn('Failed to create pre-restore backup:', error);
    }

    // Restore database
    const backupData = await fs.readFile(backup.filePath);
    await fs.writeFile(currentDbPath, backupData);

    res.json({ 
      message: 'Database restored successfully',
      restoredFrom: backup.filename,
      preRestoreBackup: path.basename(preRestoreBackupPath),
    });
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({ error: 'Failed to restore backup', details: error.message });
  }
});

/**
 * Delete backup
 */
router.delete('/:id', async (req, res) => {
  try {
    const backup = await prisma.backup.findUnique({
      where: { id: req.params.id },
    });

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    // Delete file
    try {
      await fs.unlink(backup.filePath);
    } catch (error) {
      console.warn('Failed to delete backup file:', error);
    }

    // Delete record
    await prisma.backup.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

/**
 * Export data to JSON
 */
router.post('/export', async (req, res) => {
  try {
    const { includeTypes = ['requests', 'users', 'auditLogs'] } = req.body;
    
    const exportData = {};

    if (includeTypes.includes('requests')) {
      exportData.requests = await prisma.request.findMany({
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      });
    }

    if (includeTypes.includes('users')) {
      exportData.users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          authMethod: true,
          createdAt: true,
        },
      });
    }

    if (includeTypes.includes('auditLogs')) {
      exportData.auditLogs = await prisma.auditLog.findMany({
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      });
    }

    res.json({
      exportDate: new Date().toISOString(),
      data: exportData,
    });
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * Import data from JSON
 */
router.post('/import', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'Import data is required' });
    }

    const imported = {
      requests: 0,
      users: 0,
      auditLogs: 0,
    };

    // Import users (skip duplicates)
    if (data.users) {
      for (const userData of data.users) {
        try {
          await prisma.user.upsert({
            where: { email: userData.email },
            update: {
              name: userData.name,
              role: userData.role,
            },
            create: {
              email: userData.email,
              name: userData.name,
              role: userData.role,
              authMethod: userData.authMethod || 'LOCAL',
            },
          });
          imported.users++;
        } catch (error) {
          console.warn('Failed to import user:', userData.email, error.message);
        }
      }
    }

    // Import requests
    if (data.requests) {
      for (const requestData of data.requests) {
        try {
          // Remove relations from data
          const { user, ...requestFields } = requestData;
          await prisma.request.create({
            data: requestFields,
          });
          imported.requests++;
        } catch (error) {
          console.warn('Failed to import request:', requestData.id, error.message);
        }
      }
    }

    // Import audit logs
    if (data.auditLogs) {
      for (const logData of data.auditLogs) {
        try {
          const { user, ...logFields } = logData;
          await prisma.auditLog.create({
            data: logFields,
          });
          imported.auditLogs++;
        } catch (error) {
          console.warn('Failed to import audit log:', logData.id, error.message);
        }
      }
    }

    res.json({
      message: 'Data imported successfully',
      imported,
    });
  } catch (error) {
    console.error('Import data error:', error);
    res.status(500).json({ error: 'Failed to import data', details: error.message });
  }
});

export default router;
