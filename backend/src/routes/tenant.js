import express from 'express';
import { body, validationResult } from 'express-validator';
import { getMainPool } from '../config/database.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get tenant information
router.get('/info', authenticateToken, async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const mainPool = getMainPool();

    const result = await mainPool.query(
      'SELECT * FROM tenant_mapping WHERE tenant_id = $1',
      [tenantId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Tenant not found');
    }

    res.json({
      tenant: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get tenant statistics
router.get('/stats', authenticateToken, async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const tenantPool = req.tenantPool;

    // Get counts from tenant schema
    const [studentsResult, teachersResult, coursesResult, enrollmentsResult] = await Promise.all([
      tenantPool.query('SELECT COUNT(*) as count FROM students WHERE is_active = true'),
      tenantPool.query('SELECT COUNT(*) as count FROM teachers WHERE is_active = true'),
      tenantPool.query('SELECT COUNT(*) as count FROM courses WHERE is_active = true'),
      tenantPool.query('SELECT COUNT(*) as count FROM enrollments WHERE status = \'active\'')
    ]);

    res.json({
      stats: {
        students: parseInt(studentsResult.rows[0].count),
        teachers: parseInt(teachersResult.rows[0].count),
        courses: parseInt(coursesResult.rows[0].count),
        enrollments: parseInt(enrollmentsResult.rows[0].count)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update tenant information (admin only)
router.put('/info', [
  body('institutionName').optional().isLength({ min: 3, max: 200 }).withMessage('Institution name must be 3-200 characters')
], authenticateToken, authorize('admin'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { institutionName } = req.body;
    const { tenantId } = req.user;
    const mainPool = getMainPool();

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (institutionName) {
      updateFields.push(`institution_name = $${paramCount}`);
      values.push(institutionName);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(tenantId);

    const result = await mainPool.query(
      `UPDATE tenant_mapping SET ${updateFields.join(', ')} WHERE tenant_id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Tenant not found');
    }

    res.json({
      message: 'Tenant information updated successfully',
      tenant: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get all users in tenant
router.get('/users', authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const mainPool = getMainPool();

    const result = await mainPool.query(
      'SELECT id, email, name, role, is_active, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );

    res.json({
      users: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Deactivate user
router.put('/users/:userId/deactivate', authenticateToken, authorize('admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { tenantId } = req.user;
    const mainPool = getMainPool();

    // Check if user belongs to tenant
    const userResult = await mainPool.query(
      'SELECT id FROM users WHERE id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found in this tenant');
    }

    // Deactivate user
    await mainPool.query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );

    res.json({
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Reactivate user
router.put('/users/:userId/activate', authenticateToken, authorize('admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { tenantId } = req.user;
    const mainPool = getMainPool();

    // Check if user belongs to tenant
    const userResult = await mainPool.query(
      'SELECT id FROM users WHERE id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found in this tenant');
    }

    // Activate user
    await mainPool.query(
      'UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );

    res.json({
      message: 'User activated successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;




