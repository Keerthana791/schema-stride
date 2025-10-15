import { getMainPool } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create main database schema (tenant mapping)
const createMainSchema = async () => {
  const mainPool = getMainPool();
  
  try {
    // Ensure pgcrypto extension is available for gen_random_uuid()
    await mainPool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    // Create tenant mapping table
    await mainPool.query(`
      CREATE TABLE IF NOT EXISTS tenant_mapping (
        tenant_id VARCHAR(50) PRIMARY KEY,
        schema_name VARCHAR(100) NOT NULL UNIQUE,
        institution_name VARCHAR(200) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create users table in main database
    await mainPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(200) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
        tenant_id VARCHAR(50) NOT NULL REFERENCES tenant_mapping(tenant_id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create refresh tokens table
    await mainPool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Main database schema created successfully');
  } catch (error) {
    console.error('❌ Error creating main schema:', error);
    throw error;
  }
};

// Create tenant-specific schema
const createTenantSchema = async (tenantId, schemaName) => {
  const mainPool = getMainPool();
  
  try {
    // Create schema
    await mainPool.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    
    // Create tables in tenant schema
    const schemaSQL = `
      -- Roles table (tenant-specific roles)
      CREATE TABLE IF NOT EXISTS ${schemaName}.roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        permissions JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- User roles table (many-to-many between users and roles)
      CREATE TABLE IF NOT EXISTS ${schemaName}.user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        role_id UUID NOT NULL REFERENCES ${schemaName}.roles(id) ON DELETE CASCADE,
        assigned_by UUID,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        UNIQUE(user_id, role_id)
      );

      -- Students table
      CREATE TABLE IF NOT EXISTS ${schemaName}.students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        student_id VARCHAR(50) UNIQUE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        date_of_birth DATE,
        address TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Teachers table
      CREATE TABLE IF NOT EXISTS ${schemaName}.teachers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        teacher_id VARCHAR(50) UNIQUE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        department VARCHAR(100),
        specialization VARCHAR(200),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Branches table
      CREATE TABLE IF NOT EXISTS ${schemaName}.branches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_branch_name UNIQUE (name)
      );

      -- Courses table
      CREATE TABLE IF NOT EXISTS ${schemaName}.courses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_code VARCHAR(20) NOT NULL UNIQUE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        teacher_id UUID NOT NULL REFERENCES ${schemaName}.teachers(id),
        branch_id UUID NOT NULL REFERENCES ${schemaName}.branches(id),
        credits INTEGER DEFAULT 3,
        semester VARCHAR(20),
        academic_year VARCHAR(10),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Enrollments table
      CREATE TABLE IF NOT EXISTS ${schemaName}.enrollments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES ${schemaName}.students(id),
        course_id UUID NOT NULL REFERENCES ${schemaName}.courses(id),
        enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
        grade VARCHAR(5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, course_id)
      );

      -- Assignments table
      CREATE TABLE IF NOT EXISTS ${schemaName}.assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES ${schemaName}.courses(id),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        due_date TIMESTAMP,
        max_points INTEGER DEFAULT 100,
        assignment_type VARCHAR(50) DEFAULT 'homework',
        instructions TEXT,
        attachments JSONB,
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Assignment submissions table
      CREATE TABLE IF NOT EXISTS ${schemaName}.assignment_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assignment_id UUID NOT NULL REFERENCES ${schemaName}.assignments(id),
        student_id UUID NOT NULL REFERENCES ${schemaName}.students(id),
        submission_text TEXT,
        attachments JSONB,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        grade DECIMAL(5,2),
        feedback TEXT,
        is_late BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(assignment_id, student_id)
      );

      -- Quizzes table
      CREATE TABLE IF NOT EXISTS ${schemaName}.quizzes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES ${schemaName}.courses(id),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        time_limit INTEGER DEFAULT 60, -- in minutes
        max_attempts INTEGER DEFAULT 1,
        max_points INTEGER DEFAULT 100,
        questions JSONB NOT NULL,
        is_published BOOLEAN DEFAULT false,
        available_from TIMESTAMP,
        available_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Quiz submissions table
      CREATE TABLE IF NOT EXISTS ${schemaName}.quiz_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id UUID NOT NULL REFERENCES ${schemaName}.quizzes(id),
        student_id UUID NOT NULL REFERENCES ${schemaName}.students(id),
        answers JSONB NOT NULL,
        score DECIMAL(5,2),
        time_taken INTEGER, -- in minutes
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        attempt_number INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(quiz_id, student_id, attempt_number)
      );

      -- Grades table
      CREATE TABLE IF NOT EXISTS ${schemaName}.grades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES ${schemaName}.students(id),
        course_id UUID NOT NULL REFERENCES ${schemaName}.courses(id),
        assignment_id UUID REFERENCES ${schemaName}.assignments(id),
        quiz_id UUID REFERENCES ${schemaName}.quizzes(id),
        grade DECIMAL(5,2) NOT NULL,
        max_points INTEGER DEFAULT 100,
        grade_type VARCHAR(50) NOT NULL, -- 'assignment', 'quiz', 'final', 'participation'
        feedback TEXT,
        graded_by UUID REFERENCES ${schemaName}.teachers(id),
        graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Notifications table
      CREATE TABLE IF NOT EXISTS ${schemaName}.notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info', -- 'info', 'warning', 'success', 'error'
        is_read BOOLEAN DEFAULT false,
        related_entity_type VARCHAR(50), -- 'course', 'assignment', 'quiz', 'grade'
        related_entity_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- File uploads table
      CREATE TABLE IF NOT EXISTS ${schemaName}.file_uploads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        uploaded_by UUID NOT NULL,
        related_entity_type VARCHAR(50), -- 'course', 'assignment', 'quiz', 'submission'
        related_entity_id UUID,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_roles_name ON ${schemaName}.roles(name);
      CREATE INDEX IF NOT EXISTS idx_user_roles_user ON ${schemaName}.user_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_role ON ${schemaName}.user_roles(role_id);
      CREATE INDEX IF NOT EXISTS idx_students_email ON ${schemaName}.students(email);
      CREATE INDEX IF NOT EXISTS idx_teachers_email ON ${schemaName}.teachers(email);
      CREATE INDEX IF NOT EXISTS idx_courses_teacher ON ${schemaName}.courses(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_courses_branch ON ${schemaName}.courses(branch_id);
      CREATE INDEX IF NOT EXISTS idx_enrollments_student ON ${schemaName}.enrollments(student_id);
      CREATE INDEX IF NOT EXISTS idx_enrollments_course ON ${schemaName}.enrollments(course_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_course ON ${schemaName}.assignments(course_id);
      CREATE INDEX IF NOT EXISTS idx_quizzes_course ON ${schemaName}.quizzes(course_id);
      CREATE INDEX IF NOT EXISTS idx_grades_student ON ${schemaName}.grades(student_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON ${schemaName}.notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_file_uploads_related ON ${schemaName}.file_uploads(related_entity_type, related_entity_id);
    `;

    await mainPool.query(schemaSQL);
    
    // Seed default roles
    await seedDefaultRoles(schemaName);
    
    console.log(`✅ Tenant schema '${schemaName}' created successfully`);
  } catch (error) {
    console.error(`❌ Error creating tenant schema '${schemaName}':`, error);
    throw error;
  }
};

// Seed default roles for a tenant
const seedDefaultRoles = async (schemaName) => {
  const mainPool = getMainPool();
  
  try {
    // Define default roles with permissions
    const defaultRoles = [
      {
        name: 'ADMIN',
        description: 'Full system administration access',
        permissions: [
          'users:create', 'users:read', 'users:update', 'users:delete',
          'courses:create', 'courses:read', 'courses:update', 'courses:delete',
          'assignments:create', 'assignments:read', 'assignments:update', 'assignments:delete',
          'quizzes:create', 'quizzes:read', 'quizzes:update', 'quizzes:delete',
          'grades:create', 'grades:read', 'grades:update', 'grades:delete',
          'notifications:create', 'notifications:read', 'notifications:update', 'notifications:delete',
          'files:create', 'files:read', 'files:update', 'files:delete',
          'system:admin'
        ]
      },
      {
        name: 'TEACHER',
        description: 'Course and content management access',
        permissions: [
          'courses:create', 'courses:read', 'courses:update',
          'assignments:create', 'assignments:read', 'assignments:update', 'assignments:delete',
          'quizzes:create', 'quizzes:read', 'quizzes:update', 'quizzes:delete',
          'grades:create', 'grades:read', 'grades:update',
          'notifications:create', 'notifications:read',
          'files:create', 'files:read', 'files:update', 'files:delete',
          'students:read'
        ]
      },
      {
        name: 'STUDENT',
        description: 'Basic student access to courses and assignments',
        permissions: [
          'courses:read',
          'assignments:read', 'assignments:submit',
          'quizzes:read', 'quizzes:submit',
          'grades:read',
          'notifications:read',
          'files:read'
        ]
      }
    ];

    // Insert default roles
    for (const role of defaultRoles) {
      await mainPool.query(
        `INSERT INTO ${schemaName}.roles (name, description, permissions) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (name) DO NOTHING`,
        [role.name, role.description, JSON.stringify(role.permissions)]
      );
    }

    console.log(`✅ Default roles seeded for schema '${schemaName}'`);
  } catch (error) {
    console.error(`❌ Error seeding roles for schema '${schemaName}':`, error);
    throw error;
  }
};

// Create a new tenant
export const createTenant = async (tenantId, institutionName) => {
  const schemaName = `${tenantId}_schema`;
  
  try {
    // Create tenant mapping entry
    const mainPool = getMainPool();
    await mainPool.query(
      'INSERT INTO tenant_mapping (tenant_id, schema_name, institution_name) VALUES ($1, $2, $3)',
      [tenantId, schemaName, institutionName]
    );

    // Create tenant schema
    await createTenantSchema(tenantId, schemaName);

    console.log(`✅ Tenant '${tenantId}' created successfully`);
    return { tenantId, schemaName };
  } catch (error) {
    console.error(`❌ Error creating tenant '${tenantId}':`, error);
    throw error;
  }
};

// Initialize database
export const initializeDatabase = async () => {
  try {
    await createMainSchema();
    console.log('✅ Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => {
      console.log('Database setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}




