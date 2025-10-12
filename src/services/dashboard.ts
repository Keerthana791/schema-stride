import { apiClient } from './api';
import API_CONFIG from '@/config/api';

export interface DashboardStats {
  stats: {
    students: number;
    teachers: number;
    courses: number;
    assignments: number;
    quizzes: number;
    enrollments: number;
  };
  gradeStats: {
    average_grade: number;
    total_grades: number;
    a_grades: number;
    b_grades: number;
    c_grades: number;
    failing_grades: number;
  };
  recentActivity: {
    assignments: Array<{
      title: string;
      created_at: string;
      course_title: string;
    }>;
    enrollments: Array<{
      first_name: string;
      last_name: string;
      course_title: string;
      enrollment_date: string;
    }>;
  };
  courseEnrollments: Array<{
    title: string;
    course_code: string;
    enrollment_count: number;
  }>;
}

export interface UserStats {
  userStats: {
    enrolledCourses?: number;
    pendingAssignments?: number;
    completedAssignments?: number;
    averageGrade?: number;
    upcomingQuizzes?: number;
    myCourses?: number;
    totalStudents?: number;
    pendingSubmissions?: number;
    averageClassGrade?: number;
  };
  role: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>(API_CONFIG.ENDPOINTS.DASHBOARD_STATS);
    return response;
  },

  async getUserStats(): Promise<UserStats> {
    const response = await apiClient.get<UserStats>(API_CONFIG.ENDPOINTS.USER_STATS);
    return response;
  },

  async getNotifications(): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const response = await apiClient.get<{ notifications: Notification[]; unreadCount: number }>(
      API_CONFIG.ENDPOINTS.DASHBOARD_NOTIFICATIONS
    );
    return response;
  }
};