# Multi-Tenant Learning Management System (LMS)

A comprehensive multi-tenant Learning Management System built with Node.js, Express, React, and PostgreSQL. Each tenant (institution) has its own isolated schema while sharing the same database infrastructure.

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Multi-tenant architecture** with separate schemas per tenant
- **JWT-based authentication** with role-based access control
- **PostgreSQL database** with tenant isolation
- **File upload system** with tenant-specific storage
- **RESTful API** with comprehensive LMS features

### Frontend (React + TypeScript)
- **Modern React 18** with TypeScript
- **Tailwind CSS** for styling
- **Shadcn/ui** component library
- **React Query** for data fetching
- **React Router** for navigation

### Database Schema
- **Main database**: Tenant mapping and global user management
- **Tenant schemas**: Isolated data per institution
- **Tables**: Students, Teachers, Courses, Enrollments, Assignments, Quizzes, Grades, Notifications, File Uploads

## 🚀 Features

### Multi-Tenant Support
- ✅ Tenant registration and schema creation
- ✅ Subdomain-based tenant resolution
- ✅ JWT token-based tenant identification
- ✅ Complete data isolation between tenants

### User Management
- ✅ Role-based access control (Admin, Teacher, Student)
- ✅ User registration within tenants
- ✅ Profile management
- ✅ Authentication and authorization

### Course Management
- ✅ Create and manage courses
- ✅ Student enrollment
- ✅ Course assignments and materials
- ✅ Teacher-student relationships

### Assignment System
- ✅ Create assignments with due dates
- ✅ File attachments support
- ✅ Student submissions
- ✅ Grading and feedback system

### Quiz System
- ✅ Multiple choice and true/false questions
- ✅ Time-limited quizzes
- ✅ Multiple attempts support
- ✅ Automatic scoring

### Grade Management
- ✅ Assignment and quiz grading
- ✅ Grade statistics and analytics
- ✅ Student grade summaries
- ✅ Grade distribution reports

### Notification System
- ✅ Real-time notifications
- ✅ Bulk notifications for announcements
- ✅ Notification management
- ✅ Unread count tracking

### File Management
- ✅ Secure file uploads
- ✅ Tenant-specific file storage
- ✅ File access control
- ✅ Multiple file format support

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd schema-stride
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Database Setup
```bash
# Create PostgreSQL database
createdb lms_main

# Set up environment variables
cp env.example .env
# Edit .env with your database credentials
```

### 4. Run Migrations
```bash
npm run migrate
```

### 5. Seed Sample Data
```bash
npm run seed
```

### 6. Start Backend Server
```bash
npm run dev
```

### 7. Frontend Setup
```bash
# In the root directory
npm install
```

### 8. Start Frontend Development Server
```bash
npm run dev
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lms_main
DB_USER=postgres
DB_PASSWORD=password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

#### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## 🎯 Usage

### 1. Register a New Institution
1. Navigate to `/tenant-registration`
2. Fill in institution details
3. Create admin account
4. Institution schema is automatically created

### 2. User Registration
1. Admin can register teachers and students
2. Teachers and students can self-register (if enabled)
3. Each user belongs to a specific tenant

### 3. Course Management
1. Teachers create courses
2. Students enroll in courses
3. Assignments and quizzes are course-specific

### 4. Assignment Workflow
1. Teacher creates assignment
2. Students submit assignments
3. Teacher grades submissions
4. Students view grades and feedback

## 📊 Database Schema

### Main Database Tables
- `tenant_mapping`: Maps tenant IDs to schema names
- `users`: Global user management
- `refresh_tokens`: JWT refresh token storage

### Tenant Schema Tables
- `students`: Student profiles
- `teachers`: Teacher profiles
- `courses`: Course information
- `enrollments`: Student-course relationships
- `assignments`: Assignment details
- `assignment_submissions`: Student submissions
- `quizzes`: Quiz information
- `quiz_submissions`: Quiz submissions
- `grades`: Grade records
- `notifications`: Notification system
- `file_uploads`: File management

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Granular permissions
- **Tenant Isolation**: Complete data separation
- **File Security**: Tenant-specific file storage
- **Input Validation**: Comprehensive data validation
- **Rate Limiting**: API protection

## 🧪 Testing

### Sample Login Credentials (After Seeding)
```
Institution: College A
- Admin: admin@collegeA.com / admin123
- Teacher: smith@collegeA.com / teacher123
- Student: alice@collegeA.com / student123

Institution: College B
- Admin: admin@collegeB.com / admin123
- Teacher: smith@collegeB.com / teacher123
- Student: alice@collegeB.com / student123
```

## 📈 API Endpoints

### Authentication
- `POST /api/auth/register-tenant` - Register new institution
- `POST /api/auth/register` - Register user within tenant
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Courses
- `GET /api/courses` - List courses
- `POST /api/courses` - Create course
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course
- `POST /api/courses/:id/enroll` - Enroll in course

### Assignments
- `GET /api/assignments` - List assignments
- `POST /api/assignments` - Create assignment
- `GET /api/assignments/:id` - Get assignment
- `POST /api/assignments/:id/submit` - Submit assignment
- `GET /api/assignments/:id/submissions` - Get submissions

### Quizzes
- `GET /api/quizzes` - List quizzes
- `POST /api/quizzes` - Create quiz
- `GET /api/quizzes/:id` - Get quiz
- `POST /api/quizzes/:id/submit` - Submit quiz

### Grades
- `GET /api/grades` - List grades
- `POST /api/grades` - Create grade
- `GET /api/grades/course/:id` - Get course grades
- `GET /api/grades/student/:id` - Get student grades

### Notifications
- `GET /api/notifications` - List notifications
- `POST /api/notifications` - Create notification
- `PUT /api/notifications/:id/read` - Mark as read

### File Upload
- `POST /api/upload/single` - Upload single file
- `POST /api/upload/multiple` - Upload multiple files
- `GET /api/upload/:id/download` - Download file

## 🚀 Deployment

### Backend Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Run migrations: `npm run migrate`
4. Start server: `npm start`

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy to your hosting service
3. Configure API base URL

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔄 Roadmap

- [ ] Real-time notifications with WebSockets
- [ ] Advanced analytics and reporting
- [ ] Mobile app support
- [ ] Integration with external systems
- [ ] Advanced file management
- [ ] Video streaming support
- [ ] Discussion forums
- [ ] Attendance tracking