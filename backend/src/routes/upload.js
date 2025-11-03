import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { body } from 'express-validator';

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
  // Define allowed video MIME types
  const allowedTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo', // avi
    'video/x-matroska', // mkv
    'video/x-ms-wmv', // wmv
    'video/mpeg',
    'video/3gpp',
    'video/3gpp2'
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

// Stream lecture video
router.get('/lecture/:id', authenticateToken, async (req, res, next) => {
  console.log('=== New Video Stream Request ===');
  console.log('Request URL:', req.originalUrl);
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('User:', req.user);
  
  try {
    console.log('Stream lecture request received:', req.params.id);
    const { id } = req.params;
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    // Get lecture details including the video path
    const result = await tenantPool.query(
      'SELECT id, video_path, title FROM lectures WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      console.error('Lecture not found:', id);
      throw new NotFoundError('Lecture not found');
    }

    const lecture = result.rows[0];
    console.log('Found lecture:', { id: lecture.id, title: lecture.title });
    
    // Clean up the video path (remove any leading slashes or dots)
    const cleanPath = lecture.video_path.replace(/^[./]+/, '');
    const videoPath = path.join(__dirname, '../../', cleanPath);
    
    console.log('Looking for video at path:', videoPath);
    
    // Check if file exists and is accessible
    try {
      const stats = fs.statSync(videoPath);
      console.log('Video file found. Size:', stats.size, 'bytes');
      console.log('File permissions:', {
        readable: fs.constants.R_OK ? 'readable' : 'not readable',
        writable: fs.constants.W_OK ? 'writable' : 'not writable',
        executable: fs.constants.X_OK ? 'executable' : 'not executable'
      });
      
      // Try to open the file to check read permissions
      const fd = fs.openSync(videoPath, 'r');
      fs.closeSync(fd);
      
      console.log('Successfully opened video file for reading');
    } catch (err) {
      console.error('Error accessing video file:', err);
      if (err.code === 'ENOENT') {
        console.error('File does not exist at path:', videoPath);
      } else if (err.code === 'EACCES') {
        console.error('Permission denied when trying to access file');
      } else if (err.code === 'EBUSY') {
        console.error('File is busy or locked by another process');
      }
      console.log('Current working directory:', process.cwd());
      console.log('__dirname:', __dirname);
      console.log('Attempted full path:', videoPath);
      
      // List directory contents to help debug
      const dir = path.dirname(videoPath);
      try {
        console.log('Directory contents:', fs.readdirSync(dir));
      } catch (dirErr) {
        console.error('Error reading directory:', dir, dirErr);
      }
      
      throw new NotFoundError('Video file not accessible: ' + (err.message || 'Unknown error'));
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Log request details
    console.log('Range header:', range);
    console.log('Video path:', videoPath);
    console.log('File size:', fileSize, 'bytes');
    
    // Handle range requests for video streaming
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      
      const file = fs.createReadStream(videoPath, { start, end });
      
      const headers = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff'
      };
      
      console.log('Sending 206 Partial Content with headers:', headers);
      res.writeHead(206, headers);
      
      file.pipe(res);
    } else {
      // If no range header, send the first chunk
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff'
      };
      
      console.log('Sending 200 OK with headers:', head);
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
});

// Serve file with support for video streaming
router.get('/:id/stream', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    const tenantPool = req.tenantPool;

    let query, params;

    if (role === 'student') {
      // Students can only access public files or files they uploaded
      query = 'SELECT * FROM file_uploads WHERE id = $1 AND (is_public = true OR uploaded_by = $2)';
      params = [id, userId];
    } else {
      // Teachers and admins can access all files
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

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Set appropriate content type
    const mimeType = file.mime_type || 'application/octet-stream';
    
    if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
      // Handle video/audio streaming with range requests
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;
        
        const fileStream = fs.createReadStream(filePath, { start, end });
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': mimeType,
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        
        fileStream.pipe(res);
      } else {
        // If no range header, send the first chunk
        const head = {
          'Content-Length': fileSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        };
        
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
      }
    } else {
      // For non-media files, use standard download
      res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', fileSize);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error streaming file' });
        }
      });
    }
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




