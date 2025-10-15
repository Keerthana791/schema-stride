import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure directory exists
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Multer storage with tenant/course isolation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantId = req.user?.tenantId || 'unknown';
    const courseId = req.params.courseId || 'uncoursed';
    const dest = path.join(__dirname, '../../uploads/videos', tenantId, courseId);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const ts = Date.now();
    cb(null, `${ts}_${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) return cb(null, true);
    cb(new ValidationError('Only video files are allowed'));
  }
});

// Helpers
async function ensureCourseTeacher(tenantPool, courseId, userId) {
  const q = `SELECT c.id FROM courses c JOIN teachers t ON c.teacher_id = t.id WHERE c.id = $1 AND t.user_id = $2 AND c.is_active = true`;
  const r = await tenantPool.query(q, [courseId, userId]);
  if (r.rows.length === 0) throw new ForbiddenError('Only the course teacher can perform this action');
}

async function ensureEnrolledOrStaff(tenantPool, courseId, user) {
  if (user.role === 'admin') return;
  if (user.role === 'teacher') {
    await ensureCourseTeacher(tenantPool, courseId, user.id);
    return;
  }
  // student: must be actively enrolled
  const q = `SELECT e.id FROM enrollments e JOIN students s ON e.student_id = s.id WHERE e.course_id = $1 AND s.user_id = $2 AND (e.status = 'active')`;
  const r = await tenantPool.query(q, [courseId, user.id]);
  if (r.rows.length === 0) throw new ForbiddenError('Not enrolled in this course');
}

// Create DB table DDL for reference (run per-tenant via migration)
// CREATE TABLE lectures (...)

// List lectures for a course
router.get('/courses/:courseId/lectures', authenticateToken, async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { user } = req;
    const tenantPool = req.tenantPool;

    // verify access
    await ensureEnrolledOrStaff(tenantPool, courseId, user);

    const { rows } = await tenantPool.query(
      `SELECT id, course_id, title, description, video_path, duration_sec, visibility, created_by, created_at
       FROM lectures WHERE course_id = $1 ORDER BY created_at DESC`,
      [courseId]
    );

    res.json({ lectures: rows });
  } catch (err) {
    next(err);
  }
});

// Upload a lecture (teacher/admin)
router.post('/courses/:courseId/lectures', authenticateToken, authorize('teacher', 'admin'), upload.single('file'), async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { user } = req;
    const { title, description } = req.body;
    const tenantPool = req.tenantPool;

    if (!title) throw new ValidationError('Title is required');
    if (!req.file) throw new ValidationError('Video file is required');

    if (user.role === 'teacher') await ensureCourseTeacher(tenantPool, courseId, user.id);

    // store relative path under /uploads for serving
    const relPath = path.relative(path.join(__dirname, '../../'), req.file.path).replace(/\\/g, '/');

    const ins = await tenantPool.query(
      `INSERT INTO lectures (course_id, title, description, video_path, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, course_id, title, description, video_path, created_by, created_at`,
      [courseId, title, description || null, `/${relPath}`, user.id]
    );

    res.status(201).json({ lecture: ins.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Stream with JWT in query (?token=)
router.get('/lectures/:lectureId/stream', async (req, res, next) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(401).json({ message: 'Token required' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Forge minimal req.user and tenant context: reuse tenantResolver mounted earlier
    // But here we cannot access tenantPool unless tenantResolver ran; ensure this route is mounted with tenantResolver.
    const user = { id: decoded.userId, role: decoded.role, tenantId: decoded.tenantId };

    // We need tenantPool and schema from previous middleware
    const tenantPool = req.tenantPool;
    if (!tenantPool) return res.status(500).json({ message: 'Tenant context required' });

    const { lectureId } = req.params;

    // Find lecture and course
    const lr = await tenantPool.query('SELECT l.*, c.id as c_id FROM lectures l JOIN courses c ON l.course_id = c.id WHERE l.id = $1', [lectureId]);
    if (lr.rows.length === 0) throw new NotFoundError('Lecture not found');
    const lecture = lr.rows[0];

    // Access check
    await ensureEnrolledOrStaff(tenantPool, lecture.course_id, user);

    // Resolve absolute file path
    const abs = path.join(__dirname, '../../', lecture.video_path);
    if (!fs.existsSync(abs)) throw new NotFoundError('Video file missing');

    const stat = fs.statSync(abs);
    const fileSize = stat.size;
    const range = req.headers.range;

    const contentType = 'video/mp4'; // basic; could improve by extension sniff

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      const file = fs.createReadStream(abs, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
      });
      fs.createReadStream(abs).pipe(res);
    }
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    next(err);
  }
});

// Update lecture (title/description/visibility)
router.patch('/lectures/:lectureId', authenticateToken, authorize('teacher', 'admin'), async (req, res, next) => {
  try {
    const { lectureId } = req.params;
    const { title, description, visibility } = req.body;
    const { user } = req;
    const tenantPool = req.tenantPool;

    // get course to verify ownership if teacher
    const lr = await tenantPool.query('SELECT l.*, c.teacher_id, t.user_id FROM lectures l JOIN courses c ON l.course_id = c.id JOIN teachers t ON c.teacher_id = t.id WHERE l.id = $1', [lectureId]);
    if (lr.rows.length === 0) throw new NotFoundError('Lecture not found');
    if (user.role === 'teacher' && lr.rows[0].user_id !== user.id) throw new ForbiddenError('Not course owner');

    const fields = [];
    const values = [];
    let i = 1;
    if (title !== undefined) { fields.push(`title = $${i++}`); values.push(title); }
    if (description !== undefined) { fields.push(`description = $${i++}`); values.push(description); }
    if (visibility !== undefined) { fields.push(`visibility = $${i++}`); values.push(visibility); }
    if (fields.length === 0) return res.status(400).json({ message: 'No changes' });
    const sql = `UPDATE lectures SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`;
    values.push(lectureId);
    const up = await tenantPool.query(sql, values);
    res.json({ lecture: up.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Delete lecture
router.delete('/lectures/:lectureId', authenticateToken, authorize('teacher', 'admin'), async (req, res, next) => {
  try {
    const { lectureId } = req.params;
    const { user } = req;
    const tenantPool = req.tenantPool;

    const lr = await tenantPool.query('SELECT l.*, c.teacher_id, t.user_id FROM lectures l JOIN courses c ON l.course_id = c.id JOIN teachers t ON c.teacher_id = t.id WHERE l.id = $1', [lectureId]);
    if (lr.rows.length === 0) throw new NotFoundError('Lecture not found');
    if (user.role === 'teacher' && lr.rows[0].user_id !== user.id) throw new ForbiddenError('Not course owner');

    const abs = path.join(__dirname, '../../', lr.rows[0].video_path);
    await tenantPool.query('DELETE FROM lectures WHERE id = $1', [lectureId]);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);

    res.json({ message: 'Lecture deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
