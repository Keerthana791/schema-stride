# Multi-Tenant LMS Setup Guide

This guide will help you set up the Multi-Tenant Learning Management System on your local machine.

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

#### Windows
```bash
# Run the setup script
setup.bat
```

#### Linux/macOS
```bash
# Make script executable and run
chmod +x setup.sh
./setup.sh
```

### Option 2: Manual Setup

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn**

## 🛠️ Installation Steps

### 1. Clone and Install Dependencies

```bash
# Install all dependencies
npm run setup
```

### 2. Database Setup

#### Create PostgreSQL Database
```bash
createdb lms_main
```

#### Configure Environment Variables
```bash
# Backend configuration
cd backend
cp env.example .env
```

Edit `backend/.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lms_main
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-super-secret-jwt-key-here
```

#### Frontend Configuration
```bash
# Frontend configuration
echo "VITE_API_BASE_URL=http://localhost:3000/api" > .env
```

### 3. Database Migration and Seeding

```bash
# Run database migrations
npm run backend:migrate

# Seed sample data
npm run backend:seed
```

### 4. Start the Application

#### Option A: Start Both Servers
```bash
# Start both backend and frontend
npm run start:full
```

#### Option B: Start Separately
```bash
# Terminal 1: Start backend
npm run backend:dev

# Terminal 2: Start frontend
npm run dev
```

## 🎯 Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 👥 Sample Login Credentials

After running the seed script, you can use these credentials:

### College A Institution
- **Admin**: admin@collegeA.com / admin123
- **Teacher**: smith@collegeA.com / teacher123
- **Student**: alice@collegeA.com / student123

### College B Institution
- **Admin**: admin@collegeB.com / admin123
- **Teacher**: smith@collegeB.com / teacher123
- **Student**: alice@collegeB.com / student123

## 🏗️ Project Structure

```
schema-stride/
├── backend/                 # Node.js Express backend
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── middleware/     # Authentication & tenant resolution
│   │   ├── routes/         # API routes
│   │   └── scripts/        # Migration & seeding scripts
│   ├── uploads/           # File upload storage
│   └── package.json
├── src/                    # React frontend
│   ├── components/        # Reusable UI components
│   ├── pages/            # Application pages
│   ├── services/         # API services
│   └── contexts/         # React contexts
├── public/               # Static assets
└── package.json
```

## 🔧 Development Commands

```bash
# Frontend development
npm run dev                 # Start frontend dev server
npm run build              # Build for production
npm run preview            # Preview production build

# Backend development
npm run backend:dev        # Start backend server
npm run backend:migrate    # Run database migrations
npm run backend:seed       # Seed sample data

# Full stack development
npm run start:full         # Start both servers
```

## 🗄️ Database Schema

### Main Database
- `tenant_mapping` - Maps tenant IDs to schema names
- `users` - Global user management
- `refresh_tokens` - JWT refresh tokens

### Tenant Schemas (e.g., collegeA_schema)
- `students` - Student profiles
- `teachers` - Teacher profiles
- `courses` - Course information
- `enrollments` - Student-course relationships
- `assignments` - Assignment details
- `assignment_submissions` - Student submissions
- `quizzes` - Quiz information
- `quiz_submissions` - Quiz submissions
- `grades` - Grade records
- `notifications` - Notification system
- `file_uploads` - File management

## 🔐 Security Features

- **JWT Authentication** with refresh tokens
- **Role-based Access Control** (Admin, Teacher, Student)
- **Tenant Isolation** - Complete data separation
- **File Security** - Tenant-specific file storage
- **Input Validation** - Comprehensive data validation
- **Rate Limiting** - API protection

## 🧪 Testing the Multi-Tenant System

1. **Register New Institution**:
   - Go to `/tenant-registration`
   - Create a new institution
   - Verify schema creation

2. **User Registration**:
   - Login as admin
   - Register teachers and students
   - Verify user isolation

3. **Course Management**:
   - Create courses
   - Enroll students
   - Verify course isolation

4. **Assignment System**:
   - Create assignments
   - Submit assignments
   - Grade submissions

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Error
```bash
# Check PostgreSQL is running
pg_ctl status

# Check database exists
psql -l | grep lms_main
```

#### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000

# Kill process on port 5173
npx kill-port 5173
```

#### Migration Errors
```bash
# Reset database
dropdb lms_main
createdb lms_main
npm run backend:migrate
npm run backend:seed
```

#### File Upload Issues
```bash
# Create uploads directory
mkdir -p backend/uploads
```

## 📞 Support

If you encounter issues:

1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure PostgreSQL is running
4. Check that all dependencies are installed
5. Review the README.md for additional information

## 🎉 Next Steps

After successful setup:

1. **Explore the Features**:
   - Course management
   - Assignment system
   - Quiz functionality
   - Grade management
   - Notification system

2. **Customize for Your Needs**:
   - Modify UI components
   - Add new features
   - Configure tenant settings

3. **Deploy to Production**:
   - Set up production database
   - Configure environment variables
   - Deploy to your hosting platform




