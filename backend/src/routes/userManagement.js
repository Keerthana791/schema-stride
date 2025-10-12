import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';
import { getMainPool } from '../config/database.js';

const router = express.Router();

// Get all users in tenant
router.get('/users', authenticateToken, requirePermission('users:read'), async (req, res, next) => {
  try {
    const tenantPool = req.tenantPool;
    const { role } = req.user;

    let query, params;

    if (role === 'admin') {
      // Admins can see all users
      query = `
        SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at,
               s.student_id, t.teacher_id, t.department,
               array_agg(r.name) as roles
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN teachers t ON u.id = t.user_id
        LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
        LEFT JOIN roles r ON ur.role_id = r.id AND r.is_active = true
        WHERE u.tenant_id = $1
        GROUP BY u.id, u.email, u.name, u.role, u.is_active, u.created_at,
                 s.student_id, t.teacher_id, t.department
        ORDER BY u.created_at DESC
      `;
      params = [req.user.tenantId];
    } else {
      // Teachers can see students and other teachers
      query = `
        SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at,
               s.student_id, t.teacher_id, t.department
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN teachers t ON u.id = t.user_id
        WHERE u.tenant_id = $1 AND u.role IN ('student', 'teacher')
        ORDER BY u.created_at DESC
      `;
      params = [req.user.tenantId];
    }

    const result = await tenantPool.query(query, params);

    res.json({
      users: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/users/:id', authenticateToken, requirePermission('users:read'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantPool = req.tenantPool;

    const userResult = await tenantPool.query(`
      SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at,
             s.student_id, s.first_name, s.last_name, s.phone, s.date_of_birth, s.address,
             t.teacher_id, t.first_name as t_first_name, t.last_name as t_last_name, 
             t.phone as t_phone, t.department, t.specialization
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN teachers t ON u.id = t.user_id
      WHERE u.id = $1 AND u.tenant_id = $2
    `, [id, req.user.tenantId]);

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    // Get user roles
    const rolesResult = await tenantPool.query(`
      SELECT r.id, r.name, r.description, ur.assigned_at, ur.expires_at
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1 AND ur.is_active = true AND r.is_active = true
    `, [id]);

    res.json({
      user: {
        ...userResult.rows[0],
        roles: rolesResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create new user
router.post('/users', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('role').isIn(['teacher', 'student']).withMessage('Role must be teacher or student'),
  body('studentId').optional().isLength({ max: 50 }).withMessage('Student ID must be less than 50 characters'),
  body('teacherId').optional().isLength({ max: 50 }).withMessage('Teacher ID must be less than 50 characters'),
  body('department').optional().isLength({ max: 100 }).withMessage('Department must be less than 100 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth required')
], authenticateToken, requirePermission('users:create'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const {
      email, password, name, role, studentId, teacherId, department,
      phone, dateOfBirth, address, specialization
    } = req.body;

    const mainPool = getMainPool();
    const tenantPool = req.tenantPool;

    // Check if email already exists
    const existingUser = await mainPool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user in main database
    const userResult = await mainPool.query(
      'INSERT INTO users (email, password_hash, name, role, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, tenant_id',
      [email, passwordHash, name, role, req.user.tenantId]
    );

    const user = userResult.rows[0];

    // Create user profile in tenant schema
    if (role === 'student') {
      await tenantPool.query(
        'INSERT INTO students (user_id, student_id, first_name, last_name, email, phone, date_of_birth, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [user.id, studentId, name.split(' ')[0], name.split(' ').slice(1).join(' ') || '', email, phone, dateOfBirth, address]
      );
    } else if (role === 'teacher') {
      await tenantPool.query(
        'INSERT INTO teachers (user_id, teacher_id, first_name, last_name, email, phone, department, specialization) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [user.id, teacherId, name.split(' ')[0], name.split(' ').slice(1).join(' ') || '', email, phone, department, specialization]
      );
    }

    // Assign appropriate role
    const roleName = role.toUpperCase();
    const roleResult = await tenantPool.query(
      'SELECT id FROM roles WHERE name = $1',
      [roleName]
    );
    
    if (roleResult.rows.length > 0) {
      await tenantPool.query(
        'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)',
        [user.id, roleResult.rows[0].id, req.user.id]
      );
    }

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenant_id
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/users/:id', [
  body('name').optional().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth required'),
  body('isActive').optional().isBoolean().withMessage('Active status must be boolean')
], authenticateToken, requirePermission('users:update'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { id } = req.params;
    const { name, phone, dateOfBirth, address, department, specialization, isActive } = req.body;
    const mainPool = getMainPool();
    const tenantPool = req.tenantPool;

    // Check if user exists and belongs to tenant
    const userResult = await mainPool.query(
      'SELECT * FROM users WHERE id = $1 AND tenant_id = $2',
      [id, req.user.tenantId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const user = userResult.rows[0];

    // Update user in main database
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount}`);
      values.push(isActive);
      paramCount++;
    }

    if (updateFields.length > 0) {
      values.push(id);
      await mainPool.query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
        values
      );
    }

    // Update user profile in tenant schema
    if (user.role === 'student') {
      const studentUpdateFields = [];
      const studentValues = [];
      let studentParamCount = 1;

      if (phone !== undefined) {
        studentUpdateFields.push(`phone = $${studentParamCount}`);
        studentValues.push(phone);
        studentParamCount++;
      }

      if (dateOfBirth !== undefined) {
        studentUpdateFields.push(`date_of_birth = $${studentParamCount}`);
        studentValues.push(dateOfBirth);
        studentParamCount++;
      }

      if (address !== undefined) {
        studentUpdateFields.push(`address = $${studentParamCount}`);
        studentValues.push(address);
        studentParamCount++;
      }

      if (studentUpdateFields.length > 0) {
        studentValues.push(id);
        await tenantPool.query(
          `UPDATE students SET ${studentUpdateFields.join(', ')} WHERE user_id = $${studentParamCount}`,
          studentValues
        );
      }
    } else if (user.role === 'teacher') {
      const teacherUpdateFields = [];
      const teacherValues = [];
      let teacherParamCount = 1;

      if (phone !== undefined) {
        teacherUpdateFields.push(`phone = $${teacherParamCount}`);
        teacherValues.push(phone);
        teacherParamCount++;
      }

      if (department !== undefined) {
        teacherUpdateFields.push(`department = $${teacherParamCount}`);
        teacherValues.push(department);
        teacherParamCount++;
      }

      if (specialization !== undefined) {
        teacherUpdateFields.push(`specialization = $${teacherParamCount}`);
        teacherValues.push(specialization);
        teacherParamCount++;
      }

      if (teacherUpdateFields.length > 0) {
        teacherValues.push(id);
        await tenantPool.query(
          `UPDATE teachers SET ${teacherUpdateFields.join(', ')} WHERE user_id = $${teacherParamCount}`,
          teacherValues
        );
      }
    }

    res.json({
      message: 'User updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/users/:id', authenticateToken, requirePermission('users:delete'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const mainPool = getMainPool();

    // Check if user exists and belongs to tenant
    const userResult = await mainPool.query(
      'SELECT * FROM users WHERE id = $1 AND tenant_id = $2',
      [id, req.user.tenantId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    // Soft delete user
    await mainPool.query(
      'UPDATE users SET is_active = false WHERE id = $1',
      [id]
    );

    res.json({
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get all roles
router.get('/roles', authenticateToken, requirePermission('users:read'), async (req, res, next) => {
  try {
    const tenantPool = req.tenantPool;

    const rolesResult = await tenantPool.query(`
      SELECT r.*, COUNT(ur.user_id) as user_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = true
      WHERE r.is_active = true
      GROUP BY r.id, r.name, r.description, r.permissions, r.is_active, r.created_at, r.updated_at
      ORDER BY r.name
    `);

    res.json({
      roles: rolesResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Assign role to user
router.post('/users/:id/roles', [
  body('roleId').isUUID().withMessage('Valid role ID required')
], authenticateToken, requirePermission('users:update'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { id } = req.params;
    const { roleId } = req.body;
    const tenantPool = req.tenantPool;

    // Check if user exists in tenant
    const userResult = await tenantPool.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    // Check if role exists
    const roleResult = await tenantPool.query(
      'SELECT id FROM roles WHERE id = $1 AND is_active = true',
      [roleId]
    );

    if (roleResult.rows.length === 0) {
      throw new NotFoundError('Role not found');
    }

    // Assign role
    await tenantPool.query(
      'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT (user_id, role_id) DO NOTHING',
      [id, roleId, req.user.id]
    );

    res.json({
      message: 'Role assigned successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Remove role from user
router.delete('/users/:id/roles/:roleId', authenticateToken, requirePermission('users:update'), async (req, res, next) => {
  try {
    const { id, roleId } = req.params;
    const tenantPool = req.tenantPool;

    // Remove role assignment
    await tenantPool.query(
      'UPDATE user_roles SET is_active = false WHERE user_id = $1 AND role_id = $2',
      [id, roleId]
    );

    res.json({
      message: 'Role removed successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

