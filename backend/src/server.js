import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import tenantRoutes from './routes/tenant.js';
import courseRoutes from './routes/courses.js';
import assignmentRoutes from './routes/assignments.js';
import quizRoutes from './routes/quizzes.js';
import gradeRoutes from './routes/grades.js';
import notificationRoutes from './routes/notifications.js';
import userRoutes from './routes/users.js';
import uploadRoutes from './routes/upload.js';
import dashboardRoutes from './routes/dashboard.js';
import userManagementRoutes from './routes/userManagement.js';
import lectureRoutes from './routes/lectures.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { tenantResolver } from './middleware/tenantResolver.js';

// Load environment variables (override any pre-set env like system PORT)
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env'), override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Avoid binding to DB_PORT (e.g., 5432) if PORT is accidentally set to it
const resolvedPort = (process.env.PORT && process.env.PORT !== process.env.DB_PORT)
  ? process.env.PORT
  : '3000';
const PORT = resolvedPort;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration with allowlist support
const defaultOrigins = ['http://localhost:5173', 'http://localhost:8080'];
const envOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
const allowlist = new Set([...defaultOrigins, ...envOrigins]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser or same-origin
    if (allowlist.has(origin)) return callback(null, true);
    // allow 127.0.0.1 with any port and localhost with any port
    if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return callback(null, true);
    if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/courses', tenantResolver, courseRoutes);
app.use('/api/assignments', tenantResolver, assignmentRoutes);
app.use('/api/quizzes', tenantResolver, quizRoutes);
app.use('/api/grades', tenantResolver, gradeRoutes);
app.use('/api/notifications', tenantResolver, notificationRoutes);
app.use('/api/users', tenantResolver, userRoutes);
app.use('/api/upload', tenantResolver, uploadRoutes);
app.use('/api/dashboard', tenantResolver, dashboardRoutes);
app.use('/api/admin', tenantResolver, userManagementRoutes);
app.use('/api', tenantResolver, lectureRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LMS Backend server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;




