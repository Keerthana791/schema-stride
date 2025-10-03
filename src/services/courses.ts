import { apiClient } from './api';
import API_CONFIG from '@/config/api';

export interface Course {
  id: string;
  title: string;
  code: string;
  instructor: string;
  progress: number;
  enrolledStudents?: number;
  credits?: number;
  description?: string;
}

export const coursesService = {
  async getCourses(): Promise<Course[]> {
    return apiClient.get<Course[]>(API_CONFIG.ENDPOINTS.COURSES);
  },

  async getCourseById(id: string): Promise<Course> {
    return apiClient.get<Course>(API_CONFIG.ENDPOINTS.COURSE_BY_ID(id));
  },

  async enrollInCourse(courseId: string): Promise<void> {
    return apiClient.post(API_CONFIG.ENDPOINTS.ENROLL(courseId));
  }
};
