import { apiClient } from './api';
import API_CONFIG from '@/config/api';

export interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  students: number;
  semester: string;
  description: string;
  progress: number;
  credits?: number;
}

export const courseService = {
  async getAll(): Promise<Course[]> {
    return apiClient.get<Course[]>(API_CONFIG.ENDPOINTS.COURSES);
  },

  async getById(id: string): Promise<Course> {
    return apiClient.get<Course>(API_CONFIG.ENDPOINTS.COURSE_BY_ID(id));
  },

  async enroll(courseId: string): Promise<void> {
    return apiClient.post(API_CONFIG.ENDPOINTS.ENROLL(courseId));
  }
};
