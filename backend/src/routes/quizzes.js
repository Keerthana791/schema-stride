import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get all quizzes
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    let query, params;

    if (role === 'student') {
      // Students see published quizzes for enrolled courses
      query = `
        SELECT q.*, c.title as course_title, c.course_code,
               t.first_name, t.last_name,
               s.id as submission_id, s.score, s.submitted_at
        FROM quizzes q
        JOIN courses c ON q.course_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        LEFT JOIN quiz_submissions s ON q.id = s.quiz_id
        LEFT JOIN students st ON s.student_id = st.id
        WHERE st.user_id = $1 AND q.is_published = true
        ORDER BY q.available_from ASC
      `;
      params = [userId];
    } else {
      // Teachers and admins see all quizzes
      query = `
        SELECT q.*, c.title as course_title, c.course_code,
               t.first_name, t.last_name,
               COUNT(s.id) as submission_count
        FROM quizzes q
        JOIN courses c ON q.course_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        LEFT JOIN quiz_submissions s ON q.id = s.quiz_id
        GROUP BY q.id, c.title, c.course_code, t.first_name, t.last_name
        ORDER BY q.created_at DESC
      `;
      params = [];
    }

    const result = await tenantPool.query(query, params);

    res.json({
      quizzes: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get quiz by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    let query, params;

    if (role === 'student') {
      // Students can only see published quizzes for enrolled courses
      query = `
        SELECT q.*, c.title as course_title, c.course_code,
               t.first_name, t.last_name, t.email as teacher_email,
               s.id as submission_id, s.answers, s.score, s.submitted_at, s.attempt_number
        FROM quizzes q
        JOIN courses c ON q.course_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        LEFT JOIN quiz_submissions s ON q.id = s.quiz_id
        LEFT JOIN students st ON s.student_id = st.id
        WHERE q.id = $1 AND st.user_id = $2 AND q.is_published = true
      `;
      params = [id, userId];
    } else {
      // Teachers and admins can see any quiz
      query = `
        SELECT q.*, c.title as course_title, c.course_code,
               t.first_name, t.last_name, t.email as teacher_email
        FROM quizzes q
        JOIN courses c ON q.course_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        WHERE q.id = $1
      `;
      params = [id];
    }

    const result = await tenantPool.query(query, params);

    if (result.rows.length === 0) {
      throw new NotFoundError('Quiz not found');
    }

    res.json({
      quiz: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Create quiz
router.post('/', [
  body('courseId').isUUID().withMessage('Valid course ID required'),
  body('title').isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
  body('timeLimit').optional().isInt({ min: 1, max: 300 }).withMessage('Time limit must be 1-300 minutes'),
  body('maxAttempts').optional().isInt({ min: 1, max: 10 }).withMessage('Max attempts must be 1-10'),
  body('maxPoints').optional().isInt({ min: 1, max: 1000 }).withMessage('Max points must be 1-1000'),
  body('questions').isArray({ min: 1 }).withMessage('At least one question required'),
  body('availableFrom').optional().isISO8601().withMessage('Valid available from date required'),
  body('availableUntil').optional().isISO8601().withMessage('Valid available until date required')
], authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { courseId, title, description, timeLimit, maxAttempts, maxPoints, questions, availableFrom, availableUntil } = req.body;
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
      `INSERT INTO quizzes (course_id, title, description, time_limit, max_attempts, max_points, questions, available_from, available_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [courseId, title, description, timeLimit || 60, maxAttempts || 1, maxPoints || 100, JSON.stringify(questions), availableFrom, availableUntil]
    );

    res.status(201).json({
      message: 'Quiz created successfully',
      quiz: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update quiz
router.put('/:id', [
  body('title').optional().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
  body('timeLimit').optional().isInt({ min: 1, max: 300 }).withMessage('Time limit must be 1-300 minutes'),
  body('maxAttempts').optional().isInt({ min: 1, max: 10 }).withMessage('Max attempts must be 1-10'),
  body('maxPoints').optional().isInt({ min: 1, max: 1000 }).withMessage('Max points must be 1-1000'),
  body('questions').optional().isArray({ min: 1 }).withMessage('At least one question required'),
  body('availableFrom').optional().isISO8601().withMessage('Valid available from date required'),
  body('availableUntil').optional().isISO8601().withMessage('Valid available until date required'),
  body('isPublished').optional().isBoolean().withMessage('Published status must be boolean')
], authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { id } = req.params;
    const { id: userId, role } = req.user;
    const { title, description, timeLimit, maxAttempts, maxPoints, questions, availableFrom, availableUntil, isPublished } = req.body;
    const tenantPool = req.tenantPool;

    // Check if quiz exists and user has access
    let quizQuery, quizParams;
    if (role === 'teacher') {
      quizQuery = `
        SELECT q.* FROM quizzes q
        JOIN courses c ON q.course_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        WHERE q.id = $1 AND t.user_id = $2
      `;
      quizParams = [id, userId];
    } else {
      quizQuery = 'SELECT * FROM quizzes WHERE id = $1';
      quizParams = [id];
    }

    const quizResult = await tenantPool.query(quizQuery, quizParams);
    if (quizResult.rows.length === 0) {
      throw new NotFoundError('Quiz not found or access denied');
    }

    // Update quiz
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
    if (timeLimit) {
      updateFields.push(`time_limit = $${paramCount}`);
      values.push(timeLimit);
      paramCount++;
    }
    if (maxAttempts) {
      updateFields.push(`max_attempts = $${paramCount}`);
      values.push(maxAttempts);
      paramCount++;
    }
    if (maxPoints) {
      updateFields.push(`max_points = $${paramCount}`);
      values.push(maxPoints);
      paramCount++;
    }
    if (questions) {
      updateFields.push(`questions = $${paramCount}`);
      values.push(JSON.stringify(questions));
      paramCount++;
    }
    if (availableFrom) {
      updateFields.push(`available_from = $${paramCount}`);
      values.push(availableFrom);
      paramCount++;
    }
    if (availableUntil) {
      updateFields.push(`available_until = $${paramCount}`);
      values.push(availableUntil);
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
      `UPDATE quizzes SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      message: 'Quiz updated successfully',
      quiz: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Delete quiz
router.delete('/:id', authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;
    const tenantPool = req.tenantPool;

    // Check if quiz exists and user has access
    let quizQuery, quizParams;
    if (role === 'teacher') {
      quizQuery = `
        SELECT q.* FROM quizzes q
        JOIN courses c ON q.course_id = c.id
        JOIN teachers t ON c.teacher_id = t.id
        WHERE q.id = $1 AND t.user_id = $2
      `;
      quizParams = [id, userId];
    } else {
      quizQuery = 'SELECT * FROM quizzes WHERE id = $1';
      quizParams = [id];
    }

    const quizResult = await tenantPool.query(quizQuery, quizParams);
    if (quizResult.rows.length === 0) {
      throw new NotFoundError('Quiz not found or access denied');
    }

    // Check if there are submissions
    const submissionsResult = await tenantPool.query(
      'SELECT COUNT(*) as count FROM quiz_submissions WHERE quiz_id = $1',
      [id]
    );

    if (parseInt(submissionsResult.rows[0].count) > 0) {
      return res.status(409).json({ 
        message: 'Cannot delete quiz with existing submissions' 
      });
    }

    await tenantPool.query('DELETE FROM quizzes WHERE id = $1', [id]);

    res.json({
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Submit quiz
router.post('/:id/submit', [
  body('answers').isArray().withMessage('Answers array required')
], authenticateToken, authorize('student'), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { id: quizId } = req.params;
    const { answers } = req.body;
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

    // Check if quiz exists and is available
    const quizResult = await tenantPool.query(
      'SELECT * FROM quizzes WHERE id = $1 AND is_published = true',
      [quizId]
    );

    if (quizResult.rows.length === 0) {
      throw new NotFoundError('Quiz not found or not published');
    }

    const quiz = quizResult.rows[0];

    // Check if quiz is available
    const now = new Date();
    if (quiz.available_from && now < new Date(quiz.available_from)) {
      return res.status(400).json({ message: 'Quiz is not yet available' });
    }
    if (quiz.available_until && now > new Date(quiz.available_until)) {
      return res.status(400).json({ message: 'Quiz is no longer available' });
    }

    // Check attempt limit
    const existingSubmissions = await tenantPool.query(
      'SELECT COUNT(*) as count FROM quiz_submissions WHERE quiz_id = $1 AND student_id = $2',
      [quizId, studentId]
    );

    const attemptCount = parseInt(existingSubmissions.rows[0].count);
    if (attemptCount >= quiz.max_attempts) {
      return res.status(409).json({ message: 'Maximum attempts reached' });
    }

    // Calculate score (simplified - you might want more complex scoring)
    const questions = JSON.parse(quiz.questions);
    let score = 0;
    let correctAnswers = 0;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const userAnswer = answers[i];
      
      if (question.type === 'multiple_choice') {
        if (userAnswer === question.correct_answer) {
          score += question.points || 1;
          correctAnswers++;
        }
      } else if (question.type === 'true_false') {
        if (userAnswer === question.correct_answer) {
          score += question.points || 1;
          correctAnswers++;
        }
      }
      // Add more question types as needed
    }

    const percentage = (score / quiz.max_points) * 100;

    // Create submission
    const result = await tenantPool.query(
      `INSERT INTO quiz_submissions (quiz_id, student_id, answers, score, attempt_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [quizId, studentId, JSON.stringify(answers), percentage, attemptCount + 1]
    );

    res.status(201).json({
      message: 'Quiz submitted successfully',
      submission: result.rows[0],
      score: percentage,
      correctAnswers,
      totalQuestions: questions.length
    });
  } catch (error) {
    next(error);
  }
});

// Get quiz submissions
router.get('/:id/submissions', authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const { id: quizId } = req.params;
    const { id: userId, role } = req.user;
    const tenantPool = req.tenantPool;

    // Check if user has access to this quiz
    if (role === 'teacher') {
      const quizResult = await tenantPool.query(
        `SELECT q.* FROM quizzes q
         JOIN courses c ON q.course_id = c.id
         JOIN teachers t ON c.teacher_id = t.id
         WHERE q.id = $1 AND t.user_id = $2`,
        [quizId, userId]
      );

      if (quizResult.rows.length === 0) {
        throw new ForbiddenError('Access denied to this quiz');
      }
    }

    const result = await tenantPool.query(
      `SELECT s.*, st.first_name, st.last_name, st.email, st.student_id
       FROM quiz_submissions s
       JOIN students st ON s.student_id = st.id
       WHERE s.quiz_id = $1
       ORDER BY s.submitted_at DESC`,
      [quizId]
    );

    res.json({
      submissions: result.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;




