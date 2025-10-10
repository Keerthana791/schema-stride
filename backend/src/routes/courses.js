import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, authorize, canAccessResource } from '../middleware/auth.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get all courses
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    let query, params;

    if (role === 'student') {
      // Students see only enrolled courses
      query = `
        SELECT c.*, t.first_name, t.last_name, t.email as teacher_email,
               e.enrollment_date, e.status as enrollment_status
        FROM courses c
        JOIN teachers t ON c.teacher_id = t.id
        JOIN enrollments e ON c.id = e.course_id
        JOIN students s ON e.student_id = s.id
        WHERE s.user_id = $1 AND c.is_active = true
        ORDER BY c.created_at DESC
      `;
      params = [userId];
    } else {
      // Teachers and admins see all courses
      query = `
        SELECT c.*, t.first_name, t.last_name, t.email as teacher_email,
               COUNT(e.id) as enrollment_count
        FROM courses c
        JOIN teachers t ON c.teacher_id = t.id
        LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
        WHERE c.is_active = true
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

// Get course by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    let query, params;

    if (role === 'student') {
      // Students can only see enrolled courses
      query = `
        SELECT c.*, t.first_name, t.last_name, t.email as teacher_email,
               e.enrollment_date, e.status as enrollment_status
        FROM courses c
        JOIN teachers t ON c.teacher_id = t.id
        JOIN enrollments e ON c.id = e.course_id
        JOIN students s ON e.student_id = s.id
        WHERE c.id = $1 AND s.user_id = $2 AND c.is_active = true
      `;
      params = [id, userId];
    } else {
      // Teachers and admins can see any course
      query = `
        SELECT c.*, t.first_name, t.last_name, t.email as teacher_email
        FROM courses c
        JOIN teachers t ON c.teacher_id = t.id
        WHERE c.id = $1 AND c.is_active = true
      `;
      params = [id];
    }

    const result = await tenantPool.query(query, params);

    if (result.rows.length === 0) {
      throw new NotFoundError('Course not found');
    }

    res.json({
      course: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Create course
router.post('/', [
  body('courseCode').isLength({ min: 3, max: 20 }).withMessage('Course code must be 3-20 characters'),
  body('title').isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('credits').optional().isInt({ min: 1, max: 10 }).withMessage('Credits must be between 1-10'),
  body('semester').optional().isLength({ max: 20 }).withMessage('Semester must be less than 20 characters'),
  body('academicYear').optional().isLength({ max: 10 }).withMessage('Academic year must be less than 10 characters')
], authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { courseCode, title, description, credits, semester, academicYear } = req.body;
    const { id: userId, role } = req.user;
    const tenantPool = req.tenantPool;

    // Get teacher ID
    let teacherId;
    if (role === 'teacher') {
      const teacherResult = await tenantPool.query(
        'SELECT id FROM teachers WHERE user_id = $1',
        [userId]
      );
      if (teacherResult.rows.length === 0) {
        throw new NotFoundError('Teacher profile not found');
      }
      teacherId = teacherResult.rows[0].id;
    } else {
      // Admin can assign any teacher
      const { teacherId: assignedTeacherId } = req.body;
      if (!assignedTeacherId) {
        throw new ValidationError('Teacher ID required for admin');
      }
      teacherId = assignedTeacherId;
    }

    const result = await tenantPool.query(
      `INSERT INTO courses (course_code, title, description, teacher_id, credits, semester, academic_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [courseCode, title, description, teacherId, credits || 3, semester, academicYear]
    );

    res.status(201).json({
      message: 'Course created successfully',
      course: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update course
router.put('/:id', [
  body('title').optional().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('credits').optional().isInt({ min: 1, max: 10 }).withMessage('Credits must be between 1-10'),
  body('semester').optional().isLength({ max: 20 }).withMessage('Semester must be less than 20 characters'),
  body('academicYear').optional().isLength({ max: 10 }).withMessage('Academic year must be less than 10 characters')
], authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { id } = req.params;
    const { id: userId, role } = req.user;
    const { title, description, credits, semester, academicYear } = req.body;
    const tenantPool = req.tenantPool;

    // Check if course exists and user has permission
    let courseQuery, courseParams;
    if (role === 'teacher') {
      courseQuery = `
        SELECT c.* FROM courses c
        JOIN teachers t ON c.teacher_id = t.id
        WHERE c.id = $1 AND t.user_id = $2 AND c.is_active = true
      `;
      courseParams = [id, userId];
    } else {
      courseQuery = 'SELECT * FROM courses WHERE id = $1 AND is_active = true';
      courseParams = [id];
    }

    const courseResult = await tenantPool.query(courseQuery, courseParams);
    if (courseResult.rows.length === 0) {
      throw new NotFoundError('Course not found or access denied');
    }

    // Update course
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (title) {
      updateFields.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    if (credits) {
      updateFields.push(`credits = $${paramCount}`);
      values.push(credits);
      paramCount++;
    }
    if (semester) {
      updateFields.push(`semester = $${paramCount}`);
      values.push(semester);
      paramCount++;
    }
    if (academicYear) {
      updateFields.push(`academic_year = $${paramCount}`);
      values.push(academicYear);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await tenantPool.query(
      `UPDATE courses SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      message: 'Course updated successfully',
      course: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Delete course
router.delete('/:id', authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;
    const tenantPool = req.tenantPool;

    // Check if course exists and user has permission
    let courseQuery, courseParams;
    if (role === 'teacher') {
      courseQuery = `
        SELECT c.* FROM courses c
        JOIN teachers t ON c.teacher_id = t.id
        WHERE c.id = $1 AND t.user_id = $2 AND c.is_active = true
      `;
      courseParams = [id, userId];
    } else {
      courseQuery = 'SELECT * FROM courses WHERE id = $1 AND is_active = true';
      courseParams = [id];
    }

    const courseResult = await tenantPool.query(courseQuery, courseParams);
    if (courseResult.rows.length === 0) {
      throw new NotFoundError('Course not found or access denied');
    }

    // Soft delete course
    await tenantPool.query(
      'UPDATE courses SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Enroll in course
router.post('/:id/enroll', authenticateToken, authorize('student'), async (req, res, next) => {
  try {
    const { id: courseId } = req.params;
    const { id: userId } = req.user;
    const tenantPool = req.tenantPool;

    // Get student ID
    const studentResult = await tenantPool.query(
      'SELECT id FROM students WHERE user_id = $1',
      [userId]
    );

    if (studentResult.rows.length === 0) {
      throw new NotFoundError('Student profile not found');
    }

    const studentId = studentResult.rows[0].id;

    // Check if course exists and is active
    const courseResult = await tenantPool.query(
      'SELECT id FROM courses WHERE id = $1 AND is_active = true',
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      throw new NotFoundError('Course not found');
    }

    // Check if already enrolled
    const enrollmentResult = await tenantPool.query(
      'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );

    if (enrollmentResult.rows.length > 0) {
      return res.status(409).json({ message: 'Already enrolled in this course' });
    }

    // Enroll student
    await tenantPool.query(
      'INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2)',
      [studentId, courseId]
    );

    res.status(201).json({
      message: 'Successfully enrolled in course'
    });
  } catch (error) {
    next(error);
  }
});

// Get course enrollments
router.get('/:id/enrollments', authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const { id: courseId } = req.params;
    const { id: userId, role } = req.user;
    const tenantPool = req.tenantPool;

    // Check if user has access to this course
    if (role === 'teacher') {
      const courseResult = await tenantPool.query(
        'SELECT c.* FROM courses c JOIN teachers t ON c.teacher_id = t.id WHERE c.id = $1 AND t.user_id = $2',
        [courseId, userId]
      );

      if (courseResult.rows.length === 0) {
        throw new ForbiddenError('Access denied to this course');
      }
    }

    const result = await tenantPool.query(
      `SELECT e.*, s.first_name, s.last_name, s.email, s.student_id
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       WHERE e.course_id = $1
       ORDER BY e.enrollment_date DESC`,
      [courseId]
    );

    res.json({
      enrollments: result.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;




