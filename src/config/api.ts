// API Configuration
// Update these values to match your backend API endpoints

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  ENDPOINTS: {
    // Auth
    LOGIN: '/auth/login',
    REGISTER_TENANT: '/auth/register-tenant',
    REGISTER: '/auth/register',
    REGISTER_USER: '/auth/register-user',
    TENANTS: '/auth/tenants',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    
    // Tenant
    TENANT_INFO: '/tenant/info',
    TENANT_STATS: '/tenant/stats',
    TENANT_USERS: '/tenant/users',
    
    // Courses
    COURSES: '/courses',
    COURSE_BY_ID: (id: string) => `/courses/${id}`,
    ENROLL: (courseId: string) => `/courses/${courseId}/enroll`,
    COURSE_ENROLLMENTS: (courseId: string) => `/courses/${courseId}/enrollments`,
    
    // Assignments
    ASSIGNMENTS: '/assignments',
    ASSIGNMENT_BY_ID: (id: string) => `/assignments/${id}`,
    SUBMIT_ASSIGNMENT: (id: string) => `/assignments/${id}/submit`,
    ASSIGNMENT_SUBMISSIONS: (id: string) => `/assignments/${id}/submissions`,
    GRADE_SUBMISSION: (submissionId: string) => `/assignments/submissions/${submissionId}/grade`,
    
    // Quizzes
    QUIZZES: '/quizzes',
    QUIZ_BY_ID: (id: string) => `/quizzes/${id}`,
    SUBMIT_QUIZ: (id: string) => `/quizzes/${id}/submit`,
    QUIZ_SUBMISSIONS: (id: string) => `/quizzes/${id}/submissions`,
    
    // Grades
    GRADES: '/grades',
    STUDENT_GRADES: (studentId: string) => `/grades/student/${studentId}`,
    COURSE_GRADES: (courseId: string) => `/grades/course/${courseId}`,
    GRADE_STATS: (courseId: string) => `/grades/course/${courseId}/stats`,
    STUDENT_SUMMARY: (studentId: string) => `/grades/student/${studentId}/summary`,
    
    // Notifications
    NOTIFICATIONS: '/notifications',
    NOTIFICATION_BY_ID: (id: string) => `/notifications/${id}`,
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    READ_ALL: '/notifications/read-all',
    UNREAD_COUNT: '/notifications/unread/count',
    BULK_NOTIFICATIONS: '/notifications/bulk',
    NOTIFICATION_STATS: '/notifications/stats',
    
    // Dashboard
    DASHBOARD_STATS: '/dashboard/stats',
    DASHBOARD_USER_STATS: '/dashboard/user-stats',
    DASHBOARD_NOTIFICATIONS: '/dashboard/notifications',
    
    // Users
    USERS: '/users',
    USER_BY_ID: (id: string) => `/users/${id}`,
    USER_PROFILE: (id: string) => `/users/${id}/profile`,
    USER_COURSES: (id: string) => `/users/${id}/courses`,
    USER_ASSIGNMENTS: (id: string) => `/users/${id}/assignments`,
    USER_STATS: (id: string) => `/users/${id}/stats`,
    
    // Upload
    UPLOAD_SINGLE: '/upload/single',
    UPLOAD_MULTIPLE: '/upload/multiple',
    FILES_BY_ENTITY: (entityType: string, entityId: string) => `/upload/entity/${entityType}/${entityId}`,
    FILE_BY_ID: (id: string) => `/upload/${id}`,
    DOWNLOAD_FILE: (id: string) => `/upload/${id}/download`,
    UPLOAD_STATS: '/upload/stats',
    
    // Admin/User Management
    ADMIN_USERS: '/admin/users',
    ADMIN_USER_BY_ID: (id: string) => `/admin/users/${id}`,
    ADMIN_CREATE_USER: '/admin/users',
    ADMIN_UPDATE_USER: (id: string) => `/admin/users/${id}`,
    ADMIN_DELETE_USER: (id: string) => `/admin/users/${id}`,
    ADMIN_ROLES: '/admin/roles',
    ADMIN_ASSIGN_ROLE: (id: string) => `/admin/users/${id}/roles`,
    ADMIN_REMOVE_ROLE: (id: string, roleId: string) => `/admin/users/${id}/roles/${roleId}`,
  }
};

export default API_CONFIG;
