import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantId = req.tenantId;
    const uploadPath = path.join(process.cwd(), 'uploads', tenantId);
    
    // Create tenant-specific directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError('File type not allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Upload single file
router.post('/single', authenticateToken, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { relatedEntityType, relatedEntityId, isPublic = false } = req.body;
    const { id: userId } = req.user;
    const tenantPool = req.tenantPool;

    // Save file metadata to database
    const result = await tenantPool.query(
      `INSERT INTO file_uploads (filename, original_name, file_path, file_size, mime_type, uploaded_by, related_entity_type, related_entity_id, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.file.filename,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        userId,
        relatedEntityType,
        relatedEntityId,
        isPublic
      ]
    );

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: result.rows[0].id,
        filename: result.rows[0].filename,
        originalName: result.rows[0].original_name,
        fileSize: result.rows[0].file_size,
        mimeType: result.rows[0].mime_type,
        isPublic: result.rows[0].is_public,
        uploadedAt: result.rows[0].created_at
      }
    });
  } catch (error) {
    // Clean up uploaded file if database operation fails
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    next(error);
  }
});

// Upload multiple files
router.post('/multiple', authenticateToken, upload.array('files', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const { relatedEntityType, relatedEntityId, isPublic = false } = req.body;
    const { id: userId } = req.user;
    const tenantPool = req.tenantPool;

    const uploadedFiles = [];

    for (const file of req.files) {
      try {
        const result = await tenantPool.query(
          `INSERT INTO file_uploads (filename, original_name, file_path, file_size, mime_type, uploaded_by, related_entity_type, related_entity_id, is_public)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            file.filename,
            file.originalname,
            file.path,
            file.size,
            file.mimetype,
            userId,
            relatedEntityType,
            relatedEntityId,
            isPublic
          ]
        );

        uploadedFiles.push({
          id: result.rows[0].id,
          filename: result.rows[0].filename,
          originalName: result.rows[0].original_name,
          fileSize: result.rows[0].file_size,
          mimeType: result.rows[0].mime_type,
          isPublic: result.rows[0].is_public,
          uploadedAt: result.rows[0].created_at
        });
      } catch (error) {
        // Clean up file if database operation fails
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
        throw error;
      }
    }

    res.status(201).json({
      message: 'Files uploaded successfully',
      files: uploadedFiles,
      count: uploadedFiles.length
    });
  } catch (error) {
    // Clean up all uploaded files if any operation fails
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }
    next(error);
  }
});

// Get files for entity
router.get('/entity/:entityType/:entityId', authenticateToken, async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    let query, params;

    if (role === 'student') {
      // Students can only see public files or files they uploaded
      query = `
        SELECT f.*, u.name as uploaded_by_name
        FROM file_uploads f
        LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE f.related_entity_type = $1 AND f.related_entity_id = $2 
        AND (f.is_public = true OR f.uploaded_by = $3)
        ORDER BY f.created_at DESC
      `;
      params = [entityType, entityId, userId];
    } else {
      // Teachers and admins can see all files
      query = `
        SELECT f.*, u.name as uploaded_by_name
        FROM file_uploads f
        LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE f.related_entity_type = $1 AND f.related_entity_id = $2
        ORDER BY f.created_at DESC
      `;
      params = [entityType, entityId];
    }

    const result = await tenantPool.query(query, params);

    res.json({
      files: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get file by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    let query, params;

    if (role === 'student') {
      // Students can only see public files or files they uploaded
      query = `
        SELECT f.*, u.name as uploaded_by_name
        FROM file_uploads f
        LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE f.id = $1 AND (f.is_public = true OR f.uploaded_by = $2)
      `;
      params = [id, userId];
    } else {
      // Teachers and admins can see all files
      query = `
        SELECT f.*, u.name as uploaded_by_name
        FROM file_uploads f
        LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE f.id = $1
      `;
      params = [id];
    }

    const result = await tenantPool.query(query, params);

    if (result.rows.length === 0) {
      throw new NotFoundError('File not found');
    }

    res.json({
      file: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Download file
router.get('/:id/download', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    let query, params;

    if (role === 'student') {
      // Students can only download public files or files they uploaded
      query = 'SELECT * FROM file_uploads WHERE id = $1 AND (is_public = true OR uploaded_by = $2)';
      params = [id, userId];
    } else {
      // Teachers and admins can download all files
      query = 'SELECT * FROM file_uploads WHERE id = $1';
      params = [id];
    }

    const result = await tenantPool.query(query, params);

    if (result.rows.length === 0) {
      throw new NotFoundError('File not found');
    }

    const file = result.rows[0];
    const filePath = file.file_path;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('File not found on disk');
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Length', file.file_size);

    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      res.status(500).json({ message: 'Error downloading file' });
    });
  } catch (error) {
    next(error);
  }
});

// Delete file
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    // Check if file exists and user has permission to delete
    let query, params;
    if (role === 'student') {
      // Students can only delete files they uploaded
      query = 'SELECT * FROM file_uploads WHERE id = $1 AND uploaded_by = $2';
      params = [id, userId];
    } else {
      // Teachers and admins can delete any file
      query = 'SELECT * FROM file_uploads WHERE id = $1';
      params = [id];
    }

    const result = await tenantPool.query(query, params);

    if (result.rows.length === 0) {
      throw new NotFoundError('File not found or access denied');
    }

    const file = result.rows[0];

    // Delete file from disk
    if (fs.existsSync(file.file_path)) {
      fs.unlink(file.file_path, (err) => {
        if (err) console.error('Error deleting file from disk:', err);
      });
    }

    // Delete file record from database
    await tenantPool.query('DELETE FROM file_uploads WHERE id = $1', [id]);

    res.json({
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Update file metadata
router.put('/:id', [
  body('isPublic').optional().isBoolean().withMessage('Public status must be boolean')
], authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    // Check if file exists and user has permission to update
    let query, params;
    if (role === 'student') {
      // Students can only update files they uploaded
      query = 'SELECT id FROM file_uploads WHERE id = $1 AND uploaded_by = $2';
      params = [id, userId];
    } else {
      // Teachers and admins can update any file
      query = 'SELECT id FROM file_uploads WHERE id = $1';
      params = [id];
    }

    const result = await tenantPool.query(query, params);

    if (result.rows.length === 0) {
      throw new NotFoundError('File not found or access denied');
    }

    // Update file metadata
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (isPublic !== undefined) {
      updateFields.push(`is_public = $${paramCount}`);
      values.push(isPublic);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);

    const updateResult = await tenantPool.query(
      `UPDATE file_uploads SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      message: 'File updated successfully',
      file: updateResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get upload statistics
router.get('/stats', authenticateToken, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const tenantPool = req.tenantPool;

    const statsResult = await tenantPool.query(
      `SELECT 
         COUNT(*) as total_files,
         SUM(file_size) as total_size,
         COUNT(CASE WHEN is_public = true THEN 1 END) as public_files,
         COUNT(CASE WHEN mime_type LIKE 'image/%' THEN 1 END) as image_files,
         COUNT(CASE WHEN mime_type LIKE 'application/pdf' THEN 1 END) as pdf_files,
         COUNT(CASE WHEN mime_type LIKE 'video/%' THEN 1 END) as video_files,
         COUNT(CASE WHEN mime_type LIKE 'audio/%' THEN 1 END) as audio_files
       FROM file_uploads`
    );

    const typeStatsResult = await tenantPool.query(
      `SELECT 
         related_entity_type,
         COUNT(*) as count,
         SUM(file_size) as total_size
       FROM file_uploads 
       GROUP BY related_entity_type
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




