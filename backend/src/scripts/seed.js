import bcrypt from 'bcryptjs';
import { getMainPool, getTenantPool } from '../config/database.js';

// Seed sample data for testing
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    const mainPool = getMainPool();
    
    // Create sample admin users for each tenant
    const tenants = ['collegeA', 'collegeB'];
    
    for (const tenantId of tenants) {
      console.log(`📝 Seeding data for ${tenantId}...`);
      
      // Get tenant schema name
      const tenantResult = await mainPool.query(
        'SELECT schema_name FROM tenant_mapping WHERE tenant_id = $1',
        [tenantId]
      );
      
      if (tenantResult.rows.length === 0) {
        console.log(`⚠️  Tenant ${tenantId} not found, skipping...`);
        continue;
      }
      
      const schemaName = tenantResult.rows[0].schema_name;
      const tenantPool = await getTenantPool(tenantId);
      
      // Create sample admin user
      const adminPassword = await bcrypt.hash('admin123', 12);
      const adminResult = await mainPool.query(
        'INSERT INTO users (email, password_hash, name, role, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [`admin@${tenantId}.com`, adminPassword, `${tenantId} Admin`, 'admin', tenantId]
      );
      
      const adminId = adminResult.rows[0].id;
      
      // Create sample teachers
      const teacherPassword = await bcrypt.hash('teacher123', 12);
      const teachers = [
        { name: 'Dr. Smith', email: `smith@${tenantId}.com` },
        { name: 'Prof. Johnson', email: `johnson@${tenantId}.com` },
        { name: 'Dr. Brown', email: `brown@${tenantId}.com` }
      ];
      
      const teacherIds = [];
      for (const teacher of teachers) {
        const userResult = await mainPool.query(
          'INSERT INTO users (email, password_hash, name, role, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [teacher.email, teacherPassword, teacher.name, 'teacher', tenantId]
        );
        
        const userId = userResult.rows[0].id;
        
        // Create teacher profile
        const teacherProfile = await tenantPool.query(
          `INSERT INTO teachers (user_id, first_name, last_name, email, department, specialization) 
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [userId, teacher.name.split(' ')[0], teacher.name.split(' ')[1], teacher.email, 'Computer Science', 'Software Engineering']
        );
        
        teacherIds.push(teacherProfile.rows[0].id);
      }
      
      // Create sample students
      const studentPassword = await bcrypt.hash('student123', 12);
      const students = [
        { name: 'Alice Johnson', email: `alice@${tenantId}.com`, studentId: `${tenantId.toUpperCase()}001` },
        { name: 'Bob Smith', email: `bob@${tenantId}.com`, studentId: `${tenantId.toUpperCase()}002` },
        { name: 'Carol Davis', email: `carol@${tenantId}.com`, studentId: `${tenantId.toUpperCase()}003` },
        { name: 'David Wilson', email: `david@${tenantId}.com`, studentId: `${tenantId.toUpperCase()}004` },
        { name: 'Eve Brown', email: `eve@${tenantId}.com`, studentId: `${tenantId.toUpperCase()}005` }
      ];
      
      const studentIds = [];
      for (const student of students) {
        const userResult = await mainPool.query(
          'INSERT INTO users (email, password_hash, name, role, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [student.email, studentPassword, student.name, 'student', tenantId]
        );
        
        const userId = userResult.rows[0].id;
        
        // Create student profile
        const studentProfile = await tenantPool.query(
          `INSERT INTO students (user_id, first_name, last_name, email, student_id) 
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [userId, student.name.split(' ')[0], student.name.split(' ')[1], student.email, student.studentId]
        );
        
        studentIds.push(studentProfile.rows[0].id);
      }
      
      // Create sample courses
      const courses = [
        { code: 'CS101', title: 'Introduction to Programming', credits: 3, teacherIndex: 0 },
        { code: 'CS201', title: 'Data Structures', credits: 4, teacherIndex: 1 },
        { code: 'CS301', title: 'Database Systems', credits: 3, teacherIndex: 2 },
        { code: 'MATH101', title: 'Calculus I', credits: 4, teacherIndex: 0 },
        { code: 'ENG101', title: 'English Composition', credits: 3, teacherIndex: 1 }
      ];
      
      const courseIds = [];
      for (const course of courses) {
        const courseResult = await tenantPool.query(
          `INSERT INTO courses (course_code, title, teacher_id, credits, semester, academic_year) 
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [course.code, course.title, teacherIds[course.teacherIndex], course.credits, 'Fall 2024', '2024-2025']
        );
        
        courseIds.push(courseResult.rows[0].id);
      }
      
      // Create sample enrollments
      for (let i = 0; i < studentIds.length; i++) {
        const studentId = studentIds[i];
        // Enroll each student in 2-3 courses
        const coursesToEnroll = courseIds.slice(0, Math.min(3, courseIds.length));
        
        for (const courseId of coursesToEnroll) {
          await tenantPool.query(
            'INSERT INTO enrollments (student_id, course_id, status) VALUES ($1, $2, $3)',
            [studentId, courseId, 'active']
          );
        }
      }
      
      // Create sample assignments
      const assignments = [
        { title: 'Programming Assignment 1', courseIndex: 0, maxPoints: 100, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { title: 'Data Structures Lab', courseIndex: 1, maxPoints: 50, dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        { title: 'Database Design Project', courseIndex: 2, maxPoints: 150, dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) },
        { title: 'Calculus Problem Set 1', courseIndex: 3, maxPoints: 100, dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
        { title: 'Essay Assignment', courseIndex: 4, maxPoints: 75, dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) }
      ];
      
      for (const assignment of assignments) {
        await tenantPool.query(
          `INSERT INTO assignments (course_id, title, description, max_points, due_date, assignment_type, is_published) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            courseIds[assignment.courseIndex],
            assignment.title,
            `Complete the ${assignment.title.toLowerCase()} following the instructions provided.`,
            assignment.maxPoints,
            assignment.dueDate,
            'homework',
            true
          ]
        );
      }
      
      // Create sample quizzes
      const quizQuestions = [
        {
          id: 1,
          question: "What is the time complexity of binary search?",
          type: "multiple_choice",
          options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
          correct_answer: "O(log n)",
          points: 10
        },
        {
          id: 2,
          question: "Which data structure follows LIFO principle?",
          type: "multiple_choice",
          options: ["Queue", "Stack", "Array", "Linked List"],
          correct_answer: "Stack",
          points: 10
        }
      ];
      
      await tenantPool.query(
        `INSERT INTO quizzes (course_id, title, description, time_limit, max_attempts, max_points, questions, is_published) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          courseIds[1], // Data Structures course
          'Data Structures Quiz 1',
          'Test your knowledge of basic data structures',
          30, // 30 minutes
          2, // 2 attempts
          20, // 20 points
          JSON.stringify(quizQuestions),
          true
        ]
      );
      
      // Create sample notifications
      const notifications = [
        { title: 'Welcome to the LMS', message: 'Welcome to our Learning Management System!', type: 'info' },
        { title: 'New Assignment Posted', message: 'A new assignment has been posted for CS101.', type: 'info' },
        { title: 'Quiz Available', message: 'Data Structures Quiz 1 is now available.', type: 'success' }
      ];
      
      for (const notification of notifications) {
        // Send to all students
        for (const studentId of studentIds) {
          const studentUserResult = await tenantPool.query(
            'SELECT user_id FROM students WHERE id = $1',
            [studentId]
          );
          
          if (studentUserResult.rows.length > 0) {
            await tenantPool.query(
              'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
              [studentUserResult.rows[0].user_id, notification.title, notification.message, notification.type]
            );
          }
        }
      }
      
      console.log(`✅ Seeded data for ${tenantId} completed`);
    }
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Sample Login Credentials:');
    console.log('Admin: admin@collegeA.com / admin123');
    console.log('Teacher: smith@collegeA.com / teacher123');
    console.log('Student: alice@collegeA.com / student123');
    console.log('\nAdmin: admin@collegeB.com / admin123');
    console.log('Teacher: smith@collegeB.com / teacher123');
    console.log('Student: alice@collegeB.com / student123');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };




