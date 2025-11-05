import { apiClient } from './api';
import API_CONFIG from '@/config/api';

export interface Notification {
  id: string;
  type: 'assignment' | 'grade' | 'announcement' | 'quiz';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    return apiClient.get<Notification[]>(API_CONFIG.ENDPOINTS.NOTIFICATIONS);
  },

  async markAsRead(id: string): Promise<void> {
    return apiClient.post(API_CONFIG.ENDPOINTS.MARK_READ(id), {});
  }
};
