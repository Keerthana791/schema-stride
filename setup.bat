@echo off
echo 🚀 Setting up Multi-Tenant Learning Management System...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18 or higher.
    pause
    exit /b 1
)

REM Check if PostgreSQL is installed
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL is not installed. Please install PostgreSQL 12 or higher.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file...
    copy env.example .env
    echo ⚠️  Please edit backend\.env with your database credentials
)

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd ..
call npm install

REM Create frontend .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating frontend .env file...
    echo VITE_API_BASE_URL=http://localhost:3000/api > .env
)

echo ✅ Dependencies installed successfully

echo.
echo 🗄️  Database Setup Instructions:
echo 1. Create PostgreSQL database:
echo    createdb lms_main
echo.
echo 2. Update backend\.env with your database credentials
echo.
echo 3. Run database migrations:
echo    cd backend ^&^& npm run migrate
echo.
echo 4. Seed sample data:
echo    cd backend ^&^& npm run seed
echo.
echo 5. Start the backend server:
echo    cd backend ^&^& npm run dev
echo.
echo 6. Start the frontend development server:
echo    npm run dev
echo.
echo 🎉 Setup complete! Follow the instructions above to start the application.
echo.
echo 📋 Sample Login Credentials (after seeding):
echo Institution: College A
echo - Admin: admin@collegeA.com / admin123
echo - Teacher: smith@collegeA.com / teacher123
echo - Student: alice@collegeA.com / student123
echo.
echo Institution: College B
echo - Admin: admin@collegeB.com / admin123
echo - Teacher: smith@collegeB.com / teacher123
echo - Student: alice@collegeB.com / student123

pause




