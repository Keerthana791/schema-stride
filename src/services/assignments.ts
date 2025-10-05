import { apiClient } from './api';
import API_CONFIG from '@/config/api';

export interface Assignment {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description: string;
  dueDate: string;
  maxPoints: number;
  status: 'pending' | 'submitted' | 'graded';
  submittedAt?: string;
  grade?: number;
  feedback?: string;
}

export interface AssignmentSubmission {
  assignmentId: string;
  content: string;
  fileUrl?: string;
}

export const assignmentService = {
  async getAll(): Promise<Assignment[]> {
    return apiClient.get<Assignment[]>(API_CONFIG.ENDPOINTS.ASSIGNMENTS);
  },

  async getById(id: string): Promise<Assignment> {
    return apiClient.get<Assignment>(API_CONFIG.ENDPOINTS.ASSIGNMENT_BY_ID(id));
  },

  async submit(id: string, data: AssignmentSubmission): Promise<void> {
    return apiClient.post(API_CONFIG.ENDPOINTS.SUBMIT_ASSIGNMENT(id), data);
  }
};
