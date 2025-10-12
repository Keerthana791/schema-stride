import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { getMainPool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { ValidationError, UnauthorizedError } from '../middleware/errorHandler.js';

const router = express.Router();

// Register new tenant and admin
router.post('/register-tenant', [
  body('tenantId').isLength({ min: 3, max: 50 }).withMessage('Tenant ID must be 3-50 characters'),
  body('institutionName').isLength({ min: 3, max: 200 }).withMessage('Institution name must be 3-200 characters'),
  body('adminEmail').isEmail().withMessage('Valid email required'),
  body('adminPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('adminName').isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { tenantId, institutionName, adminEmail, adminPassword, adminName } = req.body;
    const mainPool = getMainPool();

    // Check if tenant already exists
    const existingTenant = await mainPool.query(
      'SELECT tenant_id FROM tenant_mapping WHERE tenant_id = $1',
      [tenantId]
    );

    if (existingTenant.rows.length > 0) {
      return res.status(409).json({ message: 'Tenant already exists' });
    }

    // Check if email already exists
    const existingUser = await mainPool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Create tenant schema
    const { createTenant } = await import('../scripts/createSchemas.js');
    await createTenant(tenantId, institutionName);

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Create admin user
    const userResult = await mainPool.query(
      'INSERT INTO users (email, password_hash, name, role, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, tenant_id',
      [adminEmail, passwordHash, adminName, 'admin', tenantId]
    );

    const user = userResult.rows[0];

    // Assign ADMIN role to the admin user
    const { getTenantPool } = await import('../config/database.js');
    const tenantPool = await getTenantPool(tenantId);
    
    // Get ADMIN role ID and assign it to the user
    const adminRoleResult = await tenantPool.query(
      'SELECT id FROM roles WHERE name = $1',
      ['ADMIN']
    );
    
    if (adminRoleResult.rows.length > 0) {
      await tenantPool.query(
        'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $1)',
        [user.id, adminRoleResult.rows[0].id]
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role, 
        tenantId: user.tenant_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      message: 'Tenant and admin created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenant_id
      },
      accessToken: token
    });
  } catch (error) {
    next(error);
  }
});

// Public registration for students/teachers with tenant ID
router.post('/register', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('role').isIn(['teacher', 'student']).withMessage('Role must be teacher or student'),
  body('tenantId').isLength({ min: 3, max: 50 }).withMessage('Tenant ID must be 3-50 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { email, password, name, role, tenantId } = req.body;
    const mainPool = getMainPool();

    // Verify tenant exists
    const tenantResult = await mainPool.query(
      'SELECT tenant_id FROM tenant_mapping WHERE tenant_id = $1',
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid institution code' });
    }

    // Check if email already exists
    const existingUser = await mainPool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userResult = await mainPool.query(
      'INSERT INTO users (email, password_hash, name, role, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, tenant_id',
      [email, passwordHash, name, role, tenantId]
    );

    const user = userResult.rows[0];

    // Create user profile in tenant schema and assign role
    const { getTenantPool } = await import('../config/database.js');
    const tenantPool = await getTenantPool(tenantId);
    
    if (role === 'student') {
      await tenantPool.query(
        'INSERT INTO students (user_id, first_name, last_name, email) VALUES ($1, $2, $3, $4)',
        [user.id, name.split(' ')[0], name.split(' ').slice(1).join(' ') || '', email]
      );
    } else if (role === 'teacher') {
      await tenantPool.query(
        'INSERT INTO teachers (user_id, first_name, last_name, email) VALUES ($1, $2, $3, $4)',
        [user.id, name.split(' ')[0], name.split(' ').slice(1).join(' ') || '', email]
      );
    }

    // Assign appropriate role to the user
    const roleName = role.toUpperCase();
    const roleResult = await tenantPool.query(
      'SELECT id FROM roles WHERE name = $1',
      [roleName]
    );
    
    if (roleResult.rows.length > 0) {
      await tenantPool.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [user.id, roleResult.rows[0].id]
      );
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenant_id
      }
    });
  } catch (error) {
    next(error);
  }
});

// Register user within tenant (admin/teacher only)
router.post('/register-user', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('role').isIn(['teacher', 'student']).withMessage('Role must be teacher or student')
], authenticateToken, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { email, password, name, role } = req.body;
    const { tenantId } = req.user;
    const mainPool = getMainPool();

    // Check if email already exists
    const existingUser = await mainPool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userResult = await mainPool.query(
      'INSERT INTO users (email, password_hash, name, role, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, tenant_id',
      [email, passwordHash, name, role, tenantId]
    );

    const user = userResult.rows[0];

    // Create user profile in tenant schema
    const tenantPool = req.tenantPool;
    if (role === 'student') {
      await tenantPool.query(
        'INSERT INTO students (user_id, first_name, last_name, email) VALUES ($1, $2, $3, $4)',
        [user.id, name.split(' ')[0], name.split(' ').slice(1).join(' ') || '', email]
      );
    } else if (role === 'teacher') {
      await tenantPool.query(
        'INSERT INTO teachers (user_id, first_name, last_name, email) VALUES ($1, $2, $3, $4)',
        [user.id, name.split(' ')[0], name.split(' ').slice(1).join(' ') || '', email]
      );
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenant_id
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array()[0].msg);
    }

    const { email, password } = req.body;
    const mainPool = getMainPool();

    // Find user
    const userResult = await mainPool.query(
      'SELECT u.*, tm.schema_name FROM users u JOIN tenant_mapping tm ON u.tenant_id = tm.tenant_id WHERE u.email = $1 AND u.is_active = true',
      [email]
    );

    if (userResult.rows.length === 0) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role, 
        tenantId: user.tenant_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    // Store refresh token
    await mainPool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenant_id
      },
      accessToken: token,
      refreshToken: refreshToken
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token required')
], async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const mainPool = getMainPool();

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Check if refresh token exists in database
    const tokenResult = await mainPool.query(
      'SELECT rt.*, u.* FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.token = $1 AND rt.expires_at > NOW()',
      [refreshToken]
    );

    if (tokenResult.rows.length === 0) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = tokenResult.rows[0];

    // Generate new access token
    const newToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role, 
        tenantId: user.tenant_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      accessToken: newToken
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const mainPool = getMainPool();

    // Remove all refresh tokens for user
    await mainPool.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [userId]
    );

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: req.user
  });
});

// Get available tenants for registration
router.get('/tenants', async (req, res, next) => {
  try {
    const mainPool = getMainPool();
    const result = await mainPool.query(
      'SELECT tenant_id, institution_name FROM tenant_mapping ORDER BY institution_name'
    );
    
    res.json({
      tenants: result.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;
