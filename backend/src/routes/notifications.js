import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get notifications for current user
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const tenantPool = req.tenantPool;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE user_id = $1';
    let params = [userId];

    if (unreadOnly === 'true') {
      whereClause += ' AND is_read = false';
    }

    const result = await tenantPool.query(
      `SELECT * FROM notifications 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    // Get total count
    const countResult = await tenantPool.query(
      `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
      params
    );

    res.json({
      notifications: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get notification by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;
    const tenantPool = req.tenantPool;

    const result = await tenantPool.query(
      'SELECT * FROM notifications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Notification not found');
    }

    res.json({
      notification: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Create notification
router.post('/', [
  body('userId').isUUID().withMessage('Valid user ID required'),
  body('title').isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('message').isLength({ min: 1, max: 2000 }).withMessage('Message must be 1-2000 characters'),
  body('type').optional().isIn(['info', 'warning', 'success', 'error']).withMessage('Invalid notification type'),
  body('relatedEntityType').optional().isIn(['course', 'assignment', 'quiz', 'grade']).withMessage('Invalid related entity type'),
  body('relatedEntityId').optional().isUUID().withMessage('Valid related entity ID required')
], authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { userId, title, message, type, relatedEntityType, relatedEntityId } = req.body;
    const tenantPool = req.tenantPool;

    // Check if user exists in tenant
    const userResult = await tenantPool.query(
      'SELECT id FROM students WHERE user_id = $1 UNION SELECT id FROM teachers WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found in this tenant');
    }

    const result = await tenantPool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, title, message, type || 'info', relatedEntityType, relatedEntityId]
    );

    res.status(201).json({
      message: 'Notification created successfully',
      notification: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;
    const tenantPool = req.tenantPool;

    const result = await tenantPool.query(
      'UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Notification not found');
    }

    res.json({
      message: 'Notification marked as read',
      notification: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const tenantPool = req.tenantPool;

    const result = await tenantPool.query(
      'UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false RETURNING COUNT(*) as updated_count',
      [userId]
    );

    res.json({
      message: 'All notifications marked as read',
      updatedCount: parseInt(result.rows[0].updated_count)
    });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;
    const tenantPool = req.tenantPool;

    const result = await tenantPool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Notification not found');
    }

    res.json({
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get unread notification count
router.get('/unread/count', authenticateToken, async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const tenantPool = req.tenantPool;

    const result = await tenantPool.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({
      unreadCount: parseInt(result.rows[0].unread_count)
    });
  } catch (error) {
    next(error);
  }
});

// Bulk create notifications (for announcements)
router.post('/bulk', [
  body('userIds').isArray({ min: 1 }).withMessage('User IDs array required'),
  body('title').isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('message').isLength({ min: 1, max: 2000 }).withMessage('Message must be 1-2000 characters'),
  body('type').optional().isIn(['info', 'warning', 'success', 'error']).withMessage('Invalid notification type'),
  body('relatedEntityType').optional().isIn(['course', 'assignment', 'quiz', 'grade']).withMessage('Invalid related entity type'),
  body('relatedEntityId').optional().isUUID().withMessage('Valid related entity ID required')
], authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { userIds, title, message, type, relatedEntityType, relatedEntityId } = req.body;
    const tenantPool = req.tenantPool;

    // Validate all user IDs exist in tenant
    const userResult = await tenantPool.query(
      `SELECT user_id FROM students WHERE user_id = ANY($1) 
       UNION 
       SELECT user_id FROM teachers WHERE user_id = ANY($1)`,
      [userIds]
    );

    const validUserIds = userResult.rows.map(row => row.user_id);
    const invalidUserIds = userIds.filter(id => !validUserIds.includes(id));

    if (invalidUserIds.length > 0) {
      return res.status(400).json({
        message: 'Some user IDs are invalid',
        invalidUserIds
      });
    }

    // Create notifications for all users
    const notifications = [];
    for (const userId of userIds) {
      const result = await tenantPool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, title, message, type || 'info', relatedEntityType, relatedEntityId]
      );
      notifications.push(result.rows[0]);
    }

    res.status(201).json({
      message: 'Notifications created successfully',
      notifications,
      count: notifications.length
    });
  } catch (error) {
    next(error);
  }
});

// Get notification statistics
router.get('/stats', authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const tenantPool = req.tenantPool;

    const statsResult = await tenantPool.query(
      `SELECT 
         COUNT(*) as total_notifications,
         COUNT(CASE WHEN is_read = false THEN 1 END) as unread_notifications,
         COUNT(CASE WHEN type = 'info' THEN 1 END) as info_count,
         COUNT(CASE WHEN type = 'warning' THEN 1 END) as warning_count,
         COUNT(CASE WHEN type = 'success' THEN 1 END) as success_count,
         COUNT(CASE WHEN type = 'error' THEN 1 END) as error_count
       FROM notifications`
    );

    const typeStatsResult = await tenantPool.query(
      `SELECT type, COUNT(*) as count
       FROM notifications 
       GROUP BY type
       ORDER BY count DESC`
    );

    res.json({
      stats: statsResult.rows[0],
      typeDistribution: typeStatsResult.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;




