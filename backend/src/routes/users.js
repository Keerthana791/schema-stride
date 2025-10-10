import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get all users in tenant
router.get('/', authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;
    const { page = 1, limit = 20, role: filterRole } = req.query;
    const tenantPool = req.tenantPool;

    const offset = (page - 1) * limit;
    let whereClause = '';
    let params = [];

    if (filterRole) {
      whereClause = 'WHERE role = $1';
      params = [filterRole];
    }

    // Get users from main database with tenant info
    const mainPool = req.tenantPool; // This should be main pool, but for now using tenant pool
    const result = await mainPool.query(
      `SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at
       FROM users u
       WHERE u.tenant_id = $1 ${whereClause ? 'AND u.role = $2' : ''}
       ORDER BY u.created_at DESC
       LIMIT $${params.length + 2} OFFSET $${params.length + 3}`,
      [req.user.tenantId, ...params, limit, offset]
    );

    // Get total count
    const countResult = await mainPool.query(
      `SELECT COUNT(*) as total FROM users 
       WHERE tenant_id = $1 ${whereClause ? 'AND role = $2' : ''}`,
      [req.user.tenantId, ...params]
    );

    res.json({
      users: result.rows,
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

// Get user by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    // Check if user has access to this profile
    if (role === 'student' && id !== userId) {
      throw new ForbiddenError('Access denied to this user profile');
    }

    // Get user from main database
    const mainPool = req.tenantPool; // This should be main pool
    const userResult = await mainPool.query(
      'SELECT id, email, name, role, is_active, created_at FROM users WHERE id = $1 AND tenant_id = $2',
      [id, req.user.tenantId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const user = userResult.rows[0];

    // Get detailed profile based on role
    let profileQuery, profileParams;
    if (user.role === 'student') {
      profileQuery = `
        SELECT s.*, 
               COUNT(e.id) as enrolled_courses,
               COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_courses
        FROM students s
        LEFT JOIN enrollments e ON s.id = e.student_id
        WHERE s.user_id = $1
        GROUP BY s.id
      `;
      profileParams = [id];
    } else if (user.role === 'teacher') {
      profileQuery = `
        SELECT t.*,
               COUNT(c.id) as teaching_courses,
               COUNT(CASE WHEN c.is_active = true THEN 1 END) as active_courses
        FROM teachers t
        LEFT JOIN courses c ON t.id = c.teacher_id
        WHERE t.user_id = $1
        GROUP BY t.id
      `;
      profileParams = [id];
    } else {
      // Admin - no additional profile
      return res.json({
        user,
        profile: null
      });
    }

    const profileResult = await tenantPool.query(profileQuery, profileParams);
    const profile = profileResult.rows.length > 0 ? profileResult.rows[0] : null;

    res.json({
      user,
      profile
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/:id/profile', [
  body('firstName').optional().isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters'),
  body('lastName').optional().isLength({ min: 1, max: 100 }).withMessage('Last name must be 1-100 characters'),
  body('phone').optional().isLength({ max: 20 }).withMessage('Phone must be less than 20 characters'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth required'),
  body('address').optional().isLength({ max: 500 }).withMessage('Address must be less than 500 characters'),
  body('department').optional().isLength({ max: 100 }).withMessage('Department must be less than 100 characters'),
  body('specialization').optional().isLength({ max: 200 }).withMessage('Specialization must be less than 200 characters')
], authenticateToken, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { id } = req.params;
    const { role, id: userId } = req.user;
    const { firstName, lastName, phone, dateOfBirth, address, department, specialization } = req.body;
    const tenantPool = req.tenantPool;

    // Check if user has access to update this profile
    if (role === 'student' && id !== userId) {
      throw new ForbiddenError('Access denied to update this profile');
    }

    // Get user role
    const mainPool = req.tenantPool; // This should be main pool
    const userResult = await mainPool.query(
      'SELECT role FROM users WHERE id = $1 AND tenant_id = $2',
      [id, req.user.tenantId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const userRole = userResult.rows[0].role;

    // Update profile based on role
    let updateFields = [];
    let values = [];
    let paramCount = 1;

    if (firstName) {
      updateFields.push(`first_name = $${paramCount}`);
      values.push(firstName);
      paramCount++;
    }
    if (lastName) {
      updateFields.push(`last_name = $${paramCount}`);
      values.push(lastName);
      paramCount++;
    }
    if (phone) {
      updateFields.push(`phone = $${paramCount}`);
      values.push(phone);
      paramCount++;
    }
    if (dateOfBirth) {
      updateFields.push(`date_of_birth = $${paramCount}`);
      values.push(dateOfBirth);
      paramCount++;
    }
    if (address) {
      updateFields.push(`address = $${paramCount}`);
      values.push(address);
      paramCount++;
    }

    if (userRole === 'teacher') {
      if (department) {
        updateFields.push(`department = $${paramCount}`);
        values.push(department);
        paramCount++;
      }
      if (specialization) {
        updateFields.push(`specialization = $${paramCount}`);
        values.push(specialization);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    let tableName = userRole === 'student' ? 'students' : 'teachers';
    let whereClause = userRole === 'student' ? 'user_id = $' + paramCount : 'user_id = $' + paramCount;

    const result = await tenantPool.query(
      `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE ${whereClause} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Profile not found');
    }

    res.json({
      message: 'Profile updated successfully',
      profile: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get user's courses
router.get('/:id/courses', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    // Check if user has access to this user's courses
    if (role === 'student' && id !== userId) {
      throw new ForbiddenError('Access denied to this user\'s courses');
    }

    // Get user role
    const mainPool = req.tenantPool; // This should be main pool
    const userResult = await mainPool.query(
      'SELECT role FROM users WHERE id = $1 AND tenant_id = $2',
      [id, req.user.tenantId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const userRole = userResult.rows[0].role;
    let query, params;

    if (userRole === 'student') {
      // Get enrolled courses
      query = `
        SELECT c.*, e.enrollment_date, e.status as enrollment_status,
               t.first_name, t.last_name, t.email as teacher_email
        FROM courses c
        JOIN enrollments e ON c.id = e.course_id
        JOIN teachers t ON c.teacher_id = t.id
        JOIN students s ON e.student_id = s.id
        WHERE s.user_id = $1
        ORDER BY e.enrollment_date DESC
      `;
      params = [id];
    } else if (userRole === 'teacher') {
      // Get teaching courses
      query = `
        SELECT c.*, 
               COUNT(e.id) as enrollment_count,
               COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id
        JOIN teachers t ON c.teacher_id = t.id
        WHERE t.user_id = $1
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `;
      params = [id];
    } else {
      // Admin - get all courses
      query = `
        SELECT c.*, 
               COUNT(e.id) as enrollment_count,
               COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments,
               t.first_name, t.last_name, t.email as teacher_email
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id
        JOIN teachers t ON c.teacher_id = t.id
        GROUP BY c.id, t.first_name, t.last_name, t.email
        ORDER BY c.created_at DESC
      `;
      params = [];
    }

    const result = await tenantPool.query(query, params);

    res.json({
      courses: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get user's assignments
router.get('/:id/assignments', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    // Check if user has access to this user's assignments
    if (role === 'student' && id !== userId) {
      throw new ForbiddenError('Access denied to this user\'s assignments');
    }

    // Get user role
    const mainPool = req.tenantPool; // This should be main pool
    const userResult = await mainPool.query(
      'SELECT role FROM users WHERE id = $1 AND tenant_id = $2',
      [id, req.user.tenantId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const userRole = userResult.rows[0].role;
    let query, params;

    if (userRole === 'student') {
      // Get assignments for enrolled courses
      query = `
        SELECT a.*, c.title as course_title, c.course_code,
               s.id as submission_id, s.submitted_at, s.grade, s.feedback
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id
        JOIN students st ON e.student_id = st.id
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = st.id
        WHERE st.user_id = $1 AND a.is_published = true
        ORDER BY a.due_date ASC
      `;
      params = [id];
    } else {
      // Get assignments created by teacher
      query = `
        SELECT a.*, c.title as course_title, c.course_code,
               COUNT(s.id) as submission_count,
               COUNT(CASE WHEN s.submitted_at IS NOT NULL THEN 1 END) as submitted_count
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
        WHERE t.user_id = $1
        GROUP BY a.id, c.title, c.course_code
        ORDER BY a.created_at DESC
      `;
      params = [id];
    }

    const result = await tenantPool.query(query, params);

    res.json({
      assignments: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get user statistics
router.get('/:id/stats', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    // Check if user has access to this user's stats
    if (role === 'student' && id !== userId) {
      throw new ForbiddenError('Access denied to this user\'s statistics');
    }

    // Get user role
    const mainPool = req.tenantPool; // This should be main pool
    const userResult = await mainPool.query(
      'SELECT role FROM users WHERE id = $1 AND tenant_id = $2',
      [id, req.user.tenantId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const userRole = userResult.rows[0].role;
    let statsQuery, statsParams;

    if (userRole === 'student') {
      statsQuery = `
        SELECT 
          COUNT(DISTINCT e.course_id) as enrolled_courses,
          COUNT(DISTINCT a.id) as total_assignments,
          COUNT(DISTINCT s.assignment_id) as submitted_assignments,
          COUNT(DISTINCT q.id) as total_quizzes,
          COUNT(DISTINCT qs.quiz_id) as submitted_quizzes,
          AVG(g.grade) as average_grade
        FROM students st
        LEFT JOIN enrollments e ON st.id = e.student_id
        LEFT JOIN courses c ON e.course_id = c.id
        LEFT JOIN assignments a ON c.id = a.course_id AND a.is_published = true
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = st.id
        LEFT JOIN quizzes q ON c.id = q.course_id AND q.is_published = true
        LEFT JOIN quiz_submissions qs ON q.id = qs.quiz_id AND qs.student_id = st.id
        LEFT JOIN grades g ON st.id = g.student_id
        WHERE st.user_id = $1
      `;
      statsParams = [id];
    } else if (userRole === 'teacher') {
      statsQuery = `
        SELECT 
          COUNT(DISTINCT c.id) as teaching_courses,
          COUNT(DISTINCT a.id) as created_assignments,
          COUNT(DISTINCT q.id) as created_quizzes,
          COUNT(DISTINCT s.id) as total_submissions,
          COUNT(DISTINCT g.id) as graded_items
        FROM teachers t
        LEFT JOIN courses c ON t.id = c.teacher_id
        LEFT JOIN assignments a ON c.id = a.course_id
        LEFT JOIN quizzes q ON c.id = q.course_id
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
        LEFT JOIN grades g ON t.id = g.graded_by
        WHERE t.user_id = $1
      `;
      statsParams = [id];
    } else {
      // Admin stats
      statsQuery = `
        SELECT 
          COUNT(DISTINCT c.id) as total_courses,
          COUNT(DISTINCT s.id) as total_students,
          COUNT(DISTINCT t.id) as total_teachers,
          COUNT(DISTINCT a.id) as total_assignments,
          COUNT(DISTINCT q.id) as total_quizzes
        FROM courses c
        LEFT JOIN students s ON 1=1
        LEFT JOIN teachers t ON 1=1
        LEFT JOIN assignments a ON c.id = a.course_id
        LEFT JOIN quizzes q ON c.id = q.course_id
      `;
      statsParams = [];
    }

    const result = await tenantPool.query(statsQuery, statsParams);

    res.json({
      stats: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

export default router;




