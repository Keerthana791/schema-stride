import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, authorize, canAccessResource } from '../middleware/auth.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get grades for current user
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    let query, params;

    if (role === 'student') {
      // Students see their own grades
      query = `
        SELECT g.*, c.title as course_title, c.course_code,
               a.title as assignment_title, q.title as quiz_title,
               t.first_name, t.last_name
        FROM grades g
        JOIN courses c ON g.course_id = c.id
        LEFT JOIN assignments a ON g.assignment_id = a.id
        LEFT JOIN quizzes q ON g.quiz_id = q.id
        LEFT JOIN teachers t ON g.graded_by = t.id
        JOIN students s ON g.student_id = s.id
        WHERE s.user_id = $1
        ORDER BY g.graded_at DESC
      `;
      params = [userId];
    } else {
      // Teachers and admins see all grades
      query = `
        SELECT g.*, c.title as course_title, c.course_code,
               a.title as assignment_title, q.title as quiz_title,
               s.first_name, s.last_name, s.student_id,
               t.first_name as grader_first_name, t.last_name as grader_last_name
        FROM grades g
        JOIN courses c ON g.course_id = c.id
        LEFT JOIN assignments a ON g.assignment_id = a.id
        LEFT JOIN quizzes q ON g.quiz_id = q.id
        JOIN students s ON g.student_id = s.id
        LEFT JOIN teachers t ON g.graded_by = t.id
        ORDER BY g.graded_at DESC
      `;
      params = [];
    }

    const result = await tenantPool.query(query, params);

    res.json({
      grades: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get grades for specific student
router.get('/student/:studentId', authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const tenantPool = req.tenantPool;

    const result = await tenantPool.query(
      `SELECT g.*, c.title as course_title, c.course_code,
              a.title as assignment_title, q.title as quiz_title,
              s.first_name, s.last_name, s.student_id,
              t.first_name as grader_first_name, t.last_name as grader_last_name
       FROM grades g
       JOIN courses c ON g.course_id = c.id
       LEFT JOIN assignments a ON g.assignment_id = a.id
       LEFT JOIN quizzes q ON g.quiz_id = q.id
       JOIN students s ON g.student_id = s.id
       LEFT JOIN teachers t ON g.graded_by = t.id
       WHERE g.student_id = $1
       ORDER BY g.graded_at DESC`,
      [studentId]
    );

    res.json({
      grades: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get grades for specific course
router.get('/course/:courseId', authenticateToken, async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    let query, params;

    if (role === 'student') {
      // Students see their own grades for the course
      query = `
        SELECT g.*, c.title as course_title, c.course_code,
               a.title as assignment_title, q.title as quiz_title,
               t.first_name, t.last_name
        FROM grades g
        JOIN courses c ON g.course_id = c.id
        LEFT JOIN assignments a ON g.assignment_id = a.id
        LEFT JOIN quizzes q ON g.quiz_id = q.id
        LEFT JOIN teachers t ON g.graded_by = t.id
        JOIN students s ON g.student_id = s.id
        WHERE g.course_id = $1 AND s.user_id = $2
        ORDER BY g.graded_at DESC
      `;
      params = [courseId, userId];
    } else {
      // Teachers and admins see all grades for the course
      query = `
        SELECT g.*, c.title as course_title, c.course_code,
               a.title as assignment_title, q.title as quiz_title,
               s.first_name, s.last_name, s.student_id,
               t.first_name as grader_first_name, t.last_name as grader_last_name
        FROM grades g
        JOIN courses c ON g.course_id = c.id
        LEFT JOIN assignments a ON g.assignment_id = a.id
        LEFT JOIN quizzes q ON g.quiz_id = q.id
        JOIN students s ON g.student_id = s.id
        LEFT JOIN teachers t ON g.graded_by = t.id
        WHERE g.course_id = $1
        ORDER BY g.graded_at DESC
      `;
      params = [courseId];
    }

    const result = await tenantPool.query(query, params);

    res.json({
      grades: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create grade
router.post('/', [
  body('studentId').isUUID().withMessage('Valid student ID required'),
  body('courseId').isUUID().withMessage('Valid course ID required'),
  body('grade').isFloat({ min: 0 }).withMessage('Grade must be a positive number'),
  body('maxPoints').optional().isInt({ min: 1 }).withMessage('Max points must be positive'),
  body('gradeType').isIn(['assignment', 'quiz', 'final', 'participation']).withMessage('Invalid grade type'),
  body('feedback').optional().isLength({ max: 2000 }).withMessage('Feedback must be less than 2000 characters'),
  body('assignmentId').optional().isUUID().withMessage('Valid assignment ID required'),
  body('quizId').optional().isUUID().withMessage('Valid quiz ID required')
], authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { studentId, courseId, grade, maxPoints, gradeType, feedback, assignmentId, quizId } = req.body;
    const { id: userId } = req.user;
    const tenantPool = req.tenantPool;

    // Get teacher ID
    const teacherResult = await tenantPool.query(
      'SELECT id FROM teachers WHERE user_id = $1',
      [userId]
    );

    if (teacherResult.rows.length === 0) {
      throw new NotFoundError('Teacher profile not found');
    }

    const teacherId = teacherResult.rows[0].id;

    // Check if student exists
    const studentResult = await tenantPool.query(
      'SELECT id FROM students WHERE id = $1',
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      throw new NotFoundError('Student not found');
    }

    // Check if course exists
    const courseResult = await tenantPool.query(
      'SELECT id FROM courses WHERE id = $1',
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      throw new NotFoundError('Course not found');
    }

    // Validate assignment/quiz if provided
    if (assignmentId) {
      const assignmentResult = await tenantPool.query(
        'SELECT id FROM assignments WHERE id = $1 AND course_id = $2',
        [assignmentId, courseId]
      );

      if (assignmentResult.rows.length === 0) {
        throw new NotFoundError('Assignment not found in this course');
      }
    }

    if (quizId) {
      const quizResult = await tenantPool.query(
        'SELECT id FROM quizzes WHERE id = $1 AND course_id = $2',
        [quizId, courseId]
      );

      if (quizResult.rows.length === 0) {
        throw new NotFoundError('Quiz not found in this course');
      }
    }

    const result = await tenantPool.query(
      `INSERT INTO grades (student_id, course_id, assignment_id, quiz_id, grade, max_points, grade_type, feedback, graded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [studentId, courseId, assignmentId || null, quizId || null, grade, maxPoints || 100, gradeType, feedback, teacherId]
    );

    res.status(201).json({
      message: 'Grade created successfully',
      grade: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update grade
router.put('/:id', [
  body('grade').optional().isFloat({ min: 0 }).withMessage('Grade must be a positive number'),
  body('maxPoints').optional().isInt({ min: 1 }).withMessage('Max points must be positive'),
  body('feedback').optional().isLength({ max: 2000 }).withMessage('Feedback must be less than 2000 characters')
], authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { id } = req.params;
    const { grade, maxPoints, feedback } = req.body;
    const { id: userId } = req.user;
    const tenantPool = req.tenantPool;

    // Check if grade exists and user has access
    const gradeResult = await tenantPool.query(
      'SELECT * FROM grades WHERE id = $1',
      [id]
    );

    if (gradeResult.rows.length === 0) {
      throw new NotFoundError('Grade not found');
    }

    // Update grade
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (grade !== undefined) {
      updateFields.push(`grade = $${paramCount}`);
      values.push(grade);
      paramCount++;
    }
    if (maxPoints !== undefined) {
      updateFields.push(`max_points = $${paramCount}`);
      values.push(maxPoints);
      paramCount++;
    }
    if (feedback !== undefined) {
      updateFields.push(`feedback = $${paramCount}`);
      values.push(feedback);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await tenantPool.query(
      `UPDATE grades SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      message: 'Grade updated successfully',
      grade: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Delete grade
router.delete('/:id', authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantPool = req.tenantPool;

    const gradeResult = await tenantPool.query(
      'SELECT id FROM grades WHERE id = $1',
      [id]
    );

    if (gradeResult.rows.length === 0) {
      throw new NotFoundError('Grade not found');
    }

    await tenantPool.query('DELETE FROM grades WHERE id = $1', [id]);

    res.json({
      message: 'Grade deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get grade statistics for course
router.get('/course/:courseId/stats', authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const tenantPool = req.tenantPool;

    // Get grade statistics
    const statsResult = await tenantPool.query(
      `SELECT 
         COUNT(*) as total_grades,
         AVG(grade) as average_grade,
         MIN(grade) as min_grade,
         MAX(grade) as max_grade,
         COUNT(CASE WHEN grade >= 90 THEN 1 END) as a_grades,
         COUNT(CASE WHEN grade >= 80 AND grade < 90 THEN 1 END) as b_grades,
         COUNT(CASE WHEN grade >= 70 AND grade < 80 THEN 1 END) as c_grades,
         COUNT(CASE WHEN grade >= 60 AND grade < 70 THEN 1 END) as d_grades,
         COUNT(CASE WHEN grade < 60 THEN 1 END) as f_grades
       FROM grades 
       WHERE course_id = $1`,
      [courseId]
    );

    // Get grade distribution by type
    const distributionResult = await tenantPool.query(
      `SELECT grade_type, COUNT(*) as count, AVG(grade) as average
       FROM grades 
       WHERE course_id = $1 
       GROUP BY grade_type`,
      [courseId]
    );

    res.json({
      stats: statsResult.rows[0],
      distribution: distributionResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get student grade summary
router.get('/student/:studentId/summary', authenticateToken, async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    // Check if user has access to this student's grades
    if (role === 'student') {
      const studentResult = await tenantPool.query(
        'SELECT id FROM students WHERE id = $1 AND user_id = $2',
        [studentId, userId]
      );

      if (studentResult.rows.length === 0) {
        throw new ForbiddenError('Access denied to this student\'s grades');
      }
    }

    // Get grade summary
    const summaryResult = await tenantPool.query(
      `SELECT 
         c.title as course_title,
         c.course_code,
         COUNT(g.id) as total_grades,
         AVG(g.grade) as average_grade,
         SUM(g.grade) as total_points,
         SUM(g.max_points) as total_max_points
       FROM grades g
       JOIN courses c ON g.course_id = c.id
       WHERE g.student_id = $1
       GROUP BY c.id, c.title, c.course_code
       ORDER BY c.title`,
      [studentId]
    );

    res.json({
      summary: summaryResult.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;




