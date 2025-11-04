import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { uploadToS3, streamFileFromS3, deleteFromS3 } from '../utils/s3Client.js';

const router = express.Router();

// Configure multer for memory storage (file will be in memory before uploading to S3)
const storage = multer.memoryStorage();

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
    fileSize: 1024 * 1024 * 500, // 500MB limit
  }
});

// Upload lecture video
router.post('/lecture', [
  authenticateToken,
  authorize(['admin', 'instructor']),
  upload.single('video')
], async (req, res, next) => {
  if (!req.file) {
    return next(new ValidationError('No file uploaded'));
  }
  try {
    // Upload video to S3
    const s3Key = `lectures/${uuidv4()}`;
    const videoUrl = await uploadToS3(req.file, s3Key);
    // Save video metadata to database
    const { id: userId } = req.user;
    const tenantPool = req.tenantPool;
    const result = await tenantPool.query(
      `INSERT INTO lectures (video_url, uploaded_by)
       VALUES ($1, $2)
       RETURNING *`,
      [
        videoUrl,
        userId
      ]
    );
    res.status(201).json({
      message: 'Lecture video uploaded successfully',
      video: {
        id: result.rows[0].id,
        videoUrl: result.rows[0].video_url,
        uploadedAt: result.rows[0].created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get lecture video
router.get('/lecture/:id', authenticateToken, async (req, res, next) => {
  const requestId = Date.now();
  console.log(`\n=== New Video Stream Request [${requestId}] ===`);
  console.log(`[${requestId}] Request URL:`, req.originalUrl);
  console.log(`[${requestId}] Method:`, req.method);
  
  const range = req.headers.range;
  
  try {
    // Remove .mp4 extension if present in the ID
    const lectureId = req.params.id.replace(/\.mp4$/i, '');
    console.log(`[${requestId}] Cleaned lecture ID:`, lectureId);
    
    // Construct the S3 key based on your storage structure
    const s3Key = `lectures/${lectureId}`;
    
    // Stream the file directly from S3
    await streamFileFromS3(s3Key, range, res);
    
  } catch (error) {
    console.error(`[${requestId}] Error in video streaming:`, error);
    if (error.name === 'NoSuchKey') {
      return next(new NotFoundError('Lecture video not found'));
    }
    next(error);
  }
});

// Delete lecture video
router.delete('/lecture/:id', authenticateToken, authorize(['admin', 'instructor']), async (req, res, next) => {
  try {
    const lectureId = req.params.id;
    const s3Key = `lectures/${lectureId}`;
    
    // Delete from S3
    await deleteFromS3(s3Key);
    
    // Delete from database if needed
    const tenantPool = req.tenantPool;
    await tenantPool.query('DELETE FROM lectures WHERE id = $1', [lectureId]);
    
    res.status(200).json({
      success: true,
      message: 'Lecture video deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting lecture video:', error);
    next(error);
  }
});

export default router;



