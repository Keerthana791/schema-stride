// API Configuration
// Update these values to match your backend API endpoints

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  ENDPOINTS: {
    // Auth
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    
    // Courses
    COURSES: '/courses',
    COURSE_BY_ID: (id: string) => `/courses/${id}`,
    ENROLL: (courseId: string) => `/courses/${courseId}/enroll`,
    
    // Assignments
    ASSIGNMENTS: '/assignments',
    ASSIGNMENT_BY_ID: (id: string) => `/assignments/${id}`,
    SUBMIT_ASSIGNMENT: (id: string) => `/assignments/${id}/submit`,
    
    // Quizzes
    QUIZZES: '/quizzes',
    QUIZ_BY_ID: (id: string) => `/quizzes/${id}`,
    SUBMIT_QUIZ: (id: string) => `/quizzes/${id}/submit`,
    
    // Grades
    GRADES: '/grades',
    STUDENT_GRADES: (studentId: string) => `/grades/student/${studentId}`,
    
    // Notifications
    NOTIFICATIONS: '/notifications',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    
    // Dashboard
    DASHBOARD_STATS: '/dashboard/stats',
  }
};

export default API_CONFIG;
