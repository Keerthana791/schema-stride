import { apiClient } from './api';
import API_CONFIG from '@/config/api';

export interface Grade {
  id: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  credits: number;
  category: string;
  assignments: number;
  quizzes: number;
  midterm: number;
  final: number;
  total: number;
  grade: string;
}

export interface GradesSummary {
  gpa: number;
  averageGrade: number;
  totalCredits: number;
  grades: Grade[];
}

export const gradeService = {
  async getAll(): Promise<GradesSummary> {
    return apiClient.get<GradesSummary>(API_CONFIG.ENDPOINTS.GRADES);
  },

  async getByStudent(studentId: string): Promise<GradesSummary> {
    return apiClient.get<GradesSummary>(API_CONFIG.ENDPOINTS.STUDENT_GRADES(studentId));
  }
};
