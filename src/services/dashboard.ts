import { apiClient } from './api';
import API_CONFIG from '@/config/api';

export interface DashboardStats {
  enrolledCourses: number;
  pendingAssignments: number;
  upcomingQuizzes: number;
  averageGrade: number;
}

export interface RecentCourse {
  id: string;
  name: string;
  code: string;
  progress: number;
  nextClass: string;
}

export interface UpcomingDeadline {
  id: string;
  title: string;
  type: 'assignment' | 'quiz';
  courseName: string;
  dueDate: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentCourses: RecentCourse[];
  upcomingDeadlines: UpcomingDeadline[];
}

export const dashboardService = {
  async getData(): Promise<DashboardData> {
    return apiClient.get<DashboardData>(API_CONFIG.ENDPOINTS.DASHBOARD_STATS);
  }
};
