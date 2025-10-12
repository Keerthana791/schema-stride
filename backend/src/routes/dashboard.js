import express from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { NotFoundError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, requirePermission('system:admin'), async (req, res, next) => {
  try {
    const tenantPool = req.tenantPool;
    const { role, id: userId } = req.user;

    // Get basic counts
    const [
      studentsResult,
      teachersResult,
      coursesResult,
      assignmentsResult,
      quizzesResult,
      enrollmentsResult
    ] = await Promise.all([
      tenantPool.query('SELECT COUNT(*) as count FROM students WHERE is_active = true'),
      tenantPool.query('SELECT COUNT(*) as count FROM teachers WHERE is_active = true'),
      tenantPool.query('SELECT COUNT(*) as count FROM courses WHERE is_active = true'),
      tenantPool.query('SELECT COUNT(*) as count FROM assignments WHERE is_published = true'),
      tenantPool.query('SELECT COUNT(*) as count FROM quizzes WHERE is_published = true'),
      tenantPool.query('SELECT COUNT(*) as count FROM enrollments WHERE status = \'active\'')
    ]);

    // Get recent activity
    const recentAssignmentsResult = await tenantPool.query(`
      SELECT a.title, a.created_at, c.title as course_title
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      ORDER BY a.created_at DESC
      LIMIT 5
    `);

    const recentEnrollmentsResult = await tenantPool.query(`
      SELECT s.first_name, s.last_name, c.title as course_title, e.enrollment_date
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN courses c ON e.course_id = c.id
      ORDER BY e.enrollment_date DESC
      LIMIT 5
    `);

    // Get grade statistics
    const gradeStatsResult = await tenantPool.query(`
      SELECT 
        AVG(g.grade) as average_grade,
        COUNT(g.id) as total_grades,
        COUNT(CASE WHEN g.grade >= 90 THEN 1 END) as a_grades,
        COUNT(CASE WHEN g.grade >= 80 AND g.grade < 90 THEN 1 END) as b_grades,
        COUNT(CASE WHEN g.grade >= 70 AND g.grade < 80 THEN 1 END) as c_grades,
        COUNT(CASE WHEN g.grade < 70 THEN 1 END) as failing_grades
      FROM grades g
    `);

    // Get course enrollment distribution
    const courseEnrollmentResult = await tenantPool.query(`
      SELECT c.title, c.course_code, COUNT(e.id) as enrollment_count
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      WHERE c.is_active = true
      GROUP BY c.id, c.title, c.course_code
      ORDER BY enrollment_count DESC
      LIMIT 10
    `);

    res.json({
      stats: {
        students: parseInt(studentsResult.rows[0].count),
        teachers: parseInt(teachersResult.rows[0].count),
        courses: parseInt(coursesResult.rows[0].count),
        assignments: parseInt(assignmentsResult.rows[0].count),
        quizzes: parseInt(quizzesResult.rows[0].count),
        enrollments: parseInt(enrollmentsResult.rows[0].count)
      },
      gradeStats: gradeStatsResult.rows[0] || {
        average_grade: 0,
        total_grades: 0,
        a_grades: 0,
        b_grades: 0,
        c_grades: 0,
        failing_grades: 0
      },
      recentActivity: {
        assignments: recentAssignmentsResult.rows,
        enrollments: recentEnrollmentsResult.rows
      },
      courseEnrollments: courseEnrollmentResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get user-specific dashboard (for students/teachers)
router.get('/user-stats', authenticateToken, async (req, res, next) => {
  try {
    const tenantPool = req.tenantPool;
    const { role, id: userId } = req.user;

    let userStats = {};

    if (role === 'student') {
      // Student-specific stats
      const [
        enrolledCoursesResult,
        pendingAssignmentsResult,
        completedAssignmentsResult,
        averageGradeResult,
        upcomingQuizzesResult
      ] = await Promise.all([
        tenantPool.query(`
          SELECT COUNT(*) as count
          FROM enrollments e
          JOIN students s ON e.student_id = s.id
          WHERE s.user_id = $1 AND e.status = 'active'
        `, [userId]),
        tenantPool.query(`
          SELECT COUNT(*) as count
          FROM assignments a
          JOIN courses c ON a.course_id = c.id
          JOIN enrollments e ON c.id = e.course_id
          JOIN students s ON e.student_id = s.id
          LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id AND sub.student_id = s.id
          WHERE s.user_id = $1 AND a.is_published = true AND sub.id IS NULL
        `, [userId]),
        tenantPool.query(`
          SELECT COUNT(*) as count
          FROM assignment_submissions sub
          JOIN students s ON sub.student_id = s.id
          WHERE s.user_id = $1
        `, [userId]),
        tenantPool.query(`
          SELECT AVG(g.grade) as average
          FROM grades g
          JOIN students s ON g.student_id = s.id
          WHERE s.user_id = $1
        `, [userId]),
        tenantPool.query(`
          SELECT COUNT(*) as count
          FROM quizzes q
          JOIN courses c ON q.course_id = c.id
          JOIN enrollments e ON c.id = e.course_id
          JOIN students s ON e.student_id = s.id
          WHERE s.user_id = $1 AND q.is_published = true 
          AND (q.available_until IS NULL OR q.available_until > NOW())
        `, [userId])
      ]);

      userStats = {
        enrolledCourses: parseInt(enrolledCoursesResult.rows[0].count),
        pendingAssignments: parseInt(pendingAssignmentsResult.rows[0].count),
        completedAssignments: parseInt(completedAssignmentsResult.rows[0].count),
        averageGrade: parseFloat(averageGradeResult.rows[0].average) || 0,
        upcomingQuizzes: parseInt(upcomingQuizzesResult.rows[0].count)
      };
    } else if (role === 'teacher') {
      // Teacher-specific stats
      const [
        myCoursesResult,
        totalStudentsResult,
        pendingSubmissionsResult,
        averageClassGradeResult
      ] = await Promise.all([
        tenantPool.query(`
          SELECT COUNT(*) as count
          FROM courses c
          JOIN teachers t ON c.teacher_id = t.id
          WHERE t.user_id = $1 AND c.is_active = true
        `, [userId]),
        tenantPool.query(`
          SELECT COUNT(DISTINCT e.student_id) as count
          FROM courses c
          JOIN teachers t ON c.teacher_id = t.id
          JOIN enrollments e ON c.id = e.course_id
          WHERE t.user_id = $1 AND e.status = 'active'
        `, [userId]),
        tenantPool.query(`
          SELECT COUNT(*) as count
          FROM assignment_submissions sub
          JOIN assignments a ON sub.assignment_id = a.id
          JOIN courses c ON a.course_id = c.id
          JOIN teachers t ON c.teacher_id = t.id
          WHERE t.user_id = $1 AND sub.grade IS NULL
        `, [userId]),
        tenantPool.query(`
          SELECT AVG(g.grade) as average
          FROM grades g
          JOIN assignments a ON g.assignment_id = a.id
          JOIN courses c ON a.course_id = c.id
          JOIN teachers t ON c.teacher_id = t.id
          WHERE t.user_id = $1
        `, [userId])
      ]);

      userStats = {
        myCourses: parseInt(myCoursesResult.rows[0].count),
        totalStudents: parseInt(totalStudentsResult.rows[0].count),
        pendingSubmissions: parseInt(pendingSubmissionsResult.rows[0].count),
        averageClassGrade: parseFloat(averageClassGradeResult.rows[0].average) || 0
      };
    }

    res.json({
      userStats,
      role
    });
  } catch (error) {
    next(error);
  }
});

// Get notifications for current user
router.get('/notifications', authenticateToken, async (req, res, next) => {
  try {
    const tenantPool = req.tenantPool;
    const { id: userId } = req.user;

    const notificationsResult = await tenantPool.query(`
      SELECT id, title, message, type, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId]);

    const unreadCountResult = await tenantPool.query(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `, [userId]);

    res.json({
      notifications: notificationsResult.rows,
      unreadCount: parseInt(unreadCountResult.rows[0].count)
    });
  } catch (error) {
    next(error);
  }
});

export default router;

