# Engineering LMS - Multi-tenant Learning Management System

A modern, multi-tenant Learning Management System built with React, TypeScript, and Tailwind CSS.

## Project info

**URL**: https://lovable.dev/projects/6b430513-85d0-4880-8649-9f57e71fa68a

## Backend Integration

This application is configured to connect to an external backend API. You need to provide your own backend server.

### Backend Requirements

Your backend should implement the following endpoints:

#### Authentication
- `POST /api/auth/login` - User login
  - Body: `{ email, password }`
  - Returns: `{ user: { id, email, name, role, tenantId }, accessToken, refreshToken? }`
  
- `POST /api/auth/signup` - User registration
  - Body: `{ email, password, name, tenantId }`
  - Returns: `{ user: { id, email, name, role, tenantId }, accessToken, refreshToken? }`
  
- `POST /api/auth/logout` - User logout
  - Requires: Bearer token

#### Courses
- `GET /api/courses` - Get all courses for tenant
- `GET /api/courses/:id` - Get course by ID
- `POST /api/courses/:id/enroll` - Enroll in course

#### Assignments
- `GET /api/assignments` - Get all assignments
- `GET /api/assignments/:id` - Get assignment by ID
- `POST /api/assignments/:id/submit` - Submit assignment

#### Quizzes
- `GET /api/quizzes` - Get all quizzes
- `GET /api/quizzes/:id` - Get quiz by ID
- `POST /api/quizzes/:id/submit` - Submit quiz

#### Grades
- `GET /api/grades` - Get grades
- `GET /api/grades/student/:id` - Get student grades

#### Notifications
- `GET /api/notifications` - Get notifications
- `POST /api/notifications/:id/read` - Mark as read

#### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Configuration

Set your backend API URL by creating a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://your-backend-url.com/api
```

Or update `src/config/api.ts` directly.

### Authentication Flow

1. User logs in via `/login`
2. Backend returns JWT access token
3. Token is stored in localStorage
4. All subsequent API calls include `Authorization: Bearer <token>` header
5. Tenant is identified from the JWT token payload

### Multi-tenancy

The system supports multi-tenancy through:
- Tenant ID in user registration
- Tenant context resolved from JWT token
- All API calls are automatically tenant-aware

## LMS Features

- Role-based access (Admin, Teacher, Student)
- Course management and enrollment
- Assignments and submissions
- Quizzes and exams
- Grade tracking and GPA calculation
- Real-time notifications
- Responsive design
- Dark/light mode support

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/6b430513-85d0-4880-8649-9f57e71fa68a) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/6b430513-85d0-4880-8649-9f57e71fa68a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
