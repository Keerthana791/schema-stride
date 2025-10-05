import { apiClient } from './api';
import API_CONFIG from '@/config/api';

export interface Quiz {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description: string;
  duration: number;
  totalQuestions: number;
  scheduledDate: string;
  status: 'upcoming' | 'completed';
  score?: number;
  totalMarks?: number;
}

export interface QuizSubmission {
  quizId: string;
  answers: Record<string, any>;
}

export const quizService = {
  async getAll(): Promise<Quiz[]> {
    return apiClient.get<Quiz[]>(API_CONFIG.ENDPOINTS.QUIZZES);
  },

  async getById(id: string): Promise<Quiz> {
    return apiClient.get<Quiz>(API_CONFIG.ENDPOINTS.QUIZ_BY_ID(id));
  },

  async submit(id: string, data: QuizSubmission): Promise<void> {
    return apiClient.post(API_CONFIG.ENDPOINTS.SUBMIT_QUIZ(id), data);
  }
};
