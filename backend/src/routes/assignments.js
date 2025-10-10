import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, authorize, canAccessResource } from '../middleware/auth.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get all assignments
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    let query, params;

    if (role === 'student') {
      // Students see assignments for enrolled courses
      query = `
        SELECT a.*, c.title as course_title, c.course_code,
               t.first_name, t.last_name,
               s.id as submission_id, s.submitted_at, s.grade, s.feedback
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
        LEFT JOIN students st ON s.student_id = st.id
        WHERE st.user_id = $1 AND a.is_published = true
        ORDER BY a.due_date ASC
      `;
      params = [userId];
    } else {
      // Teachers and admins see all assignments
      query = `
        SELECT a.*, c.title as course_title, c.course_code,
               t.first_name, t.last_name,
               COUNT(s.id) as submission_count
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
        GROUP BY a.id, c.title, c.course_code, t.first_name, t.last_name
        ORDER BY a.created_at DESC
      `;
      params = [];
    }

    const result = await tenantPool.query(query, params);

    res.json({
      assignments: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get assignment by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    let query, params;

    if (role === 'student') {
      // Students can only see published assignments for enrolled courses
      query = `
        SELECT a.*, c.title as course_title, c.course_code,
               t.first_name, t.last_name, t.email as teacher_email,
               s.id as submission_id, s.submission_text, s.attachments, s.submitted_at, s.grade, s.feedback
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
        LEFT JOIN students st ON s.student_id = st.id
        WHERE a.id = $1 AND st.user_id = $2 AND a.is_published = true
      `;
      params = [id, userId];
    } else {
      // Teachers and admins can see any assignment
      query = `
        SELECT a.*, c.title as course_title, c.course_code,
               t.first_name, t.last_name, t.email as teacher_email
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        WHERE a.id = $1
      `;
      params = [id];
    }

    const result = await tenantPool.query(query, params);

    if (result.rows.length === 0) {
      throw new NotFoundError('Assignment not found');
    }

    res.json({
      assignment: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Create assignment
router.post('/', [
  body('courseId').isUUID().withMessage('Valid course ID required'),
  body('title').isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
  body('dueDate').optional().isISO8601().withMessage('Valid due date required'),
  body('maxPoints').optional().isInt({ min: 1, max: 1000 }).withMessage('Max points must be 1-1000'),
  body('assignmentType').optional().isIn(['homework', 'project', 'essay', 'lab']).withMessage('Invalid assignment type'),
  body('instructions').optional().isLength({ max: 5000 }).withMessage('Instructions must be less than 5000 characters')
], authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { courseId, title, description, dueDate, maxPoints, assignmentType, instructions } = req.body;
    const { id: userId, role } = req.user;
    const tenantPool = req.tenantPool;

    // Check if course exists and user has access
    let courseQuery, courseParams;
    if (role === 'teacher') {
      courseQuery = `
        SELECT c.* FROM courses c
        JOIN teachers t ON c.teacher_id = t.id
        WHERE c.id = $1 AND t.user_id = $2 AND c.is_active = true
      `;
      courseParams = [courseId, userId];
    } else {
      courseQuery = 'SELECT * FROM courses WHERE id = $1 AND is_active = true';
      courseParams = [courseId];
    }

    const courseResult = await tenantPool.query(courseQuery, courseParams);
    if (courseResult.rows.length === 0) {
      throw new NotFoundError('Course not found or access denied');
    }

    const result = await tenantPool.query(
      `INSERT INTO assignments (course_id, title, description, due_date, max_points, assignment_type, instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [courseId, title, description, dueDate, maxPoints || 100, assignmentType || 'homework', instructions]
    );

    res.status(201).json({
      message: 'Assignment created successfully',
      assignment: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update assignment
router.put('/:id', [
  body('title').optional().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
  body('dueDate').optional().isISO8601().withMessage('Valid due date required'),
  body('maxPoints').optional().isInt({ min: 1, max: 1000 }).withMessage('Max points must be 1-1000'),
  body('assignmentType').optional().isIn(['homework', 'project', 'essay', 'lab']).withMessage('Invalid assignment type'),
  body('instructions').optional().isLength({ max: 5000 }).withMessage('Instructions must be less than 5000 characters'),
  body('isPublished').optional().isBoolean().withMessage('Published status must be boolean')
], authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { id } = req.params;
    const { id: userId, role } = req.user;
    const { title, description, dueDate, maxPoints, assignmentType, instructions, isPublished } = req.body;
    const tenantPool = req.tenantPool;

    // Check if assignment exists and user has access
    let assignmentQuery, assignmentParams;
    if (role === 'teacher') {
      assignmentQuery = `
        SELECT a.* FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        WHERE a.id = $1 AND t.user_id = $2
      `;
      assignmentParams = [id, userId];
    } else {
      assignmentQuery = 'SELECT * FROM assignments WHERE id = $1';
      assignmentParams = [id];
    }

    const assignmentResult = await tenantPool.query(assignmentQuery, assignmentParams);
    if (assignmentResult.rows.length === 0) {
      throw new NotFoundError('Assignment not found or access denied');
    }

    // Update assignment
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
    if (dueDate) {
      updateFields.push(`due_date = $${paramCount}`);
      values.push(dueDate);
      paramCount++;
    }
    if (maxPoints) {
      updateFields.push(`max_points = $${paramCount}`);
      values.push(maxPoints);
      paramCount++;
    }
    if (assignmentType) {
      updateFields.push(`assignment_type = $${paramCount}`);
      values.push(assignmentType);
      paramCount++;
    }
    if (instructions !== undefined) {
      updateFields.push(`instructions = $${paramCount}`);
      values.push(instructions);
      paramCount++;
    }
    if (isPublished !== undefined) {
      updateFields.push(`is_published = $${paramCount}`);
      values.push(isPublished);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await tenantPool.query(
      `UPDATE assignments SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      message: 'Assignment updated successfully',
      assignment: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Delete assignment
router.delete('/:id', authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;
    const tenantPool = req.tenantPool;

    // Check if assignment exists and user has access
    let assignmentQuery, assignmentParams;
    if (role === 'teacher') {
      assignmentQuery = `
        SELECT a.* FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        WHERE a.id = $1 AND t.user_id = $2
      `;
      assignmentParams = [id, userId];
    } else {
      assignmentQuery = 'SELECT * FROM assignments WHERE id = $1';
      assignmentParams = [id];
    }

    const assignmentResult = await tenantPool.query(assignmentQuery, assignmentParams);
    if (assignmentResult.rows.length === 0) {
      throw new NotFoundError('Assignment not found or access denied');
    }

    // Check if there are submissions
    const submissionsResult = await tenantPool.query(
      'SELECT COUNT(*) as count FROM assignment_submissions WHERE assignment_id = $1',
      [id]
    );

    if (parseInt(submissionsResult.rows[0].count) > 0) {
      return res.status(409).json({ 
        message: 'Cannot delete assignment with existing submissions' 
      });
    }

    await tenantPool.query('DELETE FROM assignments WHERE id = $1', [id]);

    res.json({
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Submit assignment
router.post('/:id/submit', [
  body('submissionText').optional().isLength({ max: 10000 }).withMessage('Submission text must be less than 10000 characters')
], authenticateToken, authorize('student'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { id: assignmentId } = req.params;
    const { submissionText, attachments } = req.body;
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

    // Check if assignment exists and is published
    const assignmentResult = await tenantPool.query(
      'SELECT * FROM assignments WHERE id = $1 AND is_published = true',
      [assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      throw new NotFoundError('Assignment not found or not published');
    }

    const assignment = assignmentResult.rows[0];

    // Check if already submitted
    const existingSubmission = await tenantPool.query(
      'SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
      [assignmentId, studentId]
    );

    if (existingSubmission.rows.length > 0) {
      return res.status(409).json({ message: 'Assignment already submitted' });
    }

    // Check if due date has passed
    const isLate = assignment.due_date && new Date() > new Date(assignment.due_date);

    // Create submission
    const result = await tenantPool.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, attachments, is_late)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [assignmentId, studentId, submissionText, attachments || null, isLate]
    );

    res.status(201).json({
      message: 'Assignment submitted successfully',
      submission: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get assignment submissions
router.get('/:id/submissions', authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const { id: assignmentId } = req.params;
    const { id: userId, role } = req.user;
    const tenantPool = req.tenantPool;

    // Check if user has access to this assignment
    if (role === 'teacher') {
      const assignmentResult = await tenantPool.query(
        `SELECT a.* FROM assignments a
         JOIN courses c ON a.course_id = c.id
         JOIN teachers t ON c.teacher_id = t.id
         WHERE a.id = $1 AND t.user_id = $2`,
        [assignmentId, userId]
      );

      if (assignmentResult.rows.length === 0) {
        throw new ForbiddenError('Access denied to this assignment');
      }
    }

    const result = await tenantPool.query(
      `SELECT s.*, st.first_name, st.last_name, st.email, st.student_id
       FROM assignment_submissions s
       JOIN students st ON s.student_id = st.id
       WHERE s.assignment_id = $1
       ORDER BY s.submitted_at DESC`,
      [assignmentId]
    );

    res.json({
      submissions: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Grade assignment submission
router.put('/submissions/:submissionId/grade', [
  body('grade').isFloat({ min: 0 }).withMessage('Grade must be a positive number'),
  body('feedback').optional().isLength({ max: 2000 }).withMessage('Feedback must be less than 2000 characters')
], authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    const { id: userId } = req.user;
    const tenantPool = req.tenantPool;

    // Check if submission exists and user has access
    const submissionResult = await tenantPool.query(
      `SELECT s.*, a.course_id FROM assignment_submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       JOIN teachers t ON c.teacher_id = t.id
       WHERE s.id = $1 AND t.user_id = $2`,
      [submissionId, userId]
    );

    if (submissionResult.rows.length === 0) {
      throw new NotFoundError('Submission not found or access denied');
    }

    // Update submission with grade
    const result = await tenantPool.query(
      'UPDATE assignment_submissions SET grade = $1, feedback = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [grade, feedback, submissionId]
    );

    res.json({
      message: 'Grade updated successfully',
      submission: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

export default router;




