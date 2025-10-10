import jwt from 'jsonwebtoken';
import { getMainPool } from '../config/database.js';

// JWT Authentication middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user details from database
    const mainPool = getMainPool();
    const userResult = await mainPool.query(
      'SELECT u.*, tm.schema_name FROM users u JOIN tenant_mapping tm ON u.tenant_id = tm.tenant_id WHERE u.id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    
    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id,
      schemaName: user.schema_name
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
};

// Role-based authorization middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required roles: ${roles.join(', ')}` 
      });
    }

    next();
  };
};

// Check if user can access resource (owner or admin/teacher)
export const canAccessResource = (resourceUserIdField = 'user_id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Admin and teachers can access all resources
    if (['admin', 'teacher'].includes(req.user.role)) {
      return next();
    }

    // Students can only access their own resources
    if (req.user.role === 'student') {
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      if (resourceUserId && resourceUserId !== req.user.id) {
        return res.status(403).json({ 
          message: 'Access denied: You can only access your own resources' 
        });
      }
    }

    next();
  };
};




