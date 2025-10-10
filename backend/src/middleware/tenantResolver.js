import jwt from 'jsonwebtoken';
import { getTenantPool } from '../config/database.js';

// Extract tenant information from JWT token or subdomain
export const tenantResolver = async (req, res, next) => {
  try {
    let tenantId = null;

    // Method 1: Extract from subdomain (e.g., collegeA.lms.com)
    const host = req.get('host');
    if (host && host.includes('.')) {
      const subdomain = host.split('.')[0];
      if (subdomain !== 'www' && subdomain !== 'api') {
        tenantId = subdomain;
      }
    }

    // Method 2: Extract from JWT token
    if (!tenantId) {
      const authHeader = req.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          tenantId = decoded.tenantId;
        } catch (jwtError) {
          // Token might be invalid, but we'll let auth middleware handle it
          console.log('JWT verification failed in tenant resolver:', jwtError.message);
        }
      }
    }

    // Method 3: Extract from request headers (for API testing)
    if (!tenantId) {
      tenantId = req.get('X-Tenant-ID');
    }

    if (!tenantId) {
      return res.status(400).json({ 
        message: 'Tenant identification required. Provide tenant via subdomain, JWT token, or X-Tenant-ID header.' 
      });
    }

    // Get tenant-specific database connection
    const tenantPool = await getTenantPool(tenantId);
    
    // Attach tenant info to request
    req.tenantId = tenantId;
    req.tenantPool = tenantPool;

    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    res.status(500).json({ 
      message: 'Failed to resolve tenant', 
      error: error.message 
    });
  }
};

// Middleware to validate tenant access
export const validateTenantAccess = (req, res, next) => {
  const userTenantId = req.user?.tenantId;
  const requestTenantId = req.tenantId;

  if (userTenantId && userTenantId !== requestTenantId) {
    return res.status(403).json({ 
      message: 'Access denied: User does not belong to this tenant' 
    });
  }

  next();
};




