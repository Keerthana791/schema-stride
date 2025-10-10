#!/bin/bash

# Multi-Tenant LMS Setup Script
echo "🚀 Setting up Multi-Tenant Learning Management System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL 12 or higher."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
    echo "⚠️  Please edit backend/.env with your database credentials"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ..
npm install

# Create frontend .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating frontend .env file..."
    echo "VITE_API_BASE_URL=http://localhost:3000/api" > .env
fi

echo "✅ Dependencies installed successfully"

# Database setup instructions
echo ""
echo "🗄️  Database Setup Instructions:"
echo "1. Create PostgreSQL database:"
echo "   createdb lms_main"
echo ""
echo "2. Update backend/.env with your database credentials"
echo ""
echo "3. Run database migrations:"
echo "   cd backend && npm run migrate"
echo ""
echo "4. Seed sample data:"
echo "   cd backend && npm run seed"
echo ""
echo "5. Start the backend server:"
echo "   cd backend && npm run dev"
echo ""
echo "6. Start the frontend development server:"
echo "   npm run dev"
echo ""
echo "🎉 Setup complete! Follow the instructions above to start the application."
echo ""
echo "📋 Sample Login Credentials (after seeding):"
echo "Institution: College A"
echo "- Admin: admin@collegeA.com / admin123"
echo "- Teacher: smith@collegeA.com / teacher123"
echo "- Student: alice@collegeA.com / student123"
echo ""
echo "Institution: College B"
echo "- Admin: admin@collegeB.com / admin123"
echo "- Teacher: smith@collegeB.com / teacher123"
echo "- Student: alice@collegeB.com / student123"




